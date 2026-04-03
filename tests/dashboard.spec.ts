import { test, expect } from '@playwright/test';

// ── Seed data mirror (must match dooooBackend/prisma/seed.ts web dashboard tasks) ──

interface SeedTask {
  title: string;
  dateOffset: number; // 0 = today, -1 = yesterday, 1 = tomorrow, etc.
  hasTime: boolean;
  time?: string; // "HH:MM" format
  isCompleted: boolean;
  priority: string | null;
  category: string;
}

const SEED_TASKS: SeedTask[] = [
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
];

// ── Metric computation (mirrors frontend logic) ──

function computeExpectedMetrics() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Monday of current week
  const dayOfWeek = today.getDay(); // 0=Sun … 6=Sat
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekStart = new Date(today.getTime() - mondayOffset * 86400000);
  const weekEnd = new Date(weekStart.getTime() + 6 * 86400000);

  function taskDate(offset: number): Date {
    return new Date(today.getTime() + offset * 86400000);
  }

  const todayTasks = SEED_TASKS.filter((t) => t.dateOffset === 0);
  const todayCompleted = todayTasks.filter((t) => t.isCompleted).length;

  const overdueTasks = SEED_TASKS.filter((t) => t.dateOffset < 0 && !t.isCompleted);

  const todoTasks = SEED_TASKS.filter((t) => !t.isCompleted);

  const weekTasks = SEED_TASKS.filter((t) => {
    const d = taskDate(t.dateOffset);
    return d >= weekStart && d <= weekEnd;
  });
  const weekCompleted = weekTasks.filter((t) => t.isCompleted).length;
  const completionRate = weekTasks.length > 0 ? Math.round((weekCompleted / weekTasks.length) * 100) : 0;

  const todayIncomplete = todayTasks.filter((t) => !t.isCompleted).length;

  return {
    todaysTasks: todayTasks.length,
    todayCompleted,
    overdue: overdueTasks.length,
    todo: todoTasks.length,
    todayIncomplete,
    thisWeek: weekTasks.length,
    weekCompleted,
    completionRate,
  };
}

function getExpectedUpcomingTasks(): SeedTask[] {
  // Sort to match frontend: by Date value ascending
  // No-time tasks have date at midnight (00:00), timed tasks at their specified time
  // So no-time tasks sort BEFORE same-day timed tasks
  return SEED_TASKS.filter((t) => t.dateOffset >= 0 && !t.isCompleted).sort((a, b) => {
    const aMinutes = a.dateOffset * 24 * 60 + (a.hasTime && a.time ? parseInt(a.time.split(':')[0]) * 60 + parseInt(a.time.split(':')[1]) : 0);
    const bMinutes = b.dateOffset * 24 * 60 + (b.hasTime && b.time ? parseInt(b.time.split(':')[0]) * 60 + parseInt(b.time.split(':')[1]) : 0);
    return aMinutes - bMinutes;
  });
}

interface ExpectedScheduleItem {
  title: string;
  displayTime: string; // Time as displayed in the browser (local timezone)
}

function getExpectedSchedule(): ExpectedScheduleItem[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return SEED_TASKS.filter((t) => t.dateOffset === 0 && t.hasTime)
    .map((t) => {
      // Recreate the UTC date the same way the seed does:
      // seed runs in UTC Docker, so setTime(today, 9, 0) creates 2026-04-03T09:00:00.000Z
      const utcDate = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(),
        parseInt(t.time!.split(':')[0]), parseInt(t.time!.split(':')[1])));
      // Browser displays in local timezone via getHours()/getMinutes()
      const h = utcDate.getHours();
      const m = String(utcDate.getMinutes()).padStart(2, '0');
      return { title: t.title, displayTime: `${h}:${m}` };
    })
    .sort((a, b) => a.displayTime.localeCompare(b.displayTime));
}

// ── Tests ──

