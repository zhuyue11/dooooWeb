import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/ui/Icon';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useMarkNotificationAsRead, useDeleteNotification } from '@/hooks/useNotifications';
import { formatNotificationMessage } from '@/lib/notificationFormatter';
import { getNotificationRoute } from '@/lib/notificationRoutes';
import { formatTimeAgo } from '@/lib/timeAgo';
import { NotificationType } from '@/types/api';
import type { Notification } from '@/types/api';

const INVITATION_TYPES = new Set([
  NotificationType.GROUP_INVITATION,
  NotificationType.PROJECT_INVITATION,
]);

const ICON_MAP: Partial<Record<NotificationType, { name: string; bg: string; color: string }>> = {
  [NotificationType.TASK_ASSIGNED]: { name: 'assignment', bg: 'bg-(--el-notif-task-bg)', color: 'text-(--el-notif-task-color)' },
  [NotificationType.TASK_OVERDUE]: { name: 'warning', bg: 'bg-(--el-notif-warning-bg)', color: 'text-(--el-notif-warning-color)' },
  [NotificationType.TASK_COMPLETED]: { name: 'check_circle', bg: 'bg-(--el-notif-success-bg)', color: 'text-(--el-notif-success-color)' },
  [NotificationType.TASK_COMMENT]: { name: 'chat', bg: 'bg-(--el-notif-task-bg)', color: 'text-(--el-notif-task-color)' },
  [NotificationType.TASK_MENTION]: { name: 'alternate_email', bg: 'bg-(--el-notif-task-bg)', color: 'text-(--el-notif-task-color)' },
  [NotificationType.GROUP_MEMBER_JOINED]: { name: 'person_add', bg: 'bg-(--el-notif-success-bg)', color: 'text-(--el-notif-success-color)' },
  [NotificationType.GROUP_MEMBER_LEFT]: { name: 'person_remove', bg: 'bg-(--el-notif-neutral-bg)', color: 'text-(--el-notif-neutral-color)' },
  [NotificationType.GROUP_MEMBER_REMOVED]: { name: 'person_remove', bg: 'bg-(--el-notif-danger-bg)', color: 'text-(--el-notif-danger-color)' },
  [NotificationType.GROUP_MEMBER_ROLE_CHANGED]: { name: 'manage_accounts', bg: 'bg-(--el-notif-task-bg)', color: 'text-(--el-notif-task-color)' },
  [NotificationType.SYSTEM_ALERT]: { name: 'info', bg: 'bg-(--el-notif-neutral-bg)', color: 'text-(--el-notif-neutral-color)' },
  [NotificationType.EVENT_INVITATION]: { name: 'event', bg: 'bg-(--el-notif-event-bg)', color: 'text-(--el-notif-event-color)' },
  [NotificationType.EVENT_UPDATED]: { name: 'edit_calendar', bg: 'bg-(--el-notif-event-bg)', color: 'text-(--el-notif-event-color)' },
  [NotificationType.EVENT_CANCELLED]: { name: 'event_busy', bg: 'bg-(--el-notif-danger-bg)', color: 'text-(--el-notif-danger-color)' },
  [NotificationType.EVENT_RSVP_CHANGED]: { name: 'rsvp', bg: 'bg-(--el-notif-event-bg)', color: 'text-(--el-notif-event-color)' },
  [NotificationType.TASK_DUE_SOON]: { name: 'schedule', bg: 'bg-(--el-notif-warning-bg)', color: 'text-(--el-notif-warning-color)' },
  [NotificationType.DEADLINE_REMINDER]: { name: 'alarm', bg: 'bg-(--el-notif-warning-bg)', color: 'text-(--el-notif-warning-color)' },
  [NotificationType.PROJECT_INVITATION]: { name: 'folder_shared', bg: 'bg-(--el-notif-task-bg)', color: 'text-(--el-notif-task-color)' },
  [NotificationType.PROJECT_MEMBER_JOINED]: { name: 'person_add', bg: 'bg-(--el-notif-success-bg)', color: 'text-(--el-notif-success-color)' },
  [NotificationType.DAILY_DIGEST]: { name: 'summarize', bg: 'bg-(--el-notif-task-bg)', color: 'text-(--el-notif-task-color)' },
  [NotificationType.WEEKLY_DIGEST]: { name: 'summarize', bg: 'bg-(--el-notif-task-bg)', color: 'text-(--el-notif-task-color)' },
};

const DEFAULT_ICON = { name: 'notifications', bg: 'bg-(--el-notif-neutral-bg)', color: 'text-(--el-notif-neutral-color)' };

interface NotificationItemProps {
  notification: Notification;
}

export function NotificationItem({ notification }: NotificationItemProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const markAsRead = useMarkNotificationAsRead();
  const deleteMutation = useDeleteNotification();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { title, message } = formatNotificationMessage(notification, t);
  const timeAgo = formatTimeAgo(notification.createdAt, t);
  const icon = ICON_MAP[notification.type] || DEFAULT_ICON;
  const route = getNotificationRoute(notification);
  const isPendingInvitation = INVITATION_TYPES.has(notification.type);

  function handleClick() {
    if (!notification.isRead) {
      markAsRead.mutate(notification.id);
    }
    if (route) {
      navigate(route);
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
        className={`group cursor-pointer rounded-(--radius-card) border p-(--spacing-card) transition-colors ${
          notification.isRead
            ? 'border-(--el-notif-read-border) bg-(--el-notif-read-bg) hover:bg-(--el-settings-hover)'
            : 'border-(--el-notif-unread-border) bg-(--el-notif-unread-bg) hover:bg-(--el-notif-unread-bg)'
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
              <span className={`text-sm ${notification.isRead ? 'font-medium' : 'font-semibold'} text-(--el-notif-title)`}>
                {title}
              </span>
              {!notification.isRead && (
                <span className="h-2 w-2 shrink-0 rounded-full bg-(--el-notif-dot)" />
              )}
            </div>
            {message && (
              <p className="mt-0.5 text-sm text-(--el-notif-message)">{message}</p>
            )}
            <span className="mt-1 block text-xs text-(--el-notif-time)">{timeAgo}</span>
          </div>

          {/* Navigable indicator */}
          {route && (
            <Icon name="chevron_right" size={16} className="shrink-0 text-(--el-notif-time)" />
          )}

          {/* Delete button — hidden for pending invitations */}
          {!isPendingInvitation && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowDeleteConfirm(true);
              }}
              className="shrink-0 rounded p-1 text-(--el-notif-message) opacity-0 transition-opacity hover:text-(--el-notif-title) group-hover:opacity-100"
            >
              <Icon name="close" size={16} />
            </button>
          )}
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
