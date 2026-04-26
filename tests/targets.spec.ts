import { test, expect } from '@playwright/test';

/**
 * Phase 4.1 — Target list + CRUD E2E tests.
 * Tests the TargetPlanHomePage with target list,
 * filter pills, create modal, and navigation.
 */

const TEST_TARGET_NAME = 'Learn Spanish';
const TEST_TARGET_DESC = 'Become conversational in Spanish by December';
const TEST_TARGET_NAME_2 = 'Run a Marathon';

test.describe('Target list + CRUD', () => {
  test.describe.configure({ mode: 'serial' });

  test('page renders with header and controls', async ({ page }) => {
    await page.goto('/targets');
    await page.waitForSelector('[data-testid="ai-fab"]');

    // Page title
    await expect(page.getByRole('heading', { name: 'Targets' })).toBeVisible();

    // Filter pills visible
    await expect(page.getByText('Active', { exact: true })).toBeVisible();
    await expect(page.getByText('Completed', { exact: true })).toBeVisible();
    await expect(page.getByText('Archived', { exact: true })).toBeVisible();

    // New Target button visible in header
    await expect(page.getByTestId('create-target-button')).toBeVisible();

    // AI FAB visible
    await expect(page.getByTestId('ai-fab')).toBeVisible();
  });

  test('Plans route shows stub page', async ({ page }) => {
    await page.goto('/plans');

    // Stub content visible
    await expect(page.getByText('Plan & Course')).toBeVisible();
    await expect(page.getByText('Coming soon')).toBeVisible();
  });

  test('targets page shows empty state initially', async ({ page }) => {
    await page.goto('/targets');
    await page.waitForSelector('[data-testid="ai-fab"]');

    // Empty state
    await expect(page.getByText('No targets yet')).toBeVisible();
    await expect(page.getByText('Create a target to start tracking your goals')).toBeVisible();
  });

  test('create target via modal', async ({ page }) => {
    await page.goto('/targets');
    await page.waitForSelector('[data-testid="ai-fab"]');

    // Click "New Target" button in header
    await page.getByTestId('create-target-button').click();

    // Modal opens
    await expect(page.getByRole('heading', { name: 'New Target' })).toBeVisible();

    // Fill name
    const nameInput = page.locator('input[maxlength="100"]');
    await nameInput.fill(TEST_TARGET_NAME);

    // Verify char counter
    await expect(page.getByText(`${TEST_TARGET_NAME.length}/100`)).toBeVisible();

    // Fill description
    const descInput = page.locator('textarea');
    await descInput.fill(TEST_TARGET_DESC);

    // Verify desc char counter
    await expect(page.getByText(`${TEST_TARGET_DESC.length}/500`)).toBeVisible();

    // Status selector should NOT be visible in create mode
    await expect(page.getByText('Status')).not.toBeVisible();

    // Submit
    await page.getByRole('button', { name: 'Create' }).click();

    // Modal closes
    await expect(page.getByRole('heading', { name: 'New Target' })).not.toBeVisible();

    // Target card appears
    await expect(page.getByText(TEST_TARGET_NAME)).toBeVisible();
    await expect(page.getByText(TEST_TARGET_DESC)).toBeVisible();
  });

  test('create target validation - empty name disables submit', async ({ page }) => {
    await page.goto('/targets');
    await page.waitForSelector('[data-testid="ai-fab"]');

    // Open create modal
    await page.getByTestId('create-target-button').click();
    await expect(page.getByRole('heading', { name: 'New Target' })).toBeVisible();

    // Create button should be disabled with empty name
    const createButton = page.getByRole('button', { name: 'Create' });
    await expect(createButton).toBeDisabled();

    // Cancel
    await page.getByRole('button', { name: 'Cancel' }).click();
  });

  test('create second target - newer appears first', async ({ page }) => {
    await page.goto('/targets');
    await page.waitForSelector('[data-testid="ai-fab"]');

    // Wait for first target to appear
    await expect(page.getByText(TEST_TARGET_NAME)).toBeVisible();

    // Create second target
    await page.getByTestId('create-target-button').click();
    await expect(page.getByRole('heading', { name: 'New Target' })).toBeVisible();

    const nameInput = page.locator('input[maxlength="100"]');
    await nameInput.fill(TEST_TARGET_NAME_2);

    await page.getByRole('button', { name: 'Create' }).click();
    await expect(page.getByRole('heading', { name: 'New Target' })).not.toBeVisible();

    // Both targets visible
    await expect(page.getByText(TEST_TARGET_NAME)).toBeVisible();
    await expect(page.getByText(TEST_TARGET_NAME_2)).toBeVisible();

    // Newer target (Run a Marathon) should appear first (createdAt DESC)
    const cards = page.locator('[data-testid^="target-card-"]');
    await expect(cards).toHaveCount(2);
    const firstCardText = await cards.first().textContent();
    expect(firstCardText).toContain(TEST_TARGET_NAME_2);
  });

  test('filter pills - Completed shows empty state', async ({ page }) => {
    await page.goto('/targets');
    await page.waitForSelector('[data-testid="ai-fab"]');
    await expect(page.getByText(TEST_TARGET_NAME)).toBeVisible();

    // Click Completed pill
    await page.getByText('Completed', { exact: true }).click();

    // Empty state for completed
    await expect(page.getByText('No targets yet')).toBeVisible();

    // Cards should not be visible
    await expect(page.getByText(TEST_TARGET_NAME)).not.toBeVisible();
    await expect(page.getByText(TEST_TARGET_NAME_2)).not.toBeVisible();
  });

  test('filter pills - Archived shows empty state', async ({ page }) => {
    await page.goto('/targets');
    await page.waitForSelector('[data-testid="ai-fab"]');
    await expect(page.getByText(TEST_TARGET_NAME)).toBeVisible();

    // Click Archived pill
    await page.getByText('Archived', { exact: true }).click();

    // Empty state for archived
    await expect(page.getByText('No targets yet')).toBeVisible();
  });

  test('filter pills - Active shows created targets', async ({ page }) => {
    await page.goto('/targets');
    await page.waitForSelector('[data-testid="ai-fab"]');

    // Active is default, both targets should be visible
    await expect(page.getByText(TEST_TARGET_NAME)).toBeVisible();
    await expect(page.getByText(TEST_TARGET_NAME_2)).toBeVisible();
  });

  test('clicking target card navigates to detail page', async ({ page }) => {
    await page.goto('/targets');
    await page.waitForSelector('[data-testid="ai-fab"]');
    await expect(page.getByText(TEST_TARGET_NAME)).toBeVisible();

    // Click on first target card
    const firstCard = page.locator('[data-testid^="target-card-"]').first();
    await firstCard.click();

    // Should navigate to target detail
    await expect(page).toHaveURL(/\/targets\/.+/);
  });

  // === Phase 4.2: Target Detail Page tests ===

  test('target detail page renders with target data', async ({ page }) => {
    await page.goto('/targets');
    await page.waitForSelector('[data-testid="ai-fab"]');
    await expect(page.getByText(TEST_TARGET_NAME_2)).toBeVisible();

    // Click first target card (newest = Run a Marathon)
    await page.locator('[data-testid^="target-card-"]').first().click();
    await expect(page).toHaveURL(/\/targets\/.+/);

    // Target name visible as heading
    await expect(page.getByTestId('target-detail-name')).toHaveText(TEST_TARGET_NAME_2);

    // Status badge visible (Active)
    await expect(page.getByTestId('target-detail-status')).toContainText('Active');

    // Edit and Delete buttons visible
    await expect(page.getByTestId('target-detail-edit')).toBeVisible();
    await expect(page.getByTestId('target-detail-delete')).toBeVisible();

    // Sections visible
    await expect(page.getByTestId('linked-tasks-section')).toBeVisible();
    await expect(page.getByTestId('plans-section')).toBeVisible();

    // Generate plan button
    await expect(page.getByTestId('generate-plan-button')).toBeVisible();
  });

  test('target detail page shows empty states', async ({ page }) => {
    await page.goto('/targets');
    await page.waitForSelector('[data-testid="ai-fab"]');
    await page.locator('[data-testid^="target-card-"]').first().click();
    await expect(page).toHaveURL(/\/targets\/.+/);

    // Tasks empty state
    await expect(page.getByTestId('linked-tasks-empty')).toBeVisible();
    await expect(page.getByText('No tasks linked to this target yet')).toBeVisible();

    // Plans empty state
    await expect(page.getByTestId('plans-empty')).toBeVisible();
    await expect(page.getByText('No plans linked to this target')).toBeVisible();
  });

  test('edit target from detail page', async ({ page }) => {
    await page.goto('/targets');
    await page.waitForSelector('[data-testid="ai-fab"]');
    await page.locator('[data-testid^="target-card-"]').first().click();
    await expect(page).toHaveURL(/\/targets\/.+/);
    await expect(page.getByTestId('target-detail-name')).toHaveText(TEST_TARGET_NAME_2);

    // Click edit
    await page.getByTestId('target-detail-edit').click();

    // Edit modal opens with pre-filled name
    await expect(page.getByRole('heading', { name: 'Edit Target' })).toBeVisible();
    const nameInput = page.locator('input[maxlength="100"]');
    await expect(nameInput).toHaveValue(TEST_TARGET_NAME_2);

    // Change name
    await nameInput.clear();
    await nameInput.fill(TEST_TARGET_NAME_2 + ' Updated');
    await page.getByRole('button', { name: 'Save' }).click();

    // Modal closes, new name visible
    await expect(page.getByRole('heading', { name: 'Edit Target' })).not.toBeVisible();
    await expect(page.getByTestId('target-detail-name')).toHaveText(TEST_TARGET_NAME_2 + ' Updated');
  });

  test('generate plan button navigates to AI chat', async ({ page }) => {
    await page.goto('/targets');
    await page.waitForSelector('[data-testid="ai-fab"]');
    await page.locator('[data-testid^="target-card-"]').first().click();
    await expect(page).toHaveURL(/\/targets\/.+/);

    // Click generate plan
    await page.getByTestId('generate-plan-button').click();
    await expect(page).toHaveURL('/ai-chat');
  });

  test('back button navigates to targets list', async ({ page }) => {
    await page.goto('/targets');
    await page.waitForSelector('[data-testid="ai-fab"]');
    await page.locator('[data-testid^="target-card-"]').first().click();
    await expect(page).toHaveURL(/\/targets\/.+/);

    // Click back
    await page.getByTestId('target-detail-back').click();
    await expect(page).toHaveURL('/targets');
  });

  test('delete target from detail page navigates back', async ({ page }) => {
    // Create a sacrificial target
    await page.goto('/targets');
    await page.waitForSelector('[data-testid="ai-fab"]');
    await page.getByTestId('create-target-button').click();
    const nameInput = page.locator('input[maxlength="100"]');
    await nameInput.fill('Target to Delete');
    await page.getByRole('button', { name: 'Create' }).click();
    await expect(page.getByRole('heading', { name: 'New Target' })).not.toBeVisible();
    await expect(page.getByText('Target to Delete')).toBeVisible();

    // Navigate to its detail page
    const deleteCard = page.locator('[data-testid^="target-card-"]').filter({ hasText: 'Target to Delete' });
    await deleteCard.click();
    await expect(page).toHaveURL(/\/targets\/.+/);
    await expect(page.getByTestId('target-detail-name')).toHaveText('Target to Delete');

    // Click delete
    await page.getByTestId('target-detail-delete').click();

    // Confirm dialog appears
    await expect(page.getByText('Are you sure you want to delete "Target to Delete"?')).toBeVisible();

    // Confirm deletion (target the dialog's confirm button, not the page's delete button)
    const dialog = page.locator('.fixed.inset-0');
    await dialog.getByRole('button', { name: 'Delete' }).click();

    // Navigates back to list
    await expect(page).toHaveURL('/targets');

    // Target no longer in list
    await expect(page.getByText('Target to Delete')).not.toBeVisible();
  });

  test('AI FAB navigates to AI chat page', async ({ page }) => {
    await page.goto('/targets');
    await page.waitForSelector('[data-testid="ai-fab"]');

    // Click AI FAB
    await page.getByTestId('ai-fab').click();

    // Should navigate to /ai-chat
    await expect(page).toHaveURL('/ai-chat');
  });

  test('sidebar Targets link navigates to targets page', async ({ page }) => {
    await page.goto('/home');
    await page.waitForTimeout(500);

    // Click "Targets" in sidebar
    const sidebar = page.locator('nav');
    await sidebar.getByText('Targets').click();

    await expect(page).toHaveURL('/targets');
    await expect(page.getByRole('heading', { name: 'Targets' })).toBeVisible();
  });

  test('sidebar Plans link navigates to plans page', async ({ page }) => {
    await page.goto('/home');
    await page.waitForTimeout(500);

    // Click "Plans" in sidebar
    const sidebar = page.locator('nav');
    await sidebar.getByText('Plans').click();

    await expect(page).toHaveURL('/plans');
  });
});
