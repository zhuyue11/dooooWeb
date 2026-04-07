import type { Repeat } from '@/types/api';

/**
 * Compute the next occurrence date after `currentDate` for a given repeat pattern.
 * Ported from dooooApp/utils/repeatUtils.ts.
 */
export function getNextOccurrenceDate(currentDate: Date, repeat: Repeat): Date {
  const next = new Date(currentDate);
  next.setHours(0, 0, 0, 0);
  const interval = repeat.interval || 1;

  switch (repeat.type) {
    case 'daily':
      next.setDate(next.getDate() + interval);
      break;
    case 'weekly':
    case 'custom':
      if (repeat.weekdays && repeat.weekdays.length > 0) {
        const sorted = [...repeat.weekdays].sort((a, b) => a - b);
        const currentWeekday = next.getDay();
        const nextWeekday = sorted.find((wd) => wd > currentWeekday);
        if (nextWeekday !== undefined) {
          next.setDate(next.getDate() + (nextWeekday - currentWeekday));
        } else {
          const firstWeekday = sorted[0];
          const daysUntilNextWeek = 7 - currentWeekday + firstWeekday + 7 * (interval - 1);
          next.setDate(next.getDate() + daysUntilNextWeek);
        }
      } else if (repeat.type === 'weekly') {
        next.setDate(next.getDate() + 7 * interval);
      } else {
        next.setDate(next.getDate() + interval);
      }
      break;
    case 'monthly':
      if (repeat.weekdayPattern) {
        next.setMonth(next.getMonth() + interval);
        next.setDate(1);
        while (next.getDay() !== repeat.weekdayPattern.weekday) {
          next.setDate(next.getDate() + 1);
        }
        switch (repeat.weekdayPattern.week) {
          case 'second': next.setDate(next.getDate() + 7); break;
          case 'third': next.setDate(next.getDate() + 14); break;
          case 'fourth': next.setDate(next.getDate() + 21); break;
          case 'last': {
            const test = new Date(next);
            test.setDate(test.getDate() + 7);
            while (test.getMonth() === next.getMonth()) {
              next.setDate(next.getDate() + 7);
              test.setDate(test.getDate() + 7);
            }
            break;
          }
        }
      } else {
        const day = next.getDate();
        next.setMonth(next.getMonth() + interval);
        if (next.getDate() !== day) next.setDate(0);
      }
      break;
    case 'yearly':
      next.setFullYear(next.getFullYear() + interval);
      break;
  }

  return next;
}

/**
 * Check if a "recurring" task should actually be treated as a regular (non-recurring) task
 * because it has only a single occurrence — i.e., the first occurrence is also the last.
 * Ported from dooooApp/components/calendar/weeksStateHelpers.ts:isSingleOccurrenceRecurring.
 */
export function isSingleOccurrenceRecurring(
  isFirstInstance: boolean,
  taskOriginalTaskId: string | undefined | null,
  taskStartDate: Date,
  taskRepeat: Repeat | string | undefined | null,
): boolean {
  if (!isFirstInstance) return false;
  if (taskOriginalTaskId) return false;
  if (!taskRepeat) return false;

  try {
    const parsed: Repeat = typeof taskRepeat === 'string' ? JSON.parse(taskRepeat) : taskRepeat;
    if (!parsed.endCondition?.endDate) return false;

    const endDate = new Date(parsed.endCondition.endDate);
    endDate.setHours(23, 59, 59, 999);
    const normalized = new Date(taskStartDate);
    normalized.setHours(0, 0, 0, 0);

    const nextOccurrence = getNextOccurrenceDate(normalized, parsed);
    return nextOccurrence > endDate;
  } catch {
    return false;
  }
}


/**
 * Check if a recurring task/event instance should exist for a target date,
 * given the task's start date and repeat pattern.
 *
 * Ported 1:1 from dooooApp/components/calendar/weeksStateHelpers.ts:shouldGenerateInstance.
 * This is the canonical recurrence rule used across the product.
 */
