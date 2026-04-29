import { test, expect } from '@playwright/test';

/**
 * Step 6.9a — Font Settings E2E tests.
 *
 * Tests the font family picker (language-aware) and font size selector.
 * Tests run serially because font state carries between tests.
 */

test.describe('Font settings', () => {
  test.describe.configure({ mode: 'serial' });

  const FONT_PATH = '/settings/font';

  test('page renders with font family cards and size options', async ({ page }) => {
    await page.goto(FONT_PATH);

    // Font family section — system default + Latin fonts (default language is English)
    await expect(page.getByTestId('font-system')).toBeVisible();
    await expect(page.getByTestId('font-notoSans')).toBeVisible();
    await expect(page.getByTestId('font-jost')).toBeVisible();
    await expect(page.getByTestId('font-quicksand')).toBeVisible();
    await expect(page.getByTestId('font-exo2')).toBeVisible();
    await expect(page.getByTestId('font-sairaStencilOne')).toBeVisible();
    await expect(page.getByTestId('font-bitcountPropSingle')).toBeVisible();

    // Font size section — 5 size options
    await expect(page.getByTestId('font-size-xs')).toBeVisible();
    await expect(page.getByTestId('font-size-sm')).toBeVisible();
    await expect(page.getByTestId('font-size-md')).toBeVisible();
    await expect(page.getByTestId('font-size-lg')).toBeVisible();
    await expect(page.getByTestId('font-size-xl')).toBeVisible();
  });

  test('font family selection applies font-family inline style', async ({ page }) => {
    await page.goto(FONT_PATH);

    // Click Jost font
    await page.getByTestId('font-jost').click();

    // Verify font-family is set as inline style on html element
    const fontFamily = await page.locator('html').evaluate(
      (el) => el.style.fontFamily,
    );
    expect(fontFamily).toContain('Jost');
  });

  test('font family selection shows check icon on selected card', async ({ page }) => {
    await page.goto(FONT_PATH);

    // Select Jost
    await page.getByTestId('font-jost').click();

    // Jost card should have check icon
    const jostCheck = page.getByTestId('font-jost').locator('.material-symbols-rounded', { hasText: 'check' });
    await expect(jostCheck).toBeVisible();

    // System default should NOT have check
    const systemCheck = page.getByTestId('font-system').locator('.material-symbols-rounded', { hasText: 'check' });
    await expect(systemCheck).not.toBeVisible();
  });

  test('system default removes font-family inline style', async ({ page }) => {
    await page.goto(FONT_PATH);

    // First select a non-system font
    await page.getByTestId('font-jost').click();
    let fontFamily = await page.locator('html').evaluate(
      (el) => el.style.fontFamily,
    );
    expect(fontFamily).toContain('Jost');

    // Switch back to system default
    await page.getByTestId('font-system').click();
    fontFamily = await page.locator('html').evaluate(
      (el) => el.style.fontFamily,
    );
    expect(fontFamily).toBe('');
  });

  test('font family selection persists across reload', async ({ page }) => {
    await page.goto(FONT_PATH);

    // Select Exo 2
    await page.getByTestId('font-exo2').click();

    // Reload the page
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    // Verify inline style is still set
    const fontFamily = await page.locator('html').evaluate(
      (el) => el.style.fontFamily,
    );
    expect(fontFamily).toContain('Exo 2');

    // Verify the card shows selected state (check icon)
    const exo2Check = page.getByTestId('font-exo2').locator('.material-symbols-rounded', { hasText: 'check' });
    await expect(exo2Check).toBeVisible();

    // Clean up — reset to system default
    await page.getByTestId('font-system').click();
  });

  test('font size selection applies --font-size-scale CSS variable', async ({ page }) => {
    await page.goto(FONT_PATH);

    // Click Large size
    await page.getByTestId('font-size-lg').click();

    const scale = await page.locator('html').evaluate(
      (el) => el.style.getPropertyValue('--font-size-scale'),
    );
    expect(scale).toBe('1.1');
  });

  test('font size selection persists across reload', async ({ page }) => {
    await page.goto(FONT_PATH);

    // Select Extra Large
    await page.getByTestId('font-size-xl').click();

    // Reload
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    const scale = await page.locator('html').evaluate(
      (el) => el.style.getPropertyValue('--font-size-scale'),
    );
    expect(scale).toBe('1.25');

    // XL button should have selected styling (border highlight)
    await expect(page.getByTestId('font-size-xl')).toHaveClass(/border-2/);

    // Clean up — reset to medium
    await page.getByTestId('font-size-md').click();
  });

  test('sidebar settings navigation to font page', async ({ page }) => {
    await page.goto('/settings');

    // Find the font settings link and click it
    const fontLink = page.locator('a[href="/settings/font"]');
    await expect(fontLink).toBeVisible();
    await fontLink.click();

    await expect(page).toHaveURL(/\/settings\/font/);
    await expect(page.getByTestId('font-system')).toBeVisible();
  });
});
