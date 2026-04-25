import type { TFunction } from 'i18next';
import type { Notification } from '@/types/api';
import { NotificationType } from '@/types/api';
import type { NotificationDataMap } from '@/types/notifications';

export const formatNotificationMessage = (
  notification: Notification,
  t: TFunction
): { title: string; message: string } => {
  const { type, data } = notification;

  if (!data || Object.keys(data).length === 0) {
    return { title: '', message: '' };
  }

  try {
    switch (type) {
      case NotificationType.TASK_ASSIGNED:
        return formatTaskAssigned(data, t);
      case NotificationType.TASK_OVERDUE:
        return formatTaskOverdue(data, t);
      case NotificationType.TASK_COMPLETED:
        return formatTaskCompleted(data, t);
      case NotificationType.TASK_COMMENT:
        return formatTaskComment(data, t);
      case NotificationType.TASK_MENTION:
        return formatTaskMention(data, t);
      case NotificationType.PROJECT_INVITATION:
        return formatProjectInvitation(data, t);
      case NotificationType.GROUP_INVITATION:
        return formatGroupInvitation(data, t);
      case NotificationType.PROJECT_MEMBER_JOINED:
        return formatProjectMemberJoined(data, t);
      case NotificationType.GROUP_MEMBER_JOINED:
        return formatGroupMemberJoined(data, t);
      case NotificationType.GROUP_MEMBER_LEFT:
        return formatGroupMemberLeft(data, t);
      case NotificationType.GROUP_MEMBER_REMOVED:
        return formatGroupMemberRemoved(data, t);
      case NotificationType.GROUP_MEMBER_ROLE_CHANGED:
        return formatGroupMemberRoleChanged(data, t);
      case NotificationType.DAILY_DIGEST:
        return formatDailyDigest(data, t);
      case NotificationType.WEEKLY_DIGEST:
        return formatWeeklyDigest(data, t);
      case NotificationType.SYSTEM_ALERT:
        return formatSystemAlert(data, t);
      case NotificationType.EVENT_INVITATION:
        return {
          title: t('notifications.types.EVENT_INVITATION.title', { defaultValue: 'Event Invitation' }),
          message: t('notifications.types.EVENT_INVITATION.message', {
            defaultValue: '{{invitedByName}} invited you to "{{eventTitle}}"',
            invitedByName: data.invitedByName || 'Someone',
            eventTitle: data.eventTitle || 'an event',
          }),
        };
      case NotificationType.EVENT_UPDATED:
        return {
          title: t('notifications.types.EVENT_UPDATED.title', { defaultValue: 'Event Updated' }),
          message: t('notifications.types.EVENT_UPDATED.message', {
            defaultValue: '"{{eventTitle}}" has been updated',
            eventTitle: data.eventTitle || 'An event',
          }),
        };
      case NotificationType.EVENT_CANCELLED:
        return {
          title: t('notifications.types.EVENT_CANCELLED.title', { defaultValue: 'Event Cancelled' }),
          message: t('notifications.types.EVENT_CANCELLED.message', {
            defaultValue: '"{{eventTitle}}" has been cancelled',
            eventTitle: data.eventTitle || 'An event',
          }),
        };
      case NotificationType.EVENT_RSVP_CHANGED:
        return {
          title: t('notifications.types.EVENT_RSVP_CHANGED.title', { defaultValue: 'RSVP Updated' }),
          message: t('notifications.types.EVENT_RSVP_CHANGED.message', {
            defaultValue: '{{guestName}} {{responseStatus}} "{{eventTitle}}"',
            guestName: data.guestName || 'Someone',
            responseStatus: (data.responseStatus || 'responded to').toLowerCase(),
            eventTitle: data.eventTitle || 'your event',
          }),
        };
      default:
        return {
          title: t('notifications.types.default.title', { defaultValue: 'Notification' }),
          message: t('notifications.types.default.message', { defaultValue: '' }),
        };
    }
  } catch (error) {
    console.error('Error formatting notification:', error, notification);
    return { title: '', message: '' };
  }
};

