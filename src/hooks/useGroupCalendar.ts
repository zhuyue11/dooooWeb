import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDisplay } from '@/lib/contexts/display-context';
import {
  getGroupTasks,
  getGroupEvents,
  getRecurringGroupEvents,
} from '@/lib/api';
import {
  getWeekDates, startOfMonth, getMonthGridDates,
  toISODate, isSameDay, startOfDay,
} from '@/utils/date';
import type { Task, Event, Repeat } from '@/types/api';
import type { WeekStartDay } from '@/utils/date';
import { shouldGenerateInstance, isSingleOccurrenceRecurring } from '@/utils/recurrence';
import { buildOccurrenceDate } from '@/utils/recurrenceTime';
import { distributeAcrossDays } from '@/utils/multiDay';
import type { CalendarItem } from './useWeekCalendar';
import type { CalendarViewMode } from './useCalendar';
import {
  taskToCalendarItem, eventToCalendarItem,
  computeParticipantSummaryForDate, sortByTime, sortByDateThenTime,
} from './calendarHelpers';

/**
 * Group-scoped calendar hook — mirrors useCalendar but fetches only group data.
 * Ported from dooooApp's ExpandableCalendar group path (calculateGroupWeekData).
 */
export function useGroupCalendar(
  groupId: string | undefined,
  currentUserId?: string,
  groupName?: string,
  viewMode: CalendarViewMode = 'week',
) {
  const { weekStartDay } = useDisplay();
  const wsd = weekStartDay as WeekStartDay;

  const [currentDate, setCurrentDate] = useState<Date>(() => startOfDay(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // ── Visible dates ──

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

  const currentMonth = useMemo(() => startOfMonth(currentDate), [currentDate]);

  // ── Date range for API queries ──

  const fromDate = useMemo(() => toISODate(visibleDates[0]), [visibleDates]);
  const toDateEnd = useMemo(() => {
    const d = new Date(visibleDates[visibleDates.length - 1]);
    d.setDate(d.getDate() + 1);
    return toISODate(d);
  }, [visibleDates]);

  // ── Queries ──

  const enabled = !!groupId;

  const { data: groupTasks = [], isLoading: loadingTasks } = useQuery({
    queryKey: ['group-calendar-tasks', groupId, fromDate, toDateEnd],
    queryFn: () => getGroupTasks(groupId!, { from: fromDate, to: toDateEnd }),
    enabled,
  });

  const { data: recurringGroupTasks = [], isLoading: loadingRecurringTasks } = useQuery({
    queryKey: ['group-calendar-recurring-tasks', groupId],
    queryFn: () => getGroupTasks(groupId!, { recurring: true }),
    enabled,
    staleTime: 2 * 60 * 1000,
  });

  const { data: groupEvents = [], isLoading: loadingEvents } = useQuery({
    queryKey: ['group-calendar-events', groupId, fromDate, toDateEnd],
    queryFn: () => getGroupEvents(groupId!, { from: fromDate, to: toDateEnd }),
    enabled,
  });

  const { data: recurringGroupEvents = [], isLoading: loadingRecurringEvents } = useQuery({
    queryKey: ['group-calendar-recurring-events', groupId],
    queryFn: () => getRecurringGroupEvents(groupId!),
    enabled,
    staleTime: 2 * 60 * 1000,
  });

  const isLoading = loadingTasks || loadingRecurringTasks || loadingEvents || loadingRecurringEvents;

  // ── Merge into CalendarItem[], grouped by date ──

  const itemsByDate = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    const seenIds = new Set<string>();

    const enrich = (item: CalendarItem, task?: Task) => {
      const enriched = { ...item };
      if (groupName) enriched.groupName = groupName;
      if (task?.participantInstances && currentUserId) {
        const pi = task.participantInstances.find((p) => p.participantUserId === currentUserId);
        enriched.participantInstanceStatus = pi?.status;
      }
      if (task?.user?.name) enriched.creatorName = task.user.name;
      return enriched;
    };

    for (const d of visibleDates) {
      map.set(toISODate(d), []);
    }

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
        ? task.isCompleted && task.completedAt ? task.completedAt : null
        : task.date;
      if (!displayDateSource) return;

      seenIds.add(task.id);
      const baseDate = new Date(displayDateSource);
      const repeat = task.repeat as Repeat | undefined;
      const baseKey = toISODate(baseDate);
      const treatAsRegular = isSingleOccurrenceRecurring(true, task.originalTaskId, baseDate, repeat);

      const baseItem = enrich(taskToCalendarItem(task, isNoDateTask ? baseDate.toISOString() : undefined), task);
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
      placeMultiDay(baseItem, baseDate, task.id);

      if (!repeat || !repeat.type || treatAsRegular) return;

      for (const day of visibleDates) {
        const dateKey = toISODate(day);
        if (dateKey === baseKey) continue;
        if (!shouldGenerateInstance(baseDate, day, repeat)) continue;

        const base = enrich(taskToCalendarItem(task), task);
        if (task.isForAllMembers) {
          base.participantSummary = computeParticipantSummaryForDate(task, day);
        }
        const occDate = buildOccurrenceDate(baseDate, day, task.hasTime, task.timeZone);
        base.date = occDate.toISOString();
        base.isInstance = true;
        base.taskId = task.id;
        base.id = `${task.id}_${dateKey}`;
        placeMultiDay(base, occDate, base.id);
      }
    };

    // 1. Group tasks (date-range + recurring, deduped via seenIds)
    for (const task of groupTasks) pushTaskWithRecurrence(task);
    for (const task of recurringGroupTasks) pushTaskWithRecurrence(task);

    // 2. Group events (date-range + recurring, deduped)
    const allEventsRaw = [...groupEvents, ...recurringGroupEvents];
    const dedupedEventsMap = new Map<string, Event>();
    for (const event of allEventsRaw) {
      if (!dedupedEventsMap.has(event.id)) dedupedEventsMap.set(event.id, event);
    }

    const seenEventIds = new Set<string>();
    for (const event of dedupedEventsMap.values()) {
      if (!event.date || seenEventIds.has(event.id)) continue;
      seenEventIds.add(event.id);
      const baseDate = new Date(event.date);
      const repeat = event.repeat as Repeat | undefined;
      const baseKey = toISODate(baseDate);

      const item = eventToCalendarItem(event);
      if (groupName) item.groupName = groupName;
      placeMultiDay(item, baseDate, `event-${event.id}`);

      if (!repeat || !repeat.type) continue;

      for (const day of visibleDates) {
        const dateKey = toISODate(day);
        if (dateKey === baseKey) continue;
        if (!shouldGenerateInstance(baseDate, day, repeat)) continue;

        const occItem = eventToCalendarItem(event);
        const occDate = buildOccurrenceDate(baseDate, day, event.hasTime, event.timeZone);
        occItem.date = occDate.toISOString();
        occItem.isInstance = true;
        occItem.eventId = event.id;
        occItem.id = `event-${event.id}_virtual_${dateKey}`;
        if (groupName) occItem.groupName = groupName;
        placeMultiDay(occItem, occDate, occItem.id);
      }
    }

    for (const [key, items] of map) {
      map.set(key, [...items].sort(sortByTime));
    }

    return map;
  }, [groupTasks, recurringGroupTasks, groupEvents, recurringGroupEvents, visibleDates, currentUserId, groupName]);

  // ── Panel items ──

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

  const effectiveSelectedDate = useMemo(() => {
    if (!selectedDate) return null;
    if (isDateInRange(selectedDate, visibleDates)) return selectedDate;
    return null;
  }, [selectedDate, visibleDates, isDateInRange]);

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
