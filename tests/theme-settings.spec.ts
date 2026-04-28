import { test, expect } from '@playwright/test';

/**
 * Step 6.4 — Theme accent colors + color palettes E2E tests.
 *
 * Tests the three-tier theme system:
 *   Tier 1: ThemePattern (light/dark/auto/system)
 *   Tier 2: ThemeColor (9 accent colors)
 *   Tier 3: ColorPalette (9 full-theme presets)
 *
 * Tests run serially because theme state carries between tests.
 */

test.describe('Theme settings', () => {
  test.describe.configure({ mode: 'serial' });

  const THEME_PATH = '/settings/theme';

  test('page renders with all 3 sections', async ({ page }) => {
    await page.goto(THEME_PATH);

    // Pattern section — 4 buttons
    await expect(page.getByTestId('pattern-light')).toBeVisible();
    await expect(page.getByTestId('pattern-dark')).toBeVisible();
    await expect(page.getByTestId('pattern-auto')).toBeVisible();
    await expect(page.getByTestId('pattern-system')).toBeVisible();

    // Color section — 9 swatches
    await expect(page.getByTestId('color-electric')).toBeVisible();
    await expect(page.getByTestId('color-emerald')).toBeVisible();
    await expect(page.getByTestId('color-ocean')).toBeVisible();
    await expect(page.getByTestId('color-crimson')).toBeVisible();
    await expect(page.getByTestId('color-amber')).toBeVisible();
    await expect(page.getByTestId('color-yellow')).toBeVisible();
    await expect(page.getByTestId('color-cyan')).toBeVisible();
    await expect(page.getByTestId('color-purple')).toBeVisible();
    await expect(page.getByTestId('color-pink')).toBeVisible();

    // Palette section — 9 palettes
    await expect(page.getByTestId('palette-light')).toBeVisible();
    await expect(page.getByTestId('palette-dark')).toBeVisible();
    await expect(page.getByTestId('palette-ocean')).toBeVisible();
    await expect(page.getByTestId('palette-crimson')).toBeVisible();
    await expect(page.getByTestId('palette-amber')).toBeVisible();
    await expect(page.getByTestId('palette-yellow')).toBeVisible();
    await expect(page.getByTestId('palette-cyan')).toBeVisible();
    await expect(page.getByTestId('palette-purple')).toBeVisible();
    await expect(page.getByTestId('palette-pink')).toBeVisible();
  });

  test('pattern selection applies data-theme attribute', async ({ page }) => {
    await page.goto(THEME_PATH);

    // Click dark pattern
    await page.getByTestId('pattern-dark').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    // Click light pattern
    await page.getByTestId('pattern-light').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  });

  test('color selection applies data-color attribute', async ({ page }) => {
    await page.goto(THEME_PATH);

    // Ensure we're in pattern mode (no palette), start with light
    await page.getByTestId('pattern-light').click();

    // Click ocean color
    await page.getByTestId('color-ocean').click();
    await expect(page.locator('html')).toHaveAttribute('data-color', 'ocean');

    // Click emerald — should remove data-color (emerald is default)
    await page.getByTestId('color-emerald').click();
    await expect(page.locator('html')).not.toHaveAttribute('data-color');
  });

  test('color selection shows check icon on selected swatch', async ({ page }) => {
    await page.goto(THEME_PATH);

    // Click purple
    await page.getByTestId('color-purple').click();

    // Purple swatch should contain a check icon
    const purpleCheck = page.getByTestId('color-purple').locator('.material-symbols-rounded', { hasText: 'check' });
    await expect(purpleCheck).toBeVisible();

    // Emerald should NOT have check
    const emeraldCheck = page.getByTestId('color-emerald').locator('.material-symbols-rounded', { hasText: 'check' });
    await expect(emeraldCheck).not.toBeVisible();
  });

  test('palette selection applies data-palette and removes data-theme', async ({ page }) => {
    await page.goto(THEME_PATH);

    // Start with light theme
    await page.getByTestId('pattern-light').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

    // Select ocean palette
    await page.getByTestId('palette-ocean').click();
    await expect(page.locator('html')).toHaveAttribute('data-palette', 'ocean');
    await expect(page.locator('html')).not.toHaveAttribute('data-theme');
  });

  test('palette selection is toggleable (click again to deselect)', async ({ page }) => {
    await page.goto(THEME_PATH);

    // Select ocean palette
    await page.getByTestId('palette-ocean').click();
    await expect(page.locator('html')).toHaveAttribute('data-palette', 'ocean');

    // Click ocean again to deselect
    await page.getByTestId('palette-ocean').click();
    await expect(page.locator('html')).not.toHaveAttribute('data-palette');
    // data-theme should be restored
    await expect(page.locator('html')).toHaveAttribute('data-theme');
  });

  test('pattern buttons are disabled when palette is active', async ({ page }) => {
    await page.goto(THEME_PATH);

    // Select a palette
    await page.getByTestId('palette-crimson').click();
    await expect(page.locator('html')).toHaveAttribute('data-palette', 'crimson');

    // Pattern buttons should be disabled
    await expect(page.getByTestId('pattern-light')).toBeDisabled();
    await expect(page.getByTestId('pattern-dark')).toBeDisabled();
    await expect(page.getByTestId('pattern-auto')).toBeDisabled();
    await expect(page.getByTestId('pattern-system')).toBeDisabled();

    // Deselect palette
    await page.getByTestId('palette-crimson').click();

    // Pattern buttons should be enabled again
    await expect(page.getByTestId('pattern-light')).toBeEnabled();
  });

  test('color change clears active palette', async ({ page }) => {
    await page.goto(THEME_PATH);

    // Select a palette
    await page.getByTestId('palette-purple').click();
    await expect(page.locator('html')).toHaveAttribute('data-palette', 'purple');

    // Change accent color
    await page.getByTestId('color-pink').click();

    // Palette should be cleared, color should be applied
    await expect(page.locator('html')).not.toHaveAttribute('data-palette');
    await expect(page.locator('html')).toHaveAttribute('data-color', 'pink');
    // Pattern buttons should be re-enabled
    await expect(page.getByTestId('pattern-light')).toBeEnabled();
  });

  test('theme persists across page reload', async ({ page }) => {
    await page.goto(THEME_PATH);

    // Set dark pattern + ocean color
    await page.getByTestId('pattern-dark').click();
    await page.getByTestId('color-ocean').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('html')).toHaveAttribute('data-color', 'ocean');

    // Reload
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    // Theme should persist
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('html')).toHaveAttribute('data-color', 'ocean');

    // Clean up — reset to defaults
    await page.getByTestId('pattern-auto').click();
    await page.getByTestId('color-emerald').click();
  });

  test('sidebar settings link navigates to theme page', async ({ page }) => {
    await page.goto('/settings');

    // Find the theme settings link and click it
    const themeLink = page.locator('a[href="/settings/theme"]');
    await expect(themeLink).toBeVisible();
    await themeLink.click();
    await expect(page).toHaveURL('/settings/theme');
  });
});