function formatTaskAssigned(
  data: NotificationDataMap['TASK_ASSIGNED'],
  t: TFunction
): { title: string; message: string } {
  const assignedByName =
    data.assignedByName || t('notifications.common.teamMember', { defaultValue: 'a team member' });
  return {
    title: t('notifications.types.TASK_ASSIGNED.title', { defaultValue: 'New Task Assigned' }),
    message: t('notifications.types.TASK_ASSIGNED.message', {
      taskTitle: data.taskTitle,
      assignedByName,
      defaultValue: 'You have been assigned a new task: "{{taskTitle}}" by {{assignedByName}}',
    }),
  };
}

function formatTaskOverdue(
  data: NotificationDataMap['TASK_OVERDUE'],
  t: TFunction
): { title: string; message: string } {
  const hours = Math.round(data.hoursOverdue);
  return {
    title: t('notifications.types.TASK_OVERDUE.title', { defaultValue: 'Task Overdue' }),
    message: t('notifications.types.TASK_OVERDUE.message', {
      taskTitle: data.taskTitle,
      hours,
      defaultValue: 'Your task "{{taskTitle}}" is overdue by {{hours}} hours',
    }),
  };
}

function formatTaskCompleted(
  data: NotificationDataMap['TASK_COMPLETED'],
  t: TFunction
): { title: string; message: string } {
  return {
    title: t('notifications.types.TASK_COMPLETED.title', { defaultValue: 'Task Completed' }),
    message: t('notifications.types.TASK_COMPLETED.message', {
      taskTitle: data.taskTitle,
      defaultValue: 'Congratulations! You completed the task "{{taskTitle}}"',
    }),
  };
}

function formatTaskComment(
  data: NotificationDataMap['TASK_COMMENT'],
  t: TFunction
): { title: string; message: string } {
  return {
    title: t('notifications.types.TASK_COMMENT.title', { defaultValue: 'New Comment on Task' }),
    message: t('notifications.types.TASK_COMMENT.message', {
      userName: data.commentedByName,
      taskTitle: data.taskTitle,
      defaultValue: '{{userName}} commented on your task "{{taskTitle}}"',
    }),
  };
}

function formatTaskMention(
  data: NotificationDataMap['TASK_MENTION'],
  t: TFunction
): { title: string; message: string } {
  return {
    title: t('notifications.types.TASK_MENTION.title', { defaultValue: 'You were mentioned' }),
    message: t('notifications.types.TASK_MENTION.message', {
      userName: data.mentionedByName,
      taskTitle: data.taskTitle,
      defaultValue: '{{userName}} mentioned you in a comment on task "{{taskTitle}}"',
    }),
  };
}

function formatProjectInvitation(
  data: NotificationDataMap['PROJECT_INVITATION'],
  t: TFunction
): { title: string; message: string } {
  return {
    title: t('notifications.types.PROJECT_INVITATION.title', { defaultValue: 'Project Invitation' }),
    message: t('notifications.types.PROJECT_INVITATION.message', {
      userName: data.invitedByName,
      projectName: data.projectName,
      defaultValue: '{{userName}} invited you to join the project "{{projectName}}"',
    }),
  };
}

function formatGroupInvitation(
  data: NotificationDataMap['GROUP_INVITATION'],
  t: TFunction
): { title: string; message: string } {
  return {
    title: t('notifications.types.GROUP_INVITATION.title', { defaultValue: 'Group Invitation' }),
    message: t('notifications.types.GROUP_INVITATION.message', {
      userName: data.invitedByName,
      groupName: data.groupName,
      defaultValue: '{{userName}} invited you to join the group "{{groupName}}"',
    }),
  };
}

function formatProjectMemberJoined(
  data: NotificationDataMap['PROJECT_MEMBER_JOINED'],
  t: TFunction
): { title: string; message: string } {
  return {
    title: t('notifications.types.PROJECT_MEMBER_JOINED.title', { defaultValue: 'New Project Member' }),
    message: t('notifications.types.PROJECT_MEMBER_JOINED.message', {
      userName: data.newMemberName,
      projectName: data.projectName,
      defaultValue: '{{userName}} joined your project "{{projectName}}"',
    }),
  };
}

