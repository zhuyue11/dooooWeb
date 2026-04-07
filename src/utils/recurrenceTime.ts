/**
 * Compute the clock time (hours + minutes) of a base date as seen in a given timezone.
 * Mirrors dooooApp/components/calendar/instanceGenerators.ts (lines ~555-568).
 *
 * For a recurring timed task/event, the base date stored in the DB is an absolute
 * instant. The virtual instance on day N should have the same wall-clock hours/minutes
 * in the task's timezone — not in the browser's local timezone. We extract those via
 * Intl.DateTimeFormat with the task's timezone, then apply them to the target day.
 */
export function extractClockTimeInTimeZone(
  baseDate: Date,
  timeZone: string | null | undefined,
): { hours: number; minutes: number } {
  if (timeZone) {
    try {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone,
        hour: 'numeric',
        minute: 'numeric',
        hour12: false,
      }).formatToParts(baseDate);
      const hours = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10);
      const minutes = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);
      return { hours, minutes };
    } catch {
      // Fall through to local time if the timezone id is invalid
    }
  }
  return { hours: baseDate.getHours(), minutes: baseDate.getMinutes() };
}

/**
 * Build a virtual instance Date for `targetDay` that has the same clock time as
 * `baseDate` in the given timezone. Untimed items return a start-of-day Date.
 */
export function buildOccurrenceDate(
  baseDate: Date,
  targetDay: Date,
  hasTime: boolean | null | undefined,
  timeZone: string | null | undefined,
): Date {
  const occ = new Date(targetDay);
  if (hasTime) {
    const { hours, minutes } = extractClockTimeInTimeZone(baseDate, timeZone);
    occ.setHours(hours, minutes, 0, 0);
  } else {
    occ.setHours(0, 0, 0, 0);
  }
  return occ;
}
