import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDisplay } from '@/lib/contexts/display-context';
import { getTasks, getAssignedGroupTasks, getEvents, getAttendingEvents, getUserEventInstances } from '@/lib/api';
import { startOfWeek, getWeekDates, toISODate, isSameDay } from '@/utils/date';
import type { Task, Event } from '@/types/api';
import type { WeekStartDay } from '@/utils/date';

// ── CalendarItem: unified display type (matches dooooApp's CalendarTaskItem) ──

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
  // Source references
  sourceTask?: Task;
  sourceEvent?: Event;
}

// ── Participant summary computation (matches dooooApp's computeParticipantSummary) ──

function computeParticipantSummary(task: Task): ParticipantSummary {
  const summary: ParticipantSummary = { goingCount: 0, notGoingCount: 0, completedCount: 0 };
  const seen = new Set<string>();

  // participantInstances take precedence (per dooooApp logic)
  if (task.participantInstances) {
    for (const pi of task.participantInstances) {
      if (seen.has(pi.participantUserId)) continue;
      seen.add(pi.participantUserId);
      if (pi.isCompleted) summary.completedCount++;
      else if (pi.status === 'CONFIRMED') summary.goingCount++;
      else if (pi.status === 'DECLINED' || pi.status === 'LEFT') summary.notGoingCount++;
    }
  }

  // Fall back to participants (Join All) for users not in participantInstances
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

function taskToCalendarItem(task: Task): CalendarItem {
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
    // Owner / assignee
    userId: task.userId,
    assigneeId: task.assigneeId,
    assigneeName: task.assignee?.name,
    // Group
    groupId: task.groupId,
    isForAllMembers: task.isForAllMembers,
    trackCompletion: task.trackCompletion,
    participantSummary: task.isForAllMembers ? computeParticipantSummary(task) : undefined,
    participantInstances: task.participantInstances as CalendarItem['participantInstances'],
    participants: task.participants as CalendarItem['participants'],
    // Location
    location: task.location,
    locationAddress: task.locationAddress,
    // Reminders
    firstReminderMinutes: task.firstReminderMinutes,
    secondReminderMinutes: task.secondReminderMinutes,
    // Plan
    planId: task.planId,
    planName: task.plan?.name,
    // Flags
    showInTodoWhenOverdue: task.showInTodoWhenOverdue,
    sourceTask: task,
  };
}

function eventToCalendarItem(event: Event): CalendarItem {
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
    // Group
    groupId: event.groupId ?? undefined,
    // Location
    location: event.location,
    locationAddress: event.locationAddress,
    // Event-specific
    endDate: event.endDate,
    guests: event.guests,
    meetingLink: event.meetingLink,
    eventStatus: event.status,
    googleCalendarEventId: event.googleCalendarEventId,
    // Reminders
    firstReminderMinutes: event.firstReminderMinutes,
    secondReminderMinutes: event.secondReminderMinutes,
    sourceEvent: event,
  };
}

// ── Sort helpers (matching dooooApp's sortByTime / sortByDateThenTime) ──

/** Sort within a single day: timed first (by clock time), then untimed (alphabetical). */
function sortByTime(a: CalendarItem, b: CalendarItem): number {
  if (a.hasTime && !b.hasTime) return -1;
  if (!a.hasTime && b.hasTime) return 1;
  if (a.hasTime && b.hasTime) {
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  }
  return a.title.localeCompare(b.title);
}

/** Sort across multiple days: by calendar date first, then by time within the same day. */
function sortByDateThenTime(a: CalendarItem, b: CalendarItem): number {
  const dayA = toISODate(new Date(a.date));
  const dayB = toISODate(new Date(b.date));
  if (dayA !== dayB) return dayA.localeCompare(dayB);
  return sortByTime(a, b);
}

function sortCalendarItems(items: CalendarItem[]): CalendarItem[] {
  return [...items].sort(sortByTime);
}

// ── Hook ──

