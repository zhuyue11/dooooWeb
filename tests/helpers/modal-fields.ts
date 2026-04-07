/**
 * Low-level field manipulation helpers for the quick create modal and full editor.
 * These handle individual field interactions (date picker, time picker, etc.).
 */

import { type Page, expect } from '@playwright/test';
import { getDayNumber, getMonthName, getYear, toISODate } from './date-utils';

/** Select a date in the CalendarPopover. Works in both modal and full editor. */
export async function setDateInModal(page: Page, dateKey: string) {
  const targetDate = new Date(dateKey + 'T00:00:00Z');
  const targetDay = targetDate.getUTCDate();
  const targetMonth = getMonthName(targetDate);
  const targetYear = getYear(targetDate);

  // Click "Add date" button to open calendar popover
  const addDateBtn = page.getByText('Add date').first();
  const dateBtn = page.locator('button').filter({ has: page.locator('span:has-text("calendar_today")') }).first();

  if (await addDateBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
    await addDateBtn.click();
  } else {
    await dateBtn.click();
  }

  // Wait for calendar popover to appear — it's a div with w-[300px] rounded-xl
  const popover = page.locator('.w-\\[300px\\].rounded-xl');
  await expect(popover).toBeVisible({ timeout: 3000 });

  // Navigate to the correct month/year within the popover
  for (let attempt = 0; attempt < 24; attempt++) {
    // The popover header shows "Month Year" as button text (e.g., "April 2026")
    const headerBtn = popover.locator('button.text-sm.font-semibold, button:has(.text-sm.font-semibold)').first();
    const headerText = await headerBtn.textContent().catch(() => '');

    if (headerText && headerText.includes(targetMonth) && headerText.includes(String(targetYear))) break;

    // Navigate: click chevron_right or chevron_left within the popover
    const popoverChevronRight = popover.locator('button').filter({ has: page.locator('span:has-text("chevron_right")') }).first();
    if (await popoverChevronRight.isVisible({ timeout: 300 }).catch(() => false)) {
      await popoverChevronRight.click();
    }
    await page.waitForTimeout(100);
  }

  // Click the target day number within the popover's day grid
  // The day grid uses: grid grid-cols-7, with buttons containing just the day number
  const dayButton = popover.locator('button.rounded-full').filter({ hasText: new RegExp(`^${targetDay}$`) }).first();
  await dayButton.click();
  await page.waitForTimeout(200);
}

/** Set a date in the full editor's date field */
export async function setDateInEditor(page: Page, dateKey: string) {
  const targetDate = new Date(dateKey + 'T00:00:00Z');
  const targetDay = targetDate.getUTCDate();
  const targetMonth = getMonthName(targetDate);
  const targetYear = getYear(targetDate);

  // Click the date button to open calendar popover
  // May show "Add date" (no date set) or the formatted date (e.g., "Mon, Apr 6")
  const addDateButton = page.getByText('Add date').first();
  const dateFieldRow = page.locator('div[role="button"]').filter({ has: page.locator('span:has-text("calendar_today")') }).first();
  if (await addDateButton.isVisible({ timeout: 500 }).catch(() => false)) {
    await addDateButton.click();
  } else {
    await dateFieldRow.click();
  }
  await page.waitForTimeout(200);

  // Scope to the CalendarPopover container
  const popover = page.locator('.w-\\[300px\\].rounded-xl');
  await expect(popover).toBeVisible({ timeout: 3000 });

  // Navigate to correct month/year
  for (let attempt = 0; attempt < 24; attempt++) {
    const headerBtn = popover.locator('button.text-sm.font-semibold, button:has(.text-sm.font-semibold)').first();
    const headerText = await headerBtn.textContent().catch(() => '');
    if (headerText && headerText.includes(targetMonth) && headerText.includes(String(targetYear))) break;

    const chevronRight = popover.locator('button').filter({ has: page.locator('span:has-text("chevron_right")') }).first();
    if (await chevronRight.isVisible({ timeout: 300 }).catch(() => false)) {
      await chevronRight.click();
    }
    await page.waitForTimeout(100);
  }

  // Click the day within the popover
  const dayButton = popover.locator('button.rounded-full').filter({ hasText: new RegExp(`^${targetDay}$`) }).first();
  await dayButton.click();
  await page.waitForTimeout(200);
}

