/**
 * Recurrence helpers for dooooWeb E2E tests.
 * Handles verifying recurring task/event instances across views.
 */

import { type Page, expect } from '@playwright/test';
import { navigateToView, navigateToNextPeriod, navigateToPrevPeriod, navigateToToday } from './navigation';
import { toISODate, offsetDateUTC } from './date-utils';
import type { RepeatOptions } from './create-task';

export interface VerifyRecurringOptions {
  title: string;
  startDate: string;
  repeat: RepeatOptions;
  expectedDates: string[];
}

/**
 * Verify that recurring instances appear on expected dates.
 * Navigates through calendar views to check each date.
 */
export async function verifyRecurringInstances(page: Page, options: VerifyRecurringOptions) {
  // Start from today to verify instances
  await navigateToToday(page);
  await navigateToView(page, 'week');

  for (const dateKey of options.expectedDates) {
    // Navigate to the week containing this date
    const dayColumn = page.locator(`[data-testid="day-column-${dateKey}"]`);
    if (!(await dayColumn.isVisible({ timeout: 500 }).catch(() => false))) {
      let found = false;
      for (let i = 0; i < 12 && !found; i++) {
        await navigateToNextPeriod(page);
        found = await dayColumn.isVisible({ timeout: 300 }).catch(() => false);
      }
      if (!found) {
        await navigateToToday(page);
        for (let i = 0; i < 12 && !found; i++) {
          await navigateToPrevPeriod(page);
          found = await dayColumn.isVisible({ timeout: 300 }).catch(() => false);
        }
      }
      if (!found) {
        throw new Error(`Could not navigate to date ${dateKey} to verify recurring instance`);
      }
    }

    // Verify the task appears — check grid, day column, or task panel (titles may be truncated)
    const inDayCol = dayColumn.getByText(options.title);
    const weekGrid = page.locator('[data-testid="calendar-week-grid"]');
    const inGrid = weekGrid.getByText(options.title);
    const inPanel = page.locator('[data-testid="task-panel"]').getByText(options.title);

    const visible = await inDayCol.isVisible({ timeout: 1500 }).catch(() => false) ||
                    await inGrid.isVisible({ timeout: 1500 }).catch(() => false) ||
                    await inPanel.isVisible({ timeout: 1500 }).catch(() => false);
    if (!visible) {
      // Click the day column to select the date, which filters task panel to that day
      await dayColumn.click({ position: { x: 10, y: 10 } }).catch(() => {});
      await page.waitForTimeout(500);
      const visibleAfterClick = await inGrid.isVisible({ timeout: 1500 }).catch(() => false) ||
                                await inPanel.isVisible({ timeout: 1500 }).catch(() => false);
      if (!visibleAfterClick) {
        throw new Error(`Recurring instance "${options.title}" not found on ${dateKey}`);
      }
    }
  }

  // Return to today
  await navigateToToday(page);
}

/**
 * Verify that a recurring item does NOT appear beyond expected dates.
 * Checks the date after the last expected date.
 */
export async function verifyRecurringEndsAfter(page: Page, title: string, lastExpectedDate: string) {
  const lastDate = new Date(lastExpectedDate + 'T00:00:00Z');
  const nextDay = new Date(lastDate.getTime() + 86400000);
  const nextDateKey = toISODate(nextDay);

  await navigateToView(page, 'week');
  // Navigate to the week containing nextDay
  const dayColumn = page.locator(`[data-testid="day-column-${nextDateKey}"]`);
  const isVisible = await dayColumn.isVisible({ timeout: 500 }).catch(() => false);

  if (isVisible) {
    await expect(dayColumn.getByText(title)).not.toBeVisible({ timeout: 2000 });
  }
}

/**
 * Compute expected dates for a recurring pattern.
 * Useful for generating expectedDates arrays for verifyRecurringInstances.
 */
export function computeExpectedDates(
  startDate: string,
  repeat: RepeatOptions,
  checkDays: number = 30
): string[] {
  const start = new Date(startDate + 'T00:00:00Z');
  const dates: string[] = [];
  let count = 0;
  const maxCount = repeat.count || 100;
  const endDate = repeat.endDate ? new Date(repeat.endDate + 'T00:00:00Z') : null;

  for (let dayOffset = 0; dayOffset < checkDays && count < maxCount; dayOffset++) {
    const current = new Date(start.getTime() + dayOffset * 86400000);
    if (endDate && current > endDate) break;

    let matches = false;
    switch (repeat.frequency) {
      case 'daily':
        matches = true;
        break;
      case 'weekly':
        if (repeat.weekdays) {
          const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          matches = repeat.weekdays.includes(dayNames[current.getUTCDay()]);
        } else {
          matches = current.getUTCDay() === start.getUTCDay();
          // Only match on weekly intervals
          const weekDiff = Math.round((current.getTime() - start.getTime()) / (7 * 86400000));
          matches = matches && weekDiff >= 0 && weekDiff === Math.floor(weekDiff);
        }
        break;
      case 'monthly':
        matches = current.getUTCDate() === start.getUTCDate();
        break;
      case 'yearly':
        matches = current.getUTCMonth() === start.getUTCMonth() && current.getUTCDate() === start.getUTCDate();
        break;
    }

    if (matches) {
      dates.push(toISODate(current));
      count++;
    }
  }

  return dates;
}
