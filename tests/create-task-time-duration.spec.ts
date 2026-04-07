import { test, expect } from '@playwright/test';
import { generateUniqueTitle, toISODate, todayDateUTC } from './helpers/date-utils';
import { waitForCalendarLoad } from './helpers/navigation';
import { createTaskViaFullEditor } from './helpers/create-task';
import { verifyTaskInDayView, verifyTaskInSidePanel, verifyTaskInWeekView } from './helpers/verify-task';

test.describe.configure({ mode: 'serial' });

test.describe('CREATE TASK — Time of Day (T20)', () => {
  test('T20: Create task with date + time of day (MORNING) + weekly repeat', async ({ page }) => {
    const title = generateUniqueTitle('T20');
    const dateKey = toISODate(todayDateUTC());

    await createTaskViaFullEditor(page, {
      title,
      date: dateKey,
      timeOfDay: 'MORNING',
      repeat: { frequency: 'weekly' },
    });

    await waitForCalendarLoad(page);
    await verifyTaskInSidePanel(page, { title, dateKey, timeOfDay: 'MORNING', repeat: true });
  });
});

test.describe('CREATE TASK — Duration & End Time (T21-T24)', () => {
  test('T21: Create task with date + time + duration (30 min)', async ({ page }) => {
    const title = generateUniqueTitle('T21');
    const dateKey = toISODate(todayDateUTC());

    await createTaskViaFullEditor(page, {
      title,
      date: dateKey,
      time: '10:00',
      duration: '30m',
    });

    await waitForCalendarLoad(page);
    await verifyTaskInSidePanel(page, { title, dateKey, time: '10:00', duration: '30' });
    await verifyTaskInDayView(page, { title, dateKey, time: '10:00' });
  });

  test('T22: Create task with date + time + custom duration (2h 15m)', async ({ page }) => {
    const title = generateUniqueTitle('T22');
    const dateKey = toISODate(todayDateUTC());

    await createTaskViaFullEditor(page, {
      title,
      date: dateKey,
      time: '14:00',
      duration: '2h 15m',
    });

    await waitForCalendarLoad(page);
    await verifyTaskInSidePanel(page, { title, dateKey, time: '14:00', duration: '135 min' });
  });

  test('T23: Create task with date + time, switch to end time mode (same day)', async ({ page }) => {
    const title = generateUniqueTitle('T23');
    const dateKey = toISODate(todayDateUTC());

    await createTaskViaFullEditor(page, {
      title,
      date: dateKey,
      time: '10:00',
      endTime: '12:00',
    });

    await waitForCalendarLoad(page);
    await verifyTaskInSidePanel(page, { title, dateKey });
    await verifyTaskInWeekView(page, { title, dateKey });
  });

  test('T24: Create task with date + time, switch to end time on a different end date', async ({ page }) => {
    const title = generateUniqueTitle('T24');
    const dateKey = toISODate(todayDateUTC());
    const endDate = toISODate(new Date(todayDateUTC().getTime() + 86400000));

    await createTaskViaFullEditor(page, {
      title,
      date: dateKey,
      time: '22:00',
      endTime: '06:00',
      endDate,
    });

    await waitForCalendarLoad(page);
    await verifyTaskInSidePanel(page, { title, dateKey });
  });
});
