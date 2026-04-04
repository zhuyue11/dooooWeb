import { test, expect } from '@playwright/test';
import {
  TOTAL_TASKS_TODAY,
  COMPLETED_TODAY,
  INCOMPLETE_TODAY,
  OVERDUE_TASKS,
  TODO_ITEMS,
  UNPLANNED_INCOMPLETE,
  SEED_TASKS,
  SEED_GROUP_TASKS,
  SEED_EVENTS,
  EVENTS_TODAY,
  computeExpectedMetrics,
  getExpectedUpcomingTasks,
  getExpectedUnplannedTasks,
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
    expect(expected.todo).toBe(TODO_ITEMS);
    expect(expected.todayIncomplete).toBe(INCOMPLETE_TODAY);

    // Today's Tasks
    const todaysCard = page.locator('div').filter({ hasText: /^Today's Tasks/ }).first();
    await expect(todaysCard.locator('[data-testid="metric-value-Today\'s Tasks"]')).toHaveText(String(TOTAL_TASKS_TODAY));
    await expect(todaysCard.getByText(`${COMPLETED_TODAY} completed`)).toBeVisible();
    // Event count shown in sub-text (e.g. "2 completed · 1 event")
    if (EVENTS_TODAY > 0) {
      await expect(todaysCard).toContainText(`${EVENTS_TODAY} event`);
    }

    // Overdue
    const overdueCard = page.locator('div').filter({ hasText: /^Overdue/ }).first();
    await expect(overdueCard.locator('[data-testid="metric-value-Overdue"]')).toHaveText(String(OVERDUE_TASKS));

    // To-do — count may be higher than seed data if other tests created no-date tasks
    const todoCard = page.locator('div').filter({ hasText: /^To-do/ }).first();
    const todoText = await todoCard.locator('[data-testid="metric-value-To-do"]').textContent();
    expect(parseInt(todoText!)).toBeGreaterThanOrEqual(TODO_ITEMS);
    await expect(todoCard.getByText(expected.dueToday > 0 ? `${expected.dueToday} due today` : 'no deadlines today')).toBeVisible();

    // This Week (dynamic — depends on day of week and other tests creating tasks)
    const weekCard = page.locator('div').filter({ hasText: /^This Week/ }).first();
    const weekText = await weekCard.locator('[data-testid="metric-value-This Week"]').textContent();
    expect(parseInt(weekText!)).toBeGreaterThanOrEqual(expected.thisWeek);

    // Completion Rate (dynamic — depends on day of week and task mutations)
    const rateCard = page.locator('div').filter({ hasText: /^Completion Rate/ }).first();
    const rateText = await rateCard.locator('[data-testid="metric-value-Completion Rate"]').textContent();
    expect(rateText).toMatch(/^\d+%$/); // Just verify it's a valid percentage
    await expect(rateCard.getByText('this week')).toBeVisible();
  });

  test('Today panel shows all items for today', async ({ page }) => {
    await waitForDashboardLoad(page);

    const todaySection = page.locator('[data-testid="today-section"]');

    // All today items: personal tasks + group tasks + events
    const personalToday = SEED_TASKS.filter((t) => t.dateOffset === 0);
    const groupToday = SEED_GROUP_TASKS.filter((t) => t.dateOffset === 0);
    const eventsToday = SEED_EVENTS.filter((t) => t.dateOffset === 0);

    // Verify expected count of items rendered in the panel
    const todayExpectedCount = personalToday.length + groupToday.length + eventsToday.length;
    expect(todayExpectedCount).toBe(TOTAL_TASKS_TODAY + EVENTS_TODAY);

    // Check each item exists in DOM (some may be scrolled out of view in the overflow panel)
    for (const item of [...personalToday, ...groupToday, ...eventsToday]) {
      await expect(todaySection.getByText(item.title, { exact: true }).first()).toBeAttached();
    }

    await expect(todaySection.getByText('Nothing for today')).not.toBeVisible();
  });

  test('Overdue panel shows past incomplete tasks', async ({ page }) => {
    await waitForDashboardLoad(page);

    const overdueSection = page.locator('[data-testid="overdue-section"]');
    await expect(overdueSection).toBeVisible();

    // Overdue personal tasks from seed
    const overduePersonal = SEED_TASKS.filter((t) => t.dateOffset !== null && t.dateOffset < 0 && !t.isCompleted);
    expect(overduePersonal.length).toBe(OVERDUE_TASKS);

    for (const task of overduePersonal) {
      await expect(overdueSection.getByText(task.title, { exact: true }).first()).toBeVisible();
    }
  });

  test('shows to-do section with unplanned tasks', async ({ page }) => {
    await waitForDashboardLoad(page);

    const todoSection = page.locator('[data-testid="todo-section"]');
    const expectedUnplanned = getExpectedUnplannedTasks();

    expect(expectedUnplanned.length).toBe(UNPLANNED_INCOMPLETE);

    for (const task of expectedUnplanned) {
      await expect(todoSection.getByText(task.title, { exact: true }).first()).toBeVisible();
    }

    await expect(todoSection.getByText('No to-do items')).not.toBeVisible();
  });

  test('shows upcoming tasks excluding today', async ({ page }) => {
    await waitForDashboardLoad(page);

    const expectedUpcoming = getExpectedUpcomingTasks()
      .filter((t) => t.dateOffset > 0) // tomorrow+ only
      .slice(0, 5);
    const upcomingSection = page.locator('[data-testid="upcoming-tasks-section"]');

    expect(expectedUpcoming.length).toBeGreaterThan(0);

    for (const task of expectedUpcoming) {
      await expect(upcomingSection.getByText(task.title, { exact: true }).first()).toBeAttached();
    }

    // Today's items should NOT appear in upcoming
    const todayItems = [...SEED_TASKS.filter((t) => t.dateOffset === 0), ...SEED_GROUP_TASKS.filter((t) => t.dateOffset === 0), ...SEED_EVENTS.filter((t) => t.dateOffset === 0)];
    for (const item of todayItems) {
      await expect(upcomingSection.getByText(item.title, { exact: true })).not.toBeVisible();
    }
  });

  test('organizer-only group activity has no toggle checkbox', async ({ page }) => {
    await waitForDashboardLoad(page);

    // "Standup rotation" (gt05) — web user is organizer but NOT a participant
    // Find it anywhere on the dashboard (could be Today or Upcoming depending on date)
    const row = page.getByText('Standup rotation', { exact: true }).first();
    await row.scrollIntoViewIfNeeded();
    await expect(row).toBeAttached();

    // The row should NOT have a toggle button (circle checkbox)
    // Organizer-only items show a crown icon, not a button
    const rowContainer = row.locator('..');  // parent flex-col
    const grandParent = rowContainer.locator('..'); // parent flex-row with toggle
    await expect(grandParent.locator('button').first()).not.toBeAttached();
  });

  test('participant group activity has toggle checkbox', async ({ page }) => {
    await waitForDashboardLoad(page);

    // "Code review session" (gt02) — web user is CONFIRMED participant
    const row = page.getByText('Code review session', { exact: true }).first();
    await row.scrollIntoViewIfNeeded();
    await expect(row).toBeAttached();

    // The row SHOULD have a toggle button
    const rowContainer = row.locator('..');
    const grandParent = rowContainer.locator('..');
    await expect(grandParent.locator('button').first()).toBeAttached();
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
