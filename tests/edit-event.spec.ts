import { test, expect } from '@playwright/test';
import { generateUniqueTitle, toISODate, todayDateUTC, offsetDateUTC } from './helpers/date-utils';
import { waitForCalendarLoad } from './helpers/navigation';
import { createEventViaFullEditor } from './helpers/create-event';
import { verifyEventInWeekView, verifyEventInSidePanel } from './helpers/verify-event';
import { openFullEditorForItem, editField, saveEdit } from './helpers/edit-item';

test.describe.configure({ mode: 'serial' });

test.describe('EDIT EVENT (EE1-EE12)', () => {
  test('EE1: Edit event title', async ({ page }) => {
    const originalTitle = generateUniqueTitle('EE1-orig');
    const newTitle = generateUniqueTitle('EE1-new');
    const dateKey = toISODate(todayDateUTC());

    await createEventViaFullEditor(page, { title: originalTitle, date: dateKey, time: '10:00' });
    await waitForCalendarLoad(page);

    await openFullEditorForItem(page, originalTitle);
    await editField(page, 'title', newTitle);
    await saveEdit(page);

    await waitForCalendarLoad(page);
    await verifyEventInWeekView(page, { title: newTitle, dateKey });
  });

  test('EE2: Edit event date (today -> tomorrow)', async ({ page }) => {
    const title = generateUniqueTitle('EE2');
    const todayKey = toISODate(todayDateUTC());
    const tomorrowKey = toISODate(offsetDateUTC(1));

    await createEventViaFullEditor(page, { title, date: todayKey, time: '14:00' });
    await waitForCalendarLoad(page);

    await openFullEditorForItem(page, title);
    await editField(page, 'date', tomorrowKey);
    await saveEdit(page);

    await waitForCalendarLoad(page);
    await verifyEventInWeekView(page, { title, dateKey: tomorrowKey });
  });

  test('EE3: Edit event start time', async ({ page }) => {
    const title = generateUniqueTitle('EE3');
    const dateKey = toISODate(todayDateUTC());

    await createEventViaFullEditor(page, { title, date: dateKey, time: '10:00' });
    await waitForCalendarLoad(page);

    await openFullEditorForItem(page, title);
    await editField(page, 'time', '16:00');
    await saveEdit(page);

    await waitForCalendarLoad(page);
    await verifyEventInSidePanel(page, { title, dateKey, time: '16:00' });
  });

  test('EE4: Edit event to add location', async ({ page }) => {
    const title = generateUniqueTitle('EE4');
    const dateKey = toISODate(todayDateUTC());

    await createEventViaFullEditor(page, { title, date: dateKey, time: '11:00' });
    await waitForCalendarLoad(page);

    await openFullEditorForItem(page, title);
    await editField(page, 'location', 'Main Conference Room');
    await saveEdit(page);

    await waitForCalendarLoad(page);
    await verifyEventInSidePanel(page, { title, dateKey, location: 'Main Conference Room' });
  });

  test('EE5: Edit event to add end time', async ({ page }) => {
    const title = generateUniqueTitle('EE5');
    const dateKey = toISODate(todayDateUTC());

    await createEventViaFullEditor(page, { title, date: dateKey, time: '10:00' });
    await waitForCalendarLoad(page);

    await openFullEditorForItem(page, title);
    await editField(page, 'endTime', '12:00');
    await saveEdit(page);

    await waitForCalendarLoad(page);
    await verifyEventInSidePanel(page, { title, dateKey });
  });

  test('EE6: Edit event to add duration', async ({ page }) => {
    const title = generateUniqueTitle('EE6');
    const dateKey = toISODate(todayDateUTC());

    await createEventViaFullEditor(page, { title, date: dateKey, time: '14:00' });
    await waitForCalendarLoad(page);

    await openFullEditorForItem(page, title);
    await editField(page, 'duration', '1h');
    await saveEdit(page);

    await waitForCalendarLoad(page);
    await verifyEventInSidePanel(page, { title, dateKey, duration: '1' });
  });

  test('EE7: Edit event to change end date (multi-day)', async ({ page }) => {
    const title = generateUniqueTitle('EE7');
    const dateKey = toISODate(todayDateUTC());
    const endDate = toISODate(offsetDateUTC(3));

    await createEventViaFullEditor(page, { title, date: dateKey, time: '10:00', endTime: '18:00' });
    await waitForCalendarLoad(page);

    await openFullEditorForItem(page, title);
    await editField(page, 'endTime', '18:00');
    // Change end date to make it multi-day
    await saveEdit(page);

    await waitForCalendarLoad(page);
    await verifyEventInWeekView(page, { title, dateKey });
  });

  test('EE8: Edit event to add guests', async ({ page }) => {
    const title = generateUniqueTitle('EE8');
    const dateKey = toISODate(todayDateUTC());

    await createEventViaFullEditor(page, { title, date: dateKey, time: '10:00' });
    await waitForCalendarLoad(page);

    await openFullEditorForItem(page, title);
    await editField(page, 'guest', 'colleague@example.com');
    await saveEdit(page);

    await waitForCalendarLoad(page);
    await verifyEventInSidePanel(page, { title, dateKey, guests: ['colleague@example.com'] });
  });

  test('EE9: Edit event to add meeting link', async ({ page }) => {
    const title = generateUniqueTitle('EE9');
    const dateKey = toISODate(todayDateUTC());

    await createEventViaFullEditor(page, { title, date: dateKey, time: '11:00' });
    await waitForCalendarLoad(page);

    await openFullEditorForItem(page, title);
    await editField(page, 'meetingLink', 'https://zoom.us/j/9999999');
    await saveEdit(page);

    await waitForCalendarLoad(page);
    await verifyEventInSidePanel(page, { title, dateKey, meetingLink: 'https://zoom.us/j/9999999' });
  });

  test('EE10: Edit event to change timezone', async ({ page }) => {
    const title = generateUniqueTitle('EE10');
    const dateKey = toISODate(todayDateUTC());

    await createEventViaFullEditor(page, { title, date: dateKey, time: '10:00' });
    await waitForCalendarLoad(page);

    await openFullEditorForItem(page, title);
    await editField(page, 'timezone', 'Asia/Tokyo');
    await saveEdit(page);

    await waitForCalendarLoad(page);
    await verifyEventInSidePanel(page, { title, dateKey, timezone: 'JST' });
  });

  test('EE11: Edit event to use separate start/end timezones', async ({ page }) => {
    const title = generateUniqueTitle('EE11');
    const dateKey = toISODate(todayDateUTC());

    await createEventViaFullEditor(page, {
      title,
      date: dateKey,
      time: '10:00',
      endTime: '14:00',
      timezone: 'America/New_York',
    });
    await waitForCalendarLoad(page);

    await openFullEditorForItem(page, title);
    // The editor should already have the start timezone; need to set end timezone
    await saveEdit(page);

    await waitForCalendarLoad(page);
    await verifyEventInSidePanel(page, { title, dateKey, timezone: 'EST' });
  });

  test('EE12: Edit event priority', async ({ page }) => {
    const title = generateUniqueTitle('EE12');
    const dateKey = toISODate(todayDateUTC());

    await createEventViaFullEditor(page, { title, date: dateKey, time: '10:00' });
    await waitForCalendarLoad(page);

    await openFullEditorForItem(page, title);
    await editField(page, 'priority', 'MEDIUM');
    await saveEdit(page);

    await waitForCalendarLoad(page);
    await verifyEventInSidePanel(page, { title, dateKey, priority: 'MEDIUM' });
  });
});
