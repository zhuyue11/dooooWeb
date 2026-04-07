import { test, expect } from '@playwright/test';
import { generateUniqueTitle, toISODate, todayDateUTC, offsetDateUTC } from './helpers/date-utils';
import { waitForCalendarLoad } from './helpers/navigation';
import { createTaskViaFullEditor } from './helpers/create-task';
import { verifyTaskInWeekView, verifyTaskInMonthView } from './helpers/verify-task';
import { verifyRecurringInstances, verifyRecurringEndsAfter, computeExpectedDates } from './helpers/recurrence';

test.describe.configure({ mode: 'serial' });

test.describe('CREATE TASK — Recurring Daily (T7-T9)', () => {
  test('T7: Create daily repeat task (infinite)', async ({ page }) => {
    const title = generateUniqueTitle('T7');
    const dateKey = toISODate(offsetDateUTC(1)); // Tomorrow to avoid past time issue

    await createTaskViaFullEditor(page, {
      title,
      date: dateKey,
      time: '9:00',
      repeat: { frequency: 'daily' },
    });

    await waitForCalendarLoad(page);
    const expectedDates = computeExpectedDates(dateKey, { frequency: 'daily' }, 3);
    await verifyRecurringInstances(page, { title, startDate: dateKey, repeat: { frequency: 'daily' }, expectedDates });
  });

  test('T8: Create daily repeat task with repeat count (3 times)', async ({ page }) => {
    const title = generateUniqueTitle('T8');
    const dateKey = toISODate(offsetDateUTC(1)); // Tomorrow to avoid past time issue

    await createTaskViaFullEditor(page, {
      title,
      date: dateKey,
      time: '10:00',
      repeat: { frequency: 'daily', count: 3 },
    });

    await waitForCalendarLoad(page);
    const expectedDates = computeExpectedDates(dateKey, { frequency: 'daily', count: 3 });
    expect(expectedDates).toHaveLength(3);
    await verifyRecurringInstances(page, { title, startDate: dateKey, repeat: { frequency: 'daily', count: 3 }, expectedDates });
    await verifyRecurringEndsAfter(page, title, expectedDates[expectedDates.length - 1]);
  });

  test('T9: Create daily repeat task with end date', async ({ page }) => {
    const title = generateUniqueTitle('T9');
    const dateKey = toISODate(offsetDateUTC(1)); // Tomorrow to avoid past time issue
    const endDate = toISODate(offsetDateUTC(4));

    await createTaskViaFullEditor(page, {
      title,
      date: dateKey,
      time: '8:00',
      repeat: { frequency: 'daily', endDate },
    });

    await waitForCalendarLoad(page);
    const expectedDates = computeExpectedDates(dateKey, { frequency: 'daily', endDate });
    await verifyRecurringInstances(page, { title, startDate: dateKey, repeat: { frequency: 'daily', endDate }, expectedDates });
    await verifyRecurringEndsAfter(page, title, endDate);
  });
});

test.describe('CREATE TASK — Recurring Weekly (T10-T13)', () => {
  test('T10: Create weekly repeat task (infinite, single day)', async ({ page }) => {
    const title = generateUniqueTitle('T10');
    const dateKey = toISODate(offsetDateUTC(1)); // Tomorrow to avoid past time issue

    await createTaskViaFullEditor(page, {
      title,
      date: dateKey,
      time: '10:00',
      repeat: { frequency: 'weekly' },
    });

    await waitForCalendarLoad(page);
    const expectedDates = computeExpectedDates(dateKey, { frequency: 'weekly' }, 14);
    await verifyRecurringInstances(page, { title, startDate: dateKey, repeat: { frequency: 'weekly' }, expectedDates });
  });

  test('T11: Create weekly repeat task with multiple days (Mon, Wed, Fri)', async ({ page }) => {
    const title = generateUniqueTitle('T11');
    const dateKey = toISODate(offsetDateUTC(1)); // Tomorrow to avoid past time issue

    await createTaskViaFullEditor(page, {
      title,
      date: dateKey,
      time: '9:00',
      repeat: { frequency: 'weekly', weekdays: ['Mon', 'Wed', 'Fri'] },
    });

    await waitForCalendarLoad(page);
    const expectedDates = computeExpectedDates(dateKey, { frequency: 'weekly', weekdays: ['Mon', 'Wed', 'Fri'] }, 7);
    await verifyRecurringInstances(page, { title, startDate: dateKey, repeat: { frequency: 'weekly', weekdays: ['Mon', 'Wed', 'Fri'] }, expectedDates });
  });

  test('T12: Create weekly repeat task with repeat count (4 times)', async ({ page }) => {
    const title = generateUniqueTitle('T12');
    const dateKey = toISODate(offsetDateUTC(1)); // Tomorrow to avoid past time issue

    await createTaskViaFullEditor(page, {
      title,
      date: dateKey,
      time: '11:00',
      repeat: { frequency: 'weekly', count: 4 },
    });

    await waitForCalendarLoad(page);
    const expectedDates = computeExpectedDates(dateKey, { frequency: 'weekly', count: 4 }, 30);
    expect(expectedDates).toHaveLength(4);
    await verifyRecurringInstances(page, { title, startDate: dateKey, repeat: { frequency: 'weekly', count: 4 }, expectedDates });
  });

  test('T13: Create weekly repeat task with end date', async ({ page }) => {
    const title = generateUniqueTitle('T13');
    const dateKey = toISODate(offsetDateUTC(1)); // Tomorrow to avoid past time issue
    const endDate = toISODate(offsetDateUTC(21));

    await createTaskViaFullEditor(page, {
      title,
      date: dateKey,
      time: '10:00',
      repeat: { frequency: 'weekly', endDate },
    });

    await waitForCalendarLoad(page);
    const expectedDates = computeExpectedDates(dateKey, { frequency: 'weekly', endDate }, 30);
    await verifyRecurringInstances(page, { title, startDate: dateKey, repeat: { frequency: 'weekly', endDate }, expectedDates });
    await verifyRecurringEndsAfter(page, title, endDate);
  });
});

