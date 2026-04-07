import { test, expect } from '@playwright/test';
import { generateUniqueTitle, toISODate, todayDateUTC } from './helpers/date-utils';
import { waitForCalendarLoad } from './helpers/navigation';
import { createEventViaFullEditor } from './helpers/create-event';
import { verifyEventInWeekView, verifyEventInMonthView, verifyEventInDayView, verifyEventInSidePanel, verifyEventInDashboard } from './helpers/verify-event';

test.describe.configure({ mode: 'serial' });

test.describe('CREATE EVENT — Via Full Editor (E4-E4b)', () => {
  test('E4: Create event via full editor with start time + end time + location', async ({ page }) => {
    const title = generateUniqueTitle('E4');
    const dateKey = toISODate(todayDateUTC());

    await createEventViaFullEditor(page, {
      title,
      date: dateKey,
      time: '10:00',
      endTime: '14:00',
      location: 'Conference Room A',
    });

    await waitForCalendarLoad(page);
    await verifyEventInWeekView(page, { title, dateKey });
    await verifyEventInMonthView(page, { title, dateKey });
    await verifyEventInDayView(page, { title, dateKey, time: '10:00' });
    await verifyEventInSidePanel(page, {
      title,
      dateKey,
      time: '10:00',
      location: 'Conference Room A',
    });
    await verifyEventInDashboard(page, { title }, 'today');
  });

  test('E4b: Create event via full editor with description + priority', async ({ page }) => {
    const title = generateUniqueTitle('E4b');
    const dateKey = toISODate(todayDateUTC());

    await createEventViaFullEditor(page, {
      title,
      date: dateKey,
      time: '15:00',
      description: 'Important event with full details',
      priority: 'HIGH',
    });

    await waitForCalendarLoad(page);
    await verifyEventInSidePanel(page, {
      title,
      dateKey,
      time: '15:00',
      description: 'Important event with full details',
      priority: 'HIGH',
    });
  });
});