/** Set time using the time picker in modal or editor */
export async function setTimeInModal(page: Page, time: string) {
  const [hours, minutes] = time.split(':').map(Number);

  // Try different entry points depending on context:
  // Tasks: "Add time" → TimeOfDayPicker → "At time" → numeric inputs
  // Events: "Start time" → numeric inputs directly
  const addTimeBtn = page.getByText('Add time').first();
  const startTimeBtn = page.getByText('Start time').first();

  if (await addTimeBtn.isVisible({ timeout: 500 }).catch(() => false)) {
    await addTimeBtn.click();
    await page.waitForTimeout(200);
  } else if (await startTimeBtn.isVisible({ timeout: 500 }).catch(() => false)) {
    await startTimeBtn.click();
    await page.waitForTimeout(200);
  }

  // If TimeOfDayPicker is showing (Morning/Afternoon/Evening/At time), click "At time"
  const atTimeBtn = page.getByText('At time').first();
  if (await atTimeBtn.isVisible({ timeout: 500 }).catch(() => false)) {
    await atTimeBtn.click();
    await page.waitForTimeout(300);
  }

  // Fill hour and minute inputs
  const hourInput = page.locator('input[type="number"]').first();
  await expect(hourInput).toBeVisible({ timeout: 3000 });
  const minuteInput = page.locator('input[type="number"]').nth(1);

  // Check if we need to use 24h or 12h format
  const use24hBtn = page.getByText('24h');
  if (await use24hBtn.isVisible({ timeout: 300 }).catch(() => false)) {
    await use24hBtn.click();
    await page.waitForTimeout(100);
  }

  await hourInput.fill(String(hours));
  await minuteInput.fill(String(minutes).padStart(2, '0'));
  await page.waitForTimeout(200);
}

/** Select a time of day (MORNING/AFTERNOON/EVENING) */
export async function setTimeOfDayInModal(page: Page, timeOfDay: 'MORNING' | 'AFTERNOON' | 'EVENING') {
  // Click "Add time" first if needed
  const addTimeBtn = page.getByText('Add time').first();
  if (await addTimeBtn.isVisible({ timeout: 500 }).catch(() => false)) {
    await addTimeBtn.click();
    await page.waitForTimeout(200);
  }

  const icons: Record<string, string> = {
    MORNING: 'wb_sunny',
    AFTERNOON: 'wb_cloudy',
    EVENING: 'nightlight',
  };
  const icon = icons[timeOfDay];
  await page.locator(`button`).filter({ has: page.locator(`span:has-text("${icon}")`) }).first().click();
  await page.waitForTimeout(200);
}

/** Set duration using the duration picker */
export async function setDurationInModal(page: Page, duration: string) {
  // Click the duration FieldRow (timer icon)
  const durationRow = page.locator('div[role="button"]').filter({ has: page.locator('span:has-text("timer")') }).first();
  await durationRow.click();
  await page.waitForTimeout(200);

  // The DurationPopover is w-[220px] for list view, w-[280px] for custom view
  const presets: Record<string, string> = {
    '15m': '15 min',
    '30m': '30 min',
    '1h': '1 hour',
  };

  if (presets[duration]) {
    await page.getByText(presets[duration]).first().click();
  } else {
    // Custom duration: click Custom, fill hours and minutes
    await page.getByText('Custom').first().click();
    await page.waitForTimeout(300);

    const match = duration.match(/(\d+)h\s*(\d+)m/);
    if (match) {
      // Custom view has two number inputs (hour, minute) inside the popover
      const popover = page.locator('.w-\\[280px\\].rounded-xl');
      await expect(popover).toBeVisible({ timeout: 3000 });
      const hourInput = popover.locator('input[type="number"]').first();
      const minuteInput = popover.locator('input[type="number"]').nth(1);
      await hourInput.fill(match[1]);
      await minuteInput.fill(match[2]);
      // Click Save inside the popover
      await popover.locator('button').filter({ hasText: /Save/i }).click();
    }
  }
  await page.waitForTimeout(200);
}

/** Set end time (switches to end-time mode) */
export async function setEndTimeInModal(page: Page, endTime: string, endDate?: string) {
  // Try different button texts depending on context
  const switchBtn = page.getByText('Switch to end time').first();
  const endTimeBtn = page.getByText('End time').first();

  if (await switchBtn.isVisible({ timeout: 500 }).catch(() => false)) {
    await switchBtn.click();
  } else if (await endTimeBtn.isVisible({ timeout: 500 }).catch(() => false)) {
    await endTimeBtn.click();
  }
  await page.waitForTimeout(300);

  // Find the end time inputs (may be second set of number inputs)
  const numberInputs = page.locator('input[type="number"]');
  const count = await numberInputs.count();

  // End time inputs are typically the last pair
  const hourIdx = count >= 4 ? 2 : 0;
  const hourInput = numberInputs.nth(hourIdx);
  const minuteInput = numberInputs.nth(hourIdx + 1);

  const [hours, minutes] = endTime.split(':').map(Number);
  await hourInput.fill(String(hours));
  await minuteInput.fill(String(minutes).padStart(2, '0'));

  if (endDate) {
    await setDateInModal(page, endDate);
  }
  await page.waitForTimeout(200);
}