test.describe('CREATE TASK — Recurring Monthly (T14-T16)', () => {
  test('T14: Create monthly repeat task (infinite)', async ({ page }) => {
    const title = generateUniqueTitle('T14');
    const dateKey = toISODate(offsetDateUTC(1)); // Tomorrow to avoid past time issue

    await createTaskViaFullEditor(page, {
      title,
      date: dateKey,
      repeat: { frequency: 'monthly' },
    });

    await waitForCalendarLoad(page);
    // Verify instance on same date next month
    const nextMonth = new Date(todayDateUTC());
    nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
    const expectedDates = [dateKey, toISODate(nextMonth)];
    await verifyRecurringInstances(page, { title, startDate: dateKey, repeat: { frequency: 'monthly' }, expectedDates });
  });

  test('T15: Create monthly repeat task with repeat count (3 times)', async ({ page }) => {
    const title = generateUniqueTitle('T15');
    const dateKey = toISODate(offsetDateUTC(1)); // Tomorrow to avoid past time issue

    await createTaskViaFullEditor(page, {
      title,
      date: dateKey,
      repeat: { frequency: 'monthly', count: 3 },
    });

    await waitForCalendarLoad(page);
    await verifyTaskInMonthView(page, { title, dateKey });
  });

  test('T16: Create monthly repeat task with end date', async ({ page }) => {
    const title = generateUniqueTitle('T16');
    const dateKey = toISODate(offsetDateUTC(1)); // Tomorrow to avoid past time issue
    const endDate = toISODate(offsetDateUTC(90));

    await createTaskViaFullEditor(page, {
      title,
      date: dateKey,
      repeat: { frequency: 'monthly', endDate },
    });

    await waitForCalendarLoad(page);
    await verifyTaskInMonthView(page, { title, dateKey });
  });
});

test.describe('CREATE TASK — Recurring Yearly (T17-T19)', () => {
  test('T17: Create yearly repeat task (infinite)', async ({ page }) => {
    const title = generateUniqueTitle('T17');
    const dateKey = toISODate(offsetDateUTC(1)); // Tomorrow to avoid past time issue

    await createTaskViaFullEditor(page, {
      title,
      date: dateKey,
      repeat: { frequency: 'yearly' },
    });

    await waitForCalendarLoad(page);
    await verifyTaskInMonthView(page, { title, dateKey });
  });

  test('T18: Create yearly repeat task with repeat count (2 times)', async ({ page }) => {
    const title = generateUniqueTitle('T18');
    const dateKey = toISODate(offsetDateUTC(1)); // Tomorrow to avoid past time issue

    await createTaskViaFullEditor(page, {
      title,
      date: dateKey,
      repeat: { frequency: 'yearly', count: 2 },
    });

    await waitForCalendarLoad(page);
    await verifyTaskInMonthView(page, { title, dateKey });
  });

  test('T19: Create yearly repeat task with end date', async ({ page }) => {
    const title = generateUniqueTitle('T19');
    const dateKey = toISODate(offsetDateUTC(1)); // Tomorrow to avoid past time issue
    const endDate = toISODate(offsetDateUTC(365 * 2));

    await createTaskViaFullEditor(page, {
      title,
      date: dateKey,
      repeat: { frequency: 'yearly', endDate },
    });

    await waitForCalendarLoad(page);
    await verifyTaskInMonthView(page, { title, dateKey });
  });
});
