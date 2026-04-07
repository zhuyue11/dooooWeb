/**
 * Date utility helpers for E2E tests.
 * All dates use UTC to match Playwright config (timezoneId: 'UTC').
 */

/** Returns today's date at midnight UTC */
export function todayDateUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/** Returns a date offset from today (e.g., -1 = yesterday, +1 = tomorrow) */
export function offsetDateUTC(offset: number): Date {
  const today = todayDateUTC();
  return new Date(today.getTime() + offset * 86400000);
}

/** Formats a Date to "YYYY-MM-DD" ISO date string */
export function toISODate(d: Date): string {
  return d.toISOString().split('T')[0];
}

/** Formats a Date for display, e.g., "Apr 6, 2026" */
export function toDisplayDate(d: Date): string {
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** Returns the current week's date range (Mon-Sun) */
export function currentWeekRange(): { start: Date; end: Date; dates: Date[] } {
  const today = todayDateUTC();
  const dayOfWeek = today.getUTCDay();
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const start = new Date(today.getTime() - mondayOffset * 86400000);
  const end = new Date(start.getTime() + 6 * 86400000);
  const dates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    dates.push(new Date(start.getTime() + i * 86400000));
  }
  return { start, end, dates };
}

/** Generates a unique title with prefix and timestamp */
export function generateUniqueTitle(prefix: string): string {
  return `${prefix}-${Date.now()}`;
}

/** Get the day number from a date (1-31) */
export function getDayNumber(d: Date): number {
  return d.getUTCDate();
}

/** Get month name for calendar navigation */
export function getMonthName(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'long', timeZone: 'UTC' });
}

/** Get full year from date */
export function getYear(d: Date): number {
  return d.getUTCFullYear();
}
