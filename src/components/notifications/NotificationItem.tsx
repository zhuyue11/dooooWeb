import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/ui/Icon';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useMarkNotificationAsRead, useDeleteNotification } from '@/hooks/useNotifications';
import { formatNotificationMessage } from '@/lib/notificationFormatter';
import { formatTimeAgo } from '@/lib/timeAgo';
import { NotificationType } from '@/types/api';
import type { Notification } from '@/types/api';

const ICON_MAP: Partial<Record<NotificationType, { name: string; bg: string; color: string }>> = {
  [NotificationType.TASK_ASSIGNED]: { name: 'assignment', bg: 'bg-blue-100 dark:bg-blue-900/40', color: 'text-blue-600 dark:text-blue-400' },
  [NotificationType.TASK_OVERDUE]: { name: 'warning', bg: 'bg-amber-100 dark:bg-amber-900/40', color: 'text-amber-600 dark:text-amber-400' },
  [NotificationType.TASK_COMPLETED]: { name: 'check_circle', bg: 'bg-emerald-100 dark:bg-emerald-900/40', color: 'text-emerald-600 dark:text-emerald-400' },
  [NotificationType.TASK_COMMENT]: { name: 'chat', bg: 'bg-purple-100 dark:bg-purple-900/40', color: 'text-purple-600 dark:text-purple-400' },
  [NotificationType.TASK_MENTION]: { name: 'alternate_email', bg: 'bg-indigo-100 dark:bg-indigo-900/40', color: 'text-indigo-600 dark:text-indigo-400' },
  [NotificationType.GROUP_MEMBER_JOINED]: { name: 'person_add', bg: 'bg-emerald-100 dark:bg-emerald-900/40', color: 'text-emerald-600 dark:text-emerald-400' },
  [NotificationType.GROUP_MEMBER_LEFT]: { name: 'person_remove', bg: 'bg-gray-100 dark:bg-gray-800/40', color: 'text-gray-600 dark:text-gray-400' },
  [NotificationType.GROUP_MEMBER_REMOVED]: { name: 'person_remove', bg: 'bg-red-100 dark:bg-red-900/40', color: 'text-red-600 dark:text-red-400' },
  [NotificationType.GROUP_MEMBER_ROLE_CHANGED]: { name: 'manage_accounts', bg: 'bg-violet-100 dark:bg-violet-900/40', color: 'text-violet-600 dark:text-violet-400' },
  [NotificationType.SYSTEM_ALERT]: { name: 'info', bg: 'bg-gray-100 dark:bg-gray-800/40', color: 'text-gray-600 dark:text-gray-400' },
  [NotificationType.EVENT_INVITATION]: { name: 'event', bg: 'bg-teal-100 dark:bg-teal-900/40', color: 'text-teal-600 dark:text-teal-400' },
  [NotificationType.EVENT_UPDATED]: { name: 'edit_calendar', bg: 'bg-teal-100 dark:bg-teal-900/40', color: 'text-teal-600 dark:text-teal-400' },
  [NotificationType.EVENT_CANCELLED]: { name: 'event_busy', bg: 'bg-red-100 dark:bg-red-900/40', color: 'text-red-600 dark:text-red-400' },
  [NotificationType.EVENT_RSVP_CHANGED]: { name: 'rsvp', bg: 'bg-teal-100 dark:bg-teal-900/40', color: 'text-teal-600 dark:text-teal-400' },
  [NotificationType.TASK_DUE_SOON]: { name: 'schedule', bg: 'bg-amber-100 dark:bg-amber-900/40', color: 'text-amber-600 dark:text-amber-400' },
  [NotificationType.DEADLINE_REMINDER]: { name: 'alarm', bg: 'bg-amber-100 dark:bg-amber-900/40', color: 'text-amber-600 dark:text-amber-400' },
  [NotificationType.PROJECT_INVITATION]: { name: 'folder_shared', bg: 'bg-blue-100 dark:bg-blue-900/40', color: 'text-blue-600 dark:text-blue-400' },
  [NotificationType.PROJECT_MEMBER_JOINED]: { name: 'person_add', bg: 'bg-emerald-100 dark:bg-emerald-900/40', color: 'text-emerald-600 dark:text-emerald-400' },
  [NotificationType.DAILY_DIGEST]: { name: 'summarize', bg: 'bg-blue-100 dark:bg-blue-900/40', color: 'text-blue-600 dark:text-blue-400' },
  [NotificationType.WEEKLY_DIGEST]: { name: 'summarize', bg: 'bg-blue-100 dark:bg-blue-900/40', color: 'text-blue-600 dark:text-blue-400' },
};

const DEFAULT_ICON = { name: 'notifications', bg: 'bg-gray-100 dark:bg-gray-800/40', color: 'text-gray-600 dark:text-gray-400' };

interface NotificationItemProps {
  notification: Notification;
}

export function NotificationItem({ notification }: NotificationItemProps) {
  const { t } = useTranslation();
  const markAsRead = useMarkNotificationAsRead();
  const deleteMutation = useDeleteNotification();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { title, message } = formatNotificationMessage(notification, t);
  const timeAgo = formatTimeAgo(notification.createdAt, t);
  const icon = ICON_MAP[notification.type] || DEFAULT_ICON;

  function handleClick() {
    if (!notification.isRead) {
      markAsRead.mutate(notification.id);
    }
  }

  function handleDelete() {
    deleteMutation.mutate(notification.id, {
      onSuccess: () => setShowDeleteConfirm(false),
    });
  }

  return (
    <>
      <div
        data-testid={`notification-item-${notification.id}`}
        onClick={handleClick}
        className={`group cursor-pointer rounded-xl border p-4 transition-colors ${
          notification.isRead
            ? 'border-border bg-surface hover:bg-muted/50'
            : 'border-primary/20 bg-primary/5 hover:bg-primary/10'
        }`}
      >
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${icon.bg}`}>
            <Icon name={icon.name} size={20} className={icon.color} />
          </div>

          {/* Content */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className={`text-sm ${notification.isRead ? 'font-medium' : 'font-semibold'} text-foreground`}>
                {title}
              </span>
              {!notification.isRead && (
                <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
              )}
            </div>
            {message && (
              <p className="mt-0.5 text-sm text-muted-foreground">{message}</p>
            )}
            <span className="mt-1 block text-xs text-muted-foreground/70">{timeAgo}</span>
          </div>

          {/* Delete button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowDeleteConfirm(true);
            }}
            className="shrink-0 rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
          >
            <Icon name="close" size={16} />
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={showDeleteConfirm}
        title={t('notifications.deleteDialog.title')}
        description={t('notifications.deleteDialog.message')}
        confirmLabel={t('notifications.deleteDialog.delete')}
        variant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </>
  );
}
