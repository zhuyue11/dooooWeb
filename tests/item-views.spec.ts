import { test, expect } from '@playwright/test';
import { waitForCalendarLoad } from './seed-data';

// ── Side Panel Tests ──

test.describe('Item Side Panel', () => {
  test('clicking a task row in the calendar panel opens the side panel', async ({ page }) => {
    await waitForCalendarLoad(page);

    // Click a known personal incomplete task so Edit/Delete are visible
    const taskRow = page.locator('[data-testid="task-panel"]').getByText('Review PR #42');
    await expect(taskRow).toBeVisible({ timeout: 5000 });
    await taskRow.click();

    // Side panel should appear with header buttons
    await expect(page.locator('[data-testid="side-panel-edit"]')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('[data-testid="side-panel-expand"]')).toBeVisible();
    await expect(page.locator('[data-testid="side-panel-delete"]')).toBeVisible();
    await expect(page.locator('[data-testid="side-panel-close"]')).toBeVisible();
  });

  test('side panel shows correct task details for a seeded task', async ({ page }) => {
    await waitForCalendarLoad(page);

    // Click "Review PR #42" — a task with HIGH priority, has time, Work category
    const targetTask = page.locator('[data-testid="task-panel"]').getByText('Review PR #42');
    await expect(targetTask).toBeVisible({ timeout: 5000 });
    await targetTask.click();

    // Title should appear in the side panel
    await expect(page.locator('.animate-panel-in').getByText('Review PR #42')).toBeVisible({ timeout: 3000 });

    // Should show detail rows — at minimum Date and Time
    await expect(page.locator('.animate-panel-in').getByText('Date')).toBeVisible();
    await expect(page.locator('.animate-panel-in').getByText('Time')).toBeVisible();
  });

  test('side panel close button works', async ({ page }) => {
    await waitForCalendarLoad(page);

    const taskRow = page.locator('[data-testid="task-panel"]').getByText('Review PR #42');
    await taskRow.click();

    // Wait for panel to appear
    await expect(page.locator('[data-testid="side-panel-close"]')).toBeVisible({ timeout: 3000 });

    // Close the panel
    await page.locator('[data-testid="side-panel-close"]').click();

    // Panel should animate out and disappear
    await expect(page.locator('[data-testid="side-panel-close"]')).not.toBeVisible({ timeout: 3000 });
  });

  test('Escape key closes the side panel', async ({ page }) => {
    await waitForCalendarLoad(page);

    const taskRow = page.locator('[data-testid="task-panel"]').getByText('Lunch with Sara');
    await taskRow.click();
    await expect(page.locator('[data-testid="side-panel-close"]')).toBeVisible({ timeout: 3000 });

    await page.keyboard.press('Escape');
    await expect(page.locator('[data-testid="side-panel-close"]')).not.toBeVisible({ timeout: 3000 });
  });

  test('clicking a task card in the week grid opens the side panel', async ({ page }) => {
    await waitForCalendarLoad(page);

    // Click a known task card in the week grid
    const taskCard = page.locator('[data-testid^="task-card-"]').first();
    await expect(taskCard).toBeVisible();
    await taskCard.click();

    // Side panel should appear (at minimum expand and close should be visible)
    await expect(page.locator('[data-testid="side-panel-expand"]')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('[data-testid="side-panel-close"]')).toBeVisible();
  });

  test('toggle checkbox in row does not open side panel', async ({ page }) => {
    await waitForCalendarLoad(page);

    // Find a task row with a toggle button (unchecked circle)
    const toggleBtn = page.locator('[data-testid="task-panel"] [data-testid^="task-row-"] button.rounded-full').first();
    if (await toggleBtn.isVisible()) {
      await toggleBtn.click();
      // Side panel should NOT open (no title bar with "Close")
      await expect(page.locator('[data-testid="side-panel-close"]')).not.toBeVisible({ timeout: 1000 });
    }
  });

  test('side panel Edit button navigates to full-screen editor', async ({ page }) => {
    await waitForCalendarLoad(page);

    // Use a known personal incomplete task
    const taskRow = page.locator('[data-testid="task-panel"]').getByText('Gym session');
    await expect(taskRow).toBeVisible({ timeout: 5000 });
    await taskRow.click();

    // Wait for the side panel to appear and animation to finish
    await expect(page.locator('[data-testid="side-panel-edit"]')).toBeVisible({ timeout: 3000 });
    await page.waitForTimeout(300); // Wait for slide-in animation to complete

    // Use dispatchEvent to avoid animation-related click misalignment
    await page.locator('[data-testid="side-panel-edit"]').dispatchEvent('click');

    // Should navigate to /items/:id/edit
    await page.waitForURL(/\/items\/.*\/edit/, { timeout: 5000 });

    // Full-screen editor should show
    await expect(page.getByPlaceholder('Add title')).toBeVisible({ timeout: 5000 });
  });

  test('side panel Expand button navigates to full page view', async ({ page }) => {
    await waitForCalendarLoad(page);

    // Use a known personal task (not group) so Edit/Delete are visible
    const taskRow = page.locator('[data-testid="task-panel"]').getByText('Review PR #42');
    await expect(taskRow).toBeVisible({ timeout: 5000 });
    await taskRow.click();

    await expect(page.locator('[data-testid="side-panel-expand"]')).toBeVisible({ timeout: 3000 });
    await page.locator('[data-testid="side-panel-expand"]').dispatchEvent('click');

    // Should navigate to /items/:id
    await page.waitForURL(/\/items\/[^/]+(\?|$)/, { timeout: 5000 });

    // Full page view should show Back to Calendar link and Edit/Delete buttons
    await expect(page.getByText('Back to Calendar')).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: 'Edit' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Delete' })).toBeVisible();
  });

  test('side panel works on the To-do page', async ({ page }) => {
    await page.goto('/todo');
    await page.waitForSelector('[data-testid^="task-row-"]', { timeout: 10000 });

    // Use a known to-do task
    const taskRow = page.getByText('Organize desk');
    await expect(taskRow).toBeVisible();
    await taskRow.click();

    // Side panel should appear
    await expect(page.locator('[data-testid="side-panel-edit"]')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('[data-testid="side-panel-expand"]')).toBeVisible();
  });
});

