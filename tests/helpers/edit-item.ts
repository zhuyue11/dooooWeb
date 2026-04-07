/**
 * Edit/delete helpers for dooooWeb E2E tests.
 * Handles opening items for editing and modifying fields.
 */

import { type Page, expect } from '@playwright/test';
import {
  setDateInEditor,
  setTimeInModal,
  setDurationInModal,
  setEndTimeInModal,
  setTimezoneInModal,
  setPriorityInEditor,
  setCategoryInEditor,
  setDescriptionInEditor,
  setLocationInEditor,
  addGuestInEditor,
  setMeetingLinkInEditor,
  toggleMoreOption,
} from './modal-fields';

/** Open the side panel for an item by clicking its card/row */
export async function openSidePanelForItem(page: Page, title: string) {
  // Try task-row first (task panel list on right side — always shows full titles)
  const row = page.locator(`[data-testid^="task-row-"]`).filter({ hasText: title }).first();
  const card = page.locator(`[data-testid^="task-card-"]`).filter({ hasText: title }).first();
  const dayTask = page.locator(`[data-testid^="day-task-"]`).filter({ hasText: title }).first();

  if (await row.isVisible({ timeout: 1000 }).catch(() => false)) {
    await row.click();
  } else if (await card.isVisible({ timeout: 1000 }).catch(() => false)) {
    await card.click();
  } else if (await dayTask.isVisible({ timeout: 1000 }).catch(() => false)) {
    await dayTask.click();
  } else {
    // Item not visible in current view — switch to day view where items are listed
    const viewTab = page.locator('[data-testid="view-tab-day"]');
    if (await viewTab.isVisible({ timeout: 500 }).catch(() => false)) {
      await viewTab.click();
      await page.waitForTimeout(500);
      const dayItem = page.locator(`[data-testid^="day-task-"]`).filter({ hasText: title }).first();
      if (await dayItem.isVisible({ timeout: 2000 }).catch(() => false)) {
        await dayItem.click();
      } else {
        // Last resort: force click on any element with the title
        await page.locator(`[data-testid^="task-card-"], [data-testid^="task-row-"], [data-testid^="day-task-"]`).filter({ hasText: title }).first().click({ force: true });
      }
    } else {
      await page.locator(`[data-testid^="task-card-"], [data-testid^="task-row-"]`).filter({ hasText: title }).first().click({ force: true });
    }
  }
  await page.waitForTimeout(300);

  // Verify panel opened: scope the title check into the side panel container so
  // we don't false-match the tiny pills in the calendar grid (which exist in the
  // DOM but are hidden by overflow:hidden on their parent row).
  const sidePanel = page.getByTestId('item-side-panel');
  await expect(sidePanel.getByText(title).first()).toBeVisible({ timeout: 3000 });
}

/** Open the full editor for an item (via side panel Edit button) */
export async function openFullEditorForItem(page: Page, title: string) {
  await openSidePanelForItem(page, title);

  // Click the Edit button
  await page.locator('[data-testid="side-panel-edit"]').click();

  // Wait for editor page to load
  await page.waitForURL(/\/items\/.*\/edit/, { timeout: 5000 });
  await page.waitForTimeout(300);
}

