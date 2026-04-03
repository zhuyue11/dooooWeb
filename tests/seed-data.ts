/**
 * Shared seed data constants for E2E tests.
 * Must match dooooBackend/prisma/seed.ts web dashboard tasks (web@doooo.co user).
 */

// ── Seed task definitions ──

export interface SeedTask {
  title: string;
  dateOffset: number | null; // 0 = today, -1 = yesterday, null = no date (unplanned)
  hasTime: boolean;
  time?: string; // "HH:MM" format (UTC time as stored by Docker seed)
  isCompleted: boolean;
  priority: string | null;
  category: string;
}

export const SEED_TASKS: SeedTask[] = [
  { title: 'Morning standup', dateOffset: 0, hasTime: true, time: '9:00', isCompleted: true, priority: 'MEDIUM', category: 'Work' },
  { title: 'Review PR #42', dateOffset: 0, hasTime: true, time: '11:00', isCompleted: false, priority: 'HIGH', category: 'Work' },
  { title: 'Lunch with Sara', dateOffset: 0, hasTime: true, time: '12:30', isCompleted: false, priority: null, category: 'Personal' },
  { title: 'Write blog post', dateOffset: 0, hasTime: false, isCompleted: true, priority: 'LOW', category: 'Learning' },
  { title: 'Gym session', dateOffset: 0, hasTime: true, time: '18:00', isCompleted: false, priority: null, category: 'Health' },
  { title: 'Buy groceries', dateOffset: 0, hasTime: false, isCompleted: false, priority: null, category: 'Shopping' },
  { title: 'Submit expense report', dateOffset: -1, hasTime: false, isCompleted: false, priority: 'MEDIUM', category: 'Work' },
  { title: 'Call dentist', dateOffset: -2, hasTime: false, isCompleted: false, priority: 'LOW', category: 'Health' },
  { title: 'Team retro', dateOffset: 1, hasTime: true, time: '14:00', isCompleted: false, priority: 'MEDIUM', category: 'Work' },
  { title: 'Read chapter 5', dateOffset: 1, hasTime: false, isCompleted: false, priority: 'LOW', category: 'Learning' },
  { title: 'Deploy v2.1', dateOffset: 2, hasTime: true, time: '10:00', isCompleted: false, priority: 'HIGH', category: 'Work' },
  { title: 'Update resume', dateOffset: -1, hasTime: false, isCompleted: true, priority: 'MEDIUM', category: 'Personal' },
  { title: 'Plan weekend trip', dateOffset: 2, hasTime: false, isCompleted: false, priority: null, category: 'Travel' },
  { title: 'Fix bike tire', dateOffset: -2, hasTime: false, isCompleted: true, priority: 'LOW', category: 'Home' },
  // No-date (unplanned) tasks
  { title: 'Read "Deep Work" book', dateOffset: null, hasTime: false, isCompleted: false, priority: 'LOW', category: 'Learning' },
  { title: 'Organize desk', dateOffset: null, hasTime: false, isCompleted: false, priority: null, category: 'Home' },
  { title: 'Research vacation spots', dateOffset: null, hasTime: false, isCompleted: false, priority: null, category: 'Travel' },
  { title: 'Update LinkedIn profile', dateOffset: null, hasTime: false, isCompleted: true, priority: 'MEDIUM', category: 'Personal' },
];

// ── Expected counts derived from SEED_TASKS ──
// Update these when adding/removing seed tasks

/** Tasks with dateOffset=0: t01-t06 */
export const TOTAL_TASKS_TODAY = 6;

/** Completed tasks with dateOffset=0: t01 (Morning standup), t04 (Write blog post) */
export const COMPLETED_TODAY = 2;

/** Incomplete tasks with dateOffset=0: t02, t03, t05, t06 */
export const INCOMPLETE_TODAY = 4;

/** Past-dated incomplete tasks: t07 (Submit expense report), t08 (Call dentist) */
export const OVERDUE_TASKS = 2;

/** All incomplete tasks (dated + undated): 10 dated + 3 undated */
export const ALL_INCOMPLETE = 13;

/** No-date incomplete tasks: t15, t16, t17 */
export const UNPLANNED_INCOMPLETE = 3;

/** Tasks with dateOffset=0 and hasTime=true: t01, t02, t03, t05 */
export const TIMED_TASKS_TODAY = 4;

// ── Helper functions ──

export function computeExpectedMetrics() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const dayOfWeek = today.getDay();
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekStart = new Date(today.getTime() - mondayOffset * 86400000);
  const weekEnd = new Date(weekStart.getTime() + 6 * 86400000);

  function taskDate(offset: number): Date {
    return new Date(today.getTime() + offset * 86400000);
  }

  const datedTasks = SEED_TASKS.filter((t) => t.dateOffset !== null);

  const weekTasks = datedTasks.filter((t) => {
    const d = taskDate(t.dateOffset!);
    return d >= weekStart && d <= weekEnd;
  });
  const weekCompleted = weekTasks.filter((t) => t.isCompleted).length;
  const completionRate = weekTasks.length > 0 ? Math.round((weekCompleted / weekTasks.length) * 100) : 0;

  return {
    todaysTasks: TOTAL_TASKS_TODAY,
    todayCompleted: COMPLETED_TODAY,
    overdue: OVERDUE_TASKS,
    todo: ALL_INCOMPLETE,
    todayIncomplete: INCOMPLETE_TODAY,
    thisWeek: weekTasks.length,
    weekCompleted,
    completionRate,
  };
}

export function getExpectedUpcomingTasks(): SeedTask[] {
  return SEED_TASKS.filter((t) => t.dateOffset !== null && t.dateOffset >= 0 && !t.isCompleted).sort((a, b) => {
    const aMinutes = a.dateOffset! * 24 * 60 + (a.hasTime && a.time ? parseInt(a.time.split(':')[0]) * 60 + parseInt(a.time.split(':')[1]) : 0);
    const bMinutes = b.dateOffset! * 24 * 60 + (b.hasTime && b.time ? parseInt(b.time.split(':')[0]) * 60 + parseInt(b.time.split(':')[1]) : 0);
    return aMinutes - bMinutes;
  });
}

export function getExpectedUnplannedTasks(): SeedTask[] {
  return SEED_TASKS.filter((t) => t.dateOffset === null && !t.isCompleted);
}

export interface ExpectedScheduleItem {
  title: string;
  displayTime: string;
}

export function getExpectedSchedule(): ExpectedScheduleItem[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return SEED_TASKS.filter((t) => t.dateOffset === 0 && t.hasTime)
    .map((t) => {
      // Seed runs in UTC Docker, so time values are UTC.
      // Browser displays in local timezone via getHours()/getMinutes().
      const utcDate = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(),
        parseInt(t.time!.split(':')[0]), parseInt(t.time!.split(':')[1])));
      const h = utcDate.getHours();
      const m = String(utcDate.getMinutes()).padStart(2, '0');
      return { title: t.title, displayTime: `${h}:${m}` };
    })
    .sort((a, b) => a.displayTime.localeCompare(b.displayTime));
}

/** Wait for dashboard API data to finish loading */
export async function waitForDashboardLoad(page: import('@playwright/test').Page) {
  await page.goto('/home');
  await page.waitForFunction(() => {
    const els = document.querySelectorAll('[data-testid^="metric-value-"]');
    return els.length > 0 && Array.from(els).every((el) => el.textContent !== '—');
  }, { timeout: 10000 });
}
