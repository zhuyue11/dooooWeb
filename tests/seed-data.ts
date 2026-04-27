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
  { title: 'Lunch with Sara', dateOffset: 0, hasTime: true, time: '12:30', isCompleted: false, priority: null, category: 'Home' },
  { title: 'Write blog post', dateOffset: 0, hasTime: false, isCompleted: true, priority: 'LOW', category: 'Learning' },
  { title: 'Gym session', dateOffset: 0, hasTime: true, time: '18:00', isCompleted: false, priority: null, category: 'Health' },
  { title: 'Buy groceries', dateOffset: 0, hasTime: false, isCompleted: false, priority: null, category: 'Shopping' },
  { title: 'Submit expense report', dateOffset: -1, hasTime: false, isCompleted: false, priority: 'MEDIUM', category: 'Work' },
  { title: 'Call dentist', dateOffset: -2, hasTime: false, isCompleted: false, priority: 'LOW', category: 'Health' },
  { title: 'Team retro', dateOffset: 1, hasTime: true, time: '14:00', isCompleted: false, priority: 'MEDIUM', category: 'Work' },
  { title: 'Read chapter 5', dateOffset: 1, hasTime: false, isCompleted: false, priority: 'LOW', category: 'Learning' },
  { title: 'Deploy v2.1', dateOffset: 2, hasTime: true, time: '10:00', isCompleted: false, priority: 'HIGH', category: 'Work' },
  { title: 'Update resume', dateOffset: -1, hasTime: false, isCompleted: true, priority: 'MEDIUM', category: 'Work' },
  { title: 'Plan weekend trip', dateOffset: 2, hasTime: false, isCompleted: false, priority: null, category: 'Travel' },
  { title: 'Fix bike tire', dateOffset: -2, hasTime: false, isCompleted: true, priority: 'LOW', category: 'Home' },
  // No-date (unplanned) tasks
  { title: 'Read "Deep Work" book', dateOffset: null, hasTime: false, isCompleted: false, priority: 'LOW', category: 'Learning' },
  { title: 'Organize desk', dateOffset: null, hasTime: false, isCompleted: false, priority: null, category: 'Home' },
  { title: 'Research vacation spots', dateOffset: null, hasTime: false, isCompleted: false, priority: null, category: 'Travel' },
  { title: 'Update LinkedIn profile', dateOffset: null, hasTime: false, isCompleted: true, priority: 'MEDIUM', category: 'Work' },
];

// ── Expected counts derived from ALL sources (personal + group + events) ──
// Dashboard shows: SCHEDULED items in calendar sections, to-do items (no-date + DUE) in to-do section.
// All seed tasks are dateType='SCHEDULED' (no DUE tasks seeded).

/** Today's Tasks (personal + group, NOT events): 6 personal + 2 group (gt01, gt02) */
export const TOTAL_TASKS_TODAY = 8;

/** Completed today (scheduled): 2 personal (t01, t04) + 0 group */
export const COMPLETED_TODAY = 2;

/** Incomplete today (scheduled): 4 personal + 2 group */
export const INCOMPLETE_TODAY = 6;

/** Past-dated incomplete: 2 personal (t07, t08) + 0 group */
export const OVERDUE_TASKS = 2;

/** To-do items: no-date + DUE tasks (incomplete). All seed = SCHEDULED, so only no-date: 3 personal (t15, t16, t17) */
export const TODO_ITEMS = 3;

/** No-date incomplete tasks (alias for backward compat): t15, t16, t17 */
export const UNPLANNED_INCOMPLETE = 3;

/** DUE tasks due today: 0 (no DUE tasks in seed) */
export const DUE_TODAY = 0;

/** Timed today (scheduled): 4 personal + 2 group (gt01 10:00, gt02 15:00) + 1 event (ev01 16:00) */
export const TIMED_TASKS_TODAY = 7;

// ── Calendar: Group tasks seeded for web user ──

export interface SeedGroupTask {
  id: string;
  title: string;
  dateOffset: number;
  hasTime: boolean;
  time: string; // "HH:MM" UTC
  isForAllMembers: boolean;
  webUserRole: 'owner' | 'participant';
  participantSummary?: { going: number; declined: number };
  category: string;
  priority: string | null;
}

export const SEED_GROUP_TASKS: SeedGroupTask[] = [
  { id: 'web-cal-gt01', title: 'Design sync', dateOffset: 0, hasTime: true, time: '10:00', isForAllMembers: false, webUserRole: 'owner', category: 'Work', priority: 'MEDIUM' },
  { id: 'web-cal-gt02', title: 'Code review session', dateOffset: 0, hasTime: true, time: '15:00', isForAllMembers: true, webUserRole: 'participant', participantSummary: { going: 2, declined: 1 }, category: 'Work', priority: 'HIGH' },
  { id: 'web-cal-gt03', title: 'Team lunch', dateOffset: 1, hasTime: true, time: '12:00', isForAllMembers: true, webUserRole: 'owner', participantSummary: { going: 3, declined: 0 }, category: 'Work', priority: null },
  { id: 'web-cal-gt04', title: 'Sprint demo', dateOffset: 2, hasTime: true, time: '14:00', isForAllMembers: true, webUserRole: 'participant', participantSummary: { going: 1, declined: 0 }, category: 'Work', priority: 'MEDIUM' },
  { id: 'web-cal-gt05', title: 'Standup rotation', dateOffset: 1, hasTime: true, time: '9:00', isForAllMembers: true, webUserRole: 'owner', participantSummary: { going: 2, declined: 0 }, category: 'Work', priority: null },
];

