import { NotificationType } from './api';

export interface NotificationDataMap {
  TASK_ASSIGNED: {
    taskId: string;
    taskTitle: string;
    assignedByUserId: string;
    assignedByName: string | null;
  };

  TASK_OVERDUE: {
    taskId: string;
    taskTitle: string;
    dueDate: string;
    hoursOverdue: number;
  };

  TASK_COMPLETED: {
    taskId: string;
    taskTitle: string;
    completedAt: string;
  };

  TASK_COMMENT: {
    taskId: string;
    taskTitle: string;
    commentId: string;
    commentContent: string;
    commentedByUserId: string;
    commentedByName: string;
  };

  TASK_MENTION: {
    taskId: string;
    taskTitle: string;
    commentId: string;
    commentContent: string;
    mentionedByUserId: string;
    mentionedByName: string;
  };

  PROJECT_INVITATION: {
    projectId: string;
    projectName: string;
    invitedByUserId: string;
    invitedByName: string;
    role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
    invitationId: string;
  };

  GROUP_INVITATION: {
    groupId: string;
    groupName: string;
    invitedByUserId: string;
    invitedByName: string;
    role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
    invitationId: string;
  };

  PROJECT_MEMBER_JOINED: {
    projectId: string;
    projectName: string;
    newMemberId: string;
    newMemberName: string;
  };

  GROUP_MEMBER_JOINED: {
    groupId: string;
    groupName: string;
    newMemberId: string;
    newMemberName: string;
  };

  GROUP_MEMBER_LEFT: {
    groupId: string;
    groupName: string;
    leftMemberId: string;
    leftMemberName: string;
    isLastMember: boolean;
  };

  GROUP_MEMBER_REMOVED: {
    groupId: string;
    groupName: string;
    removedBy: string;
    removedByName: string;
  };

  GROUP_MEMBER_ROLE_CHANGED: {
    groupId: string;
    groupName: string;
    newRole: string;
    changedByUserId: string;
    changedByName: string;
  };

  DAILY_DIGEST: {
    type: 'daily';
    summary: {
      total: number;
      byType: Record<string, number>;
    };
    notifications?: any[];
  };

  WEEKLY_DIGEST: {
    type: 'weekly';
    summary: {
      total: number;
      byType: Record<string, number>;
    };
    notifications?: any[];
  };

  SYSTEM_ALERT: {
    customTitle?: string;
    customMessage?: string;
    translationKey?: string;
    groupId?: string;
    groupName?: string;
    declinedUserName?: string;
    [key: string]: any;
  };

  EVENT_INVITATION: {
    eventId: string;
    eventTitle: string;
    invitedByName: string;
    invitedByUserId: string;
  };

  EVENT_UPDATED: {
    eventId: string;
    eventTitle: string;
    updatedByUserId: string;
  };

  EVENT_CANCELLED: {
    eventId: string;
    eventTitle: string;
    cancelledByUserId: string;
  };

  EVENT_RSVP_CHANGED: {
    eventId: string;
    eventTitle: string;
    guestName: string;
    guestUserId: string;
    responseStatus: string;
  };
}

export type NotificationData<T extends NotificationType = NotificationType> =
  T extends keyof NotificationDataMap ? NotificationDataMap[T] : any;

export type TypedNotificationData<T extends NotificationType> =
  T extends keyof NotificationDataMap ? NotificationDataMap[T] : never;