/** Set a reminder using the reminder picker */
export async function setReminderInModal(page: Page, reminder: string) {
  // Click the first reminder FieldRow (notifications icon)
  const reminderRow = page.locator('div[role="button"]').filter({ has: page.locator('span:has-text("notifications")') }).first();
  await reminderRow.click();
  await page.waitForTimeout(300);

  // Select from preset options in the popover
  const presets: Record<string, string> = {
    '0': 'At time of event',
    '15 min': '15 minutes before',
    '30 min': '30 minutes before',
    '1 hour': '1 hour before',
    '1 day': '1 day before',
    '1 week': '1 week before',
  };

  const presetText = presets[reminder] || reminder;
  const popover = page.locator('.w-\\[240px\\].rounded-xl').last();
  await expect(popover).toBeVisible({ timeout: 3000 });
  await popover.getByText(presetText).click();
  await page.waitForTimeout(200);
}

/** Add a second reminder */
export async function addSecondReminderInModal(page: Page, reminder: string) {
  // Click the "Second reminder" FieldRow to open the ReminderPopover
  const secondBtn = page.getByText('Second reminder').first();
  await expect(secondBtn).toBeVisible({ timeout: 3000 });
  await secondBtn.click();
  await page.waitForTimeout(300);

  // The ReminderPopover opens as an absolute positioned div
  // Select preset from the popover (last one opened is on top)
  const presets: Record<string, string> = {
    '0': 'At time of event',
    '15 min': '15 minutes before',
    '30 min': '30 minutes before',
    '1 hour': '1 hour before',
    '1 day': '1 day before',
    '1 week': '1 week before',
  };

  const presetText = presets[reminder] || reminder;
  // The popover is the last .rounded-xl.border.border-border on the page
  const popover = page.locator('.w-\\[240px\\].rounded-xl').last();
  await expect(popover).toBeVisible({ timeout: 3000 });
  await popover.getByText(presetText).click();
  await page.waitForTimeout(200);
}

/** Set timezone in the editor */
export async function setTimezoneInModal(page: Page, timezone: string) {
  // Click the timezone button — a <button> containing a material-symbols-rounded span with text "public"
  const tzBtn = page.locator('button').filter({ has: page.locator('span.material-symbols-rounded', { hasText: 'public' }) }).first();
  await tzBtn.scrollIntoViewIfNeeded();
  await expect(tzBtn).toBeVisible({ timeout: 3000 });
  await tzBtn.click();
  await page.waitForTimeout(500);

  // The TimeZonePicker popover has a "Search timezones..." input
  const searchInput = page.getByPlaceholder('Search timezones...');
  await expect(searchInput).toBeVisible({ timeout: 3000 });

  // The TimeZonePicker dedupes by displayName, so we search by display name partial.
  // (e.g., "America/New_York" → "Eastern" matches "Eastern Daylight Time")
  const timezoneToSearchTerm: Record<string, string> = {
    'America/New_York': 'Eastern',
    'America/Los_Angeles': 'Pacific',
    'Europe/London': 'British',
    'Europe/Paris': 'Central European',
    'Asia/Tokyo': 'Japan',
    'Asia/Shanghai': 'China',
    'Australia/Sydney': 'Australian Eastern',
  };
  const searchTerm = timezoneToSearchTerm[timezone] || timezone.split('/').pop()!.replace(/_/g, ' ');
  await searchInput.fill(searchTerm);
  await page.waitForTimeout(800);

  // Click the first result button via evaluate (bypasses viewport overflow)
  const result = await page.evaluate(() => {
    const list = document.querySelector('.max-h-\\[300px\\]');
    if (!list) return { clicked: false, reason: 'no list element' };
    const buttons = list.querySelectorAll('button[type="button"]');
    if (buttons.length === 0) return { clicked: false, reason: 'no result buttons (filter returned empty)' };
    (buttons[0] as HTMLElement).click();
    return { clicked: true };
  });

  if (!result.clicked) {
    throw new Error(`Timezone selection failed: ${result.reason}`);
  }
  await page.waitForTimeout(500);
}

