import { test, expect } from '@playwright/test';
import { SEED_TASKS } from './seed-data';

// Serial mode — toggle test mutates data
test.describe.configure({ mode: 'serial' });

// ── Helpers ──

async function waitForSearchLoad(page: import('@playwright/test').Page) {
  await page.goto('/search');
  await page.waitForFunction(() => {
    const heading = document.querySelector('h1');
    return heading && heading.textContent?.includes('Search');
  }, { timeout: 10000 });
}

// ── Tests ──

test.describe('Search Page', () => {
  test('loads with title, search input, and filter button', async ({ page }) => {
    await waitForSearchLoad(page);

    await expect(page.getByRole('heading', { name: 'Search' })).toBeVisible();
    await expect(page.getByPlaceholder('Tasks, events, activities...')).toBeVisible();
    await expect(page.getByRole('button', { name: /Filters/ })).toBeVisible();
  });

  test('sidebar search button navigates to /search', async ({ page }) => {
    await page.goto('/home');
    await page.waitForFunction(() => {
      const heading = document.querySelector('h1');
      return heading !== null;
    }, { timeout: 10000 });

    // Click the search icon link in sidebar header (uses data-testid for precision)
    const searchLink = page.locator('[data-testid="sidebar-search-button"]');
    await expect(searchLink).toBeVisible();
    // Verify href is correct
    const href = await searchLink.getAttribute('href');
    expect(href).toBe('/search');
    // Use evaluate to trigger navigation via the DOM element directly
    await searchLink.evaluate((el) => (el as HTMLAnchorElement).click());

    await expect(page).toHaveURL(/\/search/);
    await expect(page.getByRole('heading', { name: 'Search' })).toBeVisible();
  });

  test('search by text returns matching results', async ({ page }) => {
    await waitForSearchLoad(page);

    const input = page.getByPlaceholder('Tasks, events, activities...');
    // Search for a known seed task
    await input.fill('Review PR');

    // Wait for debounce + results
    await expect(page.getByText('Review PR #42').first()).toBeVisible({ timeout: 5000 });

    // Result count should be shown
    await expect(page.getByText(/\d+ results?/)).toBeVisible();
  });

  test('search with no results shows empty state', async ({ page }) => {
    await waitForSearchLoad(page);

    const input = page.getByPlaceholder('Tasks, events, activities...');
    await input.fill('xyznonexistent123');

    await expect(page.getByText('No results')).toBeVisible({ timeout: 5000 });
  });

  test('clear search text button clears input and results', async ({ page }) => {
    await waitForSearchLoad(page);

    const input = page.getByPlaceholder('Tasks, events, activities...');
    await input.fill('Review PR');

    // Wait for results to appear
    await expect(page.getByText('Review PR #42').first()).toBeVisible({ timeout: 5000 });

    // Click the clear button (x icon)
    const clearButton = page.locator('input[type="text"]').locator('..').locator('button').first();
    await clearButton.click();

    // Input should be empty
    await expect(input).toHaveValue('');
    // Initial state placeholder should be visible (no results, no empty state)
    await expect(page.getByText('No results')).not.toBeVisible();
  });

  test('filter panel expands and collapses', async ({ page }) => {
    await waitForSearchLoad(page);

    const filterButton = page.getByRole('button', { name: /Filters/ });

    // Initially collapsed — Priority section not visible
    await expect(page.getByText('Priority', { exact: true }).first()).not.toBeVisible();

    // Click to expand
    await filterButton.click();
    await expect(page.getByText('Priority', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Status', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Date Range', { exact: true }).first()).toBeVisible();

    // Click to collapse
    await filterButton.click();
    // Filter sections should be hidden
    await expect(page.locator('.space-y-4').first()).not.toBeVisible();
  });

  test('priority filter returns matching tasks', async ({ page }) => {
    await waitForSearchLoad(page);

    // Open filter panel
    await page.getByRole('button', { name: /Filters/ }).click();

    // Click HIGH priority chip
    await page.getByRole('button', { name: 'High' }).click();

    // Wait for results — seed data has HIGH priority tasks: "Review PR #42", "Deploy v2.1", "Code review session"
    const highTasks = SEED_TASKS.filter((t) => t.priority === 'HIGH');
    expect(highTasks.length).toBeGreaterThan(0);

    // Wait for at least one result
    await expect(page.getByText(highTasks[0].title).first()).toBeVisible({ timeout: 5000 });

    // Close filter panel to see active chips
    await page.getByRole('button', { name: /Filters/ }).click();

    // Active chip should be visible
    await expect(page.getByRole('button', { name: /High/ }).first()).toBeVisible();
  });

  test('active filter chips can be removed', async ({ page }) => {
    await waitForSearchLoad(page);

    // Open filter panel and apply a priority filter
    await page.getByRole('button', { name: /Filters/ }).click();
    await page.getByRole('button', { name: 'High' }).click();

    // Wait for results
    await expect(page.getByText(/\d+ results?/)).toBeVisible({ timeout: 5000 });

    // Close filter panel
    await page.getByRole('button', { name: /Filters/ }).click();

    // Find the active chip and click "Clear"
    const clearButton = page.getByRole('button', { name: 'Clear' });
    await clearButton.click();

    // No active chips should remain — results should be cleared
    await expect(page.getByText(/\d+ results?/)).not.toBeVisible();
  });

  test('clicking a result opens side panel', async ({ page }) => {
    await waitForSearchLoad(page);

    const input = page.getByPlaceholder('Tasks, events, activities...');
    await input.fill('Review PR');

    // Wait for results
    const result = page.getByText('Review PR #42').first();
    await expect(result).toBeVisible({ timeout: 5000 });

    // Click the result row
    await result.click();

    // Side panel should open with the task title
    const sidePanel = page.locator('[data-testid="item-side-panel"]');
    await expect(sidePanel).toBeVisible({ timeout: 3000 });
    await expect(sidePanel.getByText('Review PR #42')).toBeVisible();
  });

  test('overdue status filter works', async ({ page }) => {
    await waitForSearchLoad(page);

    // Open filter panel
    await page.getByRole('button', { name: /Filters/ }).click();

    // Click Overdue chip
    await page.getByRole('button', { name: 'Overdue' }).click();

    // Should show overdue tasks (seed has: "Submit expense report" at -1 day, "Call dentist" at -2 days)
    const overdueTasks = SEED_TASKS.filter(
      (t) => t.dateOffset !== null && t.dateOffset < 0 && !t.isCompleted,
    );
    expect(overdueTasks.length).toBe(2);

    // Wait for results
    await expect(page.getByText(overdueTasks[0].title).first()).toBeVisible({ timeout: 5000 });
  });

  test('events appear in search results', async ({ page }) => {
    await waitForSearchLoad(page);

    const input = page.getByPlaceholder('Tasks, events, activities...');
    // Search for a known seed event
    await input.fill('Product launch');

    // Wait for the event result
    await expect(page.getByText('Product launch').first()).toBeVisible({ timeout: 5000 });
  });
});
