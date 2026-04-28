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
  [NotificationType.TASK_ASSIGNED]: { name: 'assignment', bg: 'bg-info/15', color: 'text-info' },
  [NotificationType.TASK_OVERDUE]: { name: 'warning', bg: 'bg-warning/20', color: 'text-warning-foreground' },
  [NotificationType.TASK_COMPLETED]: { name: 'check_circle', bg: 'bg-primary/15', color: 'text-primary' },
  [NotificationType.TASK_COMMENT]: { name: 'chat', bg: 'bg-secondary/15', color: 'text-secondary' },
  [NotificationType.TASK_MENTION]: { name: 'alternate_email', bg: 'bg-info/15', color: 'text-info' },
  [NotificationType.GROUP_MEMBER_JOINED]: { name: 'person_add', bg: 'bg-primary/15', color: 'text-primary' },
  [NotificationType.GROUP_MEMBER_LEFT]: { name: 'person_remove', bg: 'bg-muted', color: 'text-muted-foreground' },
  [NotificationType.GROUP_MEMBER_REMOVED]: { name: 'person_remove', bg: 'bg-destructive/15', color: 'text-destructive' },
  [NotificationType.GROUP_MEMBER_ROLE_CHANGED]: { name: 'manage_accounts', bg: 'bg-secondary/15', color: 'text-secondary' },
  [NotificationType.SYSTEM_ALERT]: { name: 'info', bg: 'bg-muted', color: 'text-muted-foreground' },
  [NotificationType.EVENT_INVITATION]: { name: 'event', bg: 'bg-accent/15', color: 'text-accent' },
  [NotificationType.EVENT_UPDATED]: { name: 'edit_calendar', bg: 'bg-accent/15', color: 'text-accent' },
  [NotificationType.EVENT_CANCELLED]: { name: 'event_busy', bg: 'bg-destructive/15', color: 'text-destructive' },
  [NotificationType.EVENT_RSVP_CHANGED]: { name: 'rsvp', bg: 'bg-accent/15', color: 'text-accent' },
  [NotificationType.TASK_DUE_SOON]: { name: 'schedule', bg: 'bg-warning/20', color: 'text-warning-foreground' },
  [NotificationType.DEADLINE_REMINDER]: { name: 'alarm', bg: 'bg-warning/20', color: 'text-warning-foreground' },
  [NotificationType.PROJECT_INVITATION]: { name: 'folder_shared', bg: 'bg-info/15', color: 'text-info' },
  [NotificationType.PROJECT_MEMBER_JOINED]: { name: 'person_add', bg: 'bg-primary/15', color: 'text-primary' },
  [NotificationType.DAILY_DIGEST]: { name: 'summarize', bg: 'bg-info/15', color: 'text-info' },
  [NotificationType.WEEKLY_DIGEST]: { name: 'summarize', bg: 'bg-info/15', color: 'text-info' },
};

const DEFAULT_ICON = { name: 'notifications', bg: 'bg-muted', color: 'text-muted-foreground' };

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

          {/* Navigable indicator */}
          {route && (
            <Icon name="chevron_right" size={16} className="shrink-0 text-muted-foreground/50" />
          )}

          {/* Delete button — hidden for pending invitations */}
          {!isPendingInvitation && (
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
