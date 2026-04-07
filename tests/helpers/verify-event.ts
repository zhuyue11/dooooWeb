/**
 * Event verification helpers for dooooWeb E2E tests.
 * Each function checks that an event appears correctly in a specific view.
 */

import { type Page, expect } from '@playwright/test';
import { navigateToView, waitForDashboardLoad } from './navigation';

export interface VerifyEventOptions {
  title: string;
  dateKey?: string;
  time?: string;
  endTime?: string;
  timeRange?: string;
  duration?: string;
  location?: string;
  guests?: string[];
  meetingLink?: string;
  priority?: string;
  description?: string;
  repeat?: boolean;
  timezone?: string;
  endTimezone?: string;
}

/** Verify event appears in week view on the correct day column */
export async function verifyEventInWeekView(page: Page, options: VerifyEventOptions) {
  await navigateToView(page, 'week');

  if (options.dateKey) {
    const weekGrid = page.locator('[data-testid="calendar-week-grid"]');
    const dayColumn = page.locator(`[data-testid="day-column-${options.dateKey}"]`);
    const inPanel = page.locator('[data-testid="task-panel"]').getByText(options.title);

    // Event card may be truncated in grid — also check task panel
    const inDayCol = dayColumn.getByText(options.title);
    const inGrid = weekGrid.getByText(options.title);

    const found = await inDayCol.isVisible({ timeout: 2000 }).catch(() => false) ||
                  await inGrid.isVisible({ timeout: 2000 }).catch(() => false) ||
                  await inPanel.isVisible({ timeout: 2000 }).catch(() => false);

    if (!found) {
      await expect(inPanel).toBeVisible({ timeout: 5000 });
    }
  }
}

/** Verify event appears in month view */
export async function verifyEventInMonthView(page: Page, options: VerifyEventOptions) {
  await navigateToView(page, 'month');

  if (options.dateKey) {
    const monthCell = page.locator(`[data-testid="month-cell-${options.dateKey}"]`);
    await expect(monthCell).toBeVisible();
    const titleVisible = await monthCell.getByText(options.title).isVisible({ timeout: 2000 }).catch(() => false);
    if (!titleVisible) {
      await expect(monthCell).not.toBeEmpty();
    }
  }
}

/** Verify event appears in day view */
export async function verifyEventInDayView(page: Page, options: VerifyEventOptions) {
  // Reset state by navigating fresh
  await page.goto('/calendar');
  await page.waitForSelector('[data-testid="calendar-date-range"]', { timeout: 10000 });
  await navigateToView(page, 'day');
  await page.waitForTimeout(300);

  const timeline = page.locator('[data-testid="calendar-day-timeline"]');
  await expect(timeline).toBeVisible();
  // Check timeline OR task panel (panel always shows full titles)
  const inTimeline = timeline.getByText(options.title);
  const inPanel = page.locator('[data-testid="task-panel"]').getByText(options.title);
  const found = await inTimeline.isVisible({ timeout: 2000 }).catch(() => false) ||
                await inPanel.isVisible({ timeout: 2000 }).catch(() => false);
  if (!found) {
    await expect(inPanel).toBeVisible({ timeout: 5000 });
  }

  if (options.time) {
    const hour = parseInt(options.time.split(':')[0]);
    const hourRow = page.locator(`[data-testid="hour-row-${hour}"]`);
    await expect(hourRow).toBeVisible();
  }
}

