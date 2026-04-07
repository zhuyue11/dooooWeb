/**
 * Task creation helpers for dooooWeb E2E tests.
 */

import { type Page, expect } from '@playwright/test';
import { openCreateModal, navigateToFullEditor } from './navigation';
import {
  setDateInModal,
  setTimeInModal,
  setTimeOfDayInModal,
  setDurationInModal,
  setEndTimeInModal,
  setReminderInModal,
  addSecondReminderInModal,
  setTimezoneInModal,
  setPriorityInEditor,
  setCategoryInEditor,
  setDescriptionInEditor,
  setLocationInEditor,
  toggleMoreOption,
  setDateInEditor,
} from './modal-fields';

export interface CreateTaskOptions {
  title: string;
  date?: string;
  time?: string;
  timeOfDay?: 'MORNING' | 'AFTERNOON' | 'EVENING';
  duration?: string;
  endTime?: string;
  endDate?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  category?: string;
  description?: string;
  repeat?: RepeatOptions;
  reminders?: string[];
  timezone?: string;
  dateType?: 'SCHEDULED' | 'DUE';
  showInTodoWhenOverdue?: boolean;
  setToDoneAutomatically?: boolean;
}

export interface RepeatOptions {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  weekdays?: string[];
  count?: number;
  endDate?: string;
}

/**
 * Create a task using the quick create modal.
 * Supports: title, date, time, timeOfDay.
 * For full fields, use createTaskViaFullEditor.
 */
export async function createTaskViaQuickModal(page: Page, options: CreateTaskOptions) {
  await openCreateModal(page, 'calendar');

  // Fill title
  await page.getByPlaceholder('What needs to be done?').fill(options.title);

  // Set date if provided
  if (options.date) {
    await setDateInModal(page, options.date);
  }

  // Set time or time of day
  if (options.time) {
    await setTimeInModal(page, options.time);
  } else if (options.timeOfDay) {
    await setTimeOfDayInModal(page, options.timeOfDay);
  }

  // Click save button
  if (options.date) {
    await page.getByRole('button', { name: 'Save Task' }).click();
  } else {
    await page.getByRole('button', { name: 'Add to to-do' }).click();
  }

  // Wait for modal to close
  await expect(page.getByPlaceholder('What needs to be done?')).not.toBeVisible({ timeout: 5000 });
  // Give the API time to respond and UI to update
  await page.waitForTimeout(500);
}

/**
 * Create a task using the full editor page.
 * Supports all fields including repeat, priority, category, description, etc.
 */
export async function createTaskViaFullEditor(page: Page, options: CreateTaskOptions) {
  await navigateToFullEditor(page, 'task');

  // Fill title
  await page.getByPlaceholder(/Add title/i).fill(options.title);

  // Set description
  if (options.description) {
    await setDescriptionInEditor(page, options.description);
  }

  // Set date
  if (options.date) {
    await setDateInEditor(page, options.date);
  }

  // Set time or time of day
  if (options.time) {
    await setTimeInModal(page, options.time);
  } else if (options.timeOfDay) {
    await setTimeOfDayInModal(page, options.timeOfDay);
  }

  // Set duration
  if (options.duration) {
    await setDurationInModal(page, options.duration);
  }

  // Set end time
  if (options.endTime) {
    await setEndTimeInModal(page, options.endTime, options.endDate);
  }

  // Set repeat/recurrence
  if (options.repeat) {
    await setRecurrenceInEditor(page, options.repeat);
  }

  // Set reminders
  if (options.reminders) {
    if (options.reminders[0]) {
      await setReminderInModal(page, options.reminders[0]);
    }
    if (options.reminders[1]) {
      await addSecondReminderInModal(page, options.reminders[1]);
    }
  }

  // Set priority
  if (options.priority) {
    await setPriorityInEditor(page, options.priority);
  }

  // Set category
  if (options.category) {
    await setCategoryInEditor(page, options.category);
  }

  // Expand More Options if any advanced options are needed
  // (timezone, dateType, showInTodoWhenOverdue, setToDoneAutomatically are inside More Options for tasks)
  if (options.timezone || options.dateType || options.showInTodoWhenOverdue === false || options.setToDoneAutomatically === true) {
    const moreBtn = page.getByText('More options').first();
    if (await moreBtn.isVisible({ timeout: 500 }).catch(() => false)) {
      await moreBtn.click();
      await page.waitForTimeout(200);
    }
  }

  // Set timezone (inside More Options)
  if (options.timezone) {
    await setTimezoneInModal(page, options.timezone);
  }

  // Set More Options toggles
  if (options.dateType) {
    await toggleMoreOption(page, 'dateType', options.dateType);
  }
  if (options.showInTodoWhenOverdue === false) {
    await toggleMoreOption(page, 'showInTodoWhenOverdue', false);
  }
  if (options.setToDoneAutomatically === true) {
    await toggleMoreOption(page, 'setToDoneAutomatically', true);
  }

  // Click Save
  await page.getByRole('button', { name: /Save/i }).click();

  // Wait for navigation back
  await page.waitForURL(/\/(calendar|home|todo)/, { timeout: 5000 });
  await page.waitForTimeout(500);
}

