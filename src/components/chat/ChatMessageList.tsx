import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/contexts/auth-context';
import { MessageBubble } from './MessageBubble';
import { SystemMessage } from './SystemMessage';
import { DateSeparator } from './DateSeparator';
import { Icon } from '@/components/ui/Icon';
import type { GroupMessage } from '@/types/api';

interface ChatMessageListProps {
  messages: GroupMessage[];
  isLoading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  isFetchingMore: boolean;
  onMarkAsRead: (ids: string[]) => void;
  groupColor?: string;
}

export function ChatMessageList({
  messages,
  isLoading,
  hasMore,
  onLoadMore,
  isFetchingMore,
  onMarkAsRead,
  groupColor,
}: ChatMessageListProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [newMessageCount, setNewMessageCount] = useState(0);
  const prevMessageCountRef = useRef(messages.length);
  const isAtBottomRef = useRef(true);

  // --- Infinite scroll: load older messages when sentinel enters viewport ---
  useEffect(() => {
    const sentinel = sentinelRef.current;
    const container = scrollRef.current;
    if (!sentinel || !container || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isFetchingMore) {
          onLoadMore();
        }
      },
      { root: container, threshold: 0.1 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isFetchingMore, onLoadMore]);

  // --- Track if user is scrolled to bottom ---
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    // In column-reverse, scrollTop is 0 at bottom (newest) and negative going up
    isAtBottomRef.current = el.scrollTop >= -50;
    if (isAtBottomRef.current) {
      setNewMessageCount(0);
    }
  }, []);

  // --- Detect new messages arriving while scrolled up ---
  useEffect(() => {
    const newCount = messages.length;
    const prevCount = prevMessageCountRef.current;
    prevMessageCountRef.current = newCount;

    if (newCount > prevCount && !isAtBottomRef.current) {
      // Check if the new messages are from others
      const newMessages = messages.slice(0, newCount - prevCount);
      const othersMessages = newMessages.filter((m) => m.userId !== user?.id);
      if (othersMessages.length > 0) {
        setNewMessageCount((c) => c + othersMessages.length);
      }
    }
  }, [messages, user?.id]);

  // --- Read tracking via IntersectionObserver ---
  useEffect(() => {
    const container = scrollRef.current;
    if (!container || !user) return;

    const timers = new Map<string, ReturnType<typeof setTimeout>>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const msgId = (entry.target as HTMLElement).dataset.messageId;
          if (!msgId) continue;

          if (entry.isIntersecting) {
            // Start 500ms timer to mark as read
            if (!timers.has(msgId)) {
              timers.set(
                msgId,
                setTimeout(() => {
                  onMarkAsRead([msgId]);
                  timers.delete(msgId);
                }, 500),
              );
            }
          } else {
            // Clear timer if scrolled away before 500ms
            const timer = timers.get(msgId);
            if (timer) {
              clearTimeout(timer);
              timers.delete(msgId);
            }
          }
        }
      },
      { root: container, threshold: 0.5 },
    );

    // Observe messages from other users
    const elements = container.querySelectorAll('[data-message-id]');
    elements.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, [messages, user, onMarkAsRead]);

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = 0; // In column-reverse, 0 is the bottom
      setNewMessageCount(0);
    }
  }, []);

  // --- Build message list with date separators ---
  const items = buildMessageItems(messages, user?.id);

  // --- Empty state ---
  if (!isLoading && messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
        <Icon name="chat" size={48} color="var(--color-muted-foreground)" />
        <span className="text-sm">{t('groups.noMessages')}</span>
      </div>
    );
  }

  return (
    <div className="relative flex-1 overflow-hidden">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex h-full flex-col-reverse overflow-y-auto px-3 py-2"
        data-testid="chat-message-list"
      >
        {/* Messages rendered in reverse order (newest first due to column-reverse) */}
        {items.map((item) => {
          if (item.type === 'separator') {
            return <DateSeparator key={item.key} date={item.date} />;
          }

          const msg = item.message;
          const isOwn = msg.userId === user?.id;

          // Wrap in a div with data-message-id for read tracking (only other users' messages)
          return (
            <div
              key={msg.id}
              className="py-0.5"
              {...(!isOwn && msg.messageType !== 'SYSTEM' ? { 'data-message-id': msg.id } : {})}
            >
              {msg.messageType === 'SYSTEM' ? (
                <SystemMessage message={msg} groupColor={groupColor} />
              ) : (
                <MessageBubble message={msg} isOwnMessage={isOwn} groupColor={groupColor} />
              )}
            </div>
          );
        })}

        {/* Sentinel for infinite scroll — at the top (oldest end) */}
        {hasMore && (
          <div ref={sentinelRef} className="flex justify-center py-3">
            {isFetchingMore && (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
            )}
          </div>
        )}
      </div>

      {/* New message indicator pill */}
      {newMessageCount > 0 && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground shadow-lg transition-transform hover:scale-105"
        >
          {newMessageCount === 1
            ? t('chat.newMessageSingular')
            : t('chat.newMessagesPlural', { count: newMessageCount })}
        </button>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}
    </div>
  );
}

type MessageItem =
  | { type: 'message'; message: GroupMessage; key: string }
  | { type: 'separator'; date: string; key: string };

/**
 * Build a list of messages interleaved with date separators.
 * Messages arrive newest-first; column-reverse renders them bottom-to-top.
 * Date separators are inserted when the date changes between consecutive messages.
 */
function buildMessageItems(
  messages: GroupMessage[],
  currentUserId: string | undefined,
): MessageItem[] {
  const items: MessageItem[] = [];

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const msgDate = msg.createdAt.slice(0, 10); // "YYYY-MM-DD"

    items.push({ type: 'message', message: msg, key: msg.id });

    // Insert date separator after this message if the next message is on a different date.
    // Since messages are newest-first and column-reverse flips the visual order,
    // the separator appears ABOVE the first message of a date group visually.
    const nextMsg = messages[i + 1];
    if (nextMsg) {
      const nextDate = nextMsg.createdAt.slice(0, 10);
      if (msgDate !== nextDate) {
        items.push({ type: 'separator', date: msg.createdAt, key: `sep-${msgDate}` });
      }
    } else {
      // Last message in the list — add separator for the oldest date
      items.push({ type: 'separator', date: msg.createdAt, key: `sep-${msgDate}` });
    }
  }

  return items;
}
