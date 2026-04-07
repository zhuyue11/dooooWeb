import { test, expect } from '@playwright/test';
import { generateUniqueTitle, toISODate, todayDateUTC, offsetDateUTC } from './helpers/date-utils';
import { waitForCalendarLoad } from './helpers/navigation';
import { createEventViaFullEditor } from './helpers/create-event';
import { verifyEventInSidePanel } from './helpers/verify-event';

test.describe.configure({ mode: 'serial' });

test.describe('CREATE EVENT — Guests & Meeting Link (E11-E13)', () => {
  test('E11: Create event with guests (add 2 email addresses)', async ({ page }) => {
    const title = generateUniqueTitle('E11');
    const dateKey = toISODate(todayDateUTC());

    await createEventViaFullEditor(page, {
      title,
      date: dateKey,
      time: '10:00',
      guests: ['alice@example.com', 'bob@example.com'],
    });

    await waitForCalendarLoad(page);
    await verifyEventInSidePanel(page, {
      title,
      dateKey,
      guests: ['alice@example.com', 'bob@example.com'],
    });
  });

  test('E12: Create event with meeting link', async ({ page }) => {
    const title = generateUniqueTitle('E12');
    const dateKey = toISODate(todayDateUTC());

    await createEventViaFullEditor(page, {
      title,
      date: dateKey,
      time: '14:00',
      meetingLink: 'https://zoom.us/j/1234567890',
    });

    await waitForCalendarLoad(page);
    await verifyEventInSidePanel(page, {
      title,
      dateKey,
      meetingLink: 'https://zoom.us/j/1234567890',
    });
  });

  test('E13: Create event with guests + meeting link + location', async ({ page }) => {
    const title = generateUniqueTitle('E13');
    const dateKey = toISODate(todayDateUTC());

    await createEventViaFullEditor(page, {
      title,
      date: dateKey,
      time: '11:00',
      guests: ['team@example.com', 'manager@example.com'],
      meetingLink: 'https://meet.google.com/abc-defg-hij',
      location: 'Building 42, Room 301',
    });

    await waitForCalendarLoad(page);
    await verifyEventInSidePanel(page, {
      title,
      dateKey,
      guests: ['team@example.com', 'manager@example.com'],
      meetingLink: 'https://meet.google.com/abc-defg-hij',
      location: 'Building 42, Room 301',
    });
  });
});

test.describe('CREATE EVENT — Timezone (E14-E15)', () => {
  test('E14: Create event with timezone different from browser/device', async ({ page }) => {
    const title = generateUniqueTitle('E14');
    const dateKey = toISODate(offsetDateUTC(1)); // Tomorrow to avoid past time

    await createEventViaFullEditor(page, {
      title,
      date: dateKey,
      time: '15:00',
      timezone: 'America/New_York',
    });

    await waitForCalendarLoad(page);
    // April is EDT (Eastern Daylight Time), not EST
    await verifyEventInSidePanel(page, { title, dateKey, timezone: 'Eastern' });
  });

  test('E15: Create event with different start and end timezones', async ({ page }) => {
    const title = generateUniqueTitle('E15');
    const dateKey = toISODate(offsetDateUTC(1)); // Tomorrow

    await createEventViaFullEditor(page, {
      title,
      date: dateKey,
      time: '15:00',
      endTime: '17:00',
      timezone: 'America/New_York',
      endTimezone: 'America/Los_Angeles',
    });

    await waitForCalendarLoad(page);
    await verifyEventInSidePanel(page, {
      title,
      dateKey,
      timezone: 'Eastern',
      endTimezone: 'Pacific',
    });
  });
});
