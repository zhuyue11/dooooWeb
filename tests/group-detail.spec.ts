import { test, expect } from '@playwright/test';

/**
 * Phase 3.3 — Group detail E2E tests.
 * Tests the group sidebar navigation, sub-routes (to-do, calendar, chat, members, settings),
 * and verifies the sidebar transforms when entering a group.
 */

const GROUP_NAME = 'Detail E2E Group';
const GROUP_DESC = 'Group for testing detail pages';

test.describe('Group detail — sidebar + sub-routes', () => {
  test.describe.configure({ mode: 'serial' });

  let groupPath: string; // e.g. "/groups/abc-123"

  test('create a group and navigate to it', async ({ page }) => {
    await page.goto('/groups');
    await page.waitForSelector('h1');

    // Create a group
    await page.getByText('New Group').click();
    await expect(page.getByRole('heading', { name: 'Create Group' })).toBeVisible();
    await page.locator('input[type="text"]').fill(GROUP_NAME);
    await page.locator('textarea').fill(GROUP_DESC);
    await page.getByRole('button', { name: 'Create' }).click();

    // Should navigate to /groups/:groupId/tasks
    await page.waitForURL(/\/groups\/.+\/tasks/);
    groupPath = new URL(page.url()).pathname.replace(/\/tasks$/, '');
  });

  test('sidebar shows group navigation with back button', async ({ page }) => {
    await page.goto(`${groupPath}/tasks`);
    await page.waitForSelector('h1');

    // Group name should appear in sidebar
    await expect(page.getByText(GROUP_NAME).first()).toBeVisible();

    // Back button should be visible
    await expect(page.getByTestId('group-sidebar-back')).toBeVisible();

    // Group nav items should be visible
    await expect(page.getByRole('link', { name: /to-do/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /calendar/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /chat/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /members/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /settings/i })).toBeVisible();

    // Main app nav items should NOT be visible (sidebar replaced)
    await expect(page.getByRole('link', { name: /dashboard/i })).not.toBeVisible();
  });

  test('to-do page renders', async ({ page }) => {
    await page.goto(`${groupPath}/tasks`);
    await page.waitForSelector('h1');

    // "To-do" heading should be visible
    await expect(page.getByRole('heading', { name: /to-do/i })).toBeVisible();

    // Search input should be visible
    await expect(page.locator('input[placeholder]')).toBeVisible();
  });

  test('calendar page renders with week view', async ({ page }) => {
    await page.goto(`${groupPath}/calendar`);

    // Wait for calendar header to render (the "Calendar" heading in main content, not sidebar)
    await expect(page.getByRole('heading', { name: 'Calendar' })).toBeVisible();

    // Today button should be visible
    await expect(page.getByRole('button', { name: 'Today' })).toBeVisible();

    // View toggle buttons
    await expect(page.getByTestId('view-tab-week')).toBeVisible();
    await expect(page.getByTestId('view-tab-month')).toBeVisible();
    await expect(page.getByTestId('view-tab-day')).toBeVisible();
  });

  test('calendar view switching works', async ({ page }) => {
    await page.goto(`${groupPath}/calendar`);
    await expect(page.getByRole('button', { name: 'Today' })).toBeVisible();

    // Switch to month view
    await page.getByTestId('view-tab-month').click();
    await page.waitForTimeout(300);

    // Switch to day view
    await page.getByTestId('view-tab-day').click();
    await page.waitForTimeout(300);

    // Switch back to week
    await page.getByTestId('view-tab-week').click();
    await page.waitForTimeout(300);
  });

  test('chat page renders', async ({ page }) => {
    await page.goto(`${groupPath}/chat`);
    // Chat input bar should be visible (full chat UI, not stub)
    await expect(page.getByTestId('chat-input-bar')).toBeVisible({ timeout: 10000 });
  });

  test('members page renders stub', async ({ page }) => {
    await page.goto(`${groupPath}/members`);
    await expect(page.getByText(/members/i).first()).toBeVisible();
  });

  test('settings page renders stub', async ({ page }) => {
    await page.goto(`${groupPath}/settings`);
    await expect(page.getByText(/settings/i).first()).toBeVisible();
  });

  test('sidebar nav links navigate between sub-routes', async ({ page }) => {
    await page.goto(`${groupPath}/tasks`);
    await page.waitForSelector('h1');

    // Click Calendar in sidebar
    await page.getByRole('link', { name: /calendar/i }).click();
    await expect(page).toHaveURL(`${groupPath}/calendar`);
    await expect(page.getByRole('button', { name: 'Today' })).toBeVisible();

    // Click To-do in sidebar
    await page.getByRole('link', { name: /to-do/i }).click();
    await expect(page).toHaveURL(`${groupPath}/tasks`);
    await expect(page.getByRole('heading', { name: /to-do/i })).toBeVisible();
  });

  test('back button returns to group list with main sidebar', async ({ page }) => {
    await page.goto(`${groupPath}/tasks`);
    await page.waitForSelector('h1');

    // Click back button
    await page.getByTestId('group-sidebar-back').click();
    await expect(page).toHaveURL('/groups');

    // Main sidebar should be restored
    await expect(page.getByRole('link', { name: /dashboard/i })).toBeVisible();
  });

  test('navigating to /groups/:groupId redirects to /tasks', async ({ page }) => {
    await page.goto(groupPath);
    await expect(page).toHaveURL(`${groupPath}/tasks`);
  });
});
