/**
 * useTaskInstances — paginated loading of merged (real + virtual) instances
 * for a recurring task. Uses date-range-based pagination sized to yield
 * ~10 occurrences per page based on the repeat pattern.
 *
 * Ported from dooooApp/hooks/useTaskInstances.ts.
 * Key difference: always uses API (dooooWeb is online-only, no SQLite).
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { Repeat } from '@/types/api';
import { getTaskInstancesForTask } from '@/lib/api';
import {
  calculateDateWindow,
  generateOccurrencesInRange,
  mergeInstances,
  type MergedInstance,
} from '@/utils/instanceGenerator';

const TARGET_COUNT = 10;

interface UseTaskInstancesInput {
  id: string;
  date: string;
  repeat?: Repeat | string | null;
}

export function useTaskInstances(task: UseTaskInstancesInput | null, enabled: boolean) {
  const [instances, setInstances] = useState<MergedInstance[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const windowEndRef = useRef<Date | null>(null);
  const repeatRef = useRef<Repeat | null>(null);

  const loadPage = useCallback(async (taskForPage: UseTaskInstancesInput, rangeStart: Date, rangeEnd: Date) => {
    if (!repeatRef.current) return [];

    const taskDate = new Date(taskForPage.date);
    const repeat = repeatRef.current;

    // Generate virtual occurrences in range
    const virtualDates = generateOccurrencesInRange(taskDate, repeat, rangeStart, rangeEnd);

    // Fetch real instances from API
    const fromStr = rangeStart.toISOString().split('T')[0];
    const toStr = rangeEnd.toISOString().split('T')[0];

    let realInstances: Awaited<ReturnType<typeof getTaskInstancesForTask>> = [];
    try {
      realInstances = await getTaskInstancesForTask(taskForPage.id, fromStr, toStr);
    } catch (error) {
      console.error('Failed to fetch real instances:', error);
    }

    // Merge virtual + real
    const merged = mergeInstances(virtualDates, realInstances, {
      title: '', // not used for display — parent title passed to TaskInstanceList
      hasTime: undefined,
      duration: undefined,
    });

    // Check end condition
    if (repeat.endCondition?.type === 'date' && repeat.endCondition.endDate) {
      if (rangeEnd >= new Date(repeat.endCondition.endDate)) {
        setHasMore(false);
      }
    }
    if (virtualDates.length === 0) {
      setHasMore(false);
    }

    return merged;
  }, []);

  const load = useCallback(async () => {
    if (!task || !enabled || !task.repeat) return;

    setIsLoading(true);
    setInstances([]);
    setHasMore(true);

    try {
      const repeat: Repeat = typeof task.repeat === 'string'
        ? JSON.parse(task.repeat)
        : task.repeat;
      repeatRef.current = repeat;

      const taskDate = new Date(task.date);
      const windowDays = calculateDateWindow(repeat, TARGET_COUNT);
      const rangeEnd = new Date(taskDate.getTime() + windowDays * 24 * 60 * 60 * 1000);

      windowEndRef.current = rangeEnd;

      const merged = await loadPage(task, taskDate, rangeEnd);
      setInstances(merged);
    } catch (error) {
      console.error('Failed to load instances:', error);
    } finally {
      setIsLoading(false);
    }
  }, [task, enabled, loadPage]);

  const loadMore = useCallback(async () => {
    if (!task || !repeatRef.current || !windowEndRef.current || isLoading || !hasMore) return;

    setIsLoading(true);
    try {
      const windowDays = calculateDateWindow(repeatRef.current, TARGET_COUNT);
      const rangeStart = new Date(windowEndRef.current.getTime() + 24 * 60 * 60 * 1000);
      const rangeEnd = new Date(rangeStart.getTime() + windowDays * 24 * 60 * 60 * 1000);

      windowEndRef.current = rangeEnd;

      const merged = await loadPage(task, rangeStart, rangeEnd);
      setInstances(prev => [...prev, ...merged]);
    } catch (error) {
      console.error('Failed to load more instances:', error);
    } finally {
      setIsLoading(false);
    }
  }, [task, isLoading, hasMore, loadPage]);

  // Auto-load when enabled transitions to true
  useEffect(() => {
    if (enabled && task?.repeat) {
      load();
    }
  }, [enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  return { instances, isLoading, hasMore, loadMore };
}
