// ── Date utilities shared across pages ──────────────────────────────────
import i18n from '@/lib/i18n';

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
  return d.toLocaleDateString(i18n.language, { month: 'long', year: 'numeric' });
}

/** "Thursday, April 2, 2026" */
export function formatFullDate(d: Date): string {
  return d.toLocaleDateString(i18n.language, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

// ── Day timeline helpers ─────────────────────────────────────────────

/** Returns array of hours [0, 1, 2, ..., 23]. */
export function getHoursArray(): number[] {
  return Array.from({ length: 24 }, (_, i) => i);
}

/** "8 AM" / "12 PM" (12h) or "8" / "14" (24h) */
export function formatHourLabel(hour: number, timeFormat: TimeFormat = '12h'): string {
  if (timeFormat === '24h') return String(hour);
  if (hour === 0) return '12 AM';
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return '12 PM';
  return `${hour - 12} PM`;
}

// ── Time range formatting ───────────────────────────────────────────

/**
 * Format a start time + duration into a time range string.
 * When the end time falls on a different day, includes short dates:
 *   same day:  "9:00 PM — 11:30 PM"
 *   cross day: "May 1, 9:00 PM — May 2, 2:30 AM"
 */
export function formatTimeRange(
  dateStr: string,
  durationMinutes: number,
  timeFormat: TimeFormat = '24h',
): string {
  const startTime = formatTime(dateStr, timeFormat);
  const startDate = new Date(dateStr);
  const endDate = new Date(startDate.getTime() + durationMinutes * 60_000);
  const endTime = formatTime(endDate.toISOString(), timeFormat);

  // Same calendar day — just times
  if (
    startDate.getFullYear() === endDate.getFullYear() &&
    startDate.getMonth() === endDate.getMonth() &&
    startDate.getDate() === endDate.getDate()
  ) {
    return `${startTime} — ${endTime}`;
  }

  // Different days — include short date with each time
  const shortDate = (d: Date) =>
    d.toLocaleDateString(i18n.language, { month: 'short', day: 'numeric' });
  return `${shortDate(startDate)}, ${startTime} — ${shortDate(endDate)}, ${endTime}`;
}

// ── Reminder formatting ─────────────────────────────────────────────

/** Format a reminder offset in minutes to a human-readable string. */
export function formatReminder(minutes: number | null | undefined): string | null {
  if (minutes == null) return null;
  if (minutes === 0) return 'At time';
  if (minutes < 60) return `${minutes} min before`;
  if (minutes < 1440) {
    const h = Math.floor(minutes / 60);
    return `${h} hr${h > 1 ? 's' : ''} before`;
  }
  const d = Math.floor(minutes / 1440);
  return `${d} day${d > 1 ? 's' : ''} before`;
}

// ── Duration formatting ─────────────────────────────────────────────

/** Format duration in minutes to human-friendly string using i18n. */
export function formatDuration(
  minutes: number | null | undefined,
  t: (key: string) => string,
): string | null {
  if (!minutes || minutes === 0) return null;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const parts: string[] = [];
  if (hours > 0) {
    parts.push(`${hours}${hours === 1 ? t('tasks.panel.hour') : t('tasks.panel.hours')}`);
  }
  if (mins > 0) {
    parts.push(`${mins}${mins === 1 ? t('tasks.panel.minute') : t('tasks.panel.minutes')}`);
  }
  return parts.join(' ') || null;
}

// ── Completion time formatting ──────────────────────────────────────

/** Format a completion timestamp — time only if today, full date+time otherwise. */
export function formatCompletionTime(
  completedAt: string | null | undefined,
  isForAllMembers: boolean | undefined,
  t: (key: string) => string,
): string | null {
  if (!completedAt) return null;
  const d = new Date(completedAt);
  const now = new Date();
  const isToday = d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();

  const label = isForAllMembers ? t('tasks.panel.endedAt') : t('tasks.panel.completedAt');
  const timeStr = d.toLocaleTimeString(i18n.language, { hour: 'numeric', minute: '2-digit' });

  if (isToday) {
    return `${label} ${timeStr}`;
  }
  const dateStr = d.toLocaleDateString(i18n.language, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  return `${label} ${dateStr} ${timeStr}`;
}

// ── Repeat formatting ───────────────────────────────────────────────

/** Format a repeat pattern to a translated human-readable string. */
export function formatRepeatDisplay(
  repeat: unknown,
  t: (key: string) => string,
): string | null {
  if (!repeat) return null;
  const r = repeat as { type?: string; interval?: number };
  if (r.type === 'daily') return r.interval && r.interval > 1 ? `${t('tasks.panel.every')} ${r.interval} ${t('tasks.panel.days')}` : t('tasks.panel.daily');
  if (r.type === 'weekly') return r.interval && r.interval > 1 ? `${t('tasks.panel.every')} ${r.interval} ${t('tasks.panel.weeks')}` : t('tasks.panel.weekly');
  if (r.type === 'monthly') return r.interval && r.interval > 1 ? `${t('tasks.panel.every')} ${r.interval} ${t('tasks.panel.months')}` : t('tasks.panel.monthly');
  if (r.type === 'yearly') return r.interval && r.interval > 1 ? `${t('tasks.panel.every')} ${r.interval} ${t('tasks.panel.years')}` : t('tasks.panel.yearly');
  return t('itemView.repeat');
}

// ── Time past check ─────────────────────────────────────────────────

/** Check if a task/event's time is in the past. */
export function isTaskTimeInPast(date: string | null | undefined, hasTime: boolean): boolean {
  if (!date) return false;
  const now = new Date();
  if (hasTime) {
    return new Date(date).getTime() < now.getTime();
  }
  // All-day: past if the date is before today
  const taskDate = new Date(date);
  return taskDate.getFullYear() < now.getFullYear() ||
    (taskDate.getFullYear() === now.getFullYear() && taskDate.getMonth() < now.getMonth()) ||
    (taskDate.getFullYear() === now.getFullYear() && taskDate.getMonth() === now.getMonth() && taskDate.getDate() < now.getDate());
}

/**
 * Check if a group activity has ended (for manual completion by organizer/admin).
 * Stricter than isTaskTimeInPast — accounts for duration.
 * - Timed activity: now >= startTime + duration
 * - All-day activity: now >= next day midnight
 */
export function hasActivityEnded(date: string | null | undefined, hasTime: boolean, duration: number | undefined): boolean {
  if (!date) return false;
  const now = new Date();
  const taskDate = new Date(date);
  if (hasTime) {
    const durationMs = (duration || 0) * 60 * 1000;
    const endTime = new Date(taskDate.getTime() + durationMs);
    return now >= endTime;
  }
  // All-day: can complete starting the next day (midnight)
  const nextDay = new Date(taskDate);
  nextDay.setDate(nextDay.getDate() + 1);
  nextDay.setHours(0, 0, 0, 0);
  return now >= nextDay;
}

// ── Range label ──────────────────────────────────────────────────────

/** "March 30 — April 5, 2026" style date range label. */
export function formatDateRange(start: Date, end: Date): string {
  const startMonth = start.toLocaleDateString(i18n.language, { month: 'long' });
  const endMonth = end.toLocaleDateString(i18n.language, { month: 'long' });
  const startDay = start.getDate();
  const endDay = end.getDate();
  const endYear = end.getFullYear();

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay} — ${endDay}, ${endYear}`;
  }
  return `${startMonth} ${startDay} — ${endMonth} ${endDay}, ${endYear}`;
}
