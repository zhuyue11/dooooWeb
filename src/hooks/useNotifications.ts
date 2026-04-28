import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getNotifications,
  getUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  acceptGroupInvitation,
  declineGroupInvitation,
} from '@/lib/api';
import { NotificationType } from '@/types/api';
import type { Notification } from '@/types/api';

export function useNotifications() {
  const query = useQuery({
    queryKey: ['notifications'],
    queryFn: getNotifications,
    staleTime: 30 * 1000,
  });

  const { invitationNotifications, regularNotifications, unreadNotifications } = useMemo(() => {
    const all = query.data ?? [];
    const invitations = all.filter((n) => n.type === NotificationType.GROUP_INVITATION);
    const regular = all.filter((n) => n.type !== NotificationType.GROUP_INVITATION);
    const unread = all.filter((n) => !n.isRead);
    return {
      invitationNotifications: invitations,
      regularNotifications: regular,
      unreadNotifications: unread,
    };
  }, [query.data]);

  return {
    ...query,
    notifications: query.data ?? [],
    invitationNotifications,
    regularNotifications,
    unreadNotifications,
    invitationCount: invitationNotifications.length,
    unreadCount: unreadNotifications.length,
  };
}

export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: ['unread-count'],
    queryFn: getUnreadCount,
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
  });
}

export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markNotificationAsRead,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['unread-count'] });
      const previous = queryClient.getQueryData<number>(['unread-count']);
      queryClient.setQueryData<number>(['unread-count'], (old) =>
        Math.max(0, (old ?? 1) - 1)
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(['unread-count'], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
    },
  });
}

export function useMarkAllAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markAllNotificationsAsRead,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] });
      const previous = queryClient.getQueryData<Notification[]>(['notifications']);
      queryClient.setQueryData<Notification[]>(['notifications'], (old) =>
        old?.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
      );
      queryClient.setQueryData(['unread-count'], 0);
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['notifications'], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
    },
  });
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteNotification,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] });
      await queryClient.cancelQueries({ queryKey: ['unread-count'] });
      const previousNotifications = queryClient.getQueryData<Notification[]>(['notifications']);
      const previousCount = queryClient.getQueryData<number>(['unread-count']);
      queryClient.setQueryData<Notification[]>(['notifications'], (old) =>
        old?.filter((n) => n.id !== id)
      );
      const deletedNotification = previousNotifications?.find((n) => n.id === id);
      if (deletedNotification && !deletedNotification.isRead) {
        queryClient.setQueryData<number>(['unread-count'], (old) =>
          Math.max(0, (old ?? 1) - 1)
        );
      }
      return { previousNotifications, previousCount };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousNotifications) {
        queryClient.setQueryData(['notifications'], context.previousNotifications);
      }
      if (context?.previousCount !== undefined) {
        queryClient.setQueryData(['unread-count'], context.previousCount);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
    },
  });
}

export function useAcceptInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ invitationId }: { invitationId: string; notificationId: string }) =>
      acceptGroupInvitation(invitationId),
    onMutate: async ({ notificationId }) => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] });
      const previous = queryClient.getQueryData<Notification[]>(['notifications']);
      queryClient.setQueryData<Notification[]>(['notifications'], (old) =>
        old?.filter((n) => n.id !== notificationId)
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['notifications'], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });
}

export function useDeclineInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ invitationId }: { invitationId: string; notificationId: string }) =>
      declineGroupInvitation(invitationId),
    onMutate: async ({ notificationId }) => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] });
      const previous = queryClient.getQueryData<Notification[]>(['notifications']);
      queryClient.setQueryData<Notification[]>(['notifications'], (old) =>
        old?.filter((n) => n.id !== notificationId)
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['notifications'], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
    },
  });
}
