import { test, expect } from '@playwright/test';

/**
 * Phase 3.2 — Group create/edit modal E2E tests.
 * Tests the GroupFormModal in both create and edit modes,
 * and the minimal GroupDetailPage that hosts the edit flow.
 */

const TEST_GROUP_NAME = 'E2E Test Group';
const TEST_GROUP_DESC = 'A group created by E2E tests';

test.describe('Group create and edit', () => {
  test.describe.configure({ mode: 'serial' });

  let groupUrl: string;

  test('create a group via the create modal', async ({ page }) => {
    await page.goto('/groups');
    await page.waitForSelector('h1');

    // Click "New Group" button
    await page.getByText('New Group').click();

    // Modal should appear with "Create Group" title
    await expect(page.getByRole('heading', { name: 'Create Group' })).toBeVisible();

    // Fill in the form
    await page.locator('input[type="text"]').fill(TEST_GROUP_NAME);
    await page.locator('textarea').fill(TEST_GROUP_DESC);

    // Select a different color (emerald, 2nd swatch)
    const colorSwatches = page.locator('button[style*="background-color"]');
    await colorSwatches.nth(1).click();

    // Submit
    await page.getByRole('button', { name: 'Create' }).click();

    // Should navigate to group detail page
    await page.waitForURL(/\/groups\/.+/);
    groupUrl = page.url();

    // Verify group info is displayed
    await expect(page.getByText(TEST_GROUP_NAME)).toBeVisible();
    await expect(page.getByText(TEST_GROUP_DESC)).toBeVisible();
  });

  test('group detail page shows group info and edit button', async ({ page }) => {
    await page.goto(groupUrl);
    await page.waitForSelector('h1');

    // Group name visible
    await expect(page.getByRole('heading', { name: TEST_GROUP_NAME })).toBeVisible();

    // Description visible
    await expect(page.getByText(TEST_GROUP_DESC)).toBeVisible();

    // Member count visible (owner = 1 member) — appears in header and info section
    await expect(page.getByText('1 member').first()).toBeVisible();

    // Edit button visible (test user is the owner)
    await expect(page.getByTestId('edit-group-button')).toBeVisible();

    // Group info section visible
    await expect(page.getByText('Group Info')).toBeVisible();
    await expect(page.getByText(/Created on/)).toBeVisible();
  });

  test('edit modal opens with pre-filled data', async ({ page }) => {
    await page.goto(groupUrl);
    await page.waitForSelector('h1');

    // Click edit button
    await page.getByTestId('edit-group-button').click();

    // Modal should appear with "Edit Group" title
    await expect(page.getByRole('heading', { name: 'Edit Group' })).toBeVisible();

    // Fields should be pre-filled
    const nameInput = page.locator('input[type="text"]');
    await expect(nameInput).toHaveValue(TEST_GROUP_NAME);

    const descInput = page.locator('textarea');
    await expect(descInput).toHaveValue(TEST_GROUP_DESC);

    // Owner info subtitle should NOT be shown in edit mode
    await expect(page.getByText('You will be the owner')).not.toBeVisible();

    // Save button (not Create)
    await expect(page.getByRole('button', { name: 'Save' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create' })).not.toBeVisible();
  });

  test('edit group name and verify update', async ({ page }) => {
    await page.goto(groupUrl);
    await page.waitForSelector('h1');

    // Open edit modal
    await page.getByTestId('edit-group-button').click();
    await expect(page.getByRole('heading', { name: 'Edit Group' })).toBeVisible();

    // Change name
    const nameInput = page.locator('input[type="text"]');
    await nameInput.clear();
    await nameInput.fill('Updated Test Group');

    // Save
    await page.getByRole('button', { name: 'Save' }).click();

    // Modal should close and page should show updated name
    await expect(page.getByRole('heading', { name: 'Edit Group' })).not.toBeVisible();
    await expect(page.getByRole('heading', { name: 'Updated Test Group' })).toBeVisible();
  });

  test('edit group description and verify update', async ({ page }) => {
    await page.goto(groupUrl);
    await page.waitForSelector('h1');

    await page.getByTestId('edit-group-button').click();
    await expect(page.getByRole('heading', { name: 'Edit Group' })).toBeVisible();

    // Change description
    const descInput = page.locator('textarea');
    await descInput.clear();
    await descInput.fill('Updated description');

    await page.getByRole('button', { name: 'Save' }).click();

    // Verify updated description
    await expect(page.getByRole('heading', { name: 'Edit Group' })).not.toBeVisible();
    await expect(page.getByText('Updated description')).toBeVisible();
  });

  test('cancel edit discards changes', async ({ page }) => {
    await page.goto(groupUrl);
    await page.waitForSelector('h1');

    await page.getByTestId('edit-group-button').click();
    await expect(page.getByRole('heading', { name: 'Edit Group' })).toBeVisible();

    // Change name but cancel
    const nameInput = page.locator('input[type="text"]');
    await nameInput.clear();
    await nameInput.fill('Should Not Save');

    await page.getByRole('button', { name: 'Cancel' }).click();

    // Modal should close, name should NOT have changed
    await expect(page.getByRole('heading', { name: 'Edit Group' })).not.toBeVisible();
    await expect(page.getByText('Should Not Save')).not.toBeVisible();
    // Original name (from previous edit test) should still be there
    await expect(page.getByRole('heading', { name: 'Updated Test Group' })).toBeVisible();
  });

  test('validation: empty name disables save', async ({ page }) => {
    await page.goto(groupUrl);
    await page.waitForSelector('h1');

    await page.getByTestId('edit-group-button').click();
    await expect(page.getByRole('heading', { name: 'Edit Group' })).toBeVisible();

    // Clear name
    const nameInput = page.locator('input[type="text"]');
    await nameInput.clear();

    // Save button should be disabled
    const saveButton = page.getByRole('button', { name: 'Save' });
    await expect(saveButton).toBeDisabled();
  });

  test('back button navigates to group list', async ({ page }) => {
    await page.goto(groupUrl);
    await page.waitForSelector('h1');

    // Click back button
    await page.getByTestId('back-to-groups').click();

    await expect(page).toHaveURL('/groups');
  });
});
