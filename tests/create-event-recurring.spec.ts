import { test, expect } from '@playwright/test';
import { generateUniqueTitle, toISODate, todayDateUTC, offsetDateUTC } from './helpers/date-utils';
import { waitForCalendarLoad } from './helpers/navigation';
import { createEventViaFullEditor } from './helpers/create-event';
import { verifyEventInWeekView, verifyEventInMonthView } from './helpers/verify-event';
import { verifyRecurringInstances, verifyRecurringEndsAfter, computeExpectedDates } from './helpers/recurrence';

test.describe.configure({ mode: 'serial' });

test.describe('CREATE EVENT — Recurring Daily (E16-E18)', () => {
  test('E16: Create daily repeat event (infinite)', async ({ page }) => {
    const title = generateUniqueTitle('E16');
    const dateKey = toISODate(offsetDateUTC(1)); // Tomorrow to avoid past time issue

    await createEventViaFullEditor(page, {
      title,
      date: dateKey,
      time: '10:00',
      repeat: { frequency: 'daily' },
    });

    await waitForCalendarLoad(page);
    const expectedDates = computeExpectedDates(dateKey, { frequency: 'daily' }, 3);
    await verifyRecurringInstances(page, { title, startDate: dateKey, repeat: { frequency: 'daily' }, expectedDates });
  });

  test('E17: Create daily repeat event with repeat count', async ({ page }) => {
    const title = generateUniqueTitle('E17');
    const dateKey = toISODate(offsetDateUTC(1)); // Tomorrow to avoid past time issue

    await createEventViaFullEditor(page, {
      title,
      date: dateKey,
      time: '14:00',
      repeat: { frequency: 'daily', count: 5 },
    });

    await waitForCalendarLoad(page);
    const expectedDates = computeExpectedDates(dateKey, { frequency: 'daily', count: 5 });
    expect(expectedDates).toHaveLength(5);
    await verifyRecurringInstances(page, { title, startDate: dateKey, repeat: { frequency: 'daily', count: 5 }, expectedDates });
    await verifyRecurringEndsAfter(page, title, expectedDates[expectedDates.length - 1]);
  });

  test('E18: Create daily repeat event with end date', async ({ page }) => {
    const title = generateUniqueTitle('E18');
    const dateKey = toISODate(offsetDateUTC(1)); // Tomorrow to avoid past time issue
    const endDate = toISODate(offsetDateUTC(6));

    await createEventViaFullEditor(page, {
      title,
      date: dateKey,
      time: '9:00',
      repeat: { frequency: 'daily', endDate },
    });

    await waitForCalendarLoad(page);
    const expectedDates = computeExpectedDates(dateKey, { frequency: 'daily', endDate });
    await verifyRecurringInstances(page, { title, startDate: dateKey, repeat: { frequency: 'daily', endDate }, expectedDates });
    await verifyRecurringEndsAfter(page, title, endDate);
  });
});

test.describe('CREATE EVENT — Recurring Weekly (E19-E22)', () => {
  test('E19: Create weekly repeat event (infinite)', async ({ page }) => {
    const title = generateUniqueTitle('E19');
    const dateKey = toISODate(offsetDateUTC(1)); // Tomorrow to avoid past time issue

    await createEventViaFullEditor(page, {
      title,
      date: dateKey,
      time: '11:00',
      repeat: { frequency: 'weekly' },
    });

    await waitForCalendarLoad(page);
    const expectedDates = computeExpectedDates(dateKey, { frequency: 'weekly' }, 14);
    await verifyRecurringInstances(page, { title, startDate: dateKey, repeat: { frequency: 'weekly' }, expectedDates });
  });

  test('E20: Create weekly repeat event with multiple days', async ({ page }) => {
    const title = generateUniqueTitle('E20');
    const dateKey = toISODate(offsetDateUTC(1)); // Tomorrow to avoid past time issue

    await createEventViaFullEditor(page, {
      title,
      date: dateKey,
      time: '10:00',
      repeat: { frequency: 'weekly', weekdays: ['Tue', 'Thu'] },
    });

    await waitForCalendarLoad(page);
    const expectedDates = computeExpectedDates(dateKey, { frequency: 'weekly', weekdays: ['Tue', 'Thu'] }, 7);
    await verifyRecurringInstances(page, { title, startDate: dateKey, repeat: { frequency: 'weekly', weekdays: ['Tue', 'Thu'] }, expectedDates });
  });

  test('E21: Create weekly repeat event with repeat count', async ({ page }) => {
    const title = generateUniqueTitle('E21');
    const dateKey = toISODate(offsetDateUTC(1)); // Tomorrow to avoid past time issue

    await createEventViaFullEditor(page, {
      title,
      date: dateKey,
      time: '13:00',
      repeat: { frequency: 'weekly', count: 3 },
    });

    await waitForCalendarLoad(page);
    const expectedDates = computeExpectedDates(dateKey, { frequency: 'weekly', count: 3 }, 30);
    expect(expectedDates).toHaveLength(3);
    await verifyRecurringInstances(page, { title, startDate: dateKey, repeat: { frequency: 'weekly', count: 3 }, expectedDates });
  });

  test('E22: Create weekly repeat event with end date', async ({ page }) => {
    const title = generateUniqueTitle('E22');
    const dateKey = toISODate(offsetDateUTC(1)); // Tomorrow to avoid past time issue
    const endDate = toISODate(offsetDateUTC(28));

    await createEventViaFullEditor(page, {
      title,
      date: dateKey,
      time: '16:00',
      repeat: { frequency: 'weekly', endDate },
    });

    await waitForCalendarLoad(page);
    const expectedDates = computeExpectedDates(dateKey, { frequency: 'weekly', endDate }, 35);
    await verifyRecurringInstances(page, { title, startDate: dateKey, repeat: { frequency: 'weekly', endDate }, expectedDates });
    await verifyRecurringEndsAfter(page, title, endDate);
  });
});

