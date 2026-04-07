import { test, expect } from '@playwright/test';
import { generateUniqueTitle, toISODate, offsetDateUTC, todayDateUTC } from './helpers/date-utils';
import { waitForCalendarLoad, navigateToView, navigateToPrevPeriod } from './helpers/navigation';
import { createTaskViaQuickModal } from './helpers/create-task';
import { verifyTaskInWeekView, verifyTaskInMonthView, verifyTaskInDayView, verifyTaskInSidePanel, verifyTaskInDashboard, verifyTaskInTodoPage, verifyTaskNotInView } from './helpers/verify-task';

test.describe.configure({ mode: 'serial' });

test.describe('CREATE TASK — Basic (T1-T5)', () => {
  test.beforeEach(async ({ page }) => {
    await waitForCalendarLoad(page);
  });

  test('T1: Create task with date (today) + time via quick modal', async ({ page }) => {
    const title = generateUniqueTitle('T1');
    const dateKey = toISODate(todayDateUTC());

    await createTaskViaQuickModal(page, { title, date: dateKey, time: '10:00' });

    await verifyTaskInWeekView(page, { title, dateKey, time: '10:00' });
    await verifyTaskInMonthView(page, { title, dateKey });
    await verifyTaskInDayView(page, { title, dateKey, time: '10:00' });
    await verifyTaskInSidePanel(page, { title, dateKey, time: '10:00' });
    await verifyTaskInDashboard(page, { title }, 'today');
  });

  test('T2: Create task with date (today) but no time (all-day)', async ({ page }) => {
    const title = generateUniqueTitle('T2');
    const dateKey = toISODate(todayDateUTC());

    await createTaskViaQuickModal(page, { title, date: dateKey });

    await verifyTaskInWeekView(page, { title, dateKey });
    await verifyTaskInMonthView(page, { title, dateKey });
    await verifyTaskInDayView(page, { title, dateKey });
    await verifyTaskInSidePanel(page, { title, dateKey });
    await verifyTaskInDashboard(page, { title }, 'today');
  });

  test('T3: Create task without date (to-do)', async ({ page }) => {
    const title = generateUniqueTitle('T3');

    await createTaskViaQuickModal(page, { title });

    // Should appear in to-do page and dashboard todo section
    await verifyTaskInTodoPage(page, { title });
    await verifyTaskInDashboard(page, { title }, 'todo');

    // Should NOT appear in calendar views
    await waitForCalendarLoad(page);
    await verifyTaskNotInView(page, title, 'week');
  });

  test('T4: Create task for tomorrow with time', async ({ page }) => {
    const title = generateUniqueTitle('T4');
    const dateKey = toISODate(offsetDateUTC(1));

    await createTaskViaQuickModal(page, { title, date: dateKey, time: '14:00' });

    await verifyTaskInWeekView(page, { title, dateKey, time: '14:00' });
    await verifyTaskInMonthView(page, { title, dateKey });
    await verifyTaskInSidePanel(page, { title, dateKey, time: '14:00' });
    await verifyTaskInDashboard(page, { title }, 'upcoming');
  });

  test('T5: Create task in the past (yesterday) — backend auto-completes it', async ({ page }) => {
    const title = generateUniqueTitle('T5');
    const dateKey = toISODate(offsetDateUTC(-1));

    await createTaskViaQuickModal(page, { title, date: dateKey });

    // Yesterday may be in the previous week — navigate there if needed
    await navigateToView(page, 'week');

    // Check if yesterday's column is in current view, if not navigate back
    const dayCol = page.locator(`[data-testid="day-column-${dateKey}"]`);
    if (!(await dayCol.isVisible({ timeout: 1000 }).catch(() => false))) {
      await navigateToPrevPeriod(page);
    }

    // Backend auto-completes past tasks — verify completed state
    await verifyTaskInWeekView(page, { title, dateKey, isCompleted: true });
    await verifyTaskInMonthView(page, { title, dateKey });
    await verifyTaskInSidePanel(page, { title, dateKey, isCompleted: true });
  });
});
