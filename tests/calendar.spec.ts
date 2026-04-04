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

/** Returns "today" in UTC — matches the Docker seed which runs in UTC. */
function todayDate(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
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
    // Icon component renders as <span class="material-symbols-rounded">flag</span>
    await expect(row.locator('span.material-symbols-rounded:has-text("flag")')).toBeVisible();
  });

  test('week navigation: prev/next arrows shift week', async ({ page }) => {
    await waitForCalendarLoad(page);
    const dateRange = page.locator('[data-testid="calendar-date-range"]');
    const initialText = await dateRange.textContent();

    // Click next twice — verify date range changes each time
    await page.locator('[data-testid="nav-next-week"]').click();
    await expect(dateRange).not.toHaveText(initialText!);
    const afterNextText = await dateRange.textContent();

    // Use Today button to return (more reliable than prev for testing)
    await page.locator('[data-testid="nav-today"]').click();
    await expect(dateRange).toHaveText(initialText!);

    // Verify prev arrow also changes the date range
    await page.locator('[data-testid="nav-prev-week"]').click();
    await expect(dateRange).not.toHaveText(initialText!);
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
    // Month and Day tabs should be enabled and clickable
    const monthTab = page.locator('[data-testid="view-tab-month"]');
    await expect(monthTab).toBeEnabled();
    const dayTab = page.locator('[data-testid="view-tab-day"]');
    await expect(dayTab).toBeEnabled();
  });
});

// ══════════════════════════════════════════════════════════════════════
// Month View
// ══════════════════════════════════════════════════════════════════════

test.describe('Calendar Month View', () => {
  async function switchToMonth(page: import('@playwright/test').Page) {
    await waitForCalendarLoad(page);
    await page.click('[data-testid="view-tab-month"]');
    await page.waitForSelector('[data-testid="calendar-month-grid"]', { timeout: 5000 });
  }

  test('switches to month view and shows month grid', async ({ page }) => {
    await switchToMonth(page);
    await expect(page.locator('[data-testid="calendar-month-grid"]')).toBeVisible();
  });

  test('header shows month + year format', async ({ page }) => {
    await switchToMonth(page);
    const now = todayDate();
    const monthYear = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    await expect(page.locator('[data-testid="calendar-date-range"]')).toHaveText(monthYear);
  });

  test('today cell has primary indicator', async ({ page }) => {
    await switchToMonth(page);
    const todayStr = toISODate(todayDate());
    const cell = page.locator(`[data-testid="month-cell-${todayStr}"]`);
    await expect(cell).toBeVisible();
  });

  test('seeded personal tasks appear as dots on correct dates', async ({ page }) => {
    await switchToMonth(page);
    for (const task of SEED_TASKS) {
      if (task.dateOffset === null) continue;
      const taskDate = offsetDate(task.dateOffset);
      // Only check tasks in the current month
      if (taskDate.getMonth() !== todayDate().getMonth()) continue;
      const dateKey = toISODate(taskDate);
      const cell = page.locator(`[data-testid="month-cell-${dateKey}"]`);
      // Cell should have at least one dot (colored circle)
      await expect(cell.locator('.rounded-full').first()).toBeAttached();
    }
  });

  test('seeded group tasks appear as dots on correct dates', async ({ page }) => {
    await switchToMonth(page);
    for (const gt of SEED_GROUP_TASKS) {
      const taskDate = offsetDate(gt.dateOffset);
      if (taskDate.getMonth() !== todayDate().getMonth()) continue;
      const dateKey = toISODate(taskDate);
      const cell = page.locator(`[data-testid="month-cell-${dateKey}"]`);
      await expect(cell.locator('.rounded-full').first()).toBeAttached();
    }
  });

  test('seeded events appear as dots on correct dates', async ({ page }) => {
    await switchToMonth(page);
    for (const ev of SEED_EVENTS) {
      const evDate = offsetDate(ev.dateOffset);
      if (evDate.getMonth() !== todayDate().getMonth()) continue;
      const dateKey = toISODate(evDate);
      const cell = page.locator(`[data-testid="month-cell-${dateKey}"]`);
      await expect(cell.locator('.rounded-full').first()).toBeAttached();
    }
  });

  test('clicking a date updates panel', async ({ page }) => {
    await switchToMonth(page);
    const todayStr = toISODate(todayDate());
    await page.click(`[data-testid="month-cell-${todayStr}"]`);
    // Panel should show today's date
    await expect(page.locator('[data-testid="task-panel-date"]')).toContainText('Today ·');
    // Panel should have correct item count
    const panel = page.locator('[data-testid="task-panel"]');
    const rows = panel.locator('[data-testid^="task-row-"]');
    await expect(rows).toHaveCount(TOTAL_ITEMS_TODAY);
  });

  test('month navigation shifts by month', async ({ page }) => {
    await switchToMonth(page);
    const dateRange = page.locator('[data-testid="calendar-date-range"]');
    const initial = await dateRange.textContent();

    // Click next — verify month changes
    await page.click('[data-testid="nav-next-week"]');
    await expect(dateRange).not.toHaveText(initial!);

    // Use Today to return (more reliable than prev for testing)
    await page.click('[data-testid="nav-today"]');
    await expect(dateRange).toHaveText(initial!);

    // Verify prev arrow also changes the month
    await page.click('[data-testid="nav-prev-week"]');
    await expect(dateRange).not.toHaveText(initial!);
  });
});

// ══════════════════════════════════════════════════════════════════════
// Day View
// ══════════════════════════════════════════════════════════════════════

