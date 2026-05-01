/**
 * instanceGenerator — generates virtual occurrence dates and merges them with
 * real instances from the API for paginated "View All Occurrences" display.
 *
 * Ported from dooooApp/utils/instanceGenerator.ts.
 * Key difference: dooooWeb uses ISO date strings instead of timestamps.
 */

import { getNextOccurrenceDate } from './recurrence';
import type { Repeat, TaskInstance } from '@/types/api';

const MAX_ITERATIONS = 500;

export interface MergedInstance {
  date: string;          // ISO string
  dateStr: string;       // YYYY-MM-DD for matching with real instances
  title: string;
  description?: string;
  status: 'PENDING' | 'COMPLETED' | 'REMOVED' | 'MODIFIED' | 'VIRTUAL';
  isVirtual: boolean;
  instanceId?: string;
  priority?: string;
  categoryId?: string | null;
  completedAt?: string;
  hasTime?: boolean;
  duration?: number | null;
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Calculate the date window size (in days) to yield approximately `targetCount`
 * occurrences for a given repeat pattern. Used for paginated loading.
 */
export function calculateDateWindow(repeat: Repeat, targetCount: number): number {
  const interval = repeat.interval || 1;

  switch (repeat.type) {
    case 'daily':
      return interval * targetCount;

    case 'weekly':
    case 'custom':
      if (repeat.weekdays && repeat.weekdays.length > 0) {
        const weeksNeeded = Math.ceil(targetCount / repeat.weekdays.length);
        return weeksNeeded * 7 * interval;
      }
      return interval * 7 * targetCount;

    case 'monthly':
      return interval * targetCount * 31;

    case 'yearly':
      return interval * targetCount * 366;

    default:
      return targetCount * 7;
  }
}

/**
 * Generate virtual occurrence dates in a date range by walking the repeat pattern.
 * Returns dates within [rangeStart, rangeEnd].
 */
export function generateOccurrencesInRange(
  taskDate: Date,
  repeat: Repeat,
  rangeStart: Date,
  rangeEnd: Date,
): Date[] {
  const dates: Date[] = [];
  let current = new Date(taskDate);
  current.setHours(0, 0, 0, 0);

  const start = new Date(rangeStart);
  start.setHours(0, 0, 0, 0);
  const end = new Date(rangeEnd);
  end.setHours(0, 0, 0, 0);

  let occurrenceCount = 0;

  // Include the task's own start date if it's in range
  if (current >= start && current <= end) {
    dates.push(new Date(current));
  }
  occurrenceCount++;

  // Walk forward
  for (let i = 0; i < MAX_ITERATIONS; i++) {
    current = getNextOccurrenceDate(current, repeat);
    occurrenceCount++;

    // Check end condition
    if (repeat.endCondition) {
      if (repeat.endCondition.type === 'date' && repeat.endCondition.endDate) {
        if (current > new Date(repeat.endCondition.endDate)) break;
      }
      if (repeat.endCondition.type === 'count' && repeat.endCondition.occurrences) {
        if (occurrenceCount > repeat.endCondition.occurrences) break;
      }
    }

    if (current > end) break;
    if (current >= start) {
      dates.push(new Date(current));
    }
  }

  return dates;
}

/**
 * Merge virtual occurrence dates with real instances from the API.
 * For each virtual date, if a real instance exists for that date, use the real one.
 * Otherwise create a virtual entry with parent task defaults.
 */
export function mergeInstances(
  virtualDates: Date[],
  realInstances: TaskInstance[],
  parentTask: {
    title: string;
    description?: string;
    priority?: string;
    categoryId?: string | null;
    hasTime?: boolean;
    duration?: number | null;
  },
): MergedInstance[] {
  // Index real instances by date string for fast lookup
  const realByDate = new Map<string, TaskInstance>();
  for (const inst of realInstances) {
    const d = new Date(inst.date);
    realByDate.set(toDateStr(d), inst);
  }

  const merged: MergedInstance[] = [];
  const usedDates = new Set<string>();

  // Process virtual dates
  for (const date of virtualDates) {
    const dateStr = toDateStr(date);
    usedDates.add(dateStr);

    const real = realByDate.get(dateStr);
    if (real) {
      merged.push({
        date: new Date(real.date).toISOString(),
        dateStr,
        title: real.title,
        description: real.description,
        status: real.status as MergedInstance['status'],
        isVirtual: false,
        instanceId: real.id,
        priority: real.priority,
        categoryId: real.categoryId,
        completedAt: real.completedAt,
        hasTime: real.hasTime,
        duration: real.duration,
      });
    } else {
      merged.push({
        date: date.toISOString(),
        dateStr,
        title: parentTask.title,
        description: parentTask.description,
        status: 'VIRTUAL',
        isVirtual: true,
        priority: parentTask.priority,
        categoryId: parentTask.categoryId,
        hasTime: parentTask.hasTime,
        duration: parentTask.duration,
      });
    }
  }

  // Include any real instances with REMOVED status that weren't in virtual dates
  for (const [dateStr, inst] of realByDate) {
    if (!usedDates.has(dateStr) && inst.status === 'REMOVED') {
      merged.push({
        date: new Date(inst.date).toISOString(),
        dateStr,
        title: inst.title,
        description: inst.description,
        status: 'REMOVED',
        isVirtual: false,
        instanceId: inst.id,
        priority: inst.priority,
        categoryId: inst.categoryId,
      });
    }
  }

  // Sort by date ascending
  merged.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return merged;
}
