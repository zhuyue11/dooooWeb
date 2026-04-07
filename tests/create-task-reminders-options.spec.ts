import { test, expect } from '@playwright/test';
import { generateUniqueTitle, toISODate, todayDateUTC, offsetDateUTC } from './helpers/date-utils';
import { waitForCalendarLoad } from './helpers/navigation';
import { createTaskViaFullEditor } from './helpers/create-task';
import { verifyTaskInSidePanel, verifyTaskInDashboard, verifyTaskInTodoPage, verifyTaskNotInView } from './helpers/verify-task';

test.describe.configure({ mode: 'serial' });

test.describe('CREATE TASK — Reminders (T25-T26)', () => {
  test('T25: Create task with date + time + first reminder (15 min before)', async ({ page }) => {
    const title = generateUniqueTitle('T25');
    const dateKey = toISODate(offsetDateUTC(1)); // Tomorrow to ensure time is not in the past

    await createTaskViaFullEditor(page, {
      title,
      date: dateKey,
      time: '15:00',
      reminders: ['15 min'],
    });

    await waitForCalendarLoad(page);
    await verifyTaskInSidePanel(page, { title, dateKey, time: '15:00', reminders: ['15 min before'] });
  });

  test('T26: Create task with date + time + two reminders (15 min, 1 hour)', async ({ page }) => {
    const title = generateUniqueTitle('T26');
    const dateKey = toISODate(offsetDateUTC(1)); // Tomorrow

    await createTaskViaFullEditor(page, {
      title,
      date: dateKey,
      time: '16:00',
      reminders: ['15 min', '1 hour'],
    });

    await waitForCalendarLoad(page);
    await verifyTaskInSidePanel(page, { title, dateKey, time: '16:00', reminders: ['15 min before', '1 hr before'] });
  });
});

test.describe('CREATE TASK — More Options (T27-T30)', () => {
  test('T27: Create task with date type set to DUE', async ({ page }) => {
    const title = generateUniqueTitle('T27');
    const dateKey = toISODate(offsetDateUTC(1)); // Tomorrow to ensure More Options visible

    await createTaskViaFullEditor(page, {
      title,
      date: dateKey,
      time: '10:00',
      dateType: 'DUE',
    });

    await waitForCalendarLoad(page);
    await verifyTaskInSidePanel(page, { title, dateKey, dateType: 'DUE' });
  });

  test('T28: Create task with showInTodoWhenOverdue OFF', async ({ page }) => {
    const title = generateUniqueTitle('T28');
    const dateKey = toISODate(offsetDateUTC(1)); // Tomorrow (More Options requires future date)

    await createTaskViaFullEditor(page, {
      title,
      date: dateKey,
      time: '10:00',
      showInTodoWhenOverdue: false,
    });

    await waitForCalendarLoad(page);
    await verifyTaskInSidePanel(page, { title, dateKey });
  });

  test('T29: Create task with setToDoneAutomatically ON', async ({ page }) => {
    const title = generateUniqueTitle('T29');
    const dateKey = toISODate(offsetDateUTC(1)); // Tomorrow

    await createTaskViaFullEditor(page, {
      title,
      date: dateKey,
      time: '23:59',
      setToDoneAutomatically: true,
    });

    await waitForCalendarLoad(page);
    await verifyTaskInSidePanel(page, { title, dateKey });
  });

  test('T30: Create task with timezone changed (via More Options)', async ({ page }) => {
    const title = generateUniqueTitle('T30');
    const dateKey = toISODate(offsetDateUTC(1)); // Tomorrow

    await createTaskViaFullEditor(page, {
      title,
      date: dateKey,
      time: '14:00',
      timezone: 'America/New_York',
    });

    await waitForCalendarLoad(page);
    // America/New_York in April is EDT (Eastern Daylight Time)
    await verifyTaskInSidePanel(page, { title, dateKey, timezone: 'Eastern' });
  });
});

test.describe('CREATE TASK — Special (T31-T32)', () => {
  test('T31: Create tasks on different dates and verify each', async ({ page }) => {
    const tasks = [
      { title: generateUniqueTitle('T31a'), date: toISODate(todayDateUTC()), time: '9:00' },
      { title: generateUniqueTitle('T31b'), date: toISODate(offsetDateUTC(1)), time: '14:00' },
      { title: generateUniqueTitle('T31c'), date: toISODate(offsetDateUTC(2)), time: '16:00' },
    ];

    for (const task of tasks) {
      await createTaskViaFullEditor(page, task);
    }

    await waitForCalendarLoad(page);

    // Verify each task appears on the correct date
    for (const task of tasks) {
      await verifyTaskInSidePanel(page, { title: task.title, dateKey: task.date, time: task.time });
    }
  });

  test('T32: Create task with time in a different timezone than browser/device', async ({ page }) => {
    const title = generateUniqueTitle('T32');
    const dateKey = toISODate(offsetDateUTC(1)); // Tomorrow for More Options visibility

    await createTaskViaFullEditor(page, {
      title,
      date: dateKey,
      time: '15:00',
      timezone: 'Asia/Tokyo',
    });

    await waitForCalendarLoad(page);
    // Asia/Tokyo shows as "Japan Standard Time" in the side panel
    await verifyTaskInSidePanel(page, { title, dateKey, timezone: 'Japan' });
  });
});