/** Set priority in the full editor */
export async function setPriorityInEditor(page: Page, priority: string) {
  // Click the priority FieldRow — has flag icon, may show "Add priority" or current priority name
  const priorityRow = page.locator('div[role="button"]').filter({ has: page.locator('span:has-text("flag")') }).first();
  await priorityRow.click();
  await page.waitForTimeout(200);

  // UI shows capitalized text (e.g., "High" not "HIGH")
  const displayText = priority.charAt(0).toUpperCase() + priority.slice(1).toLowerCase();
  await page.getByText(displayText, { exact: true }).first().click();
  await page.waitForTimeout(200);
}

/** Set category in the full editor */
export async function setCategoryInEditor(page: Page, category: string) {
  // Click the category FieldRow — has sell (tag) icon
  const categoryRow = page.locator('div[role="button"]').filter({ has: page.locator('span:has-text("sell")') }).first();
  await categoryRow.click();
  await page.waitForTimeout(200);

  await page.getByText(category, { exact: true }).first().click();
  await page.waitForTimeout(200);
}

/** Set description in the full editor */
export async function setDescriptionInEditor(page: Page, description: string) {
  const descInput = page.getByPlaceholder(/Add description/i);
  await descInput.fill(description);
}

/** Set location in the full editor */
export async function setLocationInEditor(page: Page, location: string) {
  // The location FieldRow is a div[role="button"] with location_on icon and "Add location" text
  const locationRow = page.locator('div[role="button"]').filter({ has: page.locator('span:has-text("location_on")') }).first();
  await locationRow.click();
  await page.waitForTimeout(300);

  // After clicking, an input appears with placeholder "Add location"
  const locationInput = page.getByPlaceholder('Add location');
  await expect(locationInput).toBeVisible({ timeout: 3000 });
  await locationInput.fill(location);
  await locationInput.press('Enter');
  await page.waitForTimeout(200);
}

/** Add a guest email in the full editor (events only) */
export async function addGuestInEditor(page: Page, email: string) {
  // The guest input is always visible for events — type="email"
  const emailInput = page.locator('input[type="email"]').first();
  await expect(emailInput).toBeVisible({ timeout: 3000 });
  await emailInput.fill(email);
  await emailInput.press('Enter');
  await page.waitForTimeout(200);
}

/** Set meeting link in the full editor (events only) */
export async function setMeetingLinkInEditor(page: Page, url: string) {
  // Click the meeting link FieldRow (link icon)
  const meetingRow = page.locator('div[role="button"]').filter({ has: page.locator('span:has-text("link")') }).first();
  await meetingRow.click();
  await page.waitForTimeout(300);

  // Fill the URL input (type="url", placeholder has meet.google.com)
  const urlInput = page.locator('input[type="url"]');
  await expect(urlInput).toBeVisible({ timeout: 3000 });
  await urlInput.fill(url);
  await urlInput.press('Enter');
  await page.waitForTimeout(200);
}

/** Toggle a More Options setting */
export async function toggleMoreOption(
  page: Page,
  option: 'dateType' | 'showInTodoWhenOverdue' | 'setToDoneAutomatically',
  value: boolean | 'SCHEDULED' | 'DUE'
) {
  // Expand More Options if collapsed
  const moreBtn = page.getByText('More options').first();
  if (await moreBtn.isVisible({ timeout: 500 }).catch(() => false)) {
    await moreBtn.click();
    await page.waitForTimeout(200);
  }

  switch (option) {
    case 'dateType': {
      // The dateType toggle is a switch button next to the "Due at this time/date" label
      // with event_available icon. Clicking it toggles between SCHEDULED and DUE.
      const dateTypeRow = page.locator('div').filter({ has: page.locator('span:has-text("event_available")') }).first();
      const toggleBtn = dateTypeRow.locator('button.rounded-full').first();
      await toggleBtn.click();
      break;
    }
    case 'showInTodoWhenOverdue':
    case 'setToDoneAutomatically': {
      // These are toggle switches similar to dateType
      const icons: Record<string, string> = {
        showInTodoWhenOverdue: 'visibility',
        setToDoneAutomatically: 'done_all',
      };
      // Find the row by icon, then click its toggle button
      const row = page.locator('div').filter({ has: page.locator(`span:has-text("${icons[option]}")`) }).first();
      const toggleBtn = row.locator('button.rounded-full').first();
      await toggleBtn.click();
      break;
    }
  }
  await page.waitForTimeout(200);
}

/** Switch to Event type in modal or editor */
export async function switchToEventType(page: Page) {
  await page.getByRole('button', { name: 'Event' }).first().click();
  await page.waitForTimeout(200);
}

/** Switch to Task type in modal or editor */
export async function switchToTaskType(page: Page) {
  await page.getByRole('button', { name: 'Task' }).first().click();
  await page.waitForTimeout(200);
}
