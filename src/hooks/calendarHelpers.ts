import type { Task, Event } from '@/types/api';
import type { CalendarItem, ParticipantSummary } from './useWeekCalendar';
import { toISODate } from '@/utils/date';

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

export function taskToCalendarItem(task: Task): CalendarItem {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    date: task.date!,
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
