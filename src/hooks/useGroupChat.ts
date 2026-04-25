import { useCallback, useMemo, useRef } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/contexts/auth-context';
import { useWebSocketSubscription } from '@/lib/contexts/websocket-context';
import { getMessages, sendMessage as apiSendMessage, markMessagesRead } from '@/lib/api';
import type { GroupMessage, MessageListResponse } from '@/types/api';

const PAGE_SIZE = 50;

export function useGroupChat(groupId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const markedReadRef = useRef<Set<string>>(new Set());
  const readBatchRef = useRef<string[]>([]);
  const readTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const queryKey = ['groupMessages', groupId];

  const {
    data,
    isLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam = 1 }) => getMessages(groupId, pageParam, PAGE_SIZE),
    getNextPageParam: (lastPage, allPages) =>
      lastPage.hasMore ? allPages.length + 1 : undefined,
    enabled: !!groupId,
  });

  // Flatten all pages into a single deduplicated array (newest-first)
  const messages = useMemo(() => {
    if (!data?.pages) return [];
    const seen = new Set<string>();
    const result: GroupMessage[] = [];
    for (const page of data.pages) {
      for (const msg of page.messages) {
        if (!seen.has(msg.id)) {
          seen.add(msg.id);
          result.push(msg);
        }
      }
    }
    return result;
  }, [data?.pages]);

  // Listen for real-time messages to prepend to the local query data
  // (so the user sees new messages without a full refetch)
  useWebSocketSubscription(
    (event) => {
      if (!event.data?.groupId || event.data.groupId !== groupId) return;

      switch (event.type) {
        case 'group_message': {
          const message: GroupMessage = event.data.message;
          // Skip own USER messages — already added optimistically by sendMessage
          if (message.userId === user?.id && message.messageType !== 'SYSTEM') {
            return;
          }
          // Prepend to first page so it appears immediately
          queryClient.setQueryData<{ pages: MessageListResponse[]; pageParams: number[] }>(
            queryKey,
            (old) => {
              if (!old?.pages?.length) return old;
              const firstPage = old.pages[0];
              if (firstPage.messages.some((m) => m.id === message.id)) return old;
              return {
                ...old,
                pages: [
                  { ...firstPage, messages: [message, ...firstPage.messages], count: firstPage.count + 1 },
                  ...old.pages.slice(1),
                ],
              };
            },
          );
          break;
        }

        case 'message_edited': {
          const updated: GroupMessage = event.data.message;
          queryClient.setQueryData<{ pages: MessageListResponse[]; pageParams: number[] }>(
            queryKey,
            (old) => {
              if (!old?.pages) return old;
              return {
                ...old,
                pages: old.pages.map((page) => ({
                  ...page,
                  messages: page.messages.map((msg) =>
                    msg.id === updated.id ? { ...msg, content: updated.content, isEdited: true, editedAt: updated.editedAt } : msg,
                  ),
                })),
              };
            },
          );
          break;
        }

        case 'message_deleted': {
          const deletedId: string = event.data.messageId;
          queryClient.setQueryData<{ pages: MessageListResponse[]; pageParams: number[] }>(
            queryKey,
            (old) => {
              if (!old?.pages) return old;
              return {
                ...old,
                pages: old.pages.map((page) => ({
                  ...page,
                  messages: page.messages.filter((msg) => msg.id !== deletedId),
                  count: page.messages.some((msg) => msg.id === deletedId) ? page.count - 1 : page.count,
                })),
              };
            },
          );
          break;
        }
      }
    },
    [groupId, user?.id],
  );

  // --- Send message with optimistic update ---
  const sendMessage = useCallback(
    async (content: string) => {
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const optimistic: GroupMessage = {
        id: tempId,
        groupId,
        userId: user?.id ?? '',
        content: content.trim(),
        messageType: 'USER',
        isEdited: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        user: user ? { id: user.id, email: user.email, name: user.name } : undefined,
      };

      // Optimistic prepend
      queryClient.setQueryData<{ pages: MessageListResponse[]; pageParams: number[] }>(
        queryKey,
        (old) => {
          if (!old?.pages?.length) {
            return {
              pages: [{ messages: [optimistic], count: 1, hasMore: false }],
              pageParams: [1],
            };
          }
          const firstPage = old.pages[0];
          return {
            ...old,
            pages: [
              { ...firstPage, messages: [optimistic, ...firstPage.messages], count: firstPage.count + 1 },
              ...old.pages.slice(1),
            ],
          };
        },
      );

      try {
        const serverMessage = await apiSendMessage(groupId, { content: content.trim() });
        // Replace temp with server response
        queryClient.setQueryData<{ pages: MessageListResponse[]; pageParams: number[] }>(
          queryKey,
          (old) => {
            if (!old?.pages) return old;
            return {
              ...old,
              pages: old.pages.map((page) => ({
                ...page,
                messages: page.messages.map((msg) =>
                  msg.id === tempId ? serverMessage : msg,
                ),
              })),
            };
          },
        );
      } catch {
        // Rollback — remove optimistic message
        queryClient.setQueryData<{ pages: MessageListResponse[]; pageParams: number[] }>(
          queryKey,
          (old) => {
            if (!old?.pages) return old;
            return {
              ...old,
              pages: old.pages.map((page) => ({
                ...page,
                messages: page.messages.filter((msg) => msg.id !== tempId),
                count: page.messages.some((msg) => msg.id === tempId) ? page.count - 1 : page.count,
              })),
            };
          },
        );
        throw new Error('Failed to send message');
      }
    },
    [groupId, user, queryClient, queryKey],
  );

  // --- Mark messages as read (batched) ---
  const markAsRead = useCallback(
    (messageIds: string[]) => {
      const newIds = messageIds.filter((id) => !markedReadRef.current.has(id));
      if (newIds.length === 0) return;

      newIds.forEach((id) => markedReadRef.current.add(id));
      readBatchRef.current.push(...newIds);

      // Flush batch after 1 second of quiet
      if (readTimerRef.current) clearTimeout(readTimerRef.current);
      readTimerRef.current = setTimeout(() => {
        const batch = [...readBatchRef.current];
        readBatchRef.current = [];
        if (batch.length > 0) {
          markMessagesRead(groupId, batch).catch(() => {});
        }
      }, 1000);
    },
    [groupId],
  );

  return {
    messages,
    isLoading,
    hasMore: hasNextPage ?? false,
    fetchNextPage,
    isFetchingNextPage,
    sendMessage,
    markAsRead,
  };
}
