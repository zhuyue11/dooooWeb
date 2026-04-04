// ── Date utilities shared across pages ──────────────────────────────────

export type WeekStartDay = 'sunday' | 'monday';
export type TimeFormat = '12h' | '24h';

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Returns the first day of the week containing `d`. */
export function startOfWeek(d: Date, weekStartDay: WeekStartDay = 'monday'): Date {
  const day = d.getDay(); // 0=Sun … 6=Sat
  const diff = weekStartDay === 'monday'
    ? (day === 0 ? 6 : day - 1)
    : day;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - diff);
}

/** Returns the last day of the week containing `d`. */
export function endOfWeek(d: Date, weekStartDay: WeekStartDay = 'monday'): Date {
  const start = startOfWeek(d, weekStartDay);
  return new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
}

/** Returns an array of 7 Date objects for the week containing `referenceDate`. */
export function getWeekDates(referenceDate: Date, weekStartDay: WeekStartDay = 'monday'): Date[] {
  const start = startOfWeek(referenceDate, weekStartDay);
  return Array.from({ length: 7 }, (_, i) =>
    new Date(start.getFullYear(), start.getMonth(), start.getDate() + i),
  );
}

/** Format an ISO date string's time portion. */
export function formatTime(dateStr: string, timeFormat: TimeFormat = '24h'): string {
  const d = new Date(dateStr);
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  if (timeFormat === '12h') {
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${m} ${period}`;
  }
  return `${h}:${m}`;
}

// ── Month helpers ────────────────────────────────────────────────────

/** First day of the month containing `d`. */
export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/** All dates for a month grid (35 or 42 cells, includes prev/next month padding). */
export function getMonthGridDates(d: Date, weekStartDay: WeekStartDay = 'monday'): Date[] {
  const first = startOfMonth(d);
  const gridStart = startOfWeek(first, weekStartDay);
  // Always generate 6 rows (42 cells) to keep layout consistent
  return Array.from({ length: 42 }, (_, i) =>
    new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i),
  );
}

/** "April 2026" */
export function formatMonthYear(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

/** "Thursday, April 2, 2026" */
export function formatFullDate(d: Date): string {
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

// ── Day timeline helpers ─────────────────────────────────────────────

/** Returns array of hours [0, 1, 2, ..., 23]. */
export function getHoursArray(): number[] {
  return Array.from({ length: 24 }, (_, i) => i);
}

/** "8 AM", "12 PM", "1 PM" */
export function formatHourLabel(hour: number): string {
  if (hour === 0) return '12 AM';
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return '12 PM';
  return `${hour - 12} PM`;
}

// ── Range label ──────────────────────────────────────────────────────

/** "March 30 — April 5, 2026" style date range label. */
export function formatDateRange(start: Date, end: Date): string {
  const startMonth = start.toLocaleDateString('en-US', { month: 'long' });
  const endMonth = end.toLocaleDateString('en-US', { month: 'long' });
  const startDay = start.getDate();
  const endDay = end.getDate();
  const endYear = end.getFullYear();

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay} — ${endDay}, ${endYear}`;
  }
  return `${startMonth} ${startDay} — ${endMonth} ${endDay}, ${endYear}`;
}
