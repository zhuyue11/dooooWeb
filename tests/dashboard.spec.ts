import { test, expect } from '@playwright/test';

// These tests run WITH auth state (authenticated via setup)
test.describe('Dashboard', () => {
  test('shows greeting with user name', async ({ page }) => {
    await page.goto('/home');

    // Greeting heading contains both time-of-day and user's first name
    await expect(page.getByRole('heading', { name: /Good (morning|afternoon|evening), Test/ })).toBeVisible();
  });

  test('shows today\'s date', async ({ page }) => {
    await page.goto('/home');

    // Date should be formatted like "Thursday, April 3, 2026"
    const today = new Date();
    const month = today.toLocaleDateString('en-US', { month: 'long' });
    await expect(page.getByText(new RegExp(month))).toBeVisible();
  });

  test('shows metric cards', async ({ page }) => {
    await page.goto('/home');

    await expect(page.getByText("Today's Tasks")).toBeVisible();
    await expect(page.getByText('Overdue')).toBeVisible();
    await expect(page.getByText('To-do')).toBeVisible();
    await expect(page.getByText('This Week', { exact: true })).toBeVisible();
    await expect(page.getByText('Completion Rate')).toBeVisible();
  });

  test('shows upcoming tasks section', async ({ page }) => {
    await page.goto('/home');

    await expect(page.getByText('Upcoming Tasks')).toBeVisible();
    await expect(page.getByText('View all')).toBeVisible();
  });

  test('shows today\'s schedule section', async ({ page }) => {
    await page.goto('/home');

    await expect(page.getByText("Today's Schedule")).toBeVisible();
    await expect(page.getByText('Open calendar')).toBeVisible();
  });

  test('add button is visible', async ({ page }) => {
    await page.goto('/home');

    // The + button in the header
    const addButton = page.locator('button').filter({ has: page.locator('svg.lucide-plus') });
    await expect(addButton).toBeVisible();
  });

  test('"View all" navigates to todo page', async ({ page }) => {
    await page.goto('/home');

    await page.click('text=View all');
    await expect(page).toHaveURL('/todo');
  });

  test('"Open calendar" navigates to calendar page', async ({ page }) => {
    await page.goto('/home');

    await page.click('text=Open calendar');
    await expect(page).toHaveURL('/calendar');
  });
});
