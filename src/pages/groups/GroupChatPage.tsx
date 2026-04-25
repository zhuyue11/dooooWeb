import { useCallback, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useGroupChat } from '@/hooks/useGroupChat';
import { useUnreadMessages } from '@/lib/contexts/unread-messages-context';
import { ChatMessageList } from '@/components/chat/ChatMessageList';
import { ChatInputBar } from '@/components/chat/ChatInputBar';
import { getGroup } from '@/lib/api';

export function GroupChatPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const { setActiveChatGroup } = useUnreadMessages();

  // Mark this group's chat as active while mounted
  useEffect(() => {
    if (groupId) {
      setActiveChatGroup(groupId);
    }
    return () => {
      setActiveChatGroup(null);
    };
  }, [groupId, setActiveChatGroup]);

  const { data: groupData } = useQuery({
    queryKey: ['group', groupId],
    queryFn: () => getGroup(groupId!),
    enabled: !!groupId,
    staleTime: 5 * 60 * 1000,
  });

  const {
    messages,
    isLoading,
    hasMore,
    fetchNextPage,
    isFetchingNextPage,
    sendMessage,
    markAsRead,
  } = useGroupChat(groupId!);

  const groupColor = groupData?.group?.color;

  const handleSend = useCallback(
    (content: string) => {
      sendMessage(content).catch((err) => {
        console.error('Failed to send message:', err);
      });
    },
    [sendMessage],
  );

  return (
    <div className="flex h-full flex-col overflow-hidden -m-4 lg:-m-6">
      <ChatMessageList
        messages={messages}
        isLoading={isLoading}
        hasMore={hasMore}
        onLoadMore={() => fetchNextPage()}
        isFetchingMore={isFetchingNextPage}
        onMarkAsRead={markAsRead}
        groupColor={groupColor}
      />
      <ChatInputBar onSend={handleSend} />
    </div>
  );
}
