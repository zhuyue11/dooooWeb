/**
 * Event creation helpers for dooooWeb E2E tests.
 */

import { type Page, expect } from '@playwright/test';
import { openCreateModal, navigateToFullEditor } from './navigation';
import {
  setDateInModal,
  setTimeInModal,
  setDurationInModal,
  setEndTimeInModal,
  setTimezoneInModal,
  setPriorityInEditor,
  setDescriptionInEditor,
  setLocationInEditor,
  addGuestInEditor,
  setMeetingLinkInEditor,
  switchToEventType,
  setDateInEditor,
} from './modal-fields';
import type { RepeatOptions } from './create-task';

export interface CreateEventOptions {
  title: string;
  date: string;
  time?: string;
  endTime?: string;
  endDate?: string;
  duration?: string;
  location?: string;
  guests?: string[];
  meetingLink?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  description?: string;
  repeat?: RepeatOptions;
  timezone?: string;
  endTimezone?: string;
}

/**
 * Create an event using the quick create modal.
 * Supports: title, date, time.
 */
export async function createEventViaQuickModal(page: Page, options: CreateEventOptions) {
  await openCreateModal(page, 'calendar');

  // Switch to Event type
  await switchToEventType(page);

  // Fill title
  await page.getByPlaceholder('What needs to be done?').fill(options.title);

  // Set date (required for events)
  await setDateInModal(page, options.date);

  // Set start time if provided
  if (options.time) {
    await setTimeInModal(page, options.time);
  }

  // Click Save Event
  await page.getByRole('button', { name: 'Save Event' }).click();

  // Wait for modal to close
  await expect(page.getByPlaceholder('What needs to be done?')).not.toBeVisible({ timeout: 5000 });
  await page.waitForTimeout(500);
}

/**
 * Create an event using the full editor page.
 * Supports all fields including end time, location, guests, meeting link, etc.
 */
export async function createEventViaFullEditor(page: Page, options: CreateEventOptions) {
  await navigateToFullEditor(page, 'event');

  // Fill title
  await page.getByPlaceholder(/Add title/i).fill(options.title);

  // Set description
  if (options.description) {
    await setDescriptionInEditor(page, options.description);
  }

  // Set date
  await setDateInEditor(page, options.date);

  // Set start time
  if (options.time) {
    await setTimeInModal(page, options.time);
  }

  // Set end time
  if (options.endTime) {
    await setEndTimeInModal(page, options.endTime, options.endDate);
  }

  // Set duration
  if (options.duration) {
    await setDurationInModal(page, options.duration);
  }

  // Set timezone
  if (options.timezone) {
    await setTimezoneInModal(page, options.timezone);
  }

  // Set end timezone (for separate start/end timezones)
  if (options.endTimezone) {
    // Toggle separate timezone, then set end timezone
    const separateTzToggle = page.getByText(/different.*timezone/i).first();
    if (await separateTzToggle.isVisible({ timeout: 500 }).catch(() => false)) {
      await separateTzToggle.click();
      await page.waitForTimeout(200);
    }
    // Set the second timezone
    const tzBtns = page.locator('button').filter({ has: page.locator('span:has-text("public")') });
    await tzBtns.last().click();
    await page.waitForTimeout(200);
    const searchInput = page.locator('input[type="text"]').last();
    await searchInput.fill(options.endTimezone);
    await page.waitForTimeout(300);
    await page.getByText(options.endTimezone).first().click();
    await page.waitForTimeout(200);
  }

  // Set repeat/recurrence
  if (options.repeat) {
    await setRecurrenceInEditor(page, options.repeat);
  }

  // Set priority
  if (options.priority) {
    await setPriorityInEditor(page, options.priority);
  }

  // Set location
  if (options.location) {
    await setLocationInEditor(page, options.location);
  }

  // Add guests
  if (options.guests) {
    for (const email of options.guests) {
      await addGuestInEditor(page, email);
    }
  }

  // Set meeting link
  if (options.meetingLink) {
    await setMeetingLinkInEditor(page, options.meetingLink);
  }

  // Click Save
  await page.getByRole('button', { name: /Save/i }).click();

  // Wait for navigation back
  await page.waitForURL(/\/(calendar|home|todo)/, { timeout: 5000 });
  await page.waitForTimeout(500);
}

/** Set recurrence in the full editor for events */
async function setRecurrenceInEditor(page: Page, repeat: RepeatOptions) {
  const repeatRow = page.locator('div[role="button"]').filter({ has: page.locator('span.material-symbols-rounded:text-is("repeat")') }).first();
  await repeatRow.click();
  await page.waitForTimeout(300);

  const popover = page.locator('.w-\\[320px\\].rounded-xl');
  await expect(popover).toBeVisible({ timeout: 3000 });

  const hasEndCondition = repeat.count || repeat.endDate;
  const hasWeekdays = repeat.frequency === 'weekly' && repeat.weekdays;

  if (!hasEndCondition && !hasWeekdays) {
    const presetLabels: Record<string, string> = {
      daily: 'Every day',
      weekly: 'Every week',
      monthly: 'Every month',
      yearly: 'Every year',
    };
    await popover.getByText(presetLabels[repeat.frequency], { exact: true }).click();
    await page.waitForTimeout(200);
  } else {
    await popover.getByText('Custom').click();
    await page.waitForTimeout(200);

    const periodMap: Record<string, string> = { daily: 'day', weekly: 'week', monthly: 'month', yearly: 'year' };
    const periodSelect = popover.locator('select').first();
    await periodSelect.selectOption(periodMap[repeat.frequency]);
    await page.waitForTimeout(200);

    if (hasWeekdays) {
      const dayLetterMap: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
      for (const day of repeat.weekdays!) {
        const idx = dayLetterMap[day];
        if (idx !== undefined) {
          await popover.locator('.flex.gap-1 button').nth(idx).click();
        }
      }
      await page.waitForTimeout(200);
    }

    if (repeat.count) {
      await popover.getByText('Repeat times').click();
      await page.waitForTimeout(200);
      await popover.locator('input[type="number"]').last().fill(String(repeat.count));
    } else if (repeat.endDate) {
      await popover.getByText('Repeat end date').click();
      await page.waitForTimeout(200);
      const dateBtn = popover.locator('button').filter({ has: page.locator('span.material-symbols-rounded:text-is("calendar_today")') }).first();
      await dateBtn.click();
      await page.waitForTimeout(200);
      const calPopover = page.locator('.w-\\[300px\\].rounded-xl');
      await expect(calPopover).toBeVisible({ timeout: 3000 });
      const targetDate = new Date(repeat.endDate + 'T00:00:00Z');
      await calPopover.locator('button.rounded-full').filter({ hasText: new RegExp(`^${targetDate.getUTCDate()}$`) }).first().click();
      await page.waitForTimeout(200);
    }

    await popover.getByText('Save').click();
    await page.waitForTimeout(200);
  }
}
