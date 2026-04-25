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
