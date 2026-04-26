import { test, expect } from '@playwright/test';

/**
 * Phase 4.3 — Plan list + browsing E2E tests.
 * Tests the PlanListPage with filter pills, empty states,
 * AI FAB navigation, and sidebar link.
 */

test.describe('Plan list + browsing', () => {
  test('page renders with heading and all 6 filter pills', async ({ page }) => {
    await page.goto('/plans');
    await page.waitForSelector('[data-testid="plan-list-page"]');

    // Page title
    await expect(page.getByRole('heading', { name: 'Plan & Course' })).toBeVisible();

    // All 6 filter pills visible
    await expect(page.getByTestId('plan-filter-all')).toBeVisible();
    await expect(page.getByTestId('plan-filter-in_progress')).toBeVisible();
    await expect(page.getByTestId('plan-filter-planned')).toBeVisible();
    await expect(page.getByTestId('plan-filter-saved')).toBeVisible();
    await expect(page.getByTestId('plan-filter-completed')).toBeVisible();
    await expect(page.getByTestId('plan-filter-discovery')).toBeVisible();

    // AI FAB visible
    await expect(page.getByTestId('ai-fab')).toBeVisible();
  });

  test('shows empty state on default All filter', async ({ page }) => {
    await page.goto('/plans');
    await page.waitForSelector('[data-testid="plan-list-page"]');

    // Empty state visible
    await expect(page.getByTestId('plan-list-empty')).toBeVisible();
    await expect(page.getByText('No plans yet')).toBeVisible();
    await expect(page.getByText('Use the AI planner to create plans for your goals')).toBeVisible();
  });

  test('filter pills switch active state and show empty states', async ({ page }) => {
    await page.goto('/plans');
    await page.waitForSelector('[data-testid="plan-list-page"]');

    // Default "All" pill is active (has primary bg)
    const allPill = page.getByTestId('plan-filter-all');
    await expect(allPill).toHaveClass(/bg-primary/);

    // Click "In Progress" pill
    await page.getByTestId('plan-filter-in_progress').click();
    await expect(page.getByTestId('plan-filter-in_progress')).toHaveClass(/bg-primary/);
    await expect(allPill).not.toHaveClass(/bg-primary/);
    await expect(page.getByTestId('plan-list-empty')).toBeVisible();

    // Click "Planned" pill
    await page.getByTestId('plan-filter-planned').click();
    await expect(page.getByTestId('plan-filter-planned')).toHaveClass(/bg-primary/);
    await expect(page.getByTestId('plan-list-empty')).toBeVisible();

    // Click "Saved" pill
    await page.getByTestId('plan-filter-saved').click();
    await expect(page.getByTestId('plan-filter-saved')).toHaveClass(/bg-primary/);
    await expect(page.getByTestId('plan-list-empty')).toBeVisible();

    // Click "Completed" pill
    await page.getByTestId('plan-filter-completed').click();
    await expect(page.getByTestId('plan-filter-completed')).toHaveClass(/bg-primary/);
    await expect(page.getByTestId('plan-list-empty')).toBeVisible();

    // Click "Discovery" pill
    await page.getByTestId('plan-filter-discovery').click();
    await expect(page.getByTestId('plan-filter-discovery')).toHaveClass(/bg-primary/);
    await expect(page.getByTestId('plan-list-empty')).toBeVisible();
  });

  test('non-default filters show filter-specific empty message', async ({ page }) => {
    await page.goto('/plans');
    await page.waitForSelector('[data-testid="plan-list-page"]');

    // Click "In Progress" — should show filter-specific message
    await page.getByTestId('plan-filter-in_progress').click();
    await expect(page.getByText('No plans match this filter')).toBeVisible();

    // Switch back to "All" — should show general message
    await page.getByTestId('plan-filter-all').click();
    await expect(page.getByText('Use the AI planner to create plans for your goals')).toBeVisible();
  });

  test('AI FAB navigates to AI chat', async ({ page }) => {
    await page.goto('/plans');
    await page.waitForSelector('[data-testid="plan-list-page"]');

    await page.getByTestId('ai-fab').click();
    await expect(page).toHaveURL('/ai-chat');
  });

  test('sidebar Plans link navigates to plans page', async ({ page }) => {
    await page.goto('/home');
    await page.waitForTimeout(500);

    const sidebar = page.locator('nav');
    await sidebar.getByText('Plans').click();

    await expect(page).toHaveURL('/plans');
    await expect(page.getByRole('heading', { name: 'Plan & Course' })).toBeVisible();
  });
});
