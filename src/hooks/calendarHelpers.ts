import type { Task, Event, EventInstance } from '@/types/api';
import type { CalendarItem, ParticipantSummary } from '@/types/calendar';
import { toISODate } from '@/utils/date';

/**
 * Whether a calendar item should render as "completed" (dimmed + strikethrough).
 * Events are never completed. Group activities check participant completion.
 */
export function isItemChecked(item: CalendarItem): boolean {
  if (item.itemType === 'EVENT') return false;
  if (item.isForAllMembers) {
    return item.participantInstanceStatus === 'COMPLETED';
  }
  return item.isCompleted;
}

/**
 * Enrich a CalendarItem with group name + participant status for the current user.
 * Shared by useCalendar and HomePage.
 */
export function enrichCalendarItem(
  item: CalendarItem,
  task: Task | undefined,
  currentUserId: string | undefined,
  groupNameMap?: Record<string, string>,
): CalendarItem {
  const enriched = { ...item };
  if (enriched.groupId && groupNameMap) {
    enriched.groupName = groupNameMap[enriched.groupId];
  }
  if (task?.isForAllMembers && currentUserId) {
    const pi = task.participantInstances?.find((p) => p.participantUserId === currentUserId);
    if (pi) {
      enriched.participantInstanceStatus = pi.status;
    } else {
      const p = task.participants?.find((p) => p.userId === currentUserId);
      enriched.participantInstanceStatus = p?.status;
    }
  }
  if (task?.user?.name) {
    enriched.creatorName = task.user.name;
  }
  return enriched;
}

// ── Participant summary (per-date, for recurring "for all members" group tasks) ──

/**
 * Compute participant summary for a specific instance date.
 * Ported 1:1 from dooooApp/utils/participantHelpers.ts:computeParticipantSummaryForDate.
 *
 * Rules (in order):
 *   1. TaskParticipantInstance records keyed to this date take precedence.
 *   2. TaskParticipant (Join All) applies to dates on/after startParticipateTime,
 *      unless already overridden by a per-date instance.
 *   3. LEFT status with stoppedParticipatingAt: dates on/before that stop date
 *      are treated as CONFIRMED; later dates stay LEFT.
 *   4. DECLINED applies to all dates.
 */
export function computeParticipantSummaryForDate(
  task: Task,
  instanceDate: Date,
): ParticipantSummary | undefined {
  if (!task.isForAllMembers) return undefined;

  const instanceDateStr = toISODate(instanceDate);
  const userStatusMap = new Map<string, { status: string }>();

  if (task.participantInstances) {
    for (const pi of task.participantInstances as Array<{
      participantUserId?: string;
      status: string;
      taskInstance?: { date?: string };
    }>) {
      const userId = pi.participantUserId;
      if (!userId) continue;
      if (pi.taskInstance?.date) {
        const piDate = new Date(pi.taskInstance.date);
        if (toISODate(piDate) === instanceDateStr) {
          userStatusMap.set(userId, { status: pi.status });
        }
      }
    }
  }

  if (task.participants) {
    for (const p of task.participants as Array<{
      userId: string;
      status: string;
      startParticipateTime?: string | null;
      stoppedParticipatingAt?: string | null;
    }>) {
      const userId = p.userId;
      if (!userId) continue;
      if (userStatusMap.has(userId)) continue;

      if (p.status === 'DECLINED') {
        userStatusMap.set(userId, { status: 'DECLINED' });
        continue;
      }

      if (p.startParticipateTime) {
        const startDateStr = toISODate(new Date(p.startParticipateTime));
        if (startDateStr <= instanceDateStr) {
          let effectiveStatus = p.status;
          if (p.status === 'LEFT' && p.stoppedParticipatingAt) {
            const stoppedDateStr = toISODate(new Date(p.stoppedParticipatingAt));
            if (instanceDateStr <= stoppedDateStr) {
              effectiveStatus = 'CONFIRMED';
            }
          }
          userStatusMap.set(userId, { status: effectiveStatus });
        }
      }
    }
  }

  let goingCount = 0;
  let notGoingCount = 0;
  let completedCount = 0;
  for (const { status } of userStatusMap.values()) {
    if (status === 'CONFIRMED') goingCount++;
    else if (status === 'COMPLETED') {
      goingCount++;
      completedCount++;
    } else if (status === 'DECLINED' || status === 'LEFT') notGoingCount++;
  }

  if (goingCount === 0 && notGoingCount === 0) return undefined;
  return { goingCount, notGoingCount, completedCount };
}

// ── Participant summary (matches dooooApp's computeParticipantSummary) ──

