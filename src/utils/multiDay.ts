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
