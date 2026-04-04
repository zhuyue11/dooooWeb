import { test, expect } from '@playwright/test';
import { waitForCalendarLoad, waitForDashboardLoad } from './seed-data';

test.describe('Create Item Modal', () => {
  test('Add button opens create modal', async ({ page }) => {
    await waitForCalendarLoad(page);

    // Click the Add button in the task panel
    const addButton = page.locator('[data-testid="task-panel"] button:has-text("Add")');
    await expect(addButton).toBeVisible();
    await addButton.click();

    // Modal should appear with Task/Event toggle and title placeholder
    await expect(page.getByPlaceholder('What needs to be done?')).toBeVisible({ timeout: 3000 });
    await expect(page.getByRole('button', { name: 'Task' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Event' })).toBeVisible();
  });

  test('Save button disabled when title is empty', async ({ page }) => {
    await waitForCalendarLoad(page);
    await page.locator('[data-testid="task-panel"] button:has-text("Add")').click();
    await expect(page.getByPlaceholder('What needs to be done?')).toBeVisible({ timeout: 3000 });

    // Save button should be disabled
    const saveButton = page.getByRole('button', { name: /Save Task|Add to to-do/ });
    await expect(saveButton).toBeDisabled();
  });

  test('Save button text is "Add to to-do" when no date set', async ({ page }) => {
    await waitForCalendarLoad(page);
    await page.locator('[data-testid="task-panel"] button:has-text("Add")').click();
    await expect(page.getByPlaceholder('What needs to be done?')).toBeVisible({ timeout: 3000 });

    // Type a title
    await page.getByPlaceholder('What needs to be done?').fill('Test task no date');

    // Button should say "Add to to-do" (no date selected)
    await expect(page.getByRole('button', { name: 'Add to to-do' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add to to-do' })).toBeEnabled();
  });

  test('Escape closes the modal', async ({ page }) => {
    await waitForCalendarLoad(page);
    await page.locator('[data-testid="task-panel"] button:has-text("Add")').click();
    await expect(page.getByPlaceholder('What needs to be done?')).toBeVisible({ timeout: 3000 });

    await page.keyboard.press('Escape');
    await expect(page.getByPlaceholder('What needs to be done?')).not.toBeVisible();
  });

  test('Create task without date adds to to-do', async ({ page }) => {
    await waitForCalendarLoad(page);
    await page.locator('[data-testid="task-panel"] button:has-text("Add")').click();
    await expect(page.getByPlaceholder('What needs to be done?')).toBeVisible({ timeout: 3000 });

    await page.getByPlaceholder('What needs to be done?').fill('E2E test task');
    await page.getByRole('button', { name: 'Add to to-do' }).click();

    // Modal should close
    await expect(page.getByPlaceholder('What needs to be done?')).not.toBeVisible({ timeout: 5000 });
  });

  test('Event Save button disabled without date, enabled with date (time optional)', async ({ page }) => {
    await waitForCalendarLoad(page);
    await page.locator('[data-testid="task-panel"] button:has-text("Add")').click();
    await expect(page.getByPlaceholder('What needs to be done?')).toBeVisible({ timeout: 3000 });

    // Switch to Event
    await page.getByRole('button', { name: 'Event' }).click();

    // Type a title — Save Event still disabled (no date)
    await page.getByPlaceholder('What needs to be done?').fill('All day event');
    const saveButton = page.getByRole('button', { name: 'Save Event' });
    await expect(saveButton).toBeDisabled();

    // Click Add date and select a date — Save Event should become enabled
    await page.getByText('Add date').click();
    // Click a day number in the calendar popover (pick day 15)
    await page.locator('.rounded-full:has-text("15")').first().click();
    await expect(saveButton).toBeEnabled();
  });
});

test.describe('Create Item Modal — Dashboard', () => {
  test('Dashboard + button opens create modal', async ({ page }) => {
    await waitForDashboardLoad(page);

    // Click the + button in the dashboard header
    const addButton = page.locator('button:has(svg)').filter({ has: page.locator('svg') }).first();
    // More specific: the + button is in the header row next to greeting
    const headerAddBtn = page.locator('.flex.items-center.justify-between button').first();
    await headerAddBtn.click();

    // Modal should appear
    await expect(page.getByPlaceholder('What needs to be done?')).toBeVisible({ timeout: 3000 });
  });
});
