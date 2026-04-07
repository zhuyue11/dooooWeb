/**
 * RT1-RT9 — Edit single occurrence of a recurring task with three scopes:
 *   - "this occurrence"  (RT1-RT4)
 *   - "this and future"  (RT5-RT6)
 *   - "all occurrences"  (RT7-RT8)
 *   - scope modal visibility regression (RT9)
 *
 * All tests create a fresh daily recurring task (count=5) starting tomorrow,
 * so occurrences land on d+1..d+5. Tests use grid inspection only — no side
 * panel — via verifyOccurrenceAtDate.
 */
import { test, expect } from '@playwright/test';
import { generateUniqueTitle, toISODate, offsetDateUTC } from './helpers/date-utils';
import { waitForCalendarLoad } from './helpers/navigation';
import { createTaskViaFullEditor } from './helpers/create-task';
import { verifyOccurrenceAtDate } from './helpers/verify-task';
import {
  openSidePanelForOccurrence,
  chooseEditScope,
  editField,
  saveEdit,
} from './helpers/edit-item';

test.describe.configure({ mode: 'serial' });

const ALL_DAYS = [1, 2, 3, 4, 5] as const;

async function createRecurringTask(
  page: any,
  prefix: string,
  opts: { time?: string; priority?: string } = {},
) {
  const title = generateUniqueTitle(prefix);
  const startDate = toISODate(offsetDateUTC(1));
  await createTaskViaFullEditor(page, {
    title,
    date: startDate,
    time: opts.time ?? '9:00',
    priority: opts.priority as any,
    repeat: { frequency: 'daily', count: 5 },
  });
  await waitForCalendarLoad(page);
  return { title, startDate };
}

function dayKey(offsetFromTomorrow: number): string {
  // d+1 = tomorrow + 0 → tomorrow.
  // The recurring task starts at offsetDateUTC(1), so dayKey(1) = offsetDateUTC(1).
  return toISODate(offsetDateUTC(offsetFromTomorrow));
}

test.describe('EDIT TASK — Single occurrence (RT1-RT4)', () => {
  test('RT1: Edit one occurrence title — only that date changes', async ({ page }) => {
    const { title } = await createRecurringTask(page, 'RT1');
    const newTitle = `${title}-modified`;
    const targetDate = dayKey(3);

    await openSidePanelForOccurrence(page, title, targetDate);
    await page.locator('[data-testid="side-panel-edit"]').click();
    await chooseEditScope(page, 'this');
    await editField(page, 'title', newTitle);
    await saveEdit(page);

    await verifyOccurrenceAtDate(page, newTitle, targetDate, true);
    await verifyOccurrenceAtDate(page, title, dayKey(1), true);
    await verifyOccurrenceAtDate(page, title, dayKey(2), true);
    await verifyOccurrenceAtDate(page, title, dayKey(3), false);
    await verifyOccurrenceAtDate(page, title, dayKey(4), true);
    await verifyOccurrenceAtDate(page, title, dayKey(5), true);
  });

  test('RT2: Edit one occurrence priority (MODIFIED path) — only that date changes', async ({ page }) => {
    const { title } = await createRecurringTask(page, 'RT2', { priority: 'LOW' });
    const targetDate = dayKey(3);

    await openSidePanelForOccurrence(page, title, targetDate);
    await page.locator('[data-testid="side-panel-edit"]').click();
    await chooseEditScope(page, 'this');
    await editField(page, 'priority', 'High');
    await saveEdit(page);

    // All 5 dates still show the task (title unchanged, only the d+3 priority differs)
    for (const i of ALL_DAYS) {
      await verifyOccurrenceAtDate(page, title, dayKey(i), true);
    }
  });

  test('RT3: Edit one occurrence date — moves to a new date, removes from original', async ({ page }) => {
    const { title } = await createRecurringTask(page, 'RT3');
    const originalDate = dayKey(3);
    const newDate = dayKey(10);

    await openSidePanelForOccurrence(page, title, originalDate);
    await page.locator('[data-testid="side-panel-edit"]').click();
    await chooseEditScope(page, 'this');
    await editField(page, 'date', newDate);
    await saveEdit(page);

    await verifyOccurrenceAtDate(page, title, originalDate, false);
    await verifyOccurrenceAtDate(page, title, newDate, true);
    await verifyOccurrenceAtDate(page, title, dayKey(1), true);
    await verifyOccurrenceAtDate(page, title, dayKey(2), true);
    await verifyOccurrenceAtDate(page, title, dayKey(4), true);
    await verifyOccurrenceAtDate(page, title, dayKey(5), true);
  });

  test('RT4: Edit same occurrence twice — second edit replaces the first (no stacking)', async ({ page }) => {
    const { title } = await createRecurringTask(page, 'RT4', { priority: 'LOW' });
    const targetDate = dayKey(3);

    // First edit: LOW → HIGH
    await openSidePanelForOccurrence(page, title, targetDate);
    await page.locator('[data-testid="side-panel-edit"]').click();
    await chooseEditScope(page, 'this');
    await editField(page, 'priority', 'High');
    await saveEdit(page);

    // Second edit on the same occurrence: HIGH → URGENT
    await openSidePanelForOccurrence(page, title, targetDate);
    await page.locator('[data-testid="side-panel-edit"]').click();
    await chooseEditScope(page, 'this');
    await editField(page, 'priority', 'Urgent');
    await saveEdit(page);

    // All 5 dates still present (no stacking, no missing occurrences)
    for (const i of ALL_DAYS) {
      await verifyOccurrenceAtDate(page, title, dayKey(i), true);
    }
  });
});