function formatGroupMemberJoined(
  data: NotificationDataMap['GROUP_MEMBER_JOINED'],
  t: TFunction
): { title: string; message: string } {
  return {
    title: t('notifications.types.GROUP_MEMBER_JOINED.title'),
    message: t('notifications.types.GROUP_MEMBER_JOINED.message', {
      userName: data.newMemberName,
      groupName: data.groupName,
    }),
  };
}

function formatGroupMemberLeft(
  data: NotificationDataMap['GROUP_MEMBER_LEFT'],
  t: TFunction
): { title: string; message: string } {
  return {
    title: t('notifications.types.GROUP_MEMBER_LEFT.title'),
    message: data.isLastMember
      ? t('notifications.types.GROUP_MEMBER_LEFT.messageLastMember', {
          userName: data.leftMemberName,
          groupName: data.groupName,
        })
      : t('notifications.types.GROUP_MEMBER_LEFT.message', {
          userName: data.leftMemberName,
          groupName: data.groupName,
        }),
  };
}

function formatGroupMemberRemoved(
  data: NotificationDataMap['GROUP_MEMBER_REMOVED'],
  t: TFunction
): { title: string; message: string } {
  return {
    title: t('notifications.types.GROUP_MEMBER_REMOVED.title'),
    message: t('notifications.types.GROUP_MEMBER_REMOVED.message', {
      removedByName: data.removedByName,
      groupName: data.groupName,
    }),
  };
}

function formatGroupMemberRoleChanged(
  data: NotificationDataMap['GROUP_MEMBER_ROLE_CHANGED'],
  t: TFunction
): { title: string; message: string } {
  const roleKey = data.newRole.charAt(0).toUpperCase() + data.newRole.slice(1).toLowerCase();
  const roleName = t(`groups.inviteModalRole${roleKey}`);
  return {
    title: t('notifications.types.GROUP_MEMBER_ROLE_CHANGED.title'),
    message: t('notifications.types.GROUP_MEMBER_ROLE_CHANGED.message', {
      changedByName: data.changedByName,
      groupName: data.groupName,
      newRole: roleName,
    }),
  };
}

function formatDailyDigest(
  data: NotificationDataMap['DAILY_DIGEST'],
  t: TFunction
): { title: string; message: string } {
  const total = data.summary?.total || 0;
  return {
    title: t('notifications.types.DAILY_DIGEST.title', { defaultValue: 'Daily Task Summary' }),
    message: t('notifications.types.DAILY_DIGEST.message', {
      count: total,
      defaultValue: 'You have {{count}} notifications from today',
    }),
  };
}

function formatWeeklyDigest(
  data: NotificationDataMap['WEEKLY_DIGEST'],
  t: TFunction
): { title: string; message: string } {
  const total = data.summary?.total || 0;
  return {
    title: t('notifications.types.WEEKLY_DIGEST.title', { defaultValue: 'Weekly Task Summary' }),
    message: t('notifications.types.WEEKLY_DIGEST.message', {
      count: total,
      defaultValue: 'You have {{count}} notifications from this week',
    }),
  };
}

function formatSystemAlert(
  data: NotificationDataMap['SYSTEM_ALERT'],
  t: TFunction
): { title: string; message: string } {
  if (data.translationKey) {
    return {
      title: t(`notifications.types.${data.translationKey}.title`, { defaultValue: 'System Alert' }),
      message: t(`notifications.types.${data.translationKey}.message`, { ...data, defaultValue: '' }),
    };
  }
  return {
    title: data.customTitle || t('notifications.types.SYSTEM_ALERT.title', { defaultValue: 'System Alert' }),
    message: data.customMessage || t('notifications.types.SYSTEM_ALERT.message', { defaultValue: '' }),
  };
}
