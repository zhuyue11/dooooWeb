import { NotificationType } from '@/types/api';
import type { Notification } from '@/types/api';
import type { NotificationDataMap } from '@/types/notifications';

/**
 * Maps a notification to its target route based on entity IDs in notification.data.
 * Returns null for non-navigable types (invitations handled by GroupInvitationCard,
 * digests with no entity, project types with no web routes).
 */
export function getNotificationRoute(notification: Notification): string | null {
  const { type, data } = notification;

  switch (type) {
    // Task notifications → item view
    case NotificationType.TASK_ASSIGNED:
    case NotificationType.TASK_OVERDUE:
    case NotificationType.TASK_COMPLETED:
    case NotificationType.TASK_COMMENT:
    case NotificationType.TASK_MENTION:
    case NotificationType.TASK_DUE_SOON:
    case NotificationType.DEADLINE_REMINDER: {
      const d = data as NotificationDataMap['TASK_ASSIGNED'];
      return d.taskId ? `/items/${d.taskId}` : null;
    }

    // Event notifications → item view with type=event
    case NotificationType.EVENT_INVITATION:
    case NotificationType.EVENT_UPDATED:
    case NotificationType.EVENT_CANCELLED:
    case NotificationType.EVENT_RSVP_CHANGED: {
      const d = data as NotificationDataMap['EVENT_INVITATION'];
      return d.eventId ? `/items/${d.eventId}?type=event` : null;
    }

    // Group member notifications → group detail
    case NotificationType.GROUP_MEMBER_JOINED:
    case NotificationType.GROUP_MEMBER_LEFT:
    case NotificationType.GROUP_MEMBER_REMOVED:
    case NotificationType.GROUP_MEMBER_ROLE_CHANGED: {
      const d = data as NotificationDataMap['GROUP_MEMBER_JOINED'];
      return d.groupId ? `/groups/${d.groupId}` : null;
    }

    // System alert — navigate to group if groupId present
    case NotificationType.SYSTEM_ALERT: {
      const d = data as NotificationDataMap['SYSTEM_ALERT'];
      return d.groupId ? `/groups/${d.groupId}` : null;
    }

    // Non-navigable: invitations (handled by GroupInvitationCard), projects (no routes), digests
    case NotificationType.GROUP_INVITATION:
    case NotificationType.PROJECT_INVITATION:
    case NotificationType.PROJECT_MEMBER_JOINED:
    case NotificationType.DAILY_DIGEST:
    case NotificationType.WEEKLY_DIGEST:
    default:
      return null;
  }
}
