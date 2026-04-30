import { toISODate } from './date';

/**
 * Decide which day(s) in `visibleDates` a timed item occupies, accounting for
 * multi-day duration. Returns an array of `{ day, isContinuation }` for the
 * days to display the item on. Non-multi-day items produce a single entry
 * with `isContinuation: false`.
 *
 * Mirrors dooooApp/components/calendar/weeksStateHelpers.ts:distributeTaskAcrossDays.
 *
 * Rules:
 *  - Completed items are only placed on the start day (single entry).
 *  - Items without duration (<=0) are placed on the start day only.
 *  - Items with duration > 0 are placed on every day their
 *    `[start, start + duration]` interval overlaps.
 *  - The first day in the range is the start day; all later days are
 *    continuations (`isContinuation: true`).
 */
export function distributeAcrossDays(
  startDate: Date,
  durationMinutes: number | null | undefined,
  isCompleted: boolean,
  visibleDates: Date[],
): Array<{ day: Date; isContinuation: boolean }> {
  const startKey = toISODate(startDate);

  if (!durationMinutes || durationMinutes <= 0 || isCompleted) {
    const day = visibleDates.find((d) => toISODate(d) === startKey);
    return day ? [{ day, isContinuation: false }] : [];
  }

  const startMs = startDate.getTime();
  const endMs = startMs + durationMinutes * 60_000;

  const result: Array<{ day: Date; isContinuation: boolean }> = [];
  for (const day of visibleDates) {
    const dayStart = new Date(day);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(day);
    dayEnd.setHours(23, 59, 59, 999);
    if (startMs <= dayEnd.getTime() && endMs >= dayStart.getTime()) {
      result.push({ day, isContinuation: toISODate(day) !== startKey });
    }
  }
  return result;
}

/**
 * For a timed item that may span multiple days, compute the visible segment
 * on `currentDay`: the clipped start time, clipped end time, and the visible
 * duration in minutes.
 *
 * Mirrors dooooApp/lib/utils.ts:getTaskSegmentInfo.
 *
 * @param itemDate - ISO date string of the item's start time
 * @param durationMinutes - total duration in minutes
 * @param currentDay - the calendar day to compute the segment for
 */
export function getSegmentForDay(
  itemDate: string,
  durationMinutes: number,
  currentDay: Date,
): { visibleStart: Date; visibleEnd: Date; visibleMinutes: number } {
  const taskStart = new Date(itemDate);
  const taskEnd = new Date(taskStart.getTime() + durationMinutes * 60_000);

  const dayStart = new Date(currentDay);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(currentDay);
  dayEnd.setHours(23, 59, 59, 999);

  const visibleStart = new Date(Math.max(taskStart.getTime(), dayStart.getTime()));
  const visibleEnd = new Date(Math.min(taskEnd.getTime(), dayEnd.getTime()));
  const visibleMinutes = Math.max(0, (visibleEnd.getTime() - visibleStart.getTime()) / 60_000);

  return { visibleStart, visibleEnd, visibleMinutes };
}