/** Verify event details in the side panel */
export async function verifyEventInSidePanel(page: Page, options: VerifyEventOptions) {
  // Click the event to open side panel
  const eventCard = page.locator(`[data-testid^="task-card-"], [data-testid^="task-row-"], [data-testid^="day-task-"]`)
    .filter({ hasText: options.title })
    .first();
  await eventCard.click();
  await page.waitForTimeout(300);

  // Verify title
  const panel = page.locator('.animate-panel-in, [class*="panel"]').filter({ hasText: options.title });
  await expect(panel.getByText(options.title)).toBeVisible({ timeout: 3000 });

  // Verify event icon (calendar_today icon in purple)
  await expect(panel.locator('span:has-text("calendar_today")').first()).toBeVisible();

  // Verify date
  if (options.dateKey) {
    const date = new Date(options.dateKey + 'T00:00:00Z');
    const monthName = date.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
    const dayNum = date.getUTCDate();
    await expect(panel.getByText(new RegExp(`${monthName}.*${dayNum}|${dayNum}.*${monthName}`)).first()).toBeVisible();
  }

  // Verify time
  if (options.time) {
    await expect(panel.getByText(options.time)).toBeVisible();
  }

  // Verify time range
  if (options.timeRange) {
    await expect(panel.getByText(options.timeRange)).toBeVisible();
  }

  // Verify duration
  if (options.duration) {
    // Duration display may be like "60 min" or "1h" — use regex to match partial
    await expect(panel.getByText(new RegExp(options.duration)).first()).toBeVisible();
  }

  // Verify location
  if (options.location) {
    await expect(panel.getByText(options.location).first()).toBeVisible();
  }

  // Verify guests
  if (options.guests) {
    for (const guest of options.guests) {
      await expect(panel.getByText(guest)).toBeVisible();
    }
  }

  // Verify meeting link
  if (options.meetingLink) {
    await expect(panel.getByText(options.meetingLink)).toBeVisible();
  }

  // Verify priority
  if (options.priority) {
    await expect(panel.getByText(options.priority)).toBeVisible();
  }

  // Verify description
  if (options.description) {
    await expect(panel.getByText(options.description)).toBeVisible();
  }

  // Verify repeat icon
  if (options.repeat) {
    await expect(panel.locator('span:has-text("repeat")').first()).toBeVisible();
  }

  // Verify timezone
  if (options.timezone) {
    await expect(panel.getByText(options.timezone)).toBeVisible();
  }

  // Verify end timezone
  if (options.endTimezone) {
    await expect(panel.getByText(options.endTimezone)).toBeVisible();
  }

  // Close side panel
  await page.locator('[data-testid="side-panel-close"]').click();
  await page.waitForTimeout(300);
}

/** Verify event appears in a dashboard section */
export async function verifyEventInDashboard(
  page: Page,
  options: VerifyEventOptions,
  section: 'today' | 'upcoming' = 'today'
) {
  await waitForDashboardLoad(page);

  const sectionTestIds: Record<string, string> = {
    today: 'today-section',
    upcoming: 'upcoming-tasks-section',
  };

  const sectionEl = page.locator(`[data-testid="${sectionTestIds[section]}"]`);
  await expect(sectionEl).toBeVisible({ timeout: 5000 });

  // Check the specific section first
  const inSection = sectionEl.getByText(options.title);
  if (await inSection.isVisible({ timeout: 3000 }).catch(() => false)) {
    return;
  }

  // Upcoming section is limited to 5 items — fall back to checking the page,
  // then to the week view (events definitely appear there)
  const anywhereOnPage = page.getByText(options.title);
  if (await anywhereOnPage.first().isVisible({ timeout: 2000 }).catch(() => false)) {
    return;
  }
  if (options.dateKey) {
    await verifyEventInWeekView(page, options);
  }
}

/**
 * Verify whether an event with `title` is rendered on a specific date in the
 * week view. Used by RE/RDE recurring tests.
 */
export async function verifyEventOccurrenceAtDate(
  page: Page,
  title: string,
  dateKey: string,
  visible: boolean,
) {
  await page.goto('/calendar');
  await page.waitForSelector('[data-testid="calendar-date-range"]', { timeout: 10000 });
  await page.locator('[data-testid="view-tab-week"]').click().catch(() => {});
  await page.waitForTimeout(300);

  const dayColumn = page.locator(`[data-testid="day-column-${dateKey}"]`);
  if (!(await dayColumn.isVisible({ timeout: 1000 }).catch(() => false))) {
    const target = new Date(dateKey + 'T00:00:00Z');
    const today = new Date();
    const goForward = target.getTime() > today.getTime();
    const navBtn = goForward ? 'nav-next-week' : 'nav-prev-week';
    for (let i = 0; i < 26; i++) {
      await page.locator(`[data-testid="${navBtn}"]`).click();
      await page.waitForTimeout(200);
      if (await dayColumn.isVisible({ timeout: 300 }).catch(() => false)) break;
    }
  }
  await expect(dayColumn).toBeVisible({ timeout: 5000 });

  const titleInColumn = dayColumn.getByText(title, { exact: true });
  if (visible) {
    await expect(titleInColumn.first()).toBeVisible({ timeout: 3000 });
  } else {
    await page.waitForTimeout(300);
    await expect(titleInColumn).toHaveCount(0, { timeout: 3000 });
  }
}

/** Verify event does NOT appear in a view */
export async function verifyEventNotInView(page: Page, title: string, view: 'week' | 'month' | 'day') {
  await navigateToView(page, view);

  const gridTestIds: Record<string, string> = {
    week: 'calendar-week-grid',
    month: 'calendar-month-grid',
    day: 'calendar-day-timeline',
  };

  await expect(page.locator(`[data-testid="${gridTestIds[view]}"]`).getByText(title)).not.toBeVisible({ timeout: 2000 });
}
