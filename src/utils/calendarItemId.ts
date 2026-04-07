/**
 * Helpers for navigating between calendar UI ids and the underlying parent
 * task/event ids that the API expects.
 *
 * Background: when a recurring task/event is rendered on the calendar, each
 * occurrence is given a virtual id like `${taskId}_${YYYY-MM-DD}` (tasks) or
 * `event-${eventId}_virtual_${YYYY-MM-DD}` (events) so React keys stay unique.
 * Stored MODIFIED instances reuse the parent's id. Routing and mutation calls
 * must always use the *parent* id, never the virtual one.
 *
 * Use these helpers anywhere you would otherwise reach for `item.id` to build
 * a route or pass to an API mutation.
 */
import type { CalendarItem } from '@/hooks/useWeekCalendar';
import { toISODate } from './date';

/**
 * Return the parent task or event id for a calendar item, regardless of whether
 * the item is a parent, a stored MODIFIED instance, or a virtual occurrence.
 */
export function getParentId(item: CalendarItem): string {
  if (item.itemType === 'EVENT') {
    if (item.eventId) return item.eventId;
    // Strip "event-" / "event-instance-" prefix and "_virtual_<date>" suffix
    return item.id.replace(/^event-(instance-)?/, '').split('_virtual_')[0];
  }
  // Tasks: parent id is item.taskId for instances, or item.id for parents
  if (item.taskId) return item.taskId;
  // Virtual recurring task instance: id is `${taskId}_${YYYY-MM-DD}`
  const idx = item.id.lastIndexOf('_');
  if (idx > 0) {
    const tail = item.id.slice(idx + 1);
    if (/^\d{4}-\d{2}-\d{2}$/.test(tail)) return item.id.slice(0, idx);
  }
  return item.id;
}

/**
 * Return the date of the clicked occurrence as a `YYYY-MM-DD` string. For
 * non-recurring items this is just the item's date.
 */
export function getOccurrenceDateKey(item: CalendarItem): string {
  return toISODate(new Date(item.date));
}

/**
 * Whether the item is part of a recurring series — i.e. clicking "edit" or
 * "delete" should prompt for scope (this / future / all).
 *
 * Note this is true for BOTH the base-date parent occurrence AND the virtual
 * instances on later dates. The base-date item has `isInstance: false` because
 * the calendar pushes the parent task itself on its own start day, but it's
 * still part of a recurring series and the scope picker still applies.
 */
export function isRecurringInstance(item: CalendarItem): boolean {
  return !!item.repeat;
}
