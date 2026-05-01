import type { Task, Event } from './api';

export interface ParticipantSummary {
  goingCount: number;
  notGoingCount: number;
  completedCount: number;
}

/**
 * Unified calendar display type — matches dooooApp's CalendarTaskItem.
 * Uses ISO strings instead of timestamps (web is online-only, no SQLite).
 */
export interface CalendarItem {
  id: string;
  title: string;
  description?: string;
  date: string; // ISO date string
  hasTime: boolean;
  timeOfDay?: 'MORNING' | 'AFTERNOON' | 'EVENING' | null;
  itemType: 'TASK' | 'EVENT';
  isCompleted: boolean;
  completedAt?: string | null;
  status?: string;
  priority?: string;
  categoryId?: string;
  dateType?: 'SCHEDULED' | 'DUE';
  duration?: number | null;
  // Recurrence
  repeat?: unknown;
  isInstance?: boolean;
  isFirstInstance?: boolean;
  taskId?: string; // parent task for instances
  eventId?: string; // parent event for event instances
  instanceStatus?: string;
  originalTaskId?: string;
  isContinuation?: boolean;
  // Owner / assignee
  userId?: string;
  assigneeId?: string | null;
  assigneeName?: string | null;
  creatorName?: string;
  // Group fields
  groupId?: string;
  groupName?: string;
  isForAllMembers?: boolean;
  trackCompletion?: boolean;
  parentTaskIsCompleted?: boolean;
  participantInstanceStatus?: string;
  participantSummary?: ParticipantSummary;
  participantInstances?: Array<{
    id: string;
    participantUserId: string;
    status: string;
    completedAt?: string;
    participantUser?: { id: string; name?: string; avatar?: string | null };
  }>;
  participants?: Array<{
    id: string;
    taskId: string;
    userId: string;
    status: string;
    user?: { id: string; name: string; avatar?: string | null };
  }>;
  // Location
  location?: string | null;
  locationAddress?: string | null;
  // Event-specific
  endDate?: string | null;
  guests?: Array<{ email: string; name?: string }> | null;
  meetingLink?: string | null;
  eventStatus?: 'CONFIRMED' | 'TENTATIVE' | 'CANCELLED';
  googleCalendarEventId?: string | null;
  // Reminders
  firstReminderMinutes?: number | null;
  secondReminderMinutes?: number | null;
  // Plan
  planId?: string;
  planName?: string;
  // Flags
  showInTodoWhenOverdue?: boolean;
  isNoDate?: boolean;
  // Source references
  sourceTask?: Task;
  sourceEvent?: Event;
}