export function shouldGenerateInstance(startDate: Date, targetDate: Date, repeat: Repeat): boolean {
  if (!repeat || !repeat.type) return false;

  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const target = new Date(targetDate);
  target.setHours(0, 0, 0, 0);

  // Original date is the first instance
  if (start.getTime() === target.getTime()) return true;

  // Check if target is before start
  if (target < start) return false;

  const interval = repeat.interval || 1;

  // Check end date condition
  if (repeat.endCondition?.type === 'date' && repeat.endCondition.endDate) {
    const end = new Date(repeat.endCondition.endDate);
    if (target > end) return false;
  }

  switch (repeat.type) {
    case 'daily': {
      const daysDiff = Math.floor((target.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff <= 0 || daysDiff % interval !== 0) return false;

      if (repeat.endCondition?.type === 'count' && repeat.endCondition.occurrences) {
        const occurrenceCount = Math.floor(daysDiff / interval) + 1;
        if (occurrenceCount > repeat.endCondition.occurrences) return false;
      }

      return true;
    }
    case 'weekly':
    case 'custom': {
      const daysDiff = Math.floor((target.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

      if (repeat.weekdays && repeat.weekdays.length > 0) {
        const targetWeekday = target.getDay();
        if (!repeat.weekdays.includes(targetWeekday)) return false;

        const weeksDiff = Math.floor(daysDiff / 7);
        if (weeksDiff < 0) return false;

        if (interval > 1 && weeksDiff % interval !== 0) return false;

        if (repeat.endCondition?.type === 'count' && repeat.endCondition.occurrences) {
          let occurrenceCount = 0;
          const currentDate = new Date(start);

          while (currentDate <= target) {
            const currentWeeksDiff = Math.floor(
              (currentDate.getTime() - start.getTime()) / (1000 * 60 * 60 * 24) / 7,
            );
            const currentWeekday = currentDate.getDay();

            if (
              repeat.weekdays.includes(currentWeekday) &&
              (interval === 1 || currentWeeksDiff % interval === 0)
            ) {
              occurrenceCount++;
            }

            currentDate.setDate(currentDate.getDate() + 1);
          }

          if (occurrenceCount > repeat.endCondition.occurrences) return false;
        }

        return true;
      }

      // Simple weekly: same weekday, every N weeks
      if (target.getDay() !== start.getDay()) return false;
      const weeksDiff = Math.floor(daysDiff / 7);
      if (weeksDiff <= 0 || weeksDiff % interval !== 0) return false;

      if (repeat.endCondition?.type === 'count' && repeat.endCondition.occurrences) {
        const occurrenceCount = Math.floor(weeksDiff / interval) + 1;
        if (occurrenceCount > repeat.endCondition.occurrences) return false;
      }

      return true;
    }
    case 'monthly': {
      const monthsDiff =
        (target.getFullYear() - start.getFullYear()) * 12 +
        (target.getMonth() - start.getMonth());
      if (monthsDiff <= 0 || monthsDiff % interval !== 0 || target.getDate() !== start.getDate())
        return false;

      if (repeat.endCondition?.type === 'count' && repeat.endCondition.occurrences) {
        const occurrenceCount = Math.floor(monthsDiff / interval) + 1;
        if (occurrenceCount > repeat.endCondition.occurrences) return false;
      }

      return true;
    }
    case 'yearly': {
      const yearsDiff = target.getFullYear() - start.getFullYear();
      if (
        yearsDiff <= 0 ||
        yearsDiff % interval !== 0 ||
        target.getMonth() !== start.getMonth() ||
        target.getDate() !== start.getDate()
      )
        return false;

      if (repeat.endCondition?.type === 'count' && repeat.endCondition.occurrences) {
        const occurrenceCount = Math.floor(yearsDiff / interval) + 1;
        if (occurrenceCount > repeat.endCondition.occurrences) return false;
      }

      return true;
    }
    default:
      return false;
  }
}