export function computeParticipantSummary(task: Task): ParticipantSummary {
  const summary: ParticipantSummary = { goingCount: 0, notGoingCount: 0, completedCount: 0 };
  const seen = new Set<string>();

  if (task.participantInstances) {
    for (const pi of task.participantInstances) {
      if (seen.has(pi.participantUserId)) continue;
      seen.add(pi.participantUserId);
      if (pi.isCompleted) summary.completedCount++;
      else if (pi.status === 'CONFIRMED') summary.goingCount++;
      else if (pi.status === 'DECLINED' || pi.status === 'LEFT') summary.notGoingCount++;
    }
  }

  if (task.participants) {
    for (const p of task.participants) {
      if (seen.has(p.userId)) continue;
      seen.add(p.userId);
      if (p.status === 'CONFIRMED') summary.goingCount++;
      else if (p.status === 'DECLINED' || p.status === 'LEFT') summary.notGoingCount++;
    }
  }

  return summary;
}

// ── Convert tasks/events to CalendarItems ──

export function taskToCalendarItem(task: Task, displayDate?: string): CalendarItem {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    // Display date — caller may override with completedAt for no-date completed tasks
    date: displayDate ?? task.date ?? '',
    hasTime: !!task.hasTime,
    timeOfDay: task.timeOfDay,
    itemType: 'TASK',
    isCompleted: task.isCompleted,
    completedAt: task.completedAt,
    status: task.status,
    priority: task.priority,
    categoryId: task.categoryId,
    dateType: task.dateType,
    duration: task.duration,
    repeat: task.repeat,
    originalTaskId: task.originalTaskId,
    userId: task.userId,
    assigneeId: task.assigneeId,
    assigneeName: task.assignee?.name,
    groupId: task.groupId,
    isForAllMembers: task.isForAllMembers,
    trackCompletion: task.trackCompletion,
    participantSummary: task.isForAllMembers ? computeParticipantSummary(task) : undefined,
    participantInstances: task.participantInstances as CalendarItem['participantInstances'],
    participants: task.participants as CalendarItem['participants'],
    location: task.location,
    locationAddress: task.locationAddress,
    firstReminderMinutes: task.firstReminderMinutes,
    secondReminderMinutes: task.secondReminderMinutes,
    planId: task.planId,
    planName: task.plan?.name,
    showInTodoWhenOverdue: task.showInTodoWhenOverdue,
    sourceTask: task,
  };
}

export function eventToCalendarItem(event: Event): CalendarItem {
  return {
    id: `event-${event.id}`,
    title: event.title,
    description: event.description ?? undefined,
    date: event.date!,
    hasTime: !!event.hasTime,
    itemType: 'EVENT',
    isCompleted: false,
    priority: event.priority ?? undefined,
    duration: event.duration,
    repeat: event.repeat,
    groupId: event.groupId ?? undefined,
    location: event.location,
    locationAddress: event.locationAddress,
    endDate: event.endDate,
    guests: event.guests,
    meetingLink: event.meetingLink,
    eventStatus: event.status,
    googleCalendarEventId: event.googleCalendarEventId,
    firstReminderMinutes: event.firstReminderMinutes,
    secondReminderMinutes: event.secondReminderMinutes,
    sourceEvent: event,
  };
}

export function eventInstanceToCalendarItem(instance: EventInstance, parentEvent?: Event): CalendarItem {
  // Use the parent event for fields that the instance doesn't override (e.g. repeat, groupId)
  const merged: CalendarItem = {
    id: `event-instance-${instance.id}`,
    title: instance.title,
    description: instance.description ?? undefined,
    date: instance.date,
    hasTime: !!instance.hasTime,
    itemType: 'EVENT',
    isCompleted: instance.status === 'COMPLETED',
    priority: instance.priority ?? undefined,
    duration: instance.duration ?? undefined,
    repeat: parentEvent?.repeat,
    groupId: parentEvent?.groupId ?? undefined,
    location: instance.location ?? parentEvent?.location,
    locationAddress: instance.locationAddress ?? parentEvent?.locationAddress,
    endDate: instance.endDate ?? undefined,
    guests: instance.guests ?? parentEvent?.guests,
    meetingLink: instance.meetingLink ?? parentEvent?.meetingLink,
    eventStatus: instance.eventStatus,
    googleCalendarEventId: instance.googleCalendarEventId ?? undefined,
    firstReminderMinutes: instance.firstReminderMinutes ?? parentEvent?.firstReminderMinutes,
    secondReminderMinutes: instance.secondReminderMinutes ?? parentEvent?.secondReminderMinutes,
    sourceEvent: parentEvent,
    isInstance: true,
    eventId: instance.eventId,
  };
  return merged;
}

// ── Sort helpers ──

export function sortByTime(a: CalendarItem, b: CalendarItem): number {
  if (a.hasTime && !b.hasTime) return -1;
  if (!a.hasTime && b.hasTime) return 1;
  if (a.hasTime && b.hasTime) {
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  }
  return a.title.localeCompare(b.title);
}

export function sortByDateThenTime(a: CalendarItem, b: CalendarItem): number {
  const dayA = toISODate(new Date(a.date));
  const dayB = toISODate(new Date(b.date));
  if (dayA !== dayB) return dayA.localeCompare(dayB);
  return sortByTime(a, b);
}