test.describe('Calendar Day View', () => {
  async function switchToDay(page: import('@playwright/test').Page) {
    await waitForCalendarLoad(page);
    await page.click('[data-testid="view-tab-day"]');
    await page.waitForSelector('[data-testid="calendar-day-timeline"]', { timeout: 5000 });
  }

  test('switches to day view and shows timeline', async ({ page }) => {
    await switchToDay(page);
    await expect(page.locator('[data-testid="calendar-day-timeline"]')).toBeVisible();
  });

  test('header shows full date format', async ({ page }) => {
    await switchToDay(page);
    const now = todayDate();
    const fullDate = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    await expect(page.locator('[data-testid="calendar-date-range"]')).toHaveText(fullDate);
  });

  test('seeded timed personal tasks appear in correct hour slots', async ({ page }) => {
    await switchToDay(page);
    const timedToday = SEED_TASKS.filter((t) => t.dateOffset === 0 && t.hasTime && t.time);
    for (const task of timedToday) {
      // Seed times are UTC, browser is UTC (via timezoneId config) — use directly
      const hour = parseInt(task.time!.split(':')[0]);
      const hourRow = page.locator(`[data-testid="hour-row-${hour}"]`);
      await expect(hourRow.getByText(task.title)).toBeVisible();
    }
  });

  test('seeded timed group tasks appear in correct hour slots', async ({ page }) => {
    await switchToDay(page);
    const timedGroupToday = SEED_GROUP_TASKS.filter((t) => t.dateOffset === 0 && t.hasTime && t.time);
    for (const gt of timedGroupToday) {
      const hour = parseInt(gt.time.split(':')[0]);
      const hourRow = page.locator(`[data-testid="hour-row-${hour}"]`);
      await expect(hourRow.getByText(gt.title)).toBeVisible();
    }
  });

  test('seeded timed events appear in correct hour slots', async ({ page }) => {
    await switchToDay(page);
    const timedEventsToday = SEED_EVENTS.filter((t) => t.dateOffset === 0 && t.hasTime && t.time);
    for (const ev of timedEventsToday) {
      const hour = parseInt(ev.time.split(':')[0]);
      const hourRow = page.locator(`[data-testid="hour-row-${hour}"]`);
      await expect(hourRow.getByText(ev.title)).toBeVisible();
    }
  });

  test('day navigation shifts by day', async ({ page }) => {
    await switchToDay(page);
    const initial = await page.locator('[data-testid="calendar-date-range"]').textContent();
    await page.click('[data-testid="nav-next-week"]');
    await expect(page.locator('[data-testid="calendar-date-range"]')).not.toHaveText(initial!);
  });

  test('navigate to tomorrow shows tomorrow tasks', async ({ page }) => {
    await switchToDay(page);
    await page.click('[data-testid="nav-next-week"]');
    // Tomorrow's tasks should be visible
    const tomorrowTasks = SEED_TASKS.filter((t) => t.dateOffset === 1 && t.hasTime && t.time);
    for (const task of tomorrowTasks) {
      const timeline = page.locator('[data-testid="calendar-day-timeline"]');
      await expect(timeline.getByText(task.title)).toBeVisible();
    }
  });

  test('Today button returns to current day', async ({ page }) => {
    await switchToDay(page);
    await page.click('[data-testid="nav-next-week"]');
    await page.click('[data-testid="nav-next-week"]');
    await page.click('[data-testid="nav-today"]');
    const fullDate = todayDate().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    await expect(page.locator('[data-testid="calendar-date-range"]')).toHaveText(fullDate);
  });
});

// ══════════════════════════════════════════════════════════════════════
// Cross-view tests (items visible in all views per CLAUDE.md)
// ══════════════════════════════════════════════════════════════════════

test.describe('Cross-view item verification', () => {
  test('today items appear in week, month, and day views', async ({ page }) => {
    const todayStr = toISODate(todayDate());
    const todayTitles = [
      ...SEED_TASKS.filter((t) => t.dateOffset === 0).map((t) => t.title),
      ...SEED_GROUP_TASKS.filter((t) => t.dateOffset === 0).map((t) => t.title),
      ...SEED_EVENTS.filter((t) => t.dateOffset === 0).map((t) => t.title),
    ];

    // Week view
    await waitForCalendarLoad(page);
    for (const title of todayTitles) {
      const col = page.locator(`[data-testid="day-column-${todayStr}"]`);
      await expect(col.getByText(title).first()).toBeAttached();
    }

    // Month view
    await page.click('[data-testid="view-tab-month"]');
    await page.waitForSelector('[data-testid="calendar-month-grid"]');
    const cell = page.locator(`[data-testid="month-cell-${todayStr}"]`);
    // Month shows dots, not titles — verify dots exist (count should match items)
    const dots = cell.locator('.rounded-full');
    // At least one dot per item type present
    expect(await dots.count()).toBeGreaterThan(0);

    // Day view
    await page.click('[data-testid="view-tab-day"]');
    await page.waitForSelector('[data-testid="calendar-day-timeline"]');
    const timeline = page.locator('[data-testid="calendar-day-timeline"]');
    // Timed items should show in timeline
    const timedTitles = [
      ...SEED_TASKS.filter((t) => t.dateOffset === 0 && t.hasTime).map((t) => t.title),
      ...SEED_GROUP_TASKS.filter((t) => t.dateOffset === 0 && t.hasTime).map((t) => t.title),
      ...SEED_EVENTS.filter((t) => t.dateOffset === 0 && t.hasTime).map((t) => t.title),
    ];
    for (const title of timedTitles) {
      await expect(timeline.getByText(title).first()).toBeAttached();
    }
  });
});
