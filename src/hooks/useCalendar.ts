import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDisplay } from '@/lib/contexts/display-context';
import {
  getCalendarItems,
  getRecurringTasks,
  getRecurringEvents,
} from '@/lib/api';
import {
  startOfWeek, getWeekDates, startOfMonth, getMonthGridDates,
  toISODate, isSameDay, startOfDay,
} from '@/utils/date';
import type { Task, Event, EventInstance, TaskInstance, Repeat } from '@/types/api';
import type { WeekStartDay } from '@/utils/date';
import { shouldGenerateInstance, isSingleOccurrenceRecurring } from '@/utils/recurrence';
import { buildOccurrenceDate } from '@/utils/recurrenceTime';
import { distributeAcrossDays } from '@/utils/multiDay';
export type { CalendarItem, ParticipantSummary } from './useWeekCalendar';
import type { CalendarItem } from './useWeekCalendar';
import { taskToCalendarItem, eventToCalendarItem, eventInstanceToCalendarItem, computeParticipantSummaryForDate, sortByTime, sortByDateThenTime } from './calendarHelpers';

export type CalendarViewMode = 'week' | 'month' | 'day';

// ── Hook ──

export function useCalendar(
  currentUserId?: string,
  groupNameMap?: Record<string, string>,
  viewMode: CalendarViewMode = 'week',
) {
  const { weekStartDay } = useDisplay();
  const wsd = weekStartDay as WeekStartDay;

  // Reference date: anchor for computing visible range
  const [currentDate, setCurrentDate] = useState<Date>(() => startOfDay(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // ── Visible dates based on view mode ──

  const visibleDates = useMemo(() => {
    switch (viewMode) {
      case 'week':
        return getWeekDates(currentDate, wsd);
      case 'month':
        return getMonthGridDates(currentDate, wsd);
      case 'day':
        return [startOfDay(currentDate)];
    }
  }, [currentDate, viewMode, wsd]);

  // Current month reference (for month view header)
  const currentMonth = useMemo(() => startOfMonth(currentDate), [currentDate]);

  // ── Date range for API queries ──

  const fromDate = useMemo(() => toISODate(visibleDates[0]), [visibleDates]);
  const toDate = useMemo(() => toISODate(visibleDates[visibleDates.length - 1]), [visibleDates]);

  // ── Unified date-range query (tasks + events + instances with multi-day overlap) ──

  const { data: calendarData, isLoading: loadingItems } = useQuery({
    queryKey: ['calendar-items', fromDate, toDate],
    queryFn: () => getCalendarItems({ from: fromDate, to: toDate }),
  });

  const personalTasks = calendarData?.tasks ?? [];
  const taskInstances: TaskInstance[] = calendarData?.taskInstances ?? [];
  const calendarEvents = calendarData?.events ?? [];
  const eventInstances = calendarData?.eventInstances ?? [];

  // Recurring tasks/events fetched once per session (no date filter) so the
  // calendar can expand instances on weeks where the parent's start date is
  // outside the visible range. Mirrors dooooApp's local SQLite-backed pattern.
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
    loadingItems ||
    loadingRecurringTasks ||
    loadingRecurringEvents;

  // ── Merge all sources into CalendarItem[], grouped by date ──

  const itemsByDate = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    const seenIds = new Set<string>();

    const enrich = (item: CalendarItem, task?: Task) => {
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

    // Initialize all visible dates
    for (const d of visibleDates) {
      map.set(toISODate(d), []);
    }

    // Index stored task instances for MODIFIED override / REMOVED skip
    const taskInstanceByKey = new Map<string, TaskInstance>();
    for (const inst of taskInstances) {
      const dateKey = toISODate(new Date(inst.date));
      taskInstanceByKey.set(`${inst.taskId}|${dateKey}`, inst);
    }

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

    const placeMultiDay = (origin: CalendarItem, startDate: Date, idPrefix: string) => {
      const parts = distributeAcrossDays(startDate, origin.duration, origin.isCompleted, visibleDates);
      for (const { day, isContinuation } of parts) {
        const dateKey = toISODate(day);
        if (!map.has(dateKey)) continue;
        const entry: CalendarItem = isContinuation
          ? { ...origin, id: `${idPrefix}_cont_${dateKey}`, isContinuation: true }
          : { ...origin, isContinuation: false };
        map.get(dateKey)!.push(entry);
      }
    };

    const pushTaskWithRecurrence = (task: Task) => {
      if (seenIds.has(task.id)) return;

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

      const treatAsRegular = isSingleOccurrenceRecurring(true, task.originalTaskId, baseDate, repeat);

      const baseStored = taskInstanceByKey.get(`${task.id}|${baseKey}`);
      if (!baseStored || baseStored.status !== 'REMOVED') {
        const baseItem = enrich(
          taskToCalendarItem(task, isNoDateTask ? baseDate.toISOString() : undefined),
          task,
        );
        if (isNoDateTask) {
          baseItem.isNoDate = true;
          baseItem.duration = null;
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

      for (const day of visibleDates) {
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
        base.id = `${task.id}_${dateKey}`;
        const item = stored ? applyTaskInstance(base, stored) : base;
        placeMultiDay(item, occDate, base.id);
      }
    };

    // 1. Tasks: date-range query (personal + group) + recurring (deduped via seenIds).
    // The recurring query is needed because the date-range query only returns
    // tasks whose start date overlaps the visible range, but a recurring task
    // whose start date falls outside may still have occurrences inside.
    for (const task of personalTasks) {
      pushTaskWithRecurrence(task);
    }
    for (const task of recurringTasks) {
      pushTaskWithRecurrence(task);
    }

    // 2. Events (date-range + recurring, deduplicated)
    const allEventsRaw = [...calendarEvents, ...recurringEvents];
    const dedupedEventsMap = new Map<string, Event>();
    for (const event of allEventsRaw) {
      if (!dedupedEventsMap.has(event.id)) dedupedEventsMap.set(event.id, event);
    }
    const allEvents = Array.from(dedupedEventsMap.values());
    const eventsById = dedupedEventsMap;

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

    const seenEventIds = new Set<string>();
    for (const event of allEvents) {
      if (!event.date || seenEventIds.has(event.id)) continue;
      seenEventIds.add(event.id);
      const baseDate = new Date(event.date);
      const repeat = event.repeat as Repeat | undefined;

      const baseKey = toISODate(baseDate);
      if (!storedInstanceKeys.has(`${event.id}|${baseKey}`)) {
        const item = eventToCalendarItem(event);
        if (item.groupId && groupNameMap) item.groupName = groupNameMap[item.groupId];
        placeMultiDay(item, baseDate, `event-${event.id}`);
      }

      if (!repeat || !repeat.type) continue;

      for (const day of visibleDates) {
        const dateKey = toISODate(day);
        if (dateKey === baseKey) continue;
        if (storedInstanceKeys.has(`${event.id}|${dateKey}`)) continue;
        if (!shouldGenerateInstance(baseDate, day, repeat)) continue;

        const item = eventToCalendarItem(event);
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
      map.set(key, [...items].sort(sortByTime));
    }

    return map;
  }, [personalTasks, recurringTasks, calendarEvents, recurringEvents, eventInstances, taskInstances, visibleDates, currentUserId, groupNameMap]);

  // ── Panel items: selected date OR all visible days ──

  const panelItems = useMemo(() => {
    if (selectedDate) {
      const dateKey = toISODate(selectedDate);
      return itemsByDate.get(dateKey) || [];
    }
    const all: CalendarItem[] = [];
    const seenIds = new Set<string>();
    for (const d of visibleDates) {
      const items = itemsByDate.get(toISODate(d)) || [];
      for (const item of items) {
        if (!seenIds.has(item.id)) {
          seenIds.add(item.id);
          all.push(item);
        }
      }
    }
    return [...all].sort(sortByDateThenTime);
  }, [itemsByDate, selectedDate, visibleDates]);

  // ── Date selection ──

  const handleSelectDate = useCallback((date: Date) => {
    setSelectedDate((prev) => {
      if (prev && isSameDay(prev, date)) return null;
      return date;
    });
  }, []);

  // ── Navigation ──

  const isDateInRange = useCallback((date: Date | null, dates: Date[]): boolean => {
    if (!date) return true;
    return dates.some((d) => isSameDay(d, date));
  }, []);

  const goToPrev = useCallback(() => {
    setCurrentDate((prev) => {
      switch (viewMode) {
        case 'week':
          return new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() - 7);
        case 'month':
          return new Date(prev.getFullYear(), prev.getMonth() - 1, 1);
        case 'day':
          return new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() - 1);
      }
    });
    // Auto-deselect will happen via the effect below
  }, [viewMode]);

  const goToNext = useCallback(() => {
    setCurrentDate((prev) => {
      switch (viewMode) {
        case 'week':
          return new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() + 7);
        case 'month':
          return new Date(prev.getFullYear(), prev.getMonth() + 1, 1);
        case 'day':
          return new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() + 1);
      }
    });
  }, [viewMode]);

  const goToToday = useCallback(() => {
    setCurrentDate(startOfDay(new Date()));
    setSelectedDate(null);
  }, []);

  // Auto-deselect when selectedDate leaves visible range after navigation
  // (computed lazily — if selectedDate is set but not in visibleDates, clear it)
  const effectiveSelectedDate = useMemo(() => {
    if (!selectedDate) return null;
    if (isDateInRange(selectedDate, visibleDates)) return selectedDate;
    return null;
  }, [selectedDate, visibleDates, isDateInRange]);

  // Sync effective back to state if it changed
  if (effectiveSelectedDate !== selectedDate) {
    setSelectedDate(effectiveSelectedDate);
  }

  const today = useMemo(() => new Date(), []);

  return {
    viewMode,
    currentDate,
    currentMonth,
    visibleDates,
    selectedDate: effectiveSelectedDate,
    handleSelectDate,
    itemsByDate,
    panelItems,
    isLoading,
    goToPrev,
    goToNext,
    goToToday,
    today,
  };
}
