import { test, expect } from '@playwright/test';
import {
  SEED_TASKS,
  SEED_GROUP_TASKS,
  SEED_EVENTS,
  TOTAL_TASKS_TODAY,
  GROUP_TASKS_TODAY,
  EVENTS_TODAY,
  TOTAL_ITEMS_TODAY,
  waitForCalendarLoad,
} from './seed-data';

// ── Helpers ──

function todayDate(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function offsetDate(offset: number): Date {
  const today = todayDate();
  return new Date(today.getTime() + offset * 86400000);
}

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Compute the Monday-start week containing today. */
function currentWeekRange(): { start: Date; end: Date; dates: Date[] } {
  const today = todayDate();
  // Default weekStartDay is 'sunday' per display-context
  const day = today.getDay(); // 0=Sun
  const start = new Date(today.getTime() - day * 86400000);
  const dates = Array.from({ length: 7 }, (_, i) => new Date(start.getTime() + i * 86400000));
  return { start, end: dates[6], dates };
}

// ── Tests ──

test.describe('Calendar Week View', () => {
  test('navigates to calendar page via sidebar', async ({ page }) => {
    await page.goto('/home');
    await page.click('a[href="/calendar"]');
    await expect(page).toHaveURL('/calendar');
    await expect(page.getByRole('heading', { name: 'Calendar' })).toBeVisible();
  });

  test('header shows correct date range for current week', async ({ page }) => {
    await waitForCalendarLoad(page);
    const dateRange = page.locator('[data-testid="calendar-date-range"]');
    await expect(dateRange).toBeVisible();
    // Verify it contains the current month name
    const monthName = todayDate().toLocaleDateString('en-US', { month: 'long' });
    await expect(dateRange).toContainText(monthName);
  });

  test('shows day labels', async ({ page }) => {
    await waitForCalendarLoad(page);
    // Check all 7 day labels are visible (short form on desktop)
    for (const label of ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']) {
      await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
    }
  });

  test('today has primary circle indicator', async ({ page }) => {
    await waitForCalendarLoad(page);
    const todayIndicator = page.locator('[data-testid="today-indicator"]');
    await expect(todayIndicator).toBeVisible();
    await expect(todayIndicator).toContainText(String(todayDate().getDate()));
  });

  test('personal tasks appear in correct day columns', async ({ page }) => {
    await waitForCalendarLoad(page);
    const { dates } = currentWeekRange();

    // Check each seeded task with a date in the current week
    for (const task of SEED_TASKS) {
      if (task.dateOffset === null) continue;
      const taskDate = offsetDate(task.dateOffset);
      const dateKey = toISODate(taskDate);

      // Only check if the task falls within the current visible week
      const inWeek = dates.some((d) => toISODate(d) === dateKey);
      if (!inWeek) continue;

      const column = page.locator(`[data-testid="day-column-${dateKey}"]`);
      await expect(column.getByText(task.title)).toBeVisible();
    }
  });

  test('group tasks appear in correct day columns', async ({ page }) => {
    await waitForCalendarLoad(page);
    const { dates } = currentWeekRange();

    for (const gt of SEED_GROUP_TASKS) {
      const taskDate = offsetDate(gt.dateOffset);
      const dateKey = toISODate(taskDate);

      const inWeek = dates.some((d) => toISODate(d) === dateKey);
      if (!inWeek) continue;

      const column = page.locator(`[data-testid="day-column-${dateKey}"]`);
      await expect(column.getByText(gt.title)).toBeVisible();
    }
  });

  test('events appear in correct day columns', async ({ page }) => {
    await waitForCalendarLoad(page);
    const { dates } = currentWeekRange();

    for (const ev of SEED_EVENTS) {
      const evDate = offsetDate(ev.dateOffset);
      const dateKey = toISODate(evDate);

      const inWeek = dates.some((d) => toISODate(d) === dateKey);
      if (!inWeek) continue;

      const column = page.locator(`[data-testid="day-column-${dateKey}"]`);
      await expect(column.getByText(ev.title)).toBeVisible();
    }
  });

  test('task panel shows all visible week items by default (no date selected)', async ({ page }) => {
    await waitForCalendarLoad(page);
    // Panel header should show date range when no date is selected
    const panelDate = page.locator('[data-testid="task-panel-date"]');
    // Should show date range like "Mar 30 – Apr 5" (not "This Week")
await expect(panelDate).toContainText('–');

    // Panel should contain items from all days in the week
    const panel = page.locator('[data-testid="task-panel"]');

    // Count total expected items in the current week from seed data
    const { dates } = currentWeekRange();
    const weekDateStrs = dates.map(toISODate);

    let expectedCount = 0;
    for (const task of SEED_TASKS) {
      if (task.dateOffset === null) continue;
      const dateKey = toISODate(offsetDate(task.dateOffset));
      if (weekDateStrs.includes(dateKey)) expectedCount++;
    }
    for (const gt of SEED_GROUP_TASKS) {
      const dateKey = toISODate(offsetDate(gt.dateOffset));
      if (weekDateStrs.includes(dateKey)) expectedCount++;
    }
    for (const ev of SEED_EVENTS) {
      const dateKey = toISODate(offsetDate(ev.dateOffset));
      if (weekDateStrs.includes(dateKey)) expectedCount++;
    }

    // Verify the panel has the expected number of task rows
    const rows = panel.locator('[data-testid^="task-row-"]');
    await expect(rows).toHaveCount(expectedCount);
  });

  test('clicking a date selects it and panel shows only that date', async ({ page }) => {
    await waitForCalendarLoad(page);

    const todayStr = toISODate(todayDate());
    const todayColumn = page.locator(`[data-testid="day-column-${todayStr}"]`);

    // Click today's date number in the date row
    const todayIndicator = page.locator('[data-testid="today-indicator"]');
    await todayIndicator.click();

    // Panel header should now show "Today · <date>" (matching dooooApp's DateRangeBar)
    const panelDate = page.locator('[data-testid="task-panel-date"]');
    await expect(panelDate).toContainText('Today ·');

    // Panel should show exactly today's items
    const panel = page.locator('[data-testid="task-panel"]');
    const rows = panel.locator('[data-testid^="task-row-"]');
    await expect(rows).toHaveCount(TOTAL_ITEMS_TODAY);
  });

  test('clicking same date again deselects it (toggle)', async ({ page }) => {
    await waitForCalendarLoad(page);

    const todayIndicator = page.locator('[data-testid="today-indicator"]');

    // Click to select
    await todayIndicator.click();
    const panelDate = page.locator('[data-testid="task-panel-date"]');
    await expect(panelDate).toContainText('Today ·');

    // Click again to deselect
    await todayIndicator.click();
    // Should show date range like "Mar 30 – Apr 5"
    await expect(panelDate).toContainText('–');
  });

  test('completed tasks show muted styling', async ({ page }) => {
    await waitForCalendarLoad(page);

    // "Morning standup" is completed (dateOffset=0, isCompleted=true)
    const todayStr = toISODate(todayDate());
    const column = page.locator(`[data-testid="day-column-${todayStr}"]`);
    const card = column.locator('[data-testid="task-card-web-dashboard-t01"]');
    // Card should have opacity class for completed state
    await expect(card).toHaveClass(/opacity-60/);
  });

  test('high priority tasks show flag icon in panel', async ({ page }) => {
    await waitForCalendarLoad(page);

    // Select today to see today's items
    await page.locator('[data-testid="today-indicator"]').click();

    // "Review PR #42" is HIGH priority
    const row = page.locator('[data-testid="task-row-web-dashboard-t02"]');
    await expect(row).toBeVisible();
    // Should contain a flag icon (lucide Flag renders as svg)
    await expect(row.locator('svg')).toBeVisible();
  });

  test('week navigation: prev/next arrows shift week', async ({ page }) => {
    await waitForCalendarLoad(page);
    const dateRange = page.locator('[data-testid="calendar-date-range"]');
    const initialText = await dateRange.textContent();

    // Click next week
    await page.click('[data-testid="nav-next-week"]');
    await expect(dateRange).not.toHaveText(initialText!);

    // Click prev to go back
    await page.click('[data-testid="nav-prev-week"]');
    await expect(dateRange).toHaveText(initialText!);
  });

  test('Today button returns to current week', async ({ page }) => {
    await waitForCalendarLoad(page);
    const dateRange = page.locator('[data-testid="calendar-date-range"]');
    const initialText = await dateRange.textContent();

    // Navigate away
    await page.click('[data-testid="nav-next-week"]');
    await page.click('[data-testid="nav-next-week"]');
    await expect(dateRange).not.toHaveText(initialText!);

    // Click Today
    await page.click('[data-testid="nav-today"]');
    await expect(dateRange).toHaveText(initialText!);

    // Panel should show date range (deselected)
    await expect(page.locator('[data-testid="task-panel-date"]')).toContainText('–');
  });

  test('navigating away auto-deselects date', async ({ page }) => {
    await waitForCalendarLoad(page);

    // Select today
    await page.locator('[data-testid="today-indicator"]').click();
    await expect(page.locator('[data-testid="task-panel-date"]')).toContainText('Today ·');

    // Navigate to next week — today is no longer visible, should auto-deselect
    await page.click('[data-testid="nav-next-week"]');
    await expect(page.locator('[data-testid="task-panel-date"]')).toContainText('–');
  });

  test('group activity cards show participant count', async ({ page }) => {
    await waitForCalendarLoad(page);

    // "Code review session" (gt02) has 2 going — should show "2 going"
    const todayStr = toISODate(todayDate());
    const column = page.locator(`[data-testid="day-column-${todayStr}"]`);
    const card = column.locator('[data-testid="task-card-web-cal-gt02"]');
    await expect(card).toBeVisible();
    await expect(card).toContainText('2 going');
  });

  test('view switcher shows Week tab as active', async ({ page }) => {
    await waitForCalendarLoad(page);
    const weekTab = page.locator('[data-testid="view-tab-week"]');
    await expect(weekTab).toBeVisible();
    // Month and Day tabs should be disabled
    const monthTab = page.locator('[data-testid="view-tab-month"]');
    await expect(monthTab).toBeDisabled();
    const dayTab = page.locator('[data-testid="view-tab-day"]');
    await expect(dayTab).toBeDisabled();
  });
});