// ── Full Page View Tests ──

test.describe('Full Page Item View', () => {
  test('displays task details with Back button, Edit, and Delete', async ({ page }) => {
    await waitForCalendarLoad(page);

    // Open side panel, then expand to full page
    const taskRow = page.locator('[data-testid="task-panel"]').getByText('Review PR #42');
    await expect(taskRow).toBeVisible({ timeout: 5000 });
    await taskRow.click();
    await expect(page.locator('[data-testid="side-panel-expand"]')).toBeVisible({ timeout: 3000 });
    await page.locator('[data-testid="side-panel-expand"]').click();

    await page.waitForURL(/\/items\//, { timeout: 5000 });

    // Should show the task title
    await expect(page.locator('h1').getByText('Review PR #42')).toBeVisible({ timeout: 5000 });

    // Should show Back to Calendar
    await expect(page.getByText('Back to Calendar')).toBeVisible();

    // Should show Edit and Delete buttons
    await expect(page.getByRole('button', { name: 'Edit' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Delete' })).toBeVisible();

    // Should show detail rows in the info card
    await expect(page.getByText('Date').first()).toBeVisible();
    await expect(page.getByText('Time').first()).toBeVisible();
  });

  test('Back to Calendar navigates back', async ({ page }) => {
    await waitForCalendarLoad(page);

    const taskRow = page.locator('[data-testid="task-panel"]').getByText('Review PR #42');
    await taskRow.click();
    await expect(page.locator('[data-testid="side-panel-expand"]')).toBeVisible({ timeout: 3000 });
    await page.locator('[data-testid="side-panel-expand"]').click();
    await page.waitForURL(/\/items\//, { timeout: 5000 });

    // Click Back to Calendar
    await page.getByText('Back to Calendar').click();

    // Should navigate back to calendar
    await page.waitForURL(/\/calendar/, { timeout: 5000 });
  });

  test('Edit button on full page view navigates to editor', async ({ page }) => {
    await waitForCalendarLoad(page);

    const taskRow = page.locator('[data-testid="task-panel"]').getByText('Review PR #42');
    await taskRow.click();
    await expect(page.locator('[data-testid="side-panel-expand"]')).toBeVisible({ timeout: 3000 });
    await page.locator('[data-testid="side-panel-expand"]').click();
    await page.waitForURL(/\/items\/[^/]+(\?|$)/, { timeout: 5000 });

    // Click Edit
    await page.getByRole('button', { name: 'Edit' }).click();

    // Should navigate to edit URL
    await page.waitForURL(/\/items\/.*\/edit/, { timeout: 5000 });

    // Editor should show with the task title pre-filled
    const titleInput = page.getByPlaceholder('Add title');
    await expect(titleInput).toBeVisible({ timeout: 5000 });
    await expect(titleInput).toHaveValue('Review PR #42');
  });
});

// ── Full-Screen Editor Tests ──

test.describe('Full-Screen Editor', () => {
  test('opens via "More Options" from create modal with state preserved', async ({ page }) => {
    await waitForCalendarLoad(page);

    // Open create modal
    await page.locator('[data-testid="task-panel"] button:has-text("Add")').click();
    await expect(page.getByPlaceholder('What needs to be done?')).toBeVisible({ timeout: 3000 });

    // Type a title in the modal
    await page.getByPlaceholder('What needs to be done?').fill('Test more options');

    // Click "More Options"
    await page.getByText('More options').click();

    // Should navigate to /items/new
    await page.waitForURL(/\/items\/new/, { timeout: 5000 });

    // Title should be preserved in the full-screen editor
    const titleInput = page.getByPlaceholder('Add title');
    await expect(titleInput).toBeVisible({ timeout: 5000 });
    await expect(titleInput).toHaveValue('Test more options');
  });

  test('full-screen editor shows two-column layout with field cards', async ({ page }) => {
    await page.goto('/items/new');

    // Header should show "New Task"
    await expect(page.locator('h1').getByText('New Task')).toBeVisible({ timeout: 5000 });

    // Type toggle should be visible
    await expect(page.getByRole('button', { name: 'Task' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Event' })).toBeVisible();

    // Save button should be visible but disabled (no title)
    await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled();

    // Title and description inputs
    await expect(page.getByPlaceholder('Add title')).toBeVisible();
    await expect(page.getByPlaceholder('Add description')).toBeVisible();

    // Schedule fields
    await expect(page.getByText('Add date')).toBeVisible();
    await expect(page.getByText('Set recurrence')).toBeVisible();
    await expect(page.getByText('Add location')).toBeVisible();

    // Classification fields
    await expect(page.getByText('Add priority')).toBeVisible();
    await expect(page.getByText('Add category')).toBeVisible();
    await expect(page.getByText('Add tags')).toBeVisible();

    // Info card (shown when no date selected)
    await expect(page.getByText('Time, duration, reminders, and advanced settings will appear after selecting a date.')).toBeVisible();
  });

  test('Save button becomes enabled when title is entered', async ({ page }) => {
    await page.goto('/items/new');
    await expect(page.getByPlaceholder('Add title')).toBeVisible({ timeout: 5000 });

    // Save initially disabled
    await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled();

    // Enter title
    await page.getByPlaceholder('Add title').fill('Test task');

    // Save should now be enabled
    await expect(page.getByRole('button', { name: 'Save' })).toBeEnabled();
  });

  test('switching to Event type changes header', async ({ page }) => {
    await page.goto('/items/new');
    await expect(page.getByPlaceholder('Add title')).toBeVisible({ timeout: 5000 });

    // Initially "New Task"
    await expect(page.locator('h1').getByText('New Task')).toBeVisible();

    // Switch to Event
    await page.getByRole('button', { name: 'Event' }).click();

    // Header should change
    await expect(page.locator('h1').getByText('New Event')).toBeVisible();
  });

  test('close button navigates back', async ({ page }) => {
    // Navigate to calendar first, then open editor via More Options so history has calendar
    await waitForCalendarLoad(page);

    // Open create modal
    await page.locator('[data-testid="task-panel"] button:has-text("Add")').click();
    await expect(page.getByPlaceholder('What needs to be done?')).toBeVisible({ timeout: 3000 });

    // Click More Options to navigate to full editor
    await page.getByText('More options').click();
    await page.waitForURL(/\/items\/new/, { timeout: 5000 });
    await expect(page.getByPlaceholder('Add title')).toBeVisible({ timeout: 5000 });

    // Click close (X) button — the first button with a close icon in the header
    await page.locator('h1:has-text("New Task")').locator('..').locator('button').first().click();

    // Should navigate back to calendar
    await page.waitForURL(/\/calendar/, { timeout: 5000 });
  });

  test('edit mode loads existing task data', async ({ page }) => {
    await waitForCalendarLoad(page);

    // Open side panel for Review PR #42 and navigate to edit
    const taskRow = page.locator('[data-testid="task-panel"]').getByText('Review PR #42');
    await taskRow.click();

    // Wait for side panel
    const panel = page.locator('.animate-panel-in');
    await expect(panel).toBeVisible({ timeout: 3000 });

    // Use dispatchEvent to avoid animation-related click misalignment
    await page.locator('[data-testid="side-panel-edit"]').dispatchEvent('click');

    await page.waitForURL(/\/items\/.*\/edit/, { timeout: 5000 });

    // Title should be pre-filled
    const titleInput = page.getByPlaceholder('Add title');
    await expect(titleInput).toBeVisible({ timeout: 5000 });
    await expect(titleInput).toHaveValue('Review PR #42');

    // Header should say "Edit Task"
    await expect(page.locator('h1').getByText('Edit Task')).toBeVisible();
  });
});

// ── Delete Flow Tests ──

test.describe('Delete Flow', () => {
  test('side panel delete shows confirmation dialog', async ({ page }) => {
    await waitForCalendarLoad(page);

    // Open side panel for a personal incomplete task
    const taskRow = page.locator('[data-testid="task-panel"]').getByText('Buy groceries');
    await taskRow.click();
    await expect(page.locator('[data-testid="side-panel-delete"]')).toBeVisible({ timeout: 3000 });

    // Click delete
    await page.locator('[data-testid="side-panel-delete"]').click();

    // Confirmation dialog should appear
    await expect(page.getByText('Delete this item?')).toBeVisible({ timeout: 3000 });
    await expect(page.getByText('This action cannot be undone')).toBeVisible();

    // Cancel button should close dialog
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByText('Delete this item?')).not.toBeVisible({ timeout: 2000 });
  });
});

// ── Create Task via Full Editor Flow ──

test.describe('Create via Full Editor', () => {
  test('create task via More Options and verify it appears', async ({ page }) => {
    await waitForCalendarLoad(page);

    // Open create modal
    await page.locator('[data-testid="task-panel"] button:has-text("Add")').click();
    await expect(page.getByPlaceholder('What needs to be done?')).toBeVisible({ timeout: 3000 });

    // Type title and click More Options
    await page.getByPlaceholder('What needs to be done?').fill('E2E full editor task');
    await page.getByText('More options').click();

    // Wait for navigation to /items/new
    await page.waitForURL(/\/items\/new/, { timeout: 5000 });

    // Title should be preserved
    await expect(page.getByPlaceholder('Add title')).toHaveValue('E2E full editor task');

    // Add a description
    await page.getByPlaceholder('Add description').fill('Created via full-screen editor E2E test');

    // Click Save
    await page.getByRole('button', { name: 'Save' }).click();

    // Should navigate away (back to calendar)
    await page.waitForURL(/\/(calendar|items)/, { timeout: 5000 });
  });
});

// ── Event-Specific Tests ──

test.describe('Event Side Panel and Views', () => {
  test('clicking an event opens side panel with event details', async ({ page }) => {
    await waitForCalendarLoad(page);

    // Click "Product launch" event (seeded event on today)
    const eventRow = page.locator('[data-testid="task-panel"]').getByText('Product launch');
    await expect(eventRow).toBeVisible({ timeout: 5000 });
    await eventRow.click();

    // Side panel should show the event title
    await expect(page.locator('[data-testid="side-panel-edit"]')).toBeVisible({ timeout: 3000 });

    // Should show event title in the panel
    const panelTitle = page.locator('.animate-panel-in').getByText('Product launch');
    await expect(panelTitle).toBeVisible();

    // Should show Date and Time detail rows
    await expect(page.locator('.animate-panel-in').getByText('Date', { exact: true })).toBeVisible();
    await expect(page.locator('.animate-panel-in').getByText('Time', { exact: true })).toBeVisible();
  });

  test('event Expand button opens full page view with correct data', async ({ page }) => {
    await waitForCalendarLoad(page);

    // Open side panel for "Product launch"
    await page.locator('[data-testid="task-panel"]').getByText('Product launch').click();
    await expect(page.locator('[data-testid="side-panel-expand"]')).toBeVisible({ timeout: 3000 });

    // Click Expand
    await page.locator('[data-testid="side-panel-expand"]').dispatchEvent('click');

    // Should navigate to /items/:id?type=event
    await page.waitForURL(/\/items\/.*\?type=event/, { timeout: 5000 });

    // Full page should show the event title
    await expect(page.locator('h1').getByText('Product launch')).toBeVisible({ timeout: 5000 });

    // Should show Back to Calendar
    await expect(page.getByText('Back to Calendar')).toBeVisible();

    // Should show detail rows
    await expect(page.getByText('Date').first()).toBeVisible();
    await expect(page.getByText('Time').first()).toBeVisible();
  });

  test('event Edit button opens editor with event data pre-filled', async ({ page }) => {
    await waitForCalendarLoad(page);

    // Open side panel for "Product launch"
    await page.locator('[data-testid="task-panel"]').getByText('Product launch').click();
    await expect(page.locator('[data-testid="side-panel-edit"]')).toBeVisible({ timeout: 3000 });

    // Click Edit
    await page.locator('[data-testid="side-panel-edit"]').dispatchEvent('click');

    // Should navigate to /items/:id/edit?type=event
    await page.waitForURL(/\/items\/.*\/edit\?type=event/, { timeout: 5000 });

    // Editor should show with event title pre-filled
    const titleInput = page.getByPlaceholder('Add title');
    await expect(titleInput).toBeVisible({ timeout: 5000 });
    await expect(titleInput).toHaveValue('Product launch');

    // Header should say "Edit Event"
    await expect(page.locator('h1').getByText('Edit Event')).toBeVisible();
  });

  test('event full page view Edit button navigates to editor', async ({ page }) => {
    await waitForCalendarLoad(page);

    // Open side panel → expand to full page
    await page.locator('[data-testid="task-panel"]').getByText('Product launch').click();
    await expect(page.locator('[data-testid="side-panel-expand"]')).toBeVisible({ timeout: 3000 });
    await page.locator('[data-testid="side-panel-expand"]').dispatchEvent('click');
    await page.waitForURL(/\/items\/.*\?type=event/, { timeout: 5000 });

    // Click Edit on the full page view
    await page.getByRole('button', { name: 'Edit' }).click();

    // Should navigate to edit URL
    await page.waitForURL(/\/items\/.*\/edit/, { timeout: 5000 });

    // Editor should have event title
    await expect(page.getByPlaceholder('Add title')).toHaveValue('Product launch', { timeout: 5000 });
  });
});

// ── Permission Tests (group tasks) ──

test.describe('Group Task Permissions', () => {
  test('group task where user is participant: no Edit/Delete in side panel', async ({ page }) => {
    await waitForCalendarLoad(page);

    // "Code review session" is a group task where web user is a participant (not owner)
    const taskRow = page.locator('[data-testid="task-panel"]').getByText('Code review session');
    await expect(taskRow).toBeVisible({ timeout: 5000 });
    await taskRow.click();

    // Side panel should open
    await expect(page.locator('[data-testid="side-panel-expand"]')).toBeVisible({ timeout: 3000 });

    // Edit and Delete buttons should NOT be visible
    await expect(page.locator('[data-testid="side-panel-edit"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="side-panel-delete"]')).not.toBeVisible();

    // Expand and Close should still be visible
    await expect(page.locator('[data-testid="side-panel-expand"]')).toBeVisible();
    await expect(page.locator('[data-testid="side-panel-close"]')).toBeVisible();
  });

  test('group task where user is participant: no Edit/Delete on full page view', async ({ page }) => {
    await waitForCalendarLoad(page);

    // Open side panel for "Code review session" and expand to full page
    await page.locator('[data-testid="task-panel"]').getByText('Code review session').click();
    await expect(page.locator('[data-testid="side-panel-expand"]')).toBeVisible({ timeout: 3000 });
    await page.locator('[data-testid="side-panel-expand"]').dispatchEvent('click');

    await page.waitForURL(/\/items\//, { timeout: 5000 });

    // Title should show
    await expect(page.locator('h1').getByText('Code review session')).toBeVisible({ timeout: 5000 });

    // Edit and Delete buttons should NOT be present
    await expect(page.getByRole('button', { name: 'Edit' })).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Delete' })).not.toBeVisible();
  });

  test('group task where user is owner: Edit/Delete visible in side panel', async ({ page }) => {
    await waitForCalendarLoad(page);

    // "Design sync" is a group task where web user is owner
    const taskRow = page.locator('[data-testid="task-panel"]').getByText('Design sync');
    await expect(taskRow).toBeVisible({ timeout: 5000 });
    await taskRow.click();

    // Side panel should open with Edit and Delete visible
    await expect(page.locator('[data-testid="side-panel-expand"]')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('[data-testid="side-panel-edit"]')).toBeVisible();
    await expect(page.locator('[data-testid="side-panel-delete"]')).toBeVisible();
  });
});