export function useWeekCalendar(currentUserId?: string, groupNameMap?: Record<string, string>) {
  const { weekStartDay } = useDisplay();
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() =>
    startOfWeek(new Date(), weekStartDay as WeekStartDay),
  );
  // null = no date selected → panel shows all visible days (matching dooooApp behavior)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const weekDates = useMemo(
    () => getWeekDates(currentWeekStart, weekStartDay as WeekStartDay),
    [currentWeekStart, weekStartDay],
  );

  const fromDate = useMemo(() => toISODate(weekDates[0]), [weekDates]);
  const toDate = useMemo(() => toISODate(weekDates[6]), [weekDates]);
  // Events use datetime comparison, so "to" must cover the full last day
  const toDateEnd = useMemo(() => {
    const d = new Date(weekDates[6]);
    d.setDate(d.getDate() + 1);
    return toISODate(d);
  }, [weekDates]);

  // ── 4 parallel queries (matching dooooApp's 4-source architecture) ──

  const { data: personalTasks = [], isLoading: loadingTasks } = useQuery({
    queryKey: ['calendar-tasks', fromDate, toDate],
    queryFn: () => getTasks({ fromDate, toDate }),
  });

  const { data: groupTasks = [], isLoading: loadingGroupTasks } = useQuery({
    queryKey: ['calendar-assigned-group-tasks'],
    queryFn: getAssignedGroupTasks,
    staleTime: 2 * 60 * 1000,
  });

  const { data: ownedEvents = [], isLoading: loadingEvents } = useQuery({
    queryKey: ['calendar-events', fromDate, toDateEnd],
    queryFn: () => getEvents({ from: fromDate, to: toDateEnd }),
  });

  const { data: attendingEvents = [], isLoading: loadingAttending } = useQuery({
    queryKey: ['calendar-attending-events', fromDate, toDateEnd],
    queryFn: () => getAttendingEvents({ from: fromDate, to: toDateEnd }),
  });

  const { data: _eventInstances = [], isLoading: loadingEventInstances } = useQuery({
    queryKey: ['calendar-event-instances', fromDate, toDateEnd],
    queryFn: () => getUserEventInstances({ from: fromDate, to: toDateEnd }),
  });

  const isLoading = loadingTasks || loadingGroupTasks || loadingEvents || loadingAttending || loadingEventInstances;

  // ── Merge all sources into CalendarItem[], grouped by date ──

  const itemsByDate = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    const seenIds = new Set<string>();

    // Enrich: add groupName, participantInstanceStatus, creatorName
    const enrich = (item: CalendarItem, task?: Task): CalendarItem => {
      const enriched = { ...item };
      if (enriched.groupId && groupNameMap) {
        enriched.groupName = groupNameMap[enriched.groupId];
      }
      if (task?.participantInstances && currentUserId) {
        const pi = task.participantInstances.find((p) => p.participantUserId === currentUserId);
        enriched.participantInstanceStatus = pi?.status;
      }
      if (task?.user?.name) {
        enriched.creatorName = task.user.name;
      }
      return enriched;
    };

    // Initialize all 7 days
    for (const d of weekDates) {
      map.set(toISODate(d), []);
    }

    // 1. Personal tasks
    for (const task of personalTasks) {
      if (!task.date || seenIds.has(task.id)) continue;
      const dateKey = toISODate(new Date(task.date));
      if (!map.has(dateKey)) continue;
      seenIds.add(task.id);
      map.get(dateKey)!.push(enrich(taskToCalendarItem(task), task));
    }

    // 2. Assigned group tasks (filter to current week, deduplicate)
    for (const task of groupTasks) {
      if (!task.date || seenIds.has(task.id)) continue;
      const dateKey = toISODate(new Date(task.date));
      if (!map.has(dateKey)) continue;
      seenIds.add(task.id);
      map.get(dateKey)!.push(enrich(taskToCalendarItem(task), task));
    }

    // 3. Events (owned + attending, deduplicated)
    const seenEventIds = new Set<string>();
    for (const event of [...ownedEvents, ...attendingEvents]) {
      if (!event.date || seenEventIds.has(event.id)) continue;
      seenEventIds.add(event.id);
      const dateKey = toISODate(new Date(event.date));
      if (!map.has(dateKey)) continue;
      const item = eventToCalendarItem(event);
      if (item.groupId && groupNameMap) item.groupName = groupNameMap[item.groupId];
      map.get(dateKey)!.push(item);
    }

    // Sort items within each day
    for (const [key, items] of map) {
      map.set(key, sortCalendarItems(items));
    }

    return map;
  }, [personalTasks, groupTasks, ownedEvents, attendingEvents, weekDates, currentUserId, groupNameMap]);

  // ── Panel items: selected date OR all visible days (matching dooooApp) ──

  const panelItems = useMemo(() => {
    if (selectedDate) {
      // Date selected → show only that date's items, sorted by time
      const dateKey = toISODate(selectedDate);
      return itemsByDate.get(dateKey) || [];
    }
    // No date selected → show all items from visible 7 days, sorted by date+time
    const all: CalendarItem[] = [];
    const seenIds = new Set<string>();
    for (const d of weekDates) {
      const items = itemsByDate.get(toISODate(d)) || [];
      for (const item of items) {
        if (!seenIds.has(item.id)) {
          seenIds.add(item.id);
          all.push(item);
        }
      }
    }
    return [...all].sort(sortByDateThenTime);
  }, [itemsByDate, selectedDate, weekDates]);

  // ── Date selection: toggle on click, auto-deselect on nav (matching dooooApp) ──

  const handleSelectDate = useCallback((date: Date) => {
    setSelectedDate((prev) => {
      // Toggle: click same date again → deselect
      if (prev && isSameDay(prev, date)) return null;
      return date;
    });
  }, []);

  // ── Navigation (auto-deselects if selected date leaves visible range) ──

  const isDateInWeek = useCallback((date: Date | null, dates: Date[]): boolean => {
    if (!date) return true; // null is always "in range" (nothing to deselect)
    return dates.some((d) => isSameDay(d, date));
  }, []);

  const goToPrevWeek = useCallback(() => {
    setCurrentWeekStart((prev) => {
      const newStart = new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() - 7);
      const newDates = getWeekDates(newStart, weekStartDay as WeekStartDay);
      // Auto-deselect if selected date not in new week
      setSelectedDate((sel) => (isDateInWeek(sel, newDates) ? sel : null));
      return newStart;
    });
  }, [weekStartDay, isDateInWeek]);

  const goToNextWeek = useCallback(() => {
    setCurrentWeekStart((prev) => {
      const newStart = new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() + 7);
      const newDates = getWeekDates(newStart, weekStartDay as WeekStartDay);
      setSelectedDate((sel) => (isDateInWeek(sel, newDates) ? sel : null));
      return newStart;
    });
  }, [weekStartDay, isDateInWeek]);

  const goToToday = useCallback(() => {
    const today = new Date();
    setCurrentWeekStart(startOfWeek(today, weekStartDay as WeekStartDay));
    setSelectedDate(null); // Deselect on "Today" navigation (show all week)
  }, [weekStartDay]);

  // ── Today reference ──

  const today = useMemo(() => new Date(), []);

  return {
    currentWeekStart,
    weekDates,
    selectedDate,
    handleSelectDate,
    itemsByDate,
    panelItems,
    isLoading,
    goToPrevWeek,
    goToNextWeek,
    goToToday,
    today,
    isSameDay,
  };
}