test.describe('Dashboard', () => {
  test('shows greeting with user name', async ({ page }) => {
    await page.goto('/home');
    await expect(
      page.getByRole('heading', { name: /Good (morning|afternoon|evening), Web/ }),
    ).toBeVisible();
  });

  test("shows today's date", async ({ page }) => {
    await page.goto('/home');
    const month = new Date().toLocaleDateString('en-US', { month: 'long' });
    await expect(page.getByText(new RegExp(month))).toBeVisible();
  });

  test('shows correct metric values from seeded data', async ({ page }) => {
    await page.goto('/home');

    // Wait for API data to load (metric values replace "—" placeholder)
    await page.waitForFunction(() => {
      const els = document.querySelectorAll('[data-testid^="metric-value-"]');
      return els.length > 0 && Array.from(els).every((el) => el.textContent !== '—');
    }, { timeout: 10000 });

    const expected = computeExpectedMetrics();

    // Today's Tasks
    const todaysCard = page.locator('div').filter({ hasText: /^Today's Tasks/ }).first();
    await expect(todaysCard.locator('[data-testid="metric-value-Today\'s Tasks"]')).toHaveText(
      String(expected.todaysTasks),
    );
    await expect(todaysCard.getByText(`${expected.todayCompleted} completed`)).toBeVisible();

    // Overdue
    const overdueCard = page.locator('div').filter({ hasText: /^Overdue/ }).first();
    await expect(overdueCard.locator('[data-testid="metric-value-Overdue"]')).toHaveText(
      String(expected.overdue),
    );

    // To-do
    const todoCard = page.locator('div').filter({ hasText: /^To-do/ }).first();
    await expect(todoCard.locator('[data-testid="metric-value-To-do"]')).toHaveText(
      String(expected.todo),
    );
    await expect(todoCard.getByText(`${expected.todayIncomplete} due today`)).toBeVisible();

    // This Week
    const weekCard = page.locator('div').filter({ hasText: /^This Week/ }).first();
    await expect(weekCard.locator('[data-testid="metric-value-This Week"]')).toHaveText(
      String(expected.thisWeek),
    );

    // Completion Rate
    const rateCard = page.locator('div').filter({ hasText: /^Completion Rate/ }).first();
    await expect(rateCard.locator('[data-testid="metric-value-Completion Rate"]')).toHaveText(
      `${expected.completionRate}%`,
    );
    await expect(rateCard.getByText('this week')).toBeVisible();
  });

  test('shows upcoming tasks from seeded data', async ({ page }) => {
    await page.goto('/home');
    await page.waitForFunction(() => {
      const els = document.querySelectorAll('[data-testid^="metric-value-"]');
      return els.length > 0 && Array.from(els).every((el) => el.textContent !== '—');
    }, { timeout: 10000 });

    const expectedUpcoming = getExpectedUpcomingTasks().slice(0, 5);
    const upcomingSection = page.locator('[data-testid="upcoming-tasks-section"]');

    for (const task of expectedUpcoming) {
      await expect(upcomingSection.getByText(task.title, { exact: true }).first()).toBeVisible();
    }
  });

  test("shows today's schedule with correct times", async ({ page }) => {
    await page.goto('/home');
    await page.waitForFunction(() => {
      const els = document.querySelectorAll('[data-testid^="metric-value-"]');
      return els.length > 0 && Array.from(els).every((el) => el.textContent !== '—');
    }, { timeout: 10000 });

    const expectedSchedule = getExpectedSchedule();
    const scheduleSection = page.locator('[data-testid="schedule-section"]');

    // Verify all timed tasks appear with correct titles and times
    for (const item of expectedSchedule) {
      await expect(scheduleSection.getByText(item.title, { exact: true }).first()).toBeVisible();
      await expect(scheduleSection.getByText(item.displayTime).first()).toBeVisible();
    }

    // Verify correct number of schedule items
    const timeSlots = scheduleSection.locator('.w-10');
    await expect(timeSlots).toHaveCount(expectedSchedule.length);
  });

  test('"View all" navigates to todo page', async ({ page }) => {
    await page.goto('/home');
    await page.click('text=View all');
    await expect(page).toHaveURL('/todo');
  });

  test('"Open calendar" navigates to calendar page', async ({ page }) => {
    await page.goto('/home');
    await page.click('text=Open calendar');
    await expect(page).toHaveURL('/calendar');
  });
});
