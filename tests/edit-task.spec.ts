import { test, expect } from '@playwright/test';
import { generateUniqueTitle, toISODate, todayDateUTC, offsetDateUTC } from './helpers/date-utils';
import { waitForCalendarLoad } from './helpers/navigation';
import { createTaskViaFullEditor, createTaskViaQuickModal } from './helpers/create-task';
import { verifyTaskInWeekView, verifyTaskInMonthView, verifyTaskInDayView, verifyTaskInSidePanel, verifyTaskInDashboard, verifyTaskInTodoPage, verifyTaskNotInView } from './helpers/verify-task';
import { openFullEditorForItem, editField, saveEdit } from './helpers/edit-item';

test.describe.configure({ mode: 'serial' });

test.describe('EDIT TASK (ET1-ET15)', () => {
  test('ET1: Edit task title', async ({ page }) => {
    const originalTitle = generateUniqueTitle('ET1-orig');
    const newTitle = generateUniqueTitle('ET1-new');
    const dateKey = toISODate(todayDateUTC());

    await createTaskViaFullEditor(page, { title: originalTitle, date: dateKey, time: '10:00' });
    await waitForCalendarLoad(page);

    await openFullEditorForItem(page, originalTitle);
    await editField(page, 'title', newTitle);
    await saveEdit(page);

    await waitForCalendarLoad(page);
    await verifyTaskInWeekView(page, { title: newTitle, dateKey });
    await verifyTaskNotInView(page, originalTitle, 'week');
  });

  test('ET2: Edit task date (today -> tomorrow)', async ({ page }) => {
    const title = generateUniqueTitle('ET2');
    const todayKey = toISODate(todayDateUTC());
    const tomorrowKey = toISODate(offsetDateUTC(1));

    await createTaskViaFullEditor(page, { title, date: todayKey, time: '10:00' });
    await waitForCalendarLoad(page);

    await openFullEditorForItem(page, title);
    await editField(page, 'date', tomorrowKey);
    await saveEdit(page);

    await waitForCalendarLoad(page);
    await verifyTaskInWeekView(page, { title, dateKey: tomorrowKey });
  });

  test('ET3: Edit task date (today -> past)', async ({ page }) => {
    const title = generateUniqueTitle('ET3');
    const todayKey = toISODate(todayDateUTC());
    const pastKey = toISODate(offsetDateUTC(-2));

    await createTaskViaFullEditor(page, { title, date: todayKey });
    await waitForCalendarLoad(page);

    await openFullEditorForItem(page, title);
    await editField(page, 'date', pastKey);
    await saveEdit(page);

    await waitForCalendarLoad(page);
    await verifyTaskInWeekView(page, { title, dateKey: pastKey });
  });

  test('ET4: Edit all-day task -> add specific time', async ({ page }) => {
    const title = generateUniqueTitle('ET4');
    const dateKey = toISODate(todayDateUTC());

    await createTaskViaFullEditor(page, { title, date: dateKey });
    await waitForCalendarLoad(page);

    await openFullEditorForItem(page, title);
    await editField(page, 'time', '14:00');
    await saveEdit(page);

    await waitForCalendarLoad(page);
    await verifyTaskInDayView(page, { title, dateKey, time: '14:00' });
    await verifyTaskInSidePanel(page, { title, dateKey, time: '14:00' });
  });

  test('ET5: Edit timed task -> remove time (make all-day)', async ({ page }) => {
    const title = generateUniqueTitle('ET5');
    const dateKey = toISODate(todayDateUTC());

    await createTaskViaFullEditor(page, { title, date: dateKey, time: '10:00' });
    await waitForCalendarLoad(page);

    await openFullEditorForItem(page, title);
    await editField(page, 'time', '');
    await saveEdit(page);

    await waitForCalendarLoad(page);
    await verifyTaskInDayView(page, { title, dateKey });
  });

  test('ET6: Edit dated task -> remove date (make to-do)', async ({ page }) => {
    const title = generateUniqueTitle('ET6');
    const dateKey = toISODate(todayDateUTC());

    await createTaskViaFullEditor(page, { title, date: dateKey });
    await waitForCalendarLoad(page);

    await openFullEditorForItem(page, title);
    await editField(page, 'date', '');
    await saveEdit(page);

    // Should disappear from calendar and appear in to-do
    await verifyTaskInTodoPage(page, { title });
    await waitForCalendarLoad(page);
    await verifyTaskNotInView(page, title, 'week');
  });

  test('ET7: Edit to-do task -> add date (make scheduled)', async ({ page }) => {
    const title = generateUniqueTitle('ET7');

    await waitForCalendarLoad(page); // Ensure we're on calendar before creating
    await createTaskViaQuickModal(page, { title }); // No date = to-do

    // Navigate to todo, open editor, add date
    await page.goto('/todo');
    await page.waitForTimeout(1000);
    await openFullEditorForItem(page, title);
    const dateKey = toISODate(todayDateUTC());
    await editField(page, 'date', dateKey);
    await saveEdit(page);

    await waitForCalendarLoad(page);
    await verifyTaskInWeekView(page, { title, dateKey });
    await verifyTaskNotInView(page, title, 'todo');
  });

  test('ET8: Edit task priority', async ({ page }) => {
    const title = generateUniqueTitle('ET8');
    const dateKey = toISODate(todayDateUTC());

    await createTaskViaFullEditor(page, { title, date: dateKey, priority: 'LOW' });
    await waitForCalendarLoad(page);

    await openFullEditorForItem(page, title);
    await editField(page, 'priority', 'HIGH');
    await saveEdit(page);

    await waitForCalendarLoad(page);
    await verifyTaskInSidePanel(page, { title, dateKey, priority: 'HIGH' });
  });

  test('ET9: Edit task category', async ({ page }) => {
    const title = generateUniqueTitle('ET9');
    const dateKey = toISODate(todayDateUTC());

    await createTaskViaFullEditor(page, { title, date: dateKey, category: 'Work' });
    await waitForCalendarLoad(page);

    await openFullEditorForItem(page, title);
    await editField(page, 'category', 'Home');
    await saveEdit(page);

    await waitForCalendarLoad(page);
    await verifyTaskInSidePanel(page, { title, dateKey, category: 'Home' });
  });

  test('ET10: Edit task description', async ({ page }) => {
    const title = generateUniqueTitle('ET10');
    const dateKey = toISODate(todayDateUTC());

    await createTaskViaFullEditor(page, { title, date: dateKey, description: 'Original description' });
    await waitForCalendarLoad(page);

    await openFullEditorForItem(page, title);
    await editField(page, 'description', 'Updated description text');
    await saveEdit(page);

    await waitForCalendarLoad(page);
    await verifyTaskInSidePanel(page, { title, dateKey, description: 'Updated description text' });
  });

  test('ET11: Edit task to add duration', async ({ page }) => {
    const title = generateUniqueTitle('ET11');
    const dateKey = toISODate(todayDateUTC());

    await createTaskViaFullEditor(page, { title, date: dateKey, time: '10:00' });
    await waitForCalendarLoad(page);

    await openFullEditorForItem(page, title);
    await editField(page, 'duration', '30m');
    await saveEdit(page);

    await waitForCalendarLoad(page);
    await verifyTaskInSidePanel(page, { title, dateKey, duration: '30' });
  });

  test('ET12: Edit task to switch from duration to end time', async ({ page }) => {
    const title = generateUniqueTitle('ET12');
    const dateKey = toISODate(todayDateUTC());

    await createTaskViaFullEditor(page, { title, date: dateKey, time: '10:00', duration: '1h' });
    await waitForCalendarLoad(page);

    await openFullEditorForItem(page, title);
    await editField(page, 'endTime', '13:00');
    await saveEdit(page);

    await waitForCalendarLoad(page);
    await verifyTaskInSidePanel(page, { title, dateKey });
  });

  test('ET13: Edit task date type (SCHEDULED -> DUE)', async ({ page }) => {
    const title = generateUniqueTitle('ET13');
    const dateKey = toISODate(todayDateUTC());

    await createTaskViaFullEditor(page, { title, date: dateKey });
    await waitForCalendarLoad(page);

    await openFullEditorForItem(page, title);
    await editField(page, 'dateType', 'DUE');
    await saveEdit(page);

    await waitForCalendarLoad(page);
    await verifyTaskInSidePanel(page, { title, dateKey, dateType: 'DUE' });
  });

  test('ET14: Edit task showInTodoWhenOverdue toggle', async ({ page }) => {
    const title = generateUniqueTitle('ET14');
    const dateKey = toISODate(todayDateUTC());

    await createTaskViaFullEditor(page, { title, date: dateKey });
    await waitForCalendarLoad(page);

    await openFullEditorForItem(page, title);
    await editField(page, 'showInTodoWhenOverdue', 'false');
    await saveEdit(page);

    await waitForCalendarLoad(page);
    await verifyTaskInSidePanel(page, { title, dateKey });
  });

  test('ET15: Edit task timezone (via More Options)', async ({ page }) => {
    const title = generateUniqueTitle('ET15');
    const dateKey = toISODate(offsetDateUTC(1)); // Tomorrow to ensure time is not in the past

    await createTaskViaFullEditor(page, { title, date: dateKey, time: '10:00' });
    await waitForCalendarLoad(page);

    await openFullEditorForItem(page, title);
    await editField(page, 'timezone', 'Europe/London');
    await saveEdit(page);

    await waitForCalendarLoad(page);
    // Europe/London in April is BST (British Summer Time), not GMT
    await verifyTaskInSidePanel(page, { title, dateKey, timezone: 'British' });
  });
});