/** Set recurrence in the full editor */
async function setRecurrenceInEditor(page: Page, repeat: RepeatOptions) {
  // Click the Repeat FieldRow (repeat icon)
  const repeatRow = page.locator('div[role="button"]').filter({ has: page.locator('span.material-symbols-rounded:text-is("repeat")') }).first();
  await repeatRow.click();
  await page.waitForTimeout(300);

  // The RepeatPopover is w-[320px] with "Common" and "Custom" tabs
  const popover = page.locator('.w-\\[320px\\].rounded-xl');
  await expect(popover).toBeVisible({ timeout: 3000 });

  const hasEndCondition = repeat.count || repeat.endDate;
  const hasWeekdays = repeat.frequency === 'weekly' && repeat.weekdays;

  if (!hasEndCondition && !hasWeekdays) {
    // Simple preset — click the preset label in the Common tab (auto-closes)
    const presetLabels: Record<string, string> = {
      daily: 'Every day',
      weekly: 'Every week',
      monthly: 'Every month',
      yearly: 'Every year',
    };
    await popover.getByText(presetLabels[repeat.frequency], { exact: true }).click();
    await page.waitForTimeout(200);
  } else {
    // Need Custom tab for end conditions or weekday selection
    await popover.getByText('Custom').click();
    await page.waitForTimeout(200);

    // Set period (day/week/month/year) via the <select>
    const periodMap: Record<string, string> = {
      daily: 'day',
      weekly: 'week',
      monthly: 'month',
      yearly: 'year',
    };
    const periodSelect = popover.locator('select').first();
    await periodSelect.selectOption(periodMap[repeat.frequency]);
    await page.waitForTimeout(200);

    // Set weekdays for weekly
    if (hasWeekdays) {
      // Weekday chips are single-letter buttons (M, T, W, T, F, S, S)
      // They appear when period='week'
      const dayLetterMap: Record<string, number> = {
        Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6,
      };
      for (const day of repeat.weekdays!) {
        const idx = dayLetterMap[day];
        if (idx !== undefined) {
          // Click the nth weekday chip button
          const chips = popover.locator('.flex.gap-1 button');
          await chips.nth(idx).click();
        }
      }
      await page.waitForTimeout(200);
    }

    // Set end condition
    if (repeat.count) {
      // Click "Repeat times" button
      await popover.getByText('Repeat times').click();
      await page.waitForTimeout(200);
      // Fill the count input
      const countInput = popover.locator('input[type="number"]').last();
      await countInput.fill(String(repeat.count));
    } else if (repeat.endDate) {
      // Click "Repeat end date" button
      await popover.getByText('Repeat end date').click();
      await page.waitForTimeout(200);
      // Click the date button to open CalendarPopover inside the RepeatPopover
      const dateBtn = popover.locator('button').filter({ has: page.locator('span.material-symbols-rounded:text-is("calendar_today")') }).first();
      await dateBtn.click();
      await page.waitForTimeout(200);
      // Select the end date in the nested CalendarPopover
      const calPopover = page.locator('.w-\\[300px\\].rounded-xl');
      await expect(calPopover).toBeVisible({ timeout: 3000 });
      const targetDate = new Date(repeat.endDate + 'T00:00:00Z');
      const targetDay = targetDate.getUTCDate();
      await calPopover.locator('button.rounded-full').filter({ hasText: new RegExp(`^${targetDay}$`) }).first().click();
      await page.waitForTimeout(200);
    }

    // Click Save in the Custom tab
    await popover.getByText('Save').click();
    await page.waitForTimeout(200);
  }
}
