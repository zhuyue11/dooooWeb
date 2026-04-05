/**
 * Date/time utilities for form handling.
 * Business logic matches dooooApp (source of truth).
 */
import i18n from '@/lib/i18n';

/**
 * Convert a local date to noon UTC — prevents timezone date-shifting for all-day items.
 * e.g. "April 10" stays April 10 in every timezone (UTC-12 to UTC+12).
 *
 * Matches dooooApp/lib/utils.ts:32-38
 */
export function toNoonUTC(date: Date): Date {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  return new Date(Date.UTC(year, month, day, 12, 0, 0, 0));
}

/**
 * Combine a date string (YYYY-MM-DD) and time string (HH:mm) into a local Date.
 * Used when building the ISO string for timed items.
 */
export function combineDateAndTime(dateStr: string, timeStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes] = timeStr.split(':').map(Number);
  return new Date(year, month - 1, day, hours, minutes, 0, 0);
}

/**
 * Extract date (YYYY-MM-DD) and time (HH:mm) from an ISO date string.
 * Used when pre-populating form fields from existing items.
 */
export function extractDateAndTime(isoStr: string): { date: string; time: string } {
  const d = new Date(isoStr);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return {
    date: `${year}-${month}-${day}`,
    time: `${hours}:${minutes}`,
  };
}

/**
 * Format a Date to a display string like "Apr 10, 2026".
 */
export function formatDateDisplay(date: Date): string {
  return date.toLocaleDateString(i18n.language, { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Format hours and minutes to a display string like "11:30 AM".
 */
export function formatTimeDisplay(hours: number, minutes: number): string {
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  const displayMinutes = String(minutes).padStart(2, '0');
  return `${displayHours}:${displayMinutes} ${period}`;
}

/**
 * Convert 12-hour format to 24-hour format.
 */
export function to24Hour(hours: number, period: 'AM' | 'PM'): number {
  if (period === 'AM') return hours === 12 ? 0 : hours;
  return hours === 12 ? 12 : hours + 12;
}

/**
 * Convert 24-hour to 12-hour format.
 */
export function to12Hour(hours24: number): { hours: number; period: 'AM' | 'PM' } {
  const period = hours24 >= 12 ? 'PM' : 'AM';
  const hours = hours24 % 12 || 12;
  return { hours, period };
}