/** Edit a specific field in the full editor */
export async function editField(page: Page, field: string, value: string) {
  switch (field) {
    case 'title':
      const titleInput = page.getByPlaceholder(/Add title/i);
      await titleInput.clear();
      await titleInput.fill(value);
      break;

    case 'date':
      if (value === '') {
        // Clear date — click the close icon inside the date row (has calendar_today icon)
        const dateRow = page.locator('div[role="button"]').filter({ has: page.locator('span:has-text("calendar_today")') }).first();
        const dateClearBtn = dateRow.locator('button').filter({ has: page.locator('span:has-text("close")') });
        await dateClearBtn.click();
      } else {
        await setDateInEditor(page, value);
      }
      break;

    case 'time':
      if (value === '') {
        // Clear time — the time clear button is next to the hour:minute inputs
        // Find the close button that's a sibling of the schedule icon + inputs
        const timeCloseBtn = page.locator('input[type="number"]').first()
          .locator('..').locator('..') // Go up to container
          .locator('button').filter({ has: page.locator('span:has-text("close")') });
        await timeCloseBtn.click();
      } else {
        await setTimeInModal(page, value);
      }
      break;

    case 'duration':
      await setDurationInModal(page, value);
      break;

    case 'endTime':
      await setEndTimeInModal(page, value);
      break;

    case 'priority':
      await setPriorityInEditor(page, value);
      break;

    case 'category':
      await setCategoryInEditor(page, value);
      break;

    case 'description':
      await setDescriptionInEditor(page, value);
      break;

    case 'location':
      await setLocationInEditor(page, value);
      break;

    case 'timezone': {
      // Timezone may be in More Options (tasks) — expand if needed
      const moreBtn = page.getByText('More options').first();
      if (await moreBtn.isVisible({ timeout: 500 }).catch(() => false)) {
        await moreBtn.click();
        await page.waitForTimeout(200);
      }
      await setTimezoneInModal(page, value);
      break;
    }

    case 'guest':
      await addGuestInEditor(page, value);
      break;

    case 'meetingLink':
      await setMeetingLinkInEditor(page, value);
      break;

    case 'dateType':
      await toggleMoreOption(page, 'dateType', value as 'SCHEDULED' | 'DUE');
      break;

    case 'showInTodoWhenOverdue':
      await toggleMoreOption(page, 'showInTodoWhenOverdue', value === 'true');
      break;

    case 'setToDoneAutomatically':
      await toggleMoreOption(page, 'setToDoneAutomatically', value === 'true');
      break;
  }

  await page.waitForTimeout(200);
}

/** Save the current edit (click Save button in full editor) */
export async function saveEdit(page: Page) {
  // Listen for API response to debug save issues
  const apiPromise = page.waitForResponse(
    (resp) => resp.url().includes('/api/') && (resp.request().method() === 'PATCH' || resp.request().method() === 'PUT' || resp.request().method() === 'POST'),
    { timeout: 10000 }
  ).catch(() => null);

  // The Save button is in the editor header
  const saveBtn = page.getByRole('button', { name: 'Save' });
  await expect(saveBtn).toBeEnabled({ timeout: 3000 });
  await saveBtn.click();

  // Wait for API response
  const resp = await apiPromise;
  if (resp && resp.ok()) {
    // Wait for navigation after successful save
    await page.waitForFunction(() => !window.location.pathname.includes('/edit') && !window.location.pathname.includes('/new'), { timeout: 10000 });
  } else if (resp) {
    const body = await resp.text().catch(() => '');
    throw new Error(`Save API failed: ${resp.status()} ${resp.request().method()} ${resp.url()} — ${body}`);
  } else {
    throw new Error('Save API call was not intercepted — no PATCH/PUT/POST request made');
  }
  await page.waitForTimeout(500);
}

/** Delete an item via side panel */
export async function deleteItem(page: Page, title: string) {
  await openSidePanelForItem(page, title);

  // Click delete button
  await page.locator('[data-testid="side-panel-delete"]').click();

  // Confirm deletion
  await page.waitForTimeout(200);
  const confirmBtn = page.getByRole('button', { name: /Delete/i }).last();
  await confirmBtn.click();

  // Wait for side panel to close
  await page.waitForTimeout(500);
}

// ── Recurring scope helpers (for RT/RD/RE/RDE tests) ──

/**
 * Open the side panel for a specific occurrence of a recurring item by clicking
 * the item's card inside the day column for the given date. Falls back to the
 * generic openSidePanelForItem if the day column isn't visible.
 */
