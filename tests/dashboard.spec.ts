import { test, expect } from '@playwright/test';
import {
  TOTAL_TASKS_TODAY,
  COMPLETED_TODAY,
  INCOMPLETE_TODAY,
  OVERDUE_TASKS,
  ALL_INCOMPLETE,
  UNPLANNED_INCOMPLETE,
  TIMED_TASKS_TODAY,
  computeExpectedMetrics,
  getExpectedUpcomingTasks,
  getExpectedUnplannedTasks,
  getExpectedSchedule,
  waitForDashboardLoad,
} from './seed-data';

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
    await waitForDashboardLoad(page);

    const expected = computeExpectedMetrics();

    // Hard assertions: verify computed values match known seed data
    expect(expected.todaysTasks).toBe(TOTAL_TASKS_TODAY);
    expect(expected.todayCompleted).toBe(COMPLETED_TODAY);
    expect(expected.overdue).toBe(OVERDUE_TASKS);
    expect(expected.todo).toBe(ALL_INCOMPLETE);
    expect(expected.todayIncomplete).toBe(INCOMPLETE_TODAY);

    // Today's Tasks
    const todaysCard = page.locator('div').filter({ hasText: /^Today's Tasks/ }).first();
    await expect(todaysCard.locator('[data-testid="metric-value-Today\'s Tasks"]')).toHaveText(String(TOTAL_TASKS_TODAY));
    await expect(todaysCard.getByText(`${COMPLETED_TODAY} completed`)).toBeVisible();

    // Overdue
    const overdueCard = page.locator('div').filter({ hasText: /^Overdue/ }).first();
    await expect(overdueCard.locator('[data-testid="metric-value-Overdue"]')).toHaveText(String(OVERDUE_TASKS));

    // To-do
    const todoCard = page.locator('div').filter({ hasText: /^To-do/ }).first();
    await expect(todoCard.locator('[data-testid="metric-value-To-do"]')).toHaveText(String(ALL_INCOMPLETE));
    await expect(todoCard.getByText(`${INCOMPLETE_TODAY} due today`)).toBeVisible();

    // This Week (dynamic — depends on day of week)
    const weekCard = page.locator('div').filter({ hasText: /^This Week/ }).first();
    await expect(weekCard.locator('[data-testid="metric-value-This Week"]')).toHaveText(
      String(expected.thisWeek),
    );

    // Completion Rate (dynamic — depends on day of week)
    const rateCard = page.locator('div').filter({ hasText: /^Completion Rate/ }).first();
    await expect(rateCard.locator('[data-testid="metric-value-Completion Rate"]')).toHaveText(
      `${expected.completionRate}%`,
    );
    await expect(rateCard.getByText('this week')).toBeVisible();
  });

  test("shows today's schedule with correct times", async ({ page }) => {
    await waitForDashboardLoad(page);

    const expectedSchedule = getExpectedSchedule();
    const scheduleSection = page.locator('[data-testid="schedule-section"]');

    expect(expectedSchedule.length).toBe(TIMED_TASKS_TODAY);

    for (const item of expectedSchedule) {
      await expect(scheduleSection.getByText(item.title, { exact: true }).first()).toBeVisible();
      await expect(scheduleSection.getByText(item.displayTime).first()).toBeVisible();
    }

    const timeSlots = scheduleSection.locator('.w-10');
    await expect(timeSlots).toHaveCount(TIMED_TASKS_TODAY);
  });

  test('shows to-do section with unplanned tasks', async ({ page }) => {
    await waitForDashboardLoad(page);

    const todoSection = page.locator('[data-testid="todo-section"]');
    const expectedUnplanned = getExpectedUnplannedTasks();

    expect(expectedUnplanned.length).toBe(UNPLANNED_INCOMPLETE);

    for (const task of expectedUnplanned) {
      await expect(todoSection.getByText(task.title, { exact: true }).first()).toBeVisible();
    }

    await expect(todoSection.getByText('No unplanned tasks')).not.toBeVisible();
  });

  test('shows upcoming tasks from seeded data', async ({ page }) => {
    await waitForDashboardLoad(page);

    const expectedUpcoming = getExpectedUpcomingTasks().slice(0, 5);
    const upcomingSection = page.locator('[data-testid="upcoming-tasks-section"]');

    expect(expectedUpcoming.length).toBeGreaterThan(0);

    for (const task of expectedUpcoming) {
      await expect(upcomingSection.getByText(task.title, { exact: true }).first()).toBeVisible();
    }

    await expect(upcomingSection.getByText('No upcoming tasks')).not.toBeVisible();
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
