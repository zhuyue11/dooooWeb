import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDisplay } from '@/lib/contexts/display-context';
import {
  getCalendarItems,
  getGroupTasks,
  getRecurringGroupEvents,
} from '@/lib/api';
import {
  getWeekDates, startOfMonth, getMonthGridDates,
  toISODate, isSameDay, startOfDay,
} from '@/utils/date';
import type { Task, Event, TaskInstance, Repeat } from '@/types/api';
import type { WeekStartDay } from '@/utils/date';
import { shouldGenerateInstance, isSingleOccurrenceRecurring } from '@/utils/recurrence';
import { buildOccurrenceDate } from '@/utils/recurrenceTime';
import { distributeAcrossDays } from '@/utils/multiDay';
import type { CalendarItem } from './useWeekCalendar';
import type { CalendarViewMode } from './useCalendar';
import {
  taskToCalendarItem, eventToCalendarItem, eventInstanceToCalendarItem,
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
  const toDate = useMemo(() => toISODate(visibleDates[visibleDates.length - 1]), [visibleDates]);

  // ── Queries ──

  const enabled = !!groupId;

  // Unified date-range query (tasks + events with multi-day overlap)
  const { data: calendarData, isLoading: loadingItems } = useQuery({
    queryKey: ['group-calendar-items', groupId, fromDate, toDate],
    queryFn: () => getCalendarItems({ from: fromDate, to: toDate, groupId: groupId! }),
    enabled,
  });

  const groupTasks = calendarData?.tasks ?? [];
  const groupEvents = calendarData?.events ?? [];
  const taskInstances: TaskInstance[] = calendarData?.taskInstances ?? [];
  const eventInstances = calendarData?.eventInstances ?? [];

  const { data: recurringGroupTasks = [], isLoading: loadingRecurringTasks } = useQuery({
    queryKey: ['group-calendar-recurring-tasks', groupId],
    queryFn: () => getGroupTasks(groupId!, { recurring: true }),
    enabled,
    staleTime: 2 * 60 * 1000,
  });

  const { data: recurringGroupEvents = [], isLoading: loadingRecurringEvents } = useQuery({
    queryKey: ['group-calendar-recurring-events', groupId],
    queryFn: () => getRecurringGroupEvents(groupId!),
    enabled,
    staleTime: 2 * 60 * 1000,
  });

  const isLoading = loadingItems || loadingRecurringTasks || loadingRecurringEvents;

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
        ? task.isCompleted && task.completedAt ? task.completedAt : null
        : task.date;
      if (!displayDateSource) return;

      seenIds.add(task.id);
      const baseDate = new Date(displayDateSource);
      const repeat = task.repeat as Repeat | undefined;
      const baseKey = toISODate(baseDate);
      const treatAsRegular = isSingleOccurrenceRecurring(true, task.originalTaskId, baseDate, repeat);

      const baseStored = taskInstanceByKey.get(`${task.id}|${baseKey}`);
      if (!baseStored || baseStored.status !== 'REMOVED') {
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

    // 1. Group tasks (date-range + recurring, deduped via seenIds)
    for (const task of groupTasks) pushTaskWithRecurrence(task);
    for (const task of recurringGroupTasks) pushTaskWithRecurrence(task);

    // 2. Group events (date-range + recurring, deduped)
    const allEventsRaw = [...groupEvents, ...recurringGroupEvents];
    const dedupedEventsMap = new Map<string, Event>();
    for (const event of allEventsRaw) {
      if (!dedupedEventsMap.has(event.id)) dedupedEventsMap.set(event.id, event);
    }
    const eventsById = dedupedEventsMap;

    // Process stored event instances first (REMOVED blocks virtual generation)
    const storedInstanceKeys = new Set<string>();
    for (const instance of eventInstances) {
      const dateKey = toISODate(new Date(instance.date));
      storedInstanceKeys.add(`${instance.eventId}|${dateKey}`);
      if (instance.status === 'REMOVED') continue;
      if (!map.has(dateKey)) continue;
      const parent = eventsById.get(instance.eventId);
      const item = eventInstanceToCalendarItem(instance, parent);
      if (groupName) item.groupName = groupName;
      map.get(dateKey)!.push(item);
    }

    const seenEventIds = new Set<string>();
    for (const event of allEventsRaw) {
      if (!event.date || seenEventIds.has(event.id)) continue;
      seenEventIds.add(event.id);
      const baseDate = new Date(event.date);
      const repeat = event.repeat as Repeat | undefined;
      const baseKey = toISODate(baseDate);

      if (!storedInstanceKeys.has(`${event.id}|${baseKey}`)) {
        const item = eventToCalendarItem(event);
        if (groupName) item.groupName = groupName;
        placeMultiDay(item, baseDate, `event-${event.id}`);
      }

      if (!repeat || !repeat.type) continue;

      for (const day of visibleDates) {
        const dateKey = toISODate(day);
        if (dateKey === baseKey) continue;
        if (storedInstanceKeys.has(`${event.id}|${dateKey}`)) continue;
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
  }, [groupTasks, recurringGroupTasks, groupEvents, recurringGroupEvents, taskInstances, eventInstances, visibleDates, currentUserId, groupName]);

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
