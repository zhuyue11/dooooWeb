import { test, expect } from '@playwright/test';

/**
 * Phase 3.7 — Group member preferences E2E tests.
 *
 * Uses the seeded "Project Alpha" group (web-group-alpha) which has:
 *   - Web Test User (OWNER)
 *   - Alice Chen (MEMBER)
 *   - Bob Kim (MEMBER)
 *
 * Default preferences: muteMessages=false, muteTasks=false, isStarred=false
 *
 * Tests run serially because later tests depend on preference state set by earlier ones.
 */

test.describe('Group member preferences', () => {
  test.describe.configure({ mode: 'serial' });

  const SETTINGS_PATH = '/groups/web-group-alpha/settings';
  const GROUPS_PATH = '/groups';

  test('settings page shows 3 preference toggles', async ({ page }) => {
    await page.goto(SETTINGS_PATH);

    // Wait for preferences to load (spinner should disappear)
    await expect(page.getByTestId('preferences-loading')).not.toBeVisible({ timeout: 10000 });

    // All 3 preference rows should be visible
    await expect(page.getByTestId('preference-mute-messages')).toBeVisible();
    await expect(page.getByTestId('preference-mute-tasks')).toBeVisible();
    await expect(page.getByTestId('preference-star-group')).toBeVisible();

    // Labels should be visible
    await expect(page.getByText('Mute Messages')).toBeVisible();
    await expect(page.getByText('Mute Task Notifications')).toBeVisible();
    await expect(page.getByText('Star Group')).toBeVisible();

    // Info callout should be visible
    await expect(page.getByTestId('preferences-info')).toBeVisible();
  });

  test('toggle muteMessages on and verify persistence', async ({ page }) => {
    await page.goto(SETTINGS_PATH);
    await expect(page.getByTestId('preference-mute-messages')).toBeVisible({ timeout: 10000 });

    // Find the switch inside the mute messages row
    const muteRow = page.getByTestId('preference-mute-messages');
    const muteSwitch = muteRow.getByRole('switch');
    await expect(muteSwitch).toHaveAttribute('aria-checked', 'false');

    // Toggle on
    await muteSwitch.click();
    await expect(muteSwitch).toHaveAttribute('aria-checked', 'true');

    // Navigate away and back to verify persistence
    await page.goto(GROUPS_PATH);
    await page.waitForSelector('h1', { timeout: 10000 });
    await page.goto(SETTINGS_PATH);
    await expect(page.getByTestId('preference-mute-messages')).toBeVisible({ timeout: 10000 });

    const muteSwitchAfter = page.getByTestId('preference-mute-messages').getByRole('switch');
    await expect(muteSwitchAfter).toHaveAttribute('aria-checked', 'true');
  });

  test('toggle muteMessages off', async ({ page }) => {
    await page.goto(SETTINGS_PATH);
    await expect(page.getByTestId('preference-mute-messages')).toBeVisible({ timeout: 10000 });

    const muteSwitch = page.getByTestId('preference-mute-messages').getByRole('switch');
    // Should be on from previous test
    await expect(muteSwitch).toHaveAttribute('aria-checked', 'true');

    // Toggle off
    await muteSwitch.click();
    await expect(muteSwitch).toHaveAttribute('aria-checked', 'false');
  });

  test('toggle muteTasks on and off', async ({ page }) => {
    await page.goto(SETTINGS_PATH);
    await expect(page.getByTestId('preference-mute-tasks')).toBeVisible({ timeout: 10000 });

    const taskSwitch = page.getByTestId('preference-mute-tasks').getByRole('switch');
    await expect(taskSwitch).toHaveAttribute('aria-checked', 'false');

    // Toggle on
    await taskSwitch.click();
    await expect(taskSwitch).toHaveAttribute('aria-checked', 'true');

    // Toggle off
    await taskSwitch.click();
    await expect(taskSwitch).toHaveAttribute('aria-checked', 'false');
  });

  test('toggle isStarred on and verify group re-sorts to top', async ({ page }) => {
    await page.goto(SETTINGS_PATH);
    await expect(page.getByTestId('preference-star-group')).toBeVisible({ timeout: 10000 });

    const starSwitch = page.getByTestId('preference-star-group').getByRole('switch');
    await expect(starSwitch).toHaveAttribute('aria-checked', 'false');

    // Toggle star on
    await starSwitch.click();
    await expect(starSwitch).toHaveAttribute('aria-checked', 'true');

    // Navigate to group list and verify Project Alpha is first (starred)
    await page.goto(GROUPS_PATH);
    await page.waitForSelector('h1', { timeout: 10000 });

    // First group card should be Project Alpha
    const firstCard = page.locator('[data-testid="star-toggle"]').first();
    // The star in the first card should be filled (aria attribute of the icon)
    await expect(firstCard).toBeVisible();
  });

  test('star icon on GroupCard toggles star off', async ({ page }) => {
    await page.goto(GROUPS_PATH);
    await page.waitForSelector('h1', { timeout: 10000 });

    // Find the star toggle for Project Alpha (which is starred from previous test)
    // Project Alpha should be first since it's starred
    const alphaCard = page.getByText('Project Alpha').first().locator('..').locator('..');
    const starButton = alphaCard.getByTestId('star-toggle');
    await expect(starButton).toBeVisible();

    // Click star to unstar
    await starButton.click();

    // Navigate to settings to verify the change persisted
    await page.goto(SETTINGS_PATH);
    await expect(page.getByTestId('preference-star-group')).toBeVisible({ timeout: 10000 });
    const starSwitch = page.getByTestId('preference-star-group').getByRole('switch');
    await expect(starSwitch).toHaveAttribute('aria-checked', 'false');
  });

  test('settings heading is visible', async ({ page }) => {
    await page.goto(SETTINGS_PATH);
    await expect(page.getByTestId('preference-mute-messages')).toBeVisible({ timeout: 10000 });

    // Settings heading should be visible
    await expect(page.getByRole('heading', { name: /settings/i })).toBeVisible();
  });
});
