import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDisplay } from '@/lib/contexts/display-context';
import {
  getCalendarItems,
  getRecurringTasks,
  getRecurringEvents,
} from '@/lib/api';
import {
  getWeekDates, startOfMonth, getMonthGridDates,
  toISODate, isSameDay, startOfDay,
} from '@/utils/date';
import type { Task, Event, EventInstance, TaskInstance, Repeat } from '@/types/api';
import type { WeekStartDay } from '@/utils/date';
import { shouldGenerateInstance, isSingleOccurrenceRecurring } from '@/utils/recurrence';
import { buildOccurrenceDate } from '@/utils/recurrenceTime';
import { distributeAcrossDays } from '@/utils/multiDay';
export type { CalendarItem, ParticipantSummary } from '@/types/calendar';
import type { CalendarItem } from '@/types/calendar';
import { taskToCalendarItem, eventToCalendarItem, eventInstanceToCalendarItem, computeParticipantSummaryForDate, sortByTime, sortByDateThenTime, enrichCalendarItem } from './calendarHelpers';

export type CalendarViewMode = 'week' | 'month' | 'day';

// ── Hook ──

export function useCalendar(
  currentUserId?: string,
  groupNameMap?: Record<string, string>,
  viewMode: CalendarViewMode = 'week',
  groupId?: string,
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
    queryKey: ['calendar-items', fromDate, toDate, groupId],
    queryFn: () => getCalendarItems({ from: fromDate, to: toDate, groupId }),
  });

  const calendarTasks: Task[] = calendarData?.tasks ?? [];
  const taskInstances: TaskInstance[] = calendarData?.taskInstances ?? [];
  const calendarEvents: Event[] = calendarData?.events ?? [];
  const eventInstances: EventInstance[] = calendarData?.eventInstances ?? [];

  // Recurring tasks/events fetched once per session (no date filter) so the
  // calendar can expand instances on weeks where the parent's start date is
  // outside the visible range.
  const { data: recurringTasks = [], isLoading: loadingRecurringTasks } = useQuery({
    queryKey: ['calendar-recurring-tasks', groupId],
    queryFn: () => getRecurringTasks(groupId),
    staleTime: 2 * 60 * 1000,
  });

  const { data: recurringEvents = [], isLoading: loadingRecurringEvents } = useQuery({
    queryKey: ['calendar-recurring-events', groupId],
    queryFn: () => getRecurringEvents(groupId),
    staleTime: 2 * 60 * 1000,
  });

  const isLoading =
    loadingItems ||
    loadingRecurringTasks ||
    loadingRecurringEvents;

  // ── Merge all sources into CalendarItem[], grouped by date ──

  const itemsByDate = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();

    const enrich = (item: CalendarItem, task?: Task): CalendarItem =>
      enrichCalendarItem(item, task, currentUserId, groupNameMap);

    // Initialize all visible dates
    for (const d of visibleDates) {
      map.set(toISODate(d), []);
    }

    // ── Helpers ──

    const applyTaskInstance = (item: CalendarItem, inst: TaskInstance): CalendarItem => ({
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
    });

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

    // ── Step 1: Regular (non-recurring) tasks ──

    for (const task of calendarTasks) {
      const isNoDateTask = !task.date;
      const displayDate = isNoDateTask
        ? task.isCompleted && task.completedAt ? task.completedAt : null
        : task.date;
      if (!displayDate) continue;
      const baseDate = new Date(displayDate);
      const item = enrich(
        taskToCalendarItem(task, isNoDateTask ? baseDate.toISOString() : undefined),
        task,
      );
      if (isNoDateTask) { item.isNoDate = true; item.duration = null; }
      if (task.isForAllMembers) {
        item.participantSummary = computeParticipantSummaryForDate(task, baseDate);
      }
      placeMultiDay(item, baseDate, item.id);
    }

    // ── Step 2: Regular (non-recurring) events ──

    for (const event of calendarEvents) {
      if (!event.date) continue;
      const item = eventToCalendarItem(event);
      if (item.groupId && groupNameMap) item.groupName = groupNameMap[item.groupId];
      placeMultiDay(item, new Date(event.date), item.id);
    }

    // ── Step 3: Stored task instances ──
    // Index by taskId|date for step 5. Render non-REMOVED instances directly.

    const taskInstanceByKey = new Map<string, TaskInstance>();
    for (const inst of taskInstances) {
      const dateKey = toISODate(new Date(inst.date));
      taskInstanceByKey.set(`${inst.taskId}|${dateKey}`, inst);
      if (inst.status === 'REMOVED') continue;
      const parent = recurringTasks.find(t => t.id === inst.taskId);
      if (!parent) continue;
      const item = enrich(taskToCalendarItem(parent), parent);
      if (parent.isForAllMembers) {
        item.participantSummary = computeParticipantSummaryForDate(parent, new Date(inst.date));
      }
      item.isInstance = true;
      item.taskId = parent.id;
      item.id = `${parent.id}_${dateKey}`;
      const final = applyTaskInstance(item, inst);
      placeMultiDay(final, new Date(inst.date), item.id);
    }

    // ── Step 4: Stored event instances ──
    // Index by eventId|date for step 6. Render non-REMOVED instances directly.

    const eventsById = new Map<string, Event>();
    for (const event of recurringEvents) eventsById.set(event.id, event);

    const storedEventInstanceKeys = new Set<string>();
    for (const instance of eventInstances) {
      const dateKey = toISODate(new Date(instance.date));
      storedEventInstanceKeys.add(`${instance.eventId}|${dateKey}`);
      if (instance.status === 'REMOVED') continue;
      const parent = eventsById.get(instance.eventId);
      const item = eventInstanceToCalendarItem(instance, parent);
      if (item.groupId && groupNameMap) item.groupName = groupNameMap[item.groupId];
      placeMultiDay(item, new Date(instance.date), item.id);
    }

    // ── Step 5: Recurring tasks — generate virtual instances for visible days ──

    for (const task of recurringTasks) {
      if (!task.date) continue;
      const baseDate = new Date(task.date);
      const repeat = task.repeat as Repeat | undefined;
      if (!repeat || !repeat.type) continue;
      if (isSingleOccurrenceRecurring(true, task.originalTaskId, baseDate, repeat)) continue;

      for (const day of visibleDates) {
        const dateKey = toISODate(day);
        if (taskInstanceByKey.has(`${task.id}|${dateKey}`)) continue; // handled in step 3
        if (!shouldGenerateInstance(baseDate, day, repeat)) continue;

        const item = enrich(taskToCalendarItem(task), task);
        if (task.isForAllMembers) {
          item.participantSummary = computeParticipantSummaryForDate(task, day);
        }
        const occDate = buildOccurrenceDate(baseDate, day, task.hasTime, task.timeZone);
        item.date = occDate.toISOString();
        item.isInstance = true;
        item.taskId = task.id;
        item.id = `${task.id}_${dateKey}`;
        placeMultiDay(item, occDate, item.id);
      }
    }

    // ── Step 6: Recurring events — generate virtual instances for visible days ──

    for (const event of recurringEvents) {
      if (!event.date) continue;
      const baseDate = new Date(event.date);
      const repeat = event.repeat as Repeat | undefined;
      if (!repeat || !repeat.type) continue;
      // TODO: add isSingleOccurrenceRecurring check for events (needs originalRecurringEventId on Event model)

      for (const day of visibleDates) {
        const dateKey = toISODate(day);
        if (storedEventInstanceKeys.has(`${event.id}|${dateKey}`)) continue; // handled in step 4
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
  }, [calendarTasks, recurringTasks, calendarEvents, recurringEvents, eventInstances, taskInstances, visibleDates, currentUserId, groupNameMap]);

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
