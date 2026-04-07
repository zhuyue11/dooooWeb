/**
 * Navigation helpers for dooooWeb E2E tests.
 * Handles view switching, date navigation, page loads, and modal opening.
 */

import { type Page, expect } from '@playwright/test';

// Re-export from seed-data for backward compatibility
export { waitForCalendarLoad, waitForDashboardLoad } from '../seed-data';

/** Wait for to-do page to load */
export async function waitForTodoLoad(page: Page) {
  await page.goto('/todo');
  await page.waitForSelector('[data-testid^="task-row-"]', { timeout: 10000 });
}

/** Switch calendar to a specific view */
export async function navigateToView(page: Page, view: 'week' | 'month' | 'day') {
  const tab = page.locator(`[data-testid="view-tab-${view}"]`);
  await tab.click();
  // Wait for the corresponding grid to be visible
  const gridTestIds: Record<string, string> = {
    week: 'calendar-week-grid',
    month: 'calendar-month-grid',
    day: 'calendar-day-timeline',
  };
  await page.waitForSelector(`[data-testid="${gridTestIds[view]}"]`, { timeout: 5000 });
}

/** Navigate to the next period (week/month/day depending on current view) */
export async function navigateToNextPeriod(page: Page) {
  await page.locator('[data-testid="nav-next-week"]').click();
  await page.waitForTimeout(300); // Wait for animation
}

/** Navigate to the previous period */
export async function navigateToPrevPeriod(page: Page) {
  await page.locator('[data-testid="nav-prev-week"]').click();
  await page.waitForTimeout(300);
}

/** Navigate to today */
export async function navigateToToday(page: Page) {
  await page.locator('[data-testid="nav-today"]').click();
  await page.waitForTimeout(300);
}

/**
 * Navigate to a specific date in the current calendar view.
 * Clicks day-column or month-cell depending on the active view.
 */
export async function clickDateInView(page: Page, dateKey: string) {
  // Try week view day column first
  const dayCol = page.locator(`[data-testid="day-column-${dateKey}"]`);
  if (await dayCol.isVisible({ timeout: 1000 }).catch(() => false)) {
    await dayCol.click();
    return;
  }
  // Try month view cell
  const monthCell = page.locator(`[data-testid="month-cell-${dateKey}"]`);
  if (await monthCell.isVisible({ timeout: 1000 }).catch(() => false)) {
    await monthCell.click();
    return;
  }
}

/** Open the create item modal from different sources */
export async function openCreateModal(page: Page, source: 'calendar' | 'dashboard' | 'todo' = 'calendar') {
  switch (source) {
    case 'calendar':
      await page.locator('[data-testid="task-panel"] button:has-text("Add")').click();
      break;
    case 'dashboard':
      await page.locator('[data-testid="dashboard-add-button"]').click();
      break;
    case 'todo':
      await page.getByRole('button', { name: /Add task/i }).click();
      break;
  }
  // Wait for modal to appear
  await expect(page.getByPlaceholder('What needs to be done?')).toBeVisible({ timeout: 3000 });
}

/** Navigate to the full editor page (via calendar to ensure proper history) */
export async function navigateToFullEditor(page: Page, type: 'task' | 'event' = 'task') {
  // Ensure we're on the calendar first so navigate(-1) after save goes back to calendar
  const currentUrl = page.url();
  if (!currentUrl.includes('/calendar') && !currentUrl.includes('/home') && !currentUrl.includes('/todo')) {
    await page.goto('/calendar');
    await page.waitForSelector('[data-testid="calendar-date-range"]', { timeout: 5000 });
  }
  await page.goto('/items/new');
  await page.waitForSelector('input[placeholder]', { timeout: 5000 });
  if (type === 'event') {
    await page.getByRole('button', { name: 'Event' }).click();
  }
}

/** Navigate to the full editor for an existing item */
export async function navigateToEditPage(page: Page, itemId: string, type: 'task' | 'event' = 'task') {
  await page.goto(`/items/${itemId}/edit?type=${type}`);
  await page.waitForSelector('input[placeholder]', { timeout: 5000 });
}
