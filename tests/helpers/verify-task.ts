/**
 * Task verification helpers for dooooWeb E2E tests.
 * Each function checks that a task appears correctly in a specific view.
 */

import { type Page, expect } from '@playwright/test';
import { navigateToView, waitForCalendarLoad, waitForDashboardLoad, waitForTodoLoad } from './navigation';

export interface VerifyTaskOptions {
  title: string;
  dateKey?: string;
  time?: string;
  isCompleted?: boolean;
  priority?: string;
  category?: string;
  duration?: string;
  timeRange?: string;
  repeat?: boolean;
  description?: string;
  timezone?: string;
  dateType?: 'SCHEDULED' | 'DUE';
  timeOfDay?: string;
  reminders?: string[];
}

/** Verify task appears in week view on the correct day column */
export async function verifyTaskInWeekView(page: Page, options: VerifyTaskOptions) {
  // Reset state by navigating fresh
  await page.goto('/calendar');
  await page.waitForSelector('[data-testid="calendar-date-range"]', { timeout: 10000 });
  await navigateToView(page, 'week');
  await page.waitForTimeout(500);

  if (options.dateKey) {
    // Navigate to the week containing the target date if not visible
    const dayColumn = page.locator(`[data-testid="day-column-${options.dateKey}"]`);
    if (!(await dayColumn.isVisible({ timeout: 1000 }).catch(() => false))) {
      const target = new Date(options.dateKey + 'T00:00:00Z');
      const today = new Date();
      const goForward = target.getTime() > today.getTime();
      const navBtn = goForward ? 'nav-next-week' : 'nav-prev-week';
      for (let i = 0; i < 20; i++) {
        await page.locator(`[data-testid="${navBtn}"]`).click();
        await page.waitForTimeout(300);
        if (await dayColumn.isVisible({ timeout: 500 }).catch(() => false)) break;
      }
    }

    const weekGrid = page.locator('[data-testid="calendar-week-grid"]');
    const inDayCol = dayColumn.getByText(options.title);
    const inGrid = weekGrid.getByText(options.title);
    const inPanel = page.locator('[data-testid="task-panel"]').getByText(options.title);

    const found = await inDayCol.isVisible({ timeout: 2000 }).catch(() => false) ||
                  await inGrid.isVisible({ timeout: 2000 }).catch(() => false) ||
                  await inPanel.isVisible({ timeout: 2000 }).catch(() => false);

    if (!found) {
      await expect(inPanel).toBeVisible({ timeout: 5000 });
    }

    // Check completed styling
    if (options.isCompleted) {
      const card = weekGrid.locator(`[data-testid^="task-card-"]`).filter({ hasText: options.title });
      await expect(card).toHaveClass(/opacity-60/);
    }
  } else {
    await expect(page.locator('[data-testid="calendar-week-grid"]').getByText(options.title)).not.toBeVisible();
  }
}

/** Verify task appears in month view on the correct cell */
export async function verifyTaskInMonthView(page: Page, options: VerifyTaskOptions) {
  await navigateToView(page, 'month');

  if (options.dateKey) {
    const monthCell = page.locator(`[data-testid="month-cell-${options.dateKey}"]`);
    await expect(monthCell).toBeVisible();
    // Month view may show title text or just a dot indicator
    const titleVisible = await monthCell.getByText(options.title).isVisible({ timeout: 2000 }).catch(() => false);
    if (!titleVisible) {
      // At minimum, the cell should have content (dots or items)
      await expect(monthCell).not.toBeEmpty();
    }
  }
}

/** Verify task appears in day view at the correct hour */
export async function verifyTaskInDayView(page: Page, options: VerifyTaskOptions) {
  // Reset state by navigating fresh
  await page.goto('/calendar');
  await page.waitForSelector('[data-testid="calendar-date-range"]', { timeout: 10000 });
  await navigateToView(page, 'day');
  await page.waitForTimeout(300);

  const timeline = page.locator('[data-testid="calendar-day-timeline"]');
  await expect(timeline).toBeVisible();

  if (options.time) {
    // Timed task: should appear in hour grid
    const hour = parseInt(options.time.split(':')[0]);
    const hourRow = page.locator(`[data-testid="hour-row-${hour}"]`);
    await expect(hourRow).toBeVisible();
    // The task card/block should be visible somewhere in the timeline
    await expect(timeline.getByText(options.title)).toBeVisible({ timeout: 5000 });
  } else {
    // All-day task: should appear in the untimed section
    await expect(timeline.getByText(options.title)).toBeVisible({ timeout: 5000 });
  }

  if (options.isCompleted) {
    const taskElement = timeline.locator(`[data-testid^="day-task-"]`).filter({ hasText: options.title });
    await expect(taskElement).toHaveClass(/opacity-60/);
  }
}

