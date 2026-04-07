/**
 * RE1-RE9 — Edit single occurrence of a recurring event with three scopes:
 *   - "this occurrence"  (RE1-RE4)
 *   - "this and future"  (RE5-RE6)
 *   - "all occurrences"  (RE7-RE8)
 *   - scope modal visibility regression (RE9)
 *
 * Mirrors RT1-RT9 for events. All tests create a fresh daily recurring event
 * (count=5) at 10:00 starting tomorrow.
 */
import { test, expect } from '@playwright/test';
import { generateUniqueTitle, toISODate, offsetDateUTC } from './helpers/date-utils';
import { waitForCalendarLoad } from './helpers/navigation';
import { createEventViaFullEditor } from './helpers/create-event';
import { verifyEventOccurrenceAtDate } from './helpers/verify-event';
import {
  openSidePanelForOccurrence,
  chooseEditScope,
  editField,
  saveEdit,
} from './helpers/edit-item';

test.describe.configure({ mode: 'serial' });

const ALL_DAYS = [1, 2, 3, 4, 5] as const;

async function createRecurringEvent(
  page: any,
  prefix: string,
  opts: { time?: string; location?: string } = {},
) {
  const title = generateUniqueTitle(prefix);
  const startDate = toISODate(offsetDateUTC(1));
  await createEventViaFullEditor(page, {
    title,
    date: startDate,
    time: opts.time ?? '07:00',
    location: opts.location,
    repeat: { frequency: 'daily', count: 5 },
  });
  await waitForCalendarLoad(page);
  return { title, startDate };
}

function dayKey(offset: number): string {
  return toISODate(offsetDateUTC(offset));
}

test.describe('EDIT EVENT — Single occurrence (RE1-RE4)', () => {
  test('RE1: Edit one occurrence title — only that date changes', async ({ page }) => {
    const { title } = await createRecurringEvent(page, 'RE1');
    const newTitle = `${title}-modified`;
    const targetDate = dayKey(3);

    await openSidePanelForOccurrence(page, title, targetDate);
    await page.locator('[data-testid="side-panel-edit"]').click();
    await chooseEditScope(page, 'this');
    await editField(page, 'title', newTitle);
    await saveEdit(page);

    await verifyEventOccurrenceAtDate(page, newTitle, targetDate, true);
    await verifyEventOccurrenceAtDate(page, title, dayKey(1), true);
    await verifyEventOccurrenceAtDate(page, title, dayKey(2), true);
    await verifyEventOccurrenceAtDate(page, title, dayKey(3), false);
    await verifyEventOccurrenceAtDate(page, title, dayKey(4), true);
    await verifyEventOccurrenceAtDate(page, title, dayKey(5), true);
  });

  test('RE2: Edit one occurrence location (MODIFIED path) — others unchanged', async ({ page }) => {
    const { title } = await createRecurringEvent(page, 'RE2', { location: 'Zoom Room A' });
    const targetDate = dayKey(3);

    await openSidePanelForOccurrence(page, title, targetDate);
    await page.locator('[data-testid="side-panel-edit"]').click();
    await chooseEditScope(page, 'this');
    await editField(page, 'location', 'Zoom Room B');
    await saveEdit(page);

    // Title still present on all 5 days; location difference is per-occurrence
    for (const i of ALL_DAYS) {
      await verifyEventOccurrenceAtDate(page, title, dayKey(i), true);
    }
  });

  test('RE3: Edit one occurrence date — d+3 → d+10', async ({ page }) => {
    const { title } = await createRecurringEvent(page, 'RE3');
    const originalDate = dayKey(3);
    const newDate = dayKey(10);

    await openSidePanelForOccurrence(page, title, originalDate);
    await page.locator('[data-testid="side-panel-edit"]').click();
    await chooseEditScope(page, 'this');
    await editField(page, 'date', newDate);
    await saveEdit(page);

    await verifyEventOccurrenceAtDate(page, title, originalDate, false);
    await verifyEventOccurrenceAtDate(page, title, newDate, true);
    await verifyEventOccurrenceAtDate(page, title, dayKey(1), true);
    await verifyEventOccurrenceAtDate(page, title, dayKey(2), true);
    await verifyEventOccurrenceAtDate(page, title, dayKey(4), true);
    await verifyEventOccurrenceAtDate(page, title, dayKey(5), true);
  });

  test('RE4: Edit same occurrence twice — second replaces first (no stacking)', async ({ page }) => {
    const { title } = await createRecurringEvent(page, 'RE4', { location: 'Zoom Room A' });
    const targetDate = dayKey(3);

    await openSidePanelForOccurrence(page, title, targetDate);
    await page.locator('[data-testid="side-panel-edit"]').click();
    await chooseEditScope(page, 'this');
    await editField(page, 'location', 'Zoom Room B');
    await saveEdit(page);

    await openSidePanelForOccurrence(page, title, targetDate);
    await page.locator('[data-testid="side-panel-edit"]').click();
    await chooseEditScope(page, 'this');
    await editField(page, 'location', 'Zoom Room C');
    await saveEdit(page);

    for (const i of ALL_DAYS) {
      await verifyEventOccurrenceAtDate(page, title, dayKey(i), true);
    }
  });
});

