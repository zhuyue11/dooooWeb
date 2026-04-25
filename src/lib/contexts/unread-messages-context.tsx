import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from './auth-context';
import { useWebSocketSubscription } from './websocket-context';
import { getUndeliveredMessages, markMessageDelivered } from '../api';
import type { Group, GroupMessage } from '@/types/api';

export interface IncomingToast {
  id: string;
  groupId: string;
  groupName: string;
  senderName: string;
  content: string;
}

interface UnreadMessagesContextType {
  /** Map of groupId → unread count */
  unreadCounts: Record<string, number>;
  /** Total unread across all groups */
  totalUnread: number;
  /** Currently visible toast (null if none) */
  toast: IncomingToast | null;
  /** Mark a group's chat as actively viewed — suppresses toasts and unread for that group */
  setActiveChatGroup: (groupId: string | null) => void;
  /** Reset a group's unread count (called when entering chat) */
  clearUnread: (groupId: string) => void;
  /** Dismiss the current toast */
  dismissToast: () => void;
}

const UnreadMessagesContext = createContext<UnreadMessagesContextType>({
  unreadCounts: {},
  totalUnread: 0,
  toast: null,
  setActiveChatGroup: () => {},
  clearUnread: () => {},
  dismissToast: () => {},
});

const TOAST_DURATION = 4000;

export function UnreadMessagesProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [toast, setToast] = useState<IncomingToast | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const activeGroupChatRef = useRef<string | null>(null);

  function getGroupName(groupId: string): string {
    const groups = queryClient.getQueryData<Group[]>(['groups']);
    return groups?.find((g) => g.id === groupId)?.name ?? '';
  }

  // Fetch initial unread counts from undelivered messages on mount
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    getUndeliveredMessages()
      .then(({ messages }) => {
        const counts: Record<string, number> = {};
        for (const msg of messages) {
          counts[msg.groupId] = (counts[msg.groupId] || 0) + 1;
        }
        setUnreadCounts(counts);
      })
      .catch(() => {});
  }, [isAuthenticated, user]);

  // Listen for incoming group messages globally
  useWebSocketSubscription(
    (event) => {
      if (event.type !== 'group_message') return;

      const groupId: string = event.data?.groupId;
      const message: GroupMessage = event.data?.message;
      if (!groupId || !message) return;

      // Skip own messages
      if (message.userId === user?.id) return;
      // Skip system messages for toast/unread
      if (message.messageType === 'SYSTEM') return;

      // Mark as delivered
      markMessageDelivered(groupId, message.id).catch(() => {});

      // If user is currently viewing this group's chat, don't count or toast
      if (activeGroupChatRef.current === groupId) return;

      // Increment unread count
      setUnreadCounts((prev) => ({
        ...prev,
        [groupId]: (prev[groupId] || 0) + 1,
      }));

      // Show toast
      const senderName = message.user?.name || message.user?.email || '';
      const preview =
        message.content.length > 80
          ? message.content.slice(0, 80) + '…'
          : message.content;

      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      setToast({ id: message.id, groupId, groupName: getGroupName(groupId), senderName, content: preview });
      toastTimerRef.current = setTimeout(() => setToast(null), TOAST_DURATION);
    },
    [user?.id],
  );

  const dismissToast = useCallback(() => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(null);
  }, []);

  const clearUnread = useCallback((groupId: string) => {
    setUnreadCounts((prev) => {
      if (!prev[groupId]) return prev;
      const next = { ...prev };
      delete next[groupId];
      return next;
    });
  }, []);

  const setActiveChatGroup = useCallback((groupId: string | null) => {
    activeGroupChatRef.current = groupId;
    if (groupId) {
      // Clear unread for this group since the user is now viewing it
      setUnreadCounts((prev) => {
        if (!prev[groupId]) return prev;
        const next = { ...prev };
        delete next[groupId];
        return next;
      });
    }
  }, []);

  const totalUnread = Object.values(unreadCounts).reduce((sum, c) => sum + c, 0);

  return (
    <UnreadMessagesContext.Provider
      value={{ unreadCounts, totalUnread, toast, setActiveChatGroup, clearUnread, dismissToast }}
    >
      {children}
    </UnreadMessagesContext.Provider>
  );
}

export function useUnreadMessages() {
  return useContext(UnreadMessagesContext);
}