export async function openSidePanelForOccurrence(page: Page, title: string, dateKey: string) {
  await page.goto('/calendar');
  await page.waitForSelector('[data-testid="calendar-date-range"]', { timeout: 10000 });

  // Force week view. Don't swallow click errors — if the tab isn't there or
  // isn't clickable, we want to know immediately rather than spend 30s in the
  // nav loop below clicking week-arrows in the wrong view.
  await page.locator('[data-testid="view-tab-week"]').click();
  // Confirm week view is actually rendered by waiting for any day-column to appear.
  await page.waitForSelector('[data-testid^="day-column-"]', { timeout: 5000 });
  // Reset to today so the nav-loop offset is bounded by the requested date,
  // not by whatever week a previous test left the calendar on.
  await page.locator('[data-testid="nav-today"]').click();
  await page.waitForTimeout(200);

  // Navigate to the week containing dateKey if not visible
  const dayColumn = page.locator(`[data-testid="day-column-${dateKey}"]`);
  if (!(await dayColumn.isVisible({ timeout: 1000 }).catch(() => false))) {
    const target = new Date(dateKey + 'T00:00:00Z');
    const today = new Date();
    const goForward = target.getTime() > today.getTime();
    const navBtn = goForward ? 'nav-next-week' : 'nav-prev-week';
    for (let i = 0; i < 26; i++) {
      await page.locator(`[data-testid="${navBtn}"]`).click();
      await page.waitForTimeout(200);
      if (await dayColumn.isVisible({ timeout: 300 }).catch(() => false)) break;
    }
  }

  // Click the task card inside the day column
  const card = dayColumn.locator(`[data-testid^="task-card-"]`).filter({ hasText: title }).first();
  if (await card.isVisible({ timeout: 1000 }).catch(() => false)) {
    await card.click();
  } else {
    // Fall back to clicking any matching element on the page
    await openSidePanelForItem(page, title);
  }
  await page.waitForTimeout(300);
}

/**
 * In the recurring scope modal, click one of the three scope buttons.
 * Pass `'this' | 'future' | 'all'`. The data-testid attributes match
 * RecurringScopeModal: scope-this, scope-future, scope-all.
 */
export async function chooseEditScope(page: Page, scope: 'this' | 'future' | 'all') {
  const modal = page.locator('[data-testid="recurring-scope-modal"]');
  await expect(modal).toBeVisible({ timeout: 3000 });
  await modal.locator(`[data-testid="scope-${scope}"]`).click();
  // For 'this' / 'future' the modal closes and the editor opens; for 'all' the
  // editor opens (with scope=all). Wait for navigation to /edit.
  await page.waitForURL(/\/items\/.*\/edit/, { timeout: 5000 });
  await page.waitForTimeout(300);
}

/**
 * In the recurring scope modal opened from the Delete button, click one of the
 * three scope buttons. The mutation runs in-place; no editor navigation.
 */
export async function chooseDeleteScope(page: Page, scope: 'this' | 'future' | 'all') {
  const modal = page.locator('[data-testid="recurring-scope-modal"]');
  await expect(modal).toBeVisible({ timeout: 3000 });
  // Listen for the mutation API call so we know when it completes
  const apiPromise = page.waitForResponse(
    (resp) =>
      resp.url().includes('/api/') &&
      (resp.request().method() === 'DELETE' ||
        resp.request().method() === 'PATCH' ||
        resp.request().method() === 'POST'),
    { timeout: 10000 },
  ).catch(() => null);
  await modal.locator(`[data-testid="scope-${scope}"]`).click();
  const resp = await apiPromise;
  if (resp && !resp.ok()) {
    const body = await resp.text().catch(() => '');
    throw new Error(`Delete-scope API failed: ${resp.status()} ${resp.request().method()} ${resp.url()} — ${body}`);
  }
  // Modal closes after success; give the calendar a moment to invalidate.
  await page.waitForTimeout(500);
}
