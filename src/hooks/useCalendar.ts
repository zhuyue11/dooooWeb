import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDisplay } from '@/lib/contexts/display-context';
import { getTasks, getAssignedGroupTasks, getEvents, getAttendingEvents, getUserEventInstances } from '@/lib/api';
import {
  startOfWeek, getWeekDates, startOfMonth, getMonthGridDates,
  toISODate, isSameDay, startOfDay,
} from '@/utils/date';
import type { Task } from '@/types/api';
import type { WeekStartDay } from '@/utils/date';
export type { CalendarItem, ParticipantSummary } from './useWeekCalendar';
import type { CalendarItem } from './useWeekCalendar';
import { taskToCalendarItem, eventToCalendarItem, sortByTime, sortByDateThenTime } from './calendarHelpers';

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
  // Events use datetime comparison — extend end by 1 day to cover full last day
  const toDateEnd = useMemo(() => {
    const d = new Date(visibleDates[visibleDates.length - 1]);
    d.setDate(d.getDate() + 1);
    return toISODate(d);
  }, [visibleDates]);

  // ── 5 parallel queries (matching dooooApp's multi-source architecture) ──

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

    // 1. Personal tasks
    for (const task of personalTasks) {
      if (!task.date || seenIds.has(task.id)) continue;
      const dateKey = toISODate(new Date(task.date));
      if (!map.has(dateKey)) continue;
      seenIds.add(task.id);
      map.get(dateKey)!.push(enrich(taskToCalendarItem(task), task));
    }

    // 2. Assigned group tasks
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
      map.set(key, [...items].sort(sortByTime));
    }

    return map;
  }, [personalTasks, groupTasks, ownedEvents, attendingEvents, visibleDates, currentUserId, groupNameMap]);

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