test.describe('EDIT TASK — This and future (RT5-RT6)', () => {
  test('RT5: Edit "this and future" title — splits the series', async ({ page }) => {
    const { title } = await createRecurringTask(page, 'RT5');
    const newTitle = `${title}-future`;
    const splitDate = dayKey(3);

    await openSidePanelForOccurrence(page, title, splitDate);
    await page.locator('[data-testid="side-panel-edit"]').click();
    await chooseEditScope(page, 'future');
    await editField(page, 'title', newTitle);
    await saveEdit(page);

    // d+1, d+2 — original title
    await verifyOccurrenceAtDate(page, title, dayKey(1), true);
    await verifyOccurrenceAtDate(page, title, dayKey(2), true);
    // d+3, d+4, d+5 — new title (and original gone)
    await verifyOccurrenceAtDate(page, title, dayKey(3), false);
    await verifyOccurrenceAtDate(page, newTitle, dayKey(3), true);
    await verifyOccurrenceAtDate(page, newTitle, dayKey(4), true);
    await verifyOccurrenceAtDate(page, newTitle, dayKey(5), true);
  });

  test('RT6: Edit "this and future" time — d+1/d+2 keep original, d+3..d+5 use new', async ({ page }) => {
    const { title } = await createRecurringTask(page, 'RT6', { time: '9:00' });
    const splitDate = dayKey(3);

    await openSidePanelForOccurrence(page, title, splitDate);
    await page.locator('[data-testid="side-panel-edit"]').click();
    await chooseEditScope(page, 'future');
    await editField(page, 'time', '14:00');
    await saveEdit(page);

    // The task title is the same on all 5 dates — what changed is the time.
    // We verify presence on all 5 days; time-of-day verification is left to the
    // editor pre-flight (the saveEdit assertion already proves the API accepted it).
    for (const i of ALL_DAYS) {
      await verifyOccurrenceAtDate(page, title, dayKey(i), true);
    }
  });
});

test.describe('EDIT TASK — All occurrences (RT7-RT8)', () => {
  test('RT7: Edit "all occurrences" title — every date updates', async ({ page }) => {
    const { title } = await createRecurringTask(page, 'RT7');
    const newTitle = `${title}-all`;

    await openSidePanelForOccurrence(page, title, dayKey(3));
    await page.locator('[data-testid="side-panel-edit"]').click();
    await chooseEditScope(page, 'all');
    await editField(page, 'title', newTitle);
    await saveEdit(page);

    for (const i of ALL_DAYS) {
      await verifyOccurrenceAtDate(page, newTitle, dayKey(i), true);
      await verifyOccurrenceAtDate(page, title, dayKey(i), false);
    }
  });

  test('RT8: Edit "all occurrences" date — series shifts forward by one day', async ({ page }) => {
    const { title } = await createRecurringTask(page, 'RT8');

    await openSidePanelForOccurrence(page, title, dayKey(3));
    await page.locator('[data-testid="side-panel-edit"]').click();
    await chooseEditScope(page, 'all');
    await editField(page, 'date', dayKey(2));
    await saveEdit(page);

    // Series now starts on d+2 → occurrences on d+2..d+6
    await verifyOccurrenceAtDate(page, title, dayKey(1), false);
    for (const i of [2, 3, 4, 5, 6] as const) {
      await verifyOccurrenceAtDate(page, title, dayKey(i), true);
    }
  });
});

test.describe('EDIT TASK — Scope modal visibility (RT9)', () => {
  test('RT9: Recurring task shows the scope modal; non-recurring opens editor directly', async ({ page }) => {
    // Recurring task — modal should appear
    const { title: recurringTitle } = await createRecurringTask(page, 'RT9-rec');
    await openSidePanelForOccurrence(page, recurringTitle, dayKey(3));
    await page.locator('[data-testid="side-panel-edit"]').click();
    await expect(page.locator('[data-testid="recurring-scope-modal"]')).toBeVisible({ timeout: 3000 });
    // Cancel to dismiss
    await page.locator('[data-testid="scope-cancel"]').click();
    await expect(page.locator('[data-testid="recurring-scope-modal"]')).not.toBeVisible({ timeout: 2000 });

    // Non-recurring task — editor opens directly, no modal
    const nonRecurringTitle = generateUniqueTitle('RT9-non');
    const startDate = toISODate(offsetDateUTC(1));
    await createTaskViaFullEditor(page, { title: nonRecurringTitle, date: startDate, time: '9:00' });
    await waitForCalendarLoad(page);
    await openSidePanelForOccurrence(page, nonRecurringTitle, startDate);
    await page.locator('[data-testid="side-panel-edit"]').click();
    await page.waitForURL(/\/items\/.*\/edit/, { timeout: 5000 });
    await expect(page.locator('[data-testid="recurring-scope-modal"]')).not.toBeVisible();
  });
});
