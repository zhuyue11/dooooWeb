import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDisplay } from '@/lib/contexts/display-context';
import {
  getTasks,
  getAssignedGroupTasks,
  getEvents,
  getAttendingEvents,
  getUserEventInstances,
  getTaskInstances,
  getRecurringTasks,
  getRecurringEvents,
} from '@/lib/api';
import { startOfWeek, getWeekDates, toISODate, isSameDay } from '@/utils/date';
import type { Task, Event, EventInstance, TaskInstance, Repeat } from '@/types/api';
import type { WeekStartDay } from '@/utils/date';
import { shouldGenerateInstance, isSingleOccurrenceRecurring } from '@/utils/recurrence';
import { buildOccurrenceDate } from '@/utils/recurrenceTime';
import { distributeAcrossDays } from '@/utils/multiDay';
import { computeParticipantSummaryForDate } from './calendarHelpers';

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
  isNoDate?: boolean; // true for no-date completed tasks displayed on completedAt
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

function taskToCalendarItem(task: Task, displayDate?: string): CalendarItem {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
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

function eventInstanceToCalendarItem(instance: EventInstance, parentEvent?: Event): CalendarItem {
  return {
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

  const { data: eventInstances = [], isLoading: loadingEventInstances } = useQuery({
    queryKey: ['calendar-event-instances', fromDate, toDateEnd],
    queryFn: () => getUserEventInstances({ from: fromDate, to: toDateEnd }),
  });

  const { data: taskInstancesResponse, isLoading: loadingTaskInstances } = useQuery({
    queryKey: ['calendar-task-instances', fromDate, toDate],
    queryFn: () => getTaskInstances({ from: fromDate, to: toDate }),
  });
  const taskInstances: TaskInstance[] = taskInstancesResponse?.data?.instances ?? [];

  // Recurring tasks/events: fetched once per session (no date filter) so the
  // calendar can expand instances on weeks where the parent's start date is
  // outside the visible range. Mirrors dooooApp's local SQLite-backed pattern
  // (sqliteService.getRecurringTasks() / getRecurringEvents()).
  const { data: recurringTasks = [], isLoading: loadingRecurringTasks } = useQuery({
    queryKey: ['calendar-recurring-tasks'],
    queryFn: getRecurringTasks,
    staleTime: 2 * 60 * 1000,
  });

  const { data: recurringEvents = [], isLoading: loadingRecurringEvents } = useQuery({
    queryKey: ['calendar-recurring-events'],
    queryFn: getRecurringEvents,
    staleTime: 2 * 60 * 1000,
  });

  const isLoading =
    loadingTasks ||
    loadingGroupTasks ||
    loadingEvents ||
    loadingAttending ||
    loadingRecurringTasks ||
    loadingRecurringEvents ||
    loadingEventInstances ||
    loadingTaskInstances;

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
      if (task?.isForAllMembers && currentUserId) {
        // Check participantInstances first (instance-level record is source of truth)
        const pi = task.participantInstances?.find((p) => p.participantUserId === currentUserId);
        if (pi) {
          enriched.participantInstanceStatus = pi.status;
        } else {
          // Fall back to participants (recurring "Join All")
          const p = task.participants?.find((p) => p.userId === currentUserId);
          enriched.participantInstanceStatus = p?.status;
        }
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

    // Index stored task instances by `${taskId}|${dateKey}` so recurring task
    // expansion can apply MODIFIED overrides and skip REMOVED dates.
    const taskInstanceByKey = new Map<string, TaskInstance>();
    for (const inst of taskInstances) {
      const dateKey = toISODate(new Date(inst.date));
      taskInstanceByKey.set(`${inst.taskId}|${dateKey}`, inst);
    }

    // Merge a stored TaskInstance's overrides onto a CalendarItem built from the parent task.
    const applyTaskInstance = (item: CalendarItem, inst: TaskInstance): CalendarItem => {
      return {
        ...item,
        title: inst.title || item.title,
        description: inst.description ?? item.description,
        priority: inst.priority ?? item.priority,
        categoryId: inst.categoryId ?? item.categoryId,
        hasTime: inst.hasTime ?? item.hasTime,
        duration: inst.duration ?? item.duration,
        firstReminderMinutes: inst.firstReminderMinutes ?? item.firstReminderMinutes,
        secondReminderMinutes: inst.secondReminderMinutes ?? item.secondReminderMinutes,
        location: inst.location ?? item.location,
        locationAddress: inst.locationAddress ?? item.locationAddress,
        isCompleted: inst.status === 'COMPLETED',
        instanceStatus: inst.status,
        isInstance: true,
      };
    };

    // Place a single (possibly multi-day) task occurrence on all days it spans.
    // The `origin` item is built for the start day; continuation entries get a
    // unique id and `isContinuation: true`.
    const placeMultiDay = (origin: CalendarItem, startDate: Date, idPrefix: string) => {
      const parts = distributeAcrossDays(startDate, origin.duration, origin.isCompleted, weekDates);
      for (const { day, isContinuation } of parts) {
        const dateKey = toISODate(day);
        if (!map.has(dateKey)) continue;
        const entry: CalendarItem = isContinuation
          ? { ...origin, id: `${idPrefix}_cont_${dateKey}`, isContinuation: true }
          : { ...origin, isContinuation: false };
        map.get(dateKey)!.push(entry);
      }
    };

    // Helper: expand a task with a repeat pattern into instances within the visible
    // date range, honoring stored task instances (MODIFIED overrides / REMOVED skips).
    // Mirrors dooooApp: iterate each day of the visible range and call shouldGenerateInstance.
    const pushTaskWithRecurrence = (task: Task) => {
      if (seenIds.has(task.id)) return;

      // No-date completed tasks use completedAt as display date (matches dooooApp)
      const isNoDateTask = !task.date;
      const displayDateSource = isNoDateTask
        ? task.isCompleted && task.completedAt
          ? task.completedAt
          : null
        : task.date;
      if (!displayDateSource) return;

      seenIds.add(task.id);
      const baseDate = new Date(displayDateSource);
      const repeat = task.repeat as Repeat | undefined;
      const baseKey = toISODate(baseDate);

      // If this "recurring" task only has one occurrence (endDate is before the
      // next recurrence), treat it as a regular task — matches dooooApp.
      const treatAsRegular = isSingleOccurrenceRecurring(true, task.originalTaskId, baseDate, repeat);

      // Base occurrence (respect stored task instance at the base date)
      const baseStored = taskInstanceByKey.get(`${task.id}|${baseKey}`);
      if (!baseStored || baseStored.status !== 'REMOVED') {
        const baseItem = enrich(
          taskToCalendarItem(task, isNoDateTask ? baseDate.toISOString() : undefined),
          task,
        );
        if (isNoDateTask) {
          baseItem.isNoDate = true;
          baseItem.duration = null; // no-date tasks don't have duration
        }
        if (task.isForAllMembers) {
          baseItem.participantSummary = computeParticipantSummaryForDate(task, baseDate);
        }
        if (treatAsRegular) {
          baseItem.isInstance = false;
          baseItem.repeat = undefined;
        }
        const finalBase = baseStored ? applyTaskInstance(baseItem, baseStored) : baseItem;
        placeMultiDay(finalBase, baseDate, task.id);
      }

      if (!repeat || !repeat.type || treatAsRegular) return;

      // For each visible day, check if a virtual instance should be generated
      for (const day of weekDates) {
        const dateKey = toISODate(day);
        if (dateKey === baseKey) continue;
        if (!shouldGenerateInstance(baseDate, day, repeat)) continue;

        const stored = taskInstanceByKey.get(`${task.id}|${dateKey}`);
        if (stored && stored.status === 'REMOVED') continue;

        const base = enrich(taskToCalendarItem(task), task);
        if (task.isForAllMembers) {
          base.participantSummary = computeParticipantSummaryForDate(task, day);
        }
        const occDate = buildOccurrenceDate(baseDate, day, task.hasTime, task.timeZone);
        base.date = occDate.toISOString();
        base.isInstance = true;
        base.taskId = task.id;
        // Virtual instance gets a date-suffixed id to avoid collisions with the
        // parent task id on other days (matches dooooApp id pattern).
        base.id = `${task.id}_${dateKey}`;
        const item = stored ? applyTaskInstance(base, stored) : base;
        placeMultiDay(item, occDate, base.id);
      }
    };

    // 1. Personal tasks: merge date-range query + recurring query.
    // The date-range query (`getTasks({fromDate,toDate})`) returns tasks whose
    // start date overlaps the visible week. The recurring query returns ALL
    // recurring tasks regardless of start date. The latter is needed because
    // a recurring task whose start date falls outside the visible week may
    // still have occurrences inside it (e.g. shifted-forward series).
    // pushTaskWithRecurrence dedupes via seenIds.
    for (const task of personalTasks) {
      pushTaskWithRecurrence(task);
    }
    for (const task of recurringTasks) {
      pushTaskWithRecurrence(task);
    }

    // 2. Assigned group tasks (filter to current week, deduplicate)
    for (const task of groupTasks) {
      pushTaskWithRecurrence(task);
    }

    // 3. Events (owned + attending + recurring, deduplicated)
    // Mirrors dooooApp/components/calendar/instanceGenerators.ts:
    //   (a) push real stored instances (skipping REMOVED)
    //   (b) push parent events on their own date + virtual instances for matching visible days
    //       skipping any (eventId, date) already covered by a stored instance
    // The recurring events query is unioned in for the same reason recurring tasks are:
    // a recurring event whose start date is outside the visible week may still
    // have occurrences inside it.
    const allEventsRaw = [...ownedEvents, ...attendingEvents, ...recurringEvents];
    const dedupedEventsMap = new Map<string, Event>();
    for (const event of allEventsRaw) {
      if (!dedupedEventsMap.has(event.id)) dedupedEventsMap.set(event.id, event);
    }
    const allEvents = Array.from(dedupedEventsMap.values());
    const eventsById = dedupedEventsMap;

    // (a) Stored instances
    const storedInstanceKeys = new Set<string>();
    for (const instance of eventInstances) {
      const dateKey = toISODate(new Date(instance.date));
      storedInstanceKeys.add(`${instance.eventId}|${dateKey}`);
      if (instance.status === 'REMOVED') continue;
      if (!map.has(dateKey)) continue;
      const parent = eventsById.get(instance.eventId);
      const item = eventInstanceToCalendarItem(instance, parent);
      if (item.groupId && groupNameMap) item.groupName = groupNameMap[item.groupId];
      map.get(dateKey)!.push(item);
    }

    // Then push events and their virtual instances for visible dates.
    const seenEventIds = new Set<string>();
    for (const event of allEvents) {
      if (!event.date || seenEventIds.has(event.id)) continue;
      seenEventIds.add(event.id);
      const baseDate = new Date(event.date);
      const repeat = event.repeat as Repeat | undefined;

      // Place the event on its base date (with multi-day distribution) if not
      // covered by a stored instance on the base date.
      const baseKey = toISODate(baseDate);
      if (!storedInstanceKeys.has(`${event.id}|${baseKey}`)) {
        const item = eventToCalendarItem(event);
        if (item.groupId && groupNameMap) item.groupName = groupNameMap[item.groupId];
        placeMultiDay(item, baseDate, `event-${event.id}`);
      }

      if (!repeat || !repeat.type) continue;

      // For each visible day, generate a virtual instance if the pattern matches
      // and there is no stored instance already on that date.
      for (const day of weekDates) {
        const dateKey = toISODate(day);
        if (dateKey === baseKey) continue;
        if (storedInstanceKeys.has(`${event.id}|${dateKey}`)) continue;
        if (!shouldGenerateInstance(baseDate, day, repeat)) continue;

        const item = eventToCalendarItem(event);
        // Clock time comes from the base in the event's timezone (matches dooooApp)
        const occDate = buildOccurrenceDate(baseDate, day, event.hasTime, event.timeZone);
        item.date = occDate.toISOString();
        item.isInstance = true;
        item.eventId = event.id;
        item.id = `event-${event.id}_virtual_${dateKey}`;
        if (item.groupId && groupNameMap) item.groupName = groupNameMap[item.groupId];
        placeMultiDay(item, occDate, item.id);
      }
    }

    // Sort items within each day
    for (const [key, items] of map) {
      map.set(key, sortCalendarItems(items));
    }

    return map;
  }, [personalTasks, recurringTasks, groupTasks, ownedEvents, attendingEvents, recurringEvents, eventInstances, taskInstances, weekDates, currentUserId, groupNameMap]);

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
