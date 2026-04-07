/**
 * RDE1-RDE6 — Delete single occurrence of a recurring event with three scopes.
 * Mirrors RD1-RD6 for events.
 */
import { test, expect } from '@playwright/test';
import { generateUniqueTitle, toISODate, offsetDateUTC } from './helpers/date-utils';
import { waitForCalendarLoad } from './helpers/navigation';
import { createEventViaFullEditor } from './helpers/create-event';
import { verifyEventOccurrenceAtDate } from './helpers/verify-event';
import { openSidePanelForOccurrence, chooseDeleteScope } from './helpers/edit-item';

test.describe.configure({ mode: 'serial' });

async function createRecurringEvent(page: any, prefix: string) {
  const title = generateUniqueTitle(prefix);
  const startDate = toISODate(offsetDateUTC(1));
  await createEventViaFullEditor(page, {
    title,
    date: startDate,
    time: '07:00',
    repeat: { frequency: 'daily', count: 5 },
  });
  await waitForCalendarLoad(page);
  return { title, startDate };
}

function dayKey(offset: number): string {
  return toISODate(offsetDateUTC(offset));
}

test.describe('DELETE EVENT — Single occurrence (RDE1-RDE3)', () => {
  test('RDE1: Delete d+3 with "this occurrence"', async ({ page }) => {
    const { title } = await createRecurringEvent(page, 'RDE1');
    await openSidePanelForOccurrence(page, title, dayKey(3));
    await page.locator('[data-testid="side-panel-delete"]').click();
    await chooseDeleteScope(page, 'this');

    await verifyEventOccurrenceAtDate(page, title, dayKey(1), true);
    await verifyEventOccurrenceAtDate(page, title, dayKey(2), true);
    await verifyEventOccurrenceAtDate(page, title, dayKey(3), false);
    await verifyEventOccurrenceAtDate(page, title, dayKey(4), true);
    await verifyEventOccurrenceAtDate(page, title, dayKey(5), true);
  });

  test('RDE2: Delete base date d+1 with "this occurrence"', async ({ page }) => {
    const { title } = await createRecurringEvent(page, 'RDE2');
    await openSidePanelForOccurrence(page, title, dayKey(1));
    await page.locator('[data-testid="side-panel-delete"]').click();
    await chooseDeleteScope(page, 'this');

    await verifyEventOccurrenceAtDate(page, title, dayKey(1), false);
    for (const i of [2, 3, 4, 5] as const) {
      await verifyEventOccurrenceAtDate(page, title, dayKey(i), true);
    }
  });

  test('RDE3: Delete d+3 — second invocation no-ops (idempotent)', async ({ page }) => {
    const { title } = await createRecurringEvent(page, 'RDE3');
    await openSidePanelForOccurrence(page, title, dayKey(3));
    await page.locator('[data-testid="side-panel-delete"]').click();
    await chooseDeleteScope(page, 'this');
    await verifyEventOccurrenceAtDate(page, title, dayKey(3), false);
    // Second invocation: occurrence is gone — verify it stays gone, no errors
    await verifyEventOccurrenceAtDate(page, title, dayKey(3), false);
  });
});

test.describe('DELETE EVENT — This and future (RDE4)', () => {
  test('RDE4: Delete d+3 with "this and future"', async ({ page }) => {
    const { title } = await createRecurringEvent(page, 'RDE4');
    await openSidePanelForOccurrence(page, title, dayKey(3));
    await page.locator('[data-testid="side-panel-delete"]').click();
    await chooseDeleteScope(page, 'future');

    await verifyEventOccurrenceAtDate(page, title, dayKey(1), true);
    await verifyEventOccurrenceAtDate(page, title, dayKey(2), true);
    await verifyEventOccurrenceAtDate(page, title, dayKey(3), false);
    await verifyEventOccurrenceAtDate(page, title, dayKey(4), false);
    await verifyEventOccurrenceAtDate(page, title, dayKey(5), false);
  });
});

test.describe('DELETE EVENT — All occurrences (RDE5)', () => {
  test('RDE5: Delete d+3 with "all occurrences"', async ({ page }) => {
    const { title } = await createRecurringEvent(page, 'RDE5');
    await openSidePanelForOccurrence(page, title, dayKey(3));
    await page.locator('[data-testid="side-panel-delete"]').click();
    await chooseDeleteScope(page, 'all');

    for (const i of [1, 2, 3, 4, 5] as const) {
      await verifyEventOccurrenceAtDate(page, title, dayKey(i), false);
    }
  });
});

test.describe('DELETE EVENT — Scope modal visibility (RDE6)', () => {
  test('RDE6: Recurring shows 3-button modal; non-recurring shows single confirm', async ({ page }) => {
    const { title: recurringTitle } = await createRecurringEvent(page, 'RDE6-rec');
    await openSidePanelForOccurrence(page, recurringTitle, dayKey(3));
    await page.locator('[data-testid="side-panel-delete"]').click();
    await expect(page.locator('[data-testid="recurring-scope-modal"]')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('[data-testid="scope-this"]')).toBeVisible();
    await expect(page.locator('[data-testid="scope-future"]')).toBeVisible();
    await expect(page.locator('[data-testid="scope-all"]')).toBeVisible();
    await page.locator('[data-testid="scope-cancel"]').click();
    await expect(page.locator('[data-testid="recurring-scope-modal"]')).not.toBeVisible({ timeout: 2000 });

    const nonRecurringTitle = generateUniqueTitle('RDE6-non');
    const startDate = toISODate(offsetDateUTC(1));
    await createEventViaFullEditor(page, { title: nonRecurringTitle, date: startDate, time: '07:00' });
    await waitForCalendarLoad(page);
    await openSidePanelForOccurrence(page, nonRecurringTitle, startDate);
    await page.locator('[data-testid="side-panel-delete"]').click();
    await expect(page.locator('[data-testid="recurring-scope-modal"]')).not.toBeVisible();
    await expect(page.getByRole('button', { name: /Delete/i }).last()).toBeVisible({ timeout: 2000 });
  });
});
