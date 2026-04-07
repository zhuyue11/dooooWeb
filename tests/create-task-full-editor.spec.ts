import { test, expect } from '@playwright/test';
import { generateUniqueTitle, toISODate, todayDateUTC } from './helpers/date-utils';
import { waitForCalendarLoad } from './helpers/navigation';
import { createTaskViaFullEditor } from './helpers/create-task';
import { verifyTaskInWeekView, verifyTaskInMonthView, verifyTaskInDayView, verifyTaskInSidePanel, verifyTaskInDashboard } from './helpers/verify-task';

test.describe.configure({ mode: 'serial' });

test.describe('CREATE TASK — Via Full Editor (T6)', () => {
  test('T6: Create task via full editor with all fields', async ({ page }) => {
    const title = generateUniqueTitle('T6');
    const dateKey = toISODate(todayDateUTC());

    await createTaskViaFullEditor(page, {
      title,
      date: dateKey,
      time: '11:00',
      priority: 'HIGH',
      category: 'Work',
      description: 'Full editor test task with all fields populated',
    });

    await waitForCalendarLoad(page);
    await verifyTaskInWeekView(page, { title, dateKey, time: '11:00' });
    await verifyTaskInMonthView(page, { title, dateKey });
    await verifyTaskInDayView(page, { title, dateKey, time: '11:00' });
    await verifyTaskInSidePanel(page, {
      title,
      dateKey,
      time: '11:00',
      priority: 'HIGH',
      category: 'Work',
      description: 'Full editor test task with all fields populated',
    });
    await verifyTaskInDashboard(page, { title }, 'today');
  });
});