/** Group tasks visible on today's column */
export const GROUP_TASKS_TODAY = 2; // gt01 + gt02
/** Group tasks visible on tomorrow's column */
export const GROUP_TASKS_TOMORROW = 2; // gt03 + gt05

// ── Calendar: Events seeded for web user ──

export interface SeedEvent {
  id: string;
  title: string;
  dateOffset: number;
  hasTime: boolean;
  time: string; // "HH:MM" UTC
  webUserRole: 'owner' | 'attendee' | 'organizer';
  location?: string;
}

export const SEED_EVENTS: SeedEvent[] = [
  { id: 'web-cal-ev01', title: 'Product launch', dateOffset: 0, hasTime: true, time: '16:00', webUserRole: 'owner' },
  { id: 'web-cal-ev02', title: 'Client meeting', dateOffset: 1, hasTime: true, time: '10:00', webUserRole: 'attendee', location: 'Conference Room B' },
  { id: 'web-cal-ev03', title: 'Team retrospective', dateOffset: 2, hasTime: true, time: '11:00', webUserRole: 'organizer' },
];

/** Events on today's column */
export const EVENTS_TODAY = 1; // ev01
/** Events on tomorrow's column */
export const EVENTS_TOMORROW = 1; // ev02

/**
 * Total items today in calendar (tasks + group tasks + events).
 * 6 personal + 2 group + 1 event = 9
 */
export const TOTAL_ITEMS_TODAY = TOTAL_TASKS_TODAY + EVENTS_TODAY; // 8 + 1 = 9

// ── Helper functions ──

export function computeExpectedMetrics() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Use Monday-start week (matches HomePage's startOfWeek() default)
  const dayOfWeek = today.getDay();
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekStart = new Date(today.getTime() - mondayOffset * 86400000);
  const weekEnd = new Date(weekStart.getTime() + 6 * 86400000);

  function taskDate(offset: number): Date {
    return new Date(today.getTime() + offset * 86400000);
  }

  // Personal tasks in week
  const personalWeek = SEED_TASKS.filter((t) => {
    if (t.dateOffset === null) return false;
    const d = taskDate(t.dateOffset);
    return d >= weekStart && d <= weekEnd;
  });
  const personalWeekCompleted = personalWeek.filter((t) => t.isCompleted).length;

  // Group tasks in week
  const groupWeek = SEED_GROUP_TASKS.filter((t) => {
    const d = taskDate(t.dateOffset);
    return d >= weekStart && d <= weekEnd;
  });
  const groupWeekCompleted = 0; // all group tasks are incomplete in seed

  const thisWeek = personalWeek.length + groupWeek.length;
  const weekCompleted = personalWeekCompleted + groupWeekCompleted;
  const completionRate = thisWeek > 0 ? Math.round((weekCompleted / thisWeek) * 100) : 0;

  return {
    todaysTasks: TOTAL_TASKS_TODAY,
    todayCompleted: COMPLETED_TODAY,
    overdue: OVERDUE_TASKS,
    todo: TODO_ITEMS,
    todayIncomplete: INCOMPLETE_TODAY,
    dueToday: DUE_TODAY,
    thisWeek,
    weekCompleted,
    completionRate,
  };
}

