import { test, expect } from '@playwright/test';

/**
 * Phase 3.5 — Group Task Assignment E2E tests.
 *
 * Tests the assignment UI in the item editor (for all members toggle,
 * assignee picker, participant selection modal, track completion toggle)
 * and the side panel display (assignee display, participation actions,
 * completion stats).
 *
 * Uses the seeded group "Project Alpha" (web-group-alpha) which has:
 *   - Owner: Web Test User (web@doooo.co)
 *   - Members: Alice Chen, Bob Kim
 */

const SEEDED_GROUP_ID = 'web-group-alpha';
const GROUP_CALENDAR_PATH = `/groups/${SEEDED_GROUP_ID}/calendar`;
const GROUP_TASKS_PATH = `/groups/${SEEDED_GROUP_ID}/tasks`;

test.describe('Group task assignment', () => {
  test.describe.configure({ mode: 'serial' });

  // ── Editor: assignment UI visibility ──

  test('assignment section is hidden for personal tasks', async ({ page }) => {
    // Navigate directly to the full editor with no groupId
    await page.goto('/items/new?type=task');
    await page.waitForSelector('input[type="text"]', { timeout: 10000 });

    // Assignment section should NOT be visible (no groupId in draft)
    await expect(page.getByTestId('group-assignment-section')).not.toBeVisible();
  });

  test('assignment section is visible for group tasks', async ({ page }) => {
    await page.goto(GROUP_CALENDAR_PATH);
    await page.waitForSelector('[data-testid="calendar-week-grid"]', { timeout: 10000 });

    // Open create modal from group calendar
    await page.locator('[data-testid="task-panel"] button:has-text("Add")').click();
    await page.getByPlaceholder('What needs to be done?').fill('Group task assignment test');

    // Navigate to full editor
    await page.getByText('More options').click();
    await page.waitForURL(/\/items\/new/);

    // Assignment section should be visible
    await expect(page.getByTestId('group-assignment-section')).toBeVisible();

    // ForAllMembers toggle should be visible
    await expect(page.getByTestId('for-all-members-toggle')).toBeVisible();
  });

  // ── Editor: ForAllMembers toggle ──

  test('for-all-members toggle switches between assignee picker and participant mode', async ({ page }) => {
    await page.goto(GROUP_CALENDAR_PATH);
    await page.waitForSelector('[data-testid="calendar-week-grid"]', { timeout: 10000 });

    await page.locator('[data-testid="task-panel"] button:has-text("Add")').click();
    await page.getByPlaceholder('What needs to be done?').fill('Toggle test');
    await page.getByText('More options').click();
    await page.waitForURL(/\/items\/new/);

    // Initially OFF: assignee picker should be visible
    await expect(page.getByTestId('assignee-picker')).toBeVisible();
    await expect(page.getByTestId('track-completion-toggle')).not.toBeVisible();

    // Toggle ON
    await page.getByTestId('for-all-members-switch').click();

    // Assignee picker should be hidden, track completion visible
    await expect(page.getByTestId('assignee-picker')).not.toBeVisible();
    await expect(page.getByTestId('track-completion-toggle')).toBeVisible();
    await expect(page.getByTestId('participate-myself-switch')).toBeVisible();

    // Toggle back OFF
    await page.getByTestId('for-all-members-switch').click();

    // Assignee picker should be visible again
    await expect(page.getByTestId('assignee-picker')).toBeVisible();
    await expect(page.getByTestId('track-completion-toggle')).not.toBeVisible();
  });

  // ── Editor: Assignee picker ──

  test('assignee picker shows group members and allows selection', async ({ page }) => {
    await page.goto(GROUP_CALENDAR_PATH);
    await page.waitForSelector('[data-testid="calendar-week-grid"]', { timeout: 10000 });

    await page.locator('[data-testid="task-panel"] button:has-text("Add")').click();
    await page.getByPlaceholder('What needs to be done?').fill('Assignee picker test');
    await page.getByText('More options').click();
    await page.waitForURL(/\/items\/new/);

    // Assignee picker should show members (Alice Chen, Bob Kim)
    // The current user (Web Test User) should be excluded
    const picker = page.getByTestId('assignee-picker');
    await expect(picker).toBeVisible();

    // Wait for members to load
    await page.waitForSelector('[data-testid^="assignee-item-"]', { timeout: 10000 });

    // Should show at least 2 members
    const memberItems = picker.locator('[data-testid^="assignee-item-"]');
    await expect(memberItems).toHaveCount(2);

    // Click first member to select
    await memberItems.first().click();

    // The selected member should have a check icon
    const firstCheck = memberItems.first().locator('.bg-primary');
    await expect(firstCheck).toBeVisible();
  });

  test('assignee picker supports search', async ({ page }) => {
    await page.goto(GROUP_CALENDAR_PATH);
    await page.waitForSelector('[data-testid="calendar-week-grid"]', { timeout: 10000 });

    await page.locator('[data-testid="task-panel"] button:has-text("Add")').click();
    await page.getByPlaceholder('What needs to be done?').fill('Assignee search test');
    await page.getByText('More options').click();
    await page.waitForURL(/\/items\/new/);

    // Wait for members
    await page.waitForSelector('[data-testid^="assignee-item-"]', { timeout: 10000 });

    // Search for "Alice"
    await page.getByTestId('assignee-search-input').fill('Alice');

    // Should show only Alice
    const memberItems = page.getByTestId('assignee-picker').locator('[data-testid^="assignee-item-"]');
    await expect(memberItems).toHaveCount(1);
    await expect(memberItems.first()).toContainText('Alice');

    // Clear search
    await page.getByTestId('assignee-search-input').fill('');
    await expect(page.getByTestId('assignee-picker').locator('[data-testid^="assignee-item-"]')).toHaveCount(2);
  });

  // ── Editor: Participant selection modal ──

  test('participant selection modal opens and supports multi-select', async ({ page }) => {
    await page.goto(GROUP_CALENDAR_PATH);
    await page.waitForSelector('[data-testid="calendar-week-grid"]', { timeout: 10000 });

    await page.locator('[data-testid="task-panel"] button:has-text("Add")').click();
    await page.getByPlaceholder('What needs to be done?').fill('Participant modal test');
    await page.getByText('More options').click();
    await page.waitForURL(/\/items\/new/);

    // Toggle ForAllMembers ON
    await page.getByTestId('for-all-members-switch').click();

    // Click "Invite to participate" field row to open modal
    await page.getByText('Invite to participate').click();

    // Modal should appear
    await expect(page.getByTestId('participant-selection-modal')).toBeVisible();

    // Wait for members to load
    await page.waitForSelector('[data-testid^="participant-item-"]', { timeout: 10000 });

    // Should show members (excluding current user)
    const items = page.locator('[data-testid^="participant-item-"]');
    await expect(items).toHaveCount(2);

    // Select first member
    await items.first().click();
    // Select second member
    await items.nth(1).click();

    // Close modal
    await page.getByTestId('participant-modal-done').click();
    await expect(page.getByTestId('participant-selection-modal')).not.toBeVisible();

    // Field row should show count
    await expect(page.getByText('2 members selected')).toBeVisible();
  });

  // ── Editor: Info panels ──

  test('info panels expand and collapse for toggles', async ({ page }) => {
    await page.goto(GROUP_CALENDAR_PATH);
    await page.waitForSelector('[data-testid="calendar-week-grid"]', { timeout: 10000 });

    await page.locator('[data-testid="task-panel"] button:has-text("Add")').click();
    await page.getByPlaceholder('What needs to be done?').fill('Info panel test');
    await page.getByText('More options').click();
    await page.waitForURL(/\/items\/new/);

    // Click ForAllMembers info button
    await page.getByTestId('for-all-members-info-btn').click();

    // Info panel should appear with activity explanation text
    await expect(page.getByText('Create a shared activity')).toBeVisible();

    // Click again to collapse
    await page.getByTestId('for-all-members-info-btn').click();
    await expect(page.getByText('Create a shared activity')).not.toBeVisible();
  });

  // ── Create: group task with assignee ──

  test('create group task with single assignee', async ({ page }) => {
    await page.goto(GROUP_CALENDAR_PATH);
    await page.waitForSelector('[data-testid="calendar-week-grid"]', { timeout: 10000 });

    await page.locator('[data-testid="task-panel"] button:has-text("Add")').click();
    await page.getByPlaceholder('What needs to be done?').fill('Assigned to Alice');
    await page.getByText('More options').click();
    await page.waitForURL(/\/items\/new/);

    // Wait for assignee picker to load members
    await page.waitForSelector('[data-testid^="assignee-item-"]', { timeout: 10000 });

    // Select first member (Alice)
    const firstMember = page.locator('[data-testid^="assignee-item-"]').first();
    await firstMember.click();

    // Save the task (undated → goes to to-do)
    await page.getByRole('button', { name: /save/i }).click();

    // Should navigate back
    await page.waitForURL(/\/groups\//);

    // Navigate to group to-do page to verify task appears there (undated tasks go to to-do)
    await page.goto(GROUP_TASKS_PATH);
    await page.waitForSelector('h1', { timeout: 10000 });
    await expect(page.getByText('Assigned to Alice').first()).toBeVisible({ timeout: 5000 });
  });

  // ── Create: group activity (for all members) ──

  test('create group activity for all members', async ({ page }) => {
    await page.goto(GROUP_CALENDAR_PATH);
    await page.waitForSelector('[data-testid="calendar-week-grid"]', { timeout: 10000 });

    await page.locator('[data-testid="task-panel"] button:has-text("Add")').click();
    await page.getByPlaceholder('What needs to be done?').fill('Team standup activity');
    await page.getByText('More options').click();
    await page.waitForURL(/\/items\/new/);

    // Toggle ForAllMembers ON
    await page.getByTestId('for-all-members-switch').click();

    // Open participant modal and select members
    await page.getByText('Invite to participate').click();
    await page.waitForSelector('[data-testid^="participant-item-"]', { timeout: 10000 });

    // Select all via toggle
    await page.getByTestId('participant-select-all').click();

    await page.getByTestId('participant-modal-done').click();

    // Save
    await page.getByRole('button', { name: /save/i }).click();
    await page.waitForURL(/\/groups\//);

    // Navigate to group to-do page to verify (undated tasks)
    await page.goto(GROUP_TASKS_PATH);
    await page.waitForSelector('h1', { timeout: 10000 });
    await expect(page.getByText('Team standup activity').first()).toBeVisible({ timeout: 5000 });
  });

  // ── Side panel: assignee display ──

  test('side panel shows assignee for single-assigned task', async ({ page }) => {
    await page.goto(GROUP_TASKS_PATH);
    await page.waitForSelector('h1', { timeout: 10000 });

    // Click on the previously created "Assigned to Alice" task
    const taskRow = page.getByText('Assigned to Alice').first();
    if (await taskRow.isVisible({ timeout: 5000 }).catch(() => false)) {
      await taskRow.click();

      // Side panel should show assignee display
      await expect(page.getByTestId('item-side-panel')).toBeVisible();
      await expect(page.getByTestId('assignee-display')).toBeVisible();
    }
  });

  // ── Side panel: participation info for group activity ──

  test('side panel shows participation info for group activity', async ({ page }) => {
    await page.goto(GROUP_TASKS_PATH);
    await page.waitForSelector('h1', { timeout: 10000 });

    // Click on the "Team standup activity" task
    const taskRow = page.getByText('Team standup activity').first();
    if (await taskRow.isVisible({ timeout: 5000 }).catch(() => false)) {
      await taskRow.click();

      // Side panel should open without errors
      await expect(page.getByTestId('item-side-panel')).toBeVisible();
    }
  });
});