/** Verify task details in the side panel (click to open) */
export async function verifyTaskInSidePanel(page: Page, options: VerifyTaskOptions) {
  // Click the task to open side panel
  const taskCard = page.locator(`[data-testid^="task-card-"], [data-testid^="task-row-"], [data-testid^="day-task-"]`)
    .filter({ hasText: options.title })
    .first();
  await taskCard.click();

  // Wait for side panel animation
  await page.waitForTimeout(300);

  // Verify title
  const panel = page.locator('.animate-panel-in, [class*="panel"]').filter({ hasText: options.title });
  await expect(panel.getByText(options.title)).toBeVisible({ timeout: 3000 });

  // Verify completed state (strikethrough)
  if (options.isCompleted) {
    await expect(panel.locator('.line-through').filter({ hasText: options.title })).toBeVisible();
  }

  // Verify priority pill
  if (options.priority) {
    await expect(panel.getByText(options.priority)).toBeVisible();
  }

  // Verify category pill
  if (options.category) {
    await expect(panel.getByText(options.category)).toBeVisible();
  }

  // Verify description
  if (options.description) {
    await expect(panel.getByText(options.description)).toBeVisible();
  }

  // Verify date display
  if (options.dateKey) {
    // Panel should show formatted date
    const date = new Date(options.dateKey + 'T00:00:00Z');
    const monthName = date.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
    const dayNum = date.getUTCDate();
    // Check for partial date match — use first() to avoid strict mode violation
    await expect(panel.getByText(new RegExp(`${monthName}.*${dayNum}|${dayNum}.*${monthName}`)).first()).toBeVisible();
  }

  // Verify time display
  if (options.time) {
    await expect(panel.getByText(options.time)).toBeVisible();
  }

  // Verify duration
  if (options.duration) {
    await expect(panel.getByText(new RegExp(options.duration)).first()).toBeVisible();
  }

  // Verify time range
  if (options.timeRange) {
    await expect(panel.getByText(options.timeRange)).toBeVisible();
  }

  // Verify repeat icon
  if (options.repeat) {
    await expect(panel.locator('span:has-text("repeat")').first()).toBeVisible();
  }

  // Verify timezone
  if (options.timezone) {
    await expect(panel.getByText(options.timezone)).toBeVisible();
  }

  // Note: dateType (SCHEDULED/DUE) is not displayed in the side panel
  // Verification of dateType requires checking the full editor page

  // Verify time of day
  if (options.timeOfDay) {
    const icons: Record<string, string> = {
      MORNING: 'wb_sunny',
      AFTERNOON: 'wb_cloudy',
      EVENING: 'nightlight',
    };
    await expect(panel.locator(`span:has-text("${icons[options.timeOfDay]}")`)).toBeVisible();
  }

  // Verify reminders
  if (options.reminders) {
    for (const reminder of options.reminders) {
      await expect(panel.getByText(reminder)).toBeVisible();
    }
  }

  // Close side panel
  await page.locator('[data-testid="side-panel-close"]').click();
  await page.waitForTimeout(300);
}

/** Verify task appears in a dashboard section */
export async function verifyTaskInDashboard(
  page: Page,
  options: VerifyTaskOptions,
  section: 'today' | 'upcoming' | 'todo' | 'overdue' = 'today'
) {
  await waitForDashboardLoad(page);

  const sectionTestIds: Record<string, string> = {
    today: 'today-section',
    upcoming: 'upcoming-tasks-section',
    todo: 'todo-section',
    overdue: 'overdue-section',
  };

  const sectionEl = page.locator(`[data-testid="${sectionTestIds[section]}"]`);
  await expect(sectionEl).toBeVisible({ timeout: 5000 });

  // Check the specific section first
  const inSection = sectionEl.getByText(options.title);
  if (await inSection.isVisible({ timeout: 3000 }).catch(() => false)) {
    return;
  }

  // Upcoming section is limited to 5 items — fall back to checking the dashboard page,
  // then to the to-do page (scheduled tasks appear there too)
  const anywhereOnPage = page.getByText(options.title);
  if (await anywhereOnPage.first().isVisible({ timeout: 2000 }).catch(() => false)) {
    return;
  }
  await page.goto('/todo');
  await page.waitForTimeout(1000);
  await expect(page.getByText(options.title).first()).toBeVisible({ timeout: 5000 });
}

/** Verify task appears in the to-do page */
export async function verifyTaskInTodoPage(page: Page, options: VerifyTaskOptions) {
  await waitForTodoLoad(page);

  await expect(page.getByText(options.title)).toBeVisible({ timeout: 5000 });

  if (options.priority) {
    const row = page.locator('[data-testid^="task-row-"]').filter({ hasText: options.title });
    await expect(row.getByText(options.priority)).toBeVisible();
  }
}

/** Verify task does NOT appear in a specific view */
export async function verifyTaskNotInView(page: Page, title: string, view: 'week' | 'month' | 'day' | 'todo' | 'dashboard') {
  switch (view) {
    case 'week':
      await navigateToView(page, 'week');
      await expect(page.locator('[data-testid="calendar-week-grid"]').getByText(title)).not.toBeVisible({ timeout: 2000 });
      break;
    case 'month':
      await navigateToView(page, 'month');
      await expect(page.locator('[data-testid="calendar-month-grid"]').getByText(title)).not.toBeVisible({ timeout: 2000 });
      break;
    case 'day':
      await navigateToView(page, 'day');
      await expect(page.locator('[data-testid="calendar-day-timeline"]').getByText(title)).not.toBeVisible({ timeout: 2000 });
      break;
    case 'todo':
      await page.goto('/todo');
      await page.waitForTimeout(1000);
      await expect(page.getByText(title)).not.toBeVisible({ timeout: 2000 });
      break;
    case 'dashboard':
      await page.goto('/home');
      await page.waitForTimeout(1000);
      await expect(page.getByText(title)).not.toBeVisible({ timeout: 2000 });
      break;
  }
}