/** Upcoming items from all sources (personal + group + events), sorted by date+time */
export function getExpectedUpcomingTasks(): Array<{ title: string; dateOffset: number; hasTime: boolean; time?: string }> {
  const personal = SEED_TASKS
    .filter((t) => t.dateOffset !== null && t.dateOffset >= 0 && !t.isCompleted)
    .map((t) => ({ title: t.title, dateOffset: t.dateOffset!, hasTime: t.hasTime, time: t.time }));

  const group = SEED_GROUP_TASKS
    .filter((t) => t.dateOffset >= 0)
    .map((t) => ({ title: t.title, dateOffset: t.dateOffset, hasTime: t.hasTime, time: t.time }));

  const events = SEED_EVENTS
    .filter((t) => t.dateOffset >= 0)
    .map((t) => ({ title: t.title, dateOffset: t.dateOffset, hasTime: t.hasTime, time: t.time }));

  return [...personal, ...group, ...events].sort((a, b) => {
    const aMinutes = a.dateOffset * 24 * 60 + (a.hasTime && a.time ? parseInt(a.time.split(':')[0]) * 60 + parseInt(a.time.split(':')[1]) : 0);
    const bMinutes = b.dateOffset * 24 * 60 + (b.hasTime && b.time ? parseInt(b.time.split(':')[0]) * 60 + parseInt(b.time.split(':')[1]) : 0);
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

  function toDisplayTime(utcTime: string): string {
    const utcDate = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(),
      parseInt(utcTime.split(':')[0]), parseInt(utcTime.split(':')[1])));
    const h = utcDate.getHours();
    const m = String(utcDate.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  }

  const items: ExpectedScheduleItem[] = [];

  // Personal tasks with time today
  for (const t of SEED_TASKS) {
    if (t.dateOffset === 0 && t.hasTime && t.time) {
      items.push({ title: t.title, displayTime: toDisplayTime(t.time) });
    }
  }
  // Group tasks with time today
  for (const t of SEED_GROUP_TASKS) {
    if (t.dateOffset === 0 && t.hasTime && t.time) {
      items.push({ title: t.title, displayTime: toDisplayTime(t.time) });
    }
  }
  // Events with time today
  for (const e of SEED_EVENTS) {
    if (e.dateOffset === 0 && e.hasTime && e.time) {
      items.push({ title: e.title, displayTime: toDisplayTime(e.time) });
    }
  }

  return items.sort((a, b) => a.displayTime.localeCompare(b.displayTime));
}

/** Returns all seed tasks (personal + group) expected in the current week's calendar */
export function getExpectedWeekTasks(): (SeedTask | SeedGroupTask)[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayOfWeek = today.getDay();
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekStart = new Date(today.getTime() - mondayOffset * 86400000);
  const weekEnd = new Date(weekStart.getTime() + 6 * 86400000);

  const personalInWeek = SEED_TASKS.filter((t) => {
    if (t.dateOffset === null) return false;
    const d = new Date(today.getTime() + t.dateOffset * 86400000);
    return d >= weekStart && d <= weekEnd;
  });

  const groupInWeek = SEED_GROUP_TASKS.filter((t) => {
    const d = new Date(today.getTime() + t.dateOffset * 86400000);
    return d >= weekStart && d <= weekEnd;
  });

  return [...personalInWeek, ...groupInWeek];
}

/** Returns tasks expected for today (personal + group + events) */
export function getExpectedTodayItems(): { tasks: SeedTask[]; groupTasks: SeedGroupTask[]; events: SeedEvent[] } {
  return {
    tasks: SEED_TASKS.filter((t) => t.dateOffset === 0),
    groupTasks: SEED_GROUP_TASKS.filter((t) => t.dateOffset === 0),
    events: SEED_EVENTS.filter((t) => t.dateOffset === 0),
  };
}

/** Wait for calendar API data to finish loading */
export async function waitForCalendarLoad(page: import('@playwright/test').Page) {
  await page.goto('/calendar');
  // Wait for the calendar date range to appear (indicates data loaded)
  await page.waitForSelector('[data-testid="calendar-date-range"]', { timeout: 10000 });
  // Wait for at least one task card to appear (data fetched)
  await page.waitForSelector('[data-testid^="task-card-"]', { timeout: 10000 });
}

/** Wait for dashboard API data to finish loading */
export async function waitForDashboardLoad(page: import('@playwright/test').Page) {
  await page.goto('/home');
  await page.waitForFunction(() => {
    const els = document.querySelectorAll('[data-testid^="metric-value-"]');
    return els.length > 0 && Array.from(els).every((el) => el.textContent !== '—');
  }, { timeout: 10000 });
}

// ── Seed plan IDs (must match dooooBackend/prisma/seed.ts) ──

export const SEED_PLANS = {
  /** User-owned plan with 4 templates */
  MORNING_ROUTINE: 'web-plan-morning-routine',
  /** AI-generated plan with 2 templates + HTML description */
  GUITAR_BASICS: 'web-plan-guitar-basics',
  /** Plan with 3 templates, NO time fields (triggers TimePreferenceModal) */
  WEEKLY_PLANNING: 'web-plan-weekly-planning',
  /** Plan with 0 templates (empty state testing) */
  EMPTY: 'web-plan-empty',
} as const;

export const SEED_PLAN_TEMPLATES = {
  MORNING_ROUTINE: [
    { title: 'Morning Stretch', time: '7 AM', duration: '10m', gapDays: 0, hasRepeat: true },
    { title: 'Morning Journal', time: '7:15 AM', duration: '15m', gapDays: 0, hasRepeat: false },
    { title: 'Meditation', time: '7:30 AM', duration: '15m', gapDays: 0, hasRepeat: false },
    { title: 'Review Daily Goals', time: '7:45 AM', duration: '10m', gapDays: 1, hasRepeat: false },
  ],
  GUITAR_BASICS: [
    { title: 'Learn Proper Posture', time: '7 PM', duration: '20m', gapDays: 0, hasRepeat: true },
    { title: 'First Three Chords', time: '7:30 PM', duration: '25m', gapDays: 3, hasRepeat: false },
  ],
  WEEKLY_PLANNING: [
    { title: 'Review Week Goals', duration: '20m', gapDays: 0 },
    { title: 'Plan Next Week', duration: '30m', gapDays: 0 },
    { title: 'Organize Tasks', duration: '15m', gapDays: 1 },
  ],
} as const;