test.describe('CREATE EVENT — Recurring Monthly (E23-E25)', () => {
  test('E23: Create monthly repeat event (infinite)', async ({ page }) => {
    const title = generateUniqueTitle('E23');
    const dateKey = toISODate(offsetDateUTC(1)); // Tomorrow to avoid past time issue

    await createEventViaFullEditor(page, {
      title,
      date: dateKey,
      time: '10:00',
      repeat: { frequency: 'monthly' },
    });

    await waitForCalendarLoad(page);
    await verifyEventInMonthView(page, { title, dateKey });
  });

  test('E24: Create monthly repeat event with repeat count', async ({ page }) => {
    const title = generateUniqueTitle('E24');
    const dateKey = toISODate(offsetDateUTC(1)); // Tomorrow to avoid past time issue

    await createEventViaFullEditor(page, {
      title,
      date: dateKey,
      time: '11:00',
      repeat: { frequency: 'monthly', count: 3 },
    });

    await waitForCalendarLoad(page);
    await verifyEventInMonthView(page, { title, dateKey });
  });

  test('E25: Create monthly repeat event with end date', async ({ page }) => {
    const title = generateUniqueTitle('E25');
    const dateKey = toISODate(offsetDateUTC(1)); // Tomorrow to avoid past time issue
    const endDate = toISODate(offsetDateUTC(120));

    await createEventViaFullEditor(page, {
      title,
      date: dateKey,
      time: '14:00',
      repeat: { frequency: 'monthly', endDate },
    });

    await waitForCalendarLoad(page);
    await verifyEventInMonthView(page, { title, dateKey });
  });
});

test.describe('CREATE EVENT — Recurring Yearly (E26-E28)', () => {
  test('E26: Create yearly repeat event (infinite)', async ({ page }) => {
    const title = generateUniqueTitle('E26');
    const dateKey = toISODate(offsetDateUTC(1)); // Tomorrow to avoid past time issue

    await createEventViaFullEditor(page, {
      title,
      date: dateKey,
      time: '10:00',
      repeat: { frequency: 'yearly' },
    });

    await waitForCalendarLoad(page);
    await verifyEventInMonthView(page, { title, dateKey });
  });

  test('E27: Create yearly repeat event with repeat count', async ({ page }) => {
    const title = generateUniqueTitle('E27');
    const dateKey = toISODate(offsetDateUTC(1)); // Tomorrow to avoid past time issue

    await createEventViaFullEditor(page, {
      title,
      date: dateKey,
      time: '15:00',
      repeat: { frequency: 'yearly', count: 2 },
    });

    await waitForCalendarLoad(page);
    await verifyEventInMonthView(page, { title, dateKey });
  });

  test('E28: Create yearly repeat event with end date', async ({ page }) => {
    const title = generateUniqueTitle('E28');
    const dateKey = toISODate(offsetDateUTC(1)); // Tomorrow to avoid past time issue
    const endDate = toISODate(offsetDateUTC(365 * 3));

    await createEventViaFullEditor(page, {
      title,
      date: dateKey,
      time: '12:00',
      repeat: { frequency: 'yearly', endDate },
    });

    await waitForCalendarLoad(page);
    await verifyEventInMonthView(page, { title, dateKey });
  });
});
