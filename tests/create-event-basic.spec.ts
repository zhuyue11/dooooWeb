import { test, expect } from '@playwright/test';
import { generateUniqueTitle, toISODate, todayDateUTC, offsetDateUTC } from './helpers/date-utils';
import { waitForCalendarLoad } from './helpers/navigation';
import { createEventViaQuickModal } from './helpers/create-event';
import { verifyEventInWeekView, verifyEventInMonthView, verifyEventInDayView, verifyEventInSidePanel, verifyEventInDashboard } from './helpers/verify-event';

test.describe.configure({ mode: 'serial' });

test.describe('CREATE EVENT — Basic (E1-E3)', () => {
  test.beforeEach(async ({ page }) => {
    await waitForCalendarLoad(page);
  });

  test('E1: Create event with date (today) + start time via quick modal', async ({ page }) => {
    const title = generateUniqueTitle('E1');
    const dateKey = toISODate(todayDateUTC());

    await createEventViaQuickModal(page, { title, date: dateKey, time: '16:00' });

    await verifyEventInWeekView(page, { title, dateKey });
    await verifyEventInMonthView(page, { title, dateKey });
    await verifyEventInDayView(page, { title, dateKey, time: '16:00' });
    await verifyEventInSidePanel(page, { title, dateKey, time: '16:00' });
    await verifyEventInDashboard(page, { title }, 'today');
  });

  test('E2: Create all-day event (date, no time)', async ({ page }) => {
    const title = generateUniqueTitle('E2');
    const dateKey = toISODate(todayDateUTC());

    await createEventViaQuickModal(page, { title, date: dateKey });

    await verifyEventInWeekView(page, { title, dateKey });
    await verifyEventInMonthView(page, { title, dateKey });
    await verifyEventInDayView(page, { title, dateKey });
    await verifyEventInSidePanel(page, { title, dateKey });
    await verifyEventInDashboard(page, { title }, 'today');
  });

  test('E3: Create event for tomorrow', async ({ page }) => {
    const title = generateUniqueTitle('E3');
    const dateKey = toISODate(offsetDateUTC(1));

    await createEventViaQuickModal(page, { title, date: dateKey, time: '10:00' });

    await verifyEventInWeekView(page, { title, dateKey });
    await verifyEventInMonthView(page, { title, dateKey });
    await verifyEventInSidePanel(page, { title, dateKey, time: '10:00' });
    await verifyEventInDashboard(page, { title }, 'upcoming');
  });
});
