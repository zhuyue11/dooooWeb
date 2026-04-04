import { test, expect } from '@playwright/test';

// Force serial execution — toggle test mutates data
test.describe.configure({ mode: 'serial' });

// ── Helpers ──

async function waitForTodoLoad(page: import('@playwright/test').Page) {
  await page.goto('/todo');
  await page.waitForFunction(() => {
    const heading = document.querySelector('h1');
    if (!heading || !heading.textContent?.includes('To-do')) return false;
    return !document.body.textContent?.includes('Loading...');
  }, { timeout: 10000 });
}

// ── Tests ──

test.describe('To-do Page', () => {
  test('loads with title and task count', async ({ page }) => {
    await waitForTodoLoad(page);

    await expect(page.getByRole('heading', { name: 'To-do' })).toBeVisible();
    // Must show a task count (at least the seed tasks)
    await expect(page.getByText(/\d+ tasks?/)).toBeVisible();
  });

  test('displays to-do tasks in the list', async ({ page }) => {
    await waitForTodoLoad(page);

    // The task list card should contain task rows
    const taskRows = page.locator('[data-testid^="task-row-"]');
    const count = await taskRows.count();
    expect(count).toBeGreaterThan(0);

    // At least one seed task should be present ("Research vacation spots" is never toggled)
    await expect(page.getByText('Research vacation spots', { exact: true }).first()).toBeAttached();
  });

  test('search filters tasks by title', async ({ page }) => {
    await waitForTodoLoad(page);

    const searchInput = page.getByPlaceholder('Search tasks...');
    await expect(searchInput).toBeVisible();

    // Search for a known seed task
    await searchInput.fill('Research vacation');
    await expect(page.getByText('Research vacation spots', { exact: true }).first()).toBeVisible({ timeout: 5000 });

    // Search for something that doesn't exist
    await searchInput.fill('xyznonexistent123');
    await expect(page.getByText('No matching tasks')).toBeVisible();

    // Clear search restores the list
    await searchInput.clear();
    const taskRows = page.locator('[data-testid^="task-row-"]');
    expect(await taskRows.count()).toBeGreaterThan(0);
  });

  test('filter dropdown shows category and priority', async ({ page }) => {
    await waitForTodoLoad(page);

    const filterButton = page.getByRole('button', { name: /Filter/ });
    await expect(filterButton).toBeVisible();
    await filterButton.click();

    await expect(page.getByText('Category')).toBeVisible();
    await expect(page.getByText('Priority')).toBeVisible();
  });

  test('Add task button opens create modal', async ({ page }) => {
    await waitForTodoLoad(page);

    const addButton = page.getByRole('button', { name: /Add task/ });
    await expect(addButton).toBeVisible();
    await addButton.click();

    // Modal title input has "What needs to be done?" placeholder
    await expect(page.getByPlaceholder('What needs to be done?')).toBeVisible({ timeout: 5000 });
  });

  // Toggle test runs last since it mutates data
  test('toggle task removes it from the list', async ({ page }) => {
    await waitForTodoLoad(page);

    // Count tasks before toggle
    const taskRows = page.locator('[data-testid^="task-row-"]');
    const countBefore = await taskRows.count();
    expect(countBefore).toBeGreaterThan(0);

    // Click the first task's checkbox
    const firstRow = taskRows.first();
    const checkbox = firstRow.locator('button.rounded-full').first();
    await checkbox.click();

    // After toggle, the task is completed and removed from the PENDING list
    // Wait for the list to re-fetch and shrink
    await expect(taskRows).toHaveCount(countBefore - 1, { timeout: 5000 });
  });
});