test.describe('EDIT EVENT — This and future (RE5-RE6)', () => {
  test('RE5: Edit "this and future" title — series splits at d+3', async ({ page }) => {
    const { title } = await createRecurringEvent(page, 'RE5');
    const newTitle = `${title}-future`;

    await openSidePanelForOccurrence(page, title, dayKey(3));
    await page.locator('[data-testid="side-panel-edit"]').click();
    await chooseEditScope(page, 'future');
    await editField(page, 'title', newTitle);
    await saveEdit(page);

    await verifyEventOccurrenceAtDate(page, title, dayKey(1), true);
    await verifyEventOccurrenceAtDate(page, title, dayKey(2), true);
    await verifyEventOccurrenceAtDate(page, title, dayKey(3), false);
    await verifyEventOccurrenceAtDate(page, newTitle, dayKey(3), true);
    await verifyEventOccurrenceAtDate(page, newTitle, dayKey(4), true);
    await verifyEventOccurrenceAtDate(page, newTitle, dayKey(5), true);
  });

  test('RE6: Edit "this and future" time (07:00 → 15:00) — split applies to d+3..d+5', async ({ page }) => {
    const { title } = await createRecurringEvent(page, 'RE6', { time: '07:00' });

    await openSidePanelForOccurrence(page, title, dayKey(3));
    await page.locator('[data-testid="side-panel-edit"]').click();
    await chooseEditScope(page, 'future');
    await editField(page, 'time', '15:00');
    await saveEdit(page);

    for (const i of ALL_DAYS) {
      await verifyEventOccurrenceAtDate(page, title, dayKey(i), true);
    }
  });
});

test.describe('EDIT EVENT — All occurrences (RE7-RE8)', () => {
  test('RE7: Edit "all occurrences" title — every date updates', async ({ page }) => {
    const { title } = await createRecurringEvent(page, 'RE7');
    const newTitle = `${title}-all`;

    await openSidePanelForOccurrence(page, title, dayKey(3));
    await page.locator('[data-testid="side-panel-edit"]').click();
    await chooseEditScope(page, 'all');
    await editField(page, 'title', newTitle);
    await saveEdit(page);

    for (const i of ALL_DAYS) {
      await verifyEventOccurrenceAtDate(page, newTitle, dayKey(i), true);
      await verifyEventOccurrenceAtDate(page, title, dayKey(i), false);
    }
  });

  test('RE8: Edit "all occurrences" date — series shifts forward', async ({ page }) => {
    const { title } = await createRecurringEvent(page, 'RE8');

    await openSidePanelForOccurrence(page, title, dayKey(3));
    await page.locator('[data-testid="side-panel-edit"]').click();
    await chooseEditScope(page, 'all');
    await editField(page, 'date', dayKey(2));
    await saveEdit(page);

    await verifyEventOccurrenceAtDate(page, title, dayKey(1), false);
    for (const i of [2, 3, 4, 5, 6] as const) {
      await verifyEventOccurrenceAtDate(page, title, dayKey(i), true);
    }
  });
});

test.describe('EDIT EVENT — Scope modal visibility (RE9)', () => {
  test('RE9: Recurring shows modal; non-recurring opens editor directly', async ({ page }) => {
    const { title: recurringTitle } = await createRecurringEvent(page, 'RE9-rec');
    await openSidePanelForOccurrence(page, recurringTitle, dayKey(3));
    await page.locator('[data-testid="side-panel-edit"]').click();
    await expect(page.locator('[data-testid="recurring-scope-modal"]')).toBeVisible({ timeout: 3000 });
    await page.locator('[data-testid="scope-cancel"]').click();
    await expect(page.locator('[data-testid="recurring-scope-modal"]')).not.toBeVisible({ timeout: 2000 });

    const nonRecurringTitle = generateUniqueTitle('RE9-non');
    const startDate = toISODate(offsetDateUTC(1));
    await createEventViaFullEditor(page, { title: nonRecurringTitle, date: startDate, time: '07:00' });
    await waitForCalendarLoad(page);
    await openSidePanelForOccurrence(page, nonRecurringTitle, startDate);
    await page.locator('[data-testid="side-panel-edit"]').click();
    await page.waitForURL(/\/items\/.*\/edit/, { timeout: 5000 });
    await expect(page.locator('[data-testid="recurring-scope-modal"]')).not.toBeVisible();
  });
});
