import { test, expect } from '@playwright/test';

/**
 * Phase 3.8 — Notification page & group invitation E2E tests.
 *
 * Tests the notification inbox page structure, tab switching, empty states,
 * navigation, and the notification badge in the sidebar/header.
 *
 * The logged-in user (web@doooo.co) is the group OWNER, so they send
 * invitations but don't receive GROUP_INVITATION notifications themselves.
 * These tests verify the page renders correctly and handles both populated
 * and empty notification states.
 *
 * Tests run in serial mode because later tests depend on state from earlier
 * ones (e.g., creating invitations that generate notifications).
 */

test.describe('Notification page', () => {
  test.describe.configure({ mode: 'serial' });

  test('notification page loads and shows heading', async ({ page }) => {
    await page.goto('/notifications');

    // Wait for the page to load
    const heading = page.getByTestId('notifications-heading');
    await expect(heading).toBeVisible({ timeout: 10000 });
    await expect(heading).toContainText('Notifications');
  });

  test('page shows three filter tabs', async ({ page }) => {
    await page.goto('/notifications');
    await expect(page.getByTestId('notifications-heading')).toBeVisible({ timeout: 10000 });

    // All three tabs should be visible
    await expect(page.getByTestId('tab-unread')).toBeVisible();
    await expect(page.getByTestId('tab-invitations')).toBeVisible();
    await expect(page.getByTestId('tab-all')).toBeVisible();
  });

  test('default tab is Unread', async ({ page }) => {
    await page.goto('/notifications');
    await expect(page.getByTestId('notifications-heading')).toBeVisible({ timeout: 10000 });

    // Unread tab should have the active indicator (primary text color)
    const unreadTab = page.getByTestId('tab-unread');
    await expect(unreadTab).toHaveClass(/text-primary/);
  });

  test('switching to Invitations tab shows invitation-specific empty state', async ({ page }) => {
    await page.goto('/notifications');
    await expect(page.getByTestId('notifications-heading')).toBeVisible({ timeout: 10000 });

    // Click Invitations tab
    await page.getByTestId('tab-invitations').click();

    // Should show invitation-specific empty state
    const emptyState = page.getByTestId('empty-state');
    await expect(emptyState).toBeVisible();
    await expect(emptyState).toContainText(/no pending invitations/i);
    await expect(emptyState).toContainText(/group invitations will appear here/i);
  });

  test('switching to All tab shows content after loading', async ({ page }) => {
    await page.goto('/notifications');
    await expect(page.getByTestId('notifications-heading')).toBeVisible({ timeout: 10000 });

    // Click All tab
    await page.getByTestId('tab-all').click();

    // Wait for loading to finish — either empty state or notifications list should appear
    const emptyState = page.getByTestId('empty-state');
    const notificationsList = page.getByTestId('notifications-list');

    await expect(emptyState.or(notificationsList)).toBeVisible({ timeout: 10000 });
  });

  test('tab switching updates active indicator', async ({ page }) => {
    await page.goto('/notifications');
    await expect(page.getByTestId('notifications-heading')).toBeVisible({ timeout: 10000 });

    // Initially Unread is active
    await expect(page.getByTestId('tab-unread')).toHaveClass(/text-primary/);
    await expect(page.getByTestId('tab-invitations')).not.toHaveClass(/text-primary/);

    // Click Invitations
    await page.getByTestId('tab-invitations').click();
    await expect(page.getByTestId('tab-invitations')).toHaveClass(/text-primary/);
    await expect(page.getByTestId('tab-unread')).not.toHaveClass(/text-primary/);

    // Click All
    await page.getByTestId('tab-all').click();
    await expect(page.getByTestId('tab-all')).toHaveClass(/text-primary/);
    await expect(page.getByTestId('tab-invitations')).not.toHaveClass(/text-primary/);

    // Click back to Unread
    await page.getByTestId('tab-unread').click();
    await expect(page.getByTestId('tab-unread')).toHaveClass(/text-primary/);
  });
});

test.describe('Sidebar notification navigation', () => {
  test('clicking notification bell in sidebar navigates to notification page', async ({ page }) => {
    await page.goto('/home');
    // Wait for dashboard to load
    await expect(page.getByText(/Good (morning|afternoon|evening)/i)).toBeVisible({ timeout: 10000 });

    // Click the notification bell in the sidebar (expanded state on desktop)
    const notificationLink = page.locator('a[href="/notifications"]').first();
    await notificationLink.click();

    // Should navigate to notifications page
    await expect(page).toHaveURL('/notifications');
    await expect(page.getByTestId('notifications-heading')).toBeVisible({ timeout: 10000 });
  });

  test('direct URL navigation to /notifications works', async ({ page }) => {
    await page.goto('/notifications');

    await expect(page).toHaveURL('/notifications');
    await expect(page.getByTestId('notifications-heading')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Notification badge and mark all read', () => {
  test.describe.configure({ mode: 'serial' });

  test('mark all read button is hidden when no unread notifications', async ({ page }) => {
    await page.goto('/notifications');
    await expect(page.getByTestId('notifications-heading')).toBeVisible({ timeout: 10000 });

    // If there are no unread notifications, mark all read button should not be visible
    // We check the all tab first to see if there are any notifications
    await page.getByTestId('tab-all').click();

    const emptyState = page.getByTestId('empty-state');
    const hasEmpty = await emptyState.isVisible().catch(() => false);

    if (hasEmpty) {
      // No notifications at all — mark all read should be hidden
      await expect(page.getByTestId('mark-all-read-button')).not.toBeVisible();
    }
    // If there are notifications, the button visibility depends on unread count
  });
});

test.describe('Invitation card via group members flow', () => {
  test.describe.configure({ mode: 'serial' });

  const MEMBERS_PATH = '/groups/web-group-alpha/members';

  test('creating invitation via LINK delivery shows pending invitation', async ({ page }) => {
    await page.goto(MEMBERS_PATH);
    await expect(page.getByTestId('members-heading')).toBeVisible({ timeout: 10000 });

    // Open invite modal
    await page.getByTestId('invite-member-button').click();
    await expect(page.getByRole('heading', { name: /invite member/i })).toBeVisible();

    // Share Link delivery should already be selected by default
    // Select MEMBER role (should be default)
    const apiResponse = page.waitForResponse(
      (resp) => resp.url().includes('/invitations') && resp.request().method() === 'POST',
      { timeout: 10000 },
    );

    // Click the Share button in the modal header
    await page.getByRole('button', { name: 'Share', exact: true }).click();
    await apiResponse;

    // Pending invitations section should now appear
    await expect(page.getByTestId('pending-invitations-section')).toBeVisible({ timeout: 5000 });
  });

  test('cancel invitation cleans up pending state', async ({ page }) => {
    await page.goto(MEMBERS_PATH);
    await expect(page.getByTestId('members-heading')).toBeVisible({ timeout: 10000 });

    // Wait for pending invitations to load
    const pendingSection = page.getByTestId('pending-invitations-section');
    const hasPending = await pendingSection.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasPending) {
      // Cancel the invitation
      await page.getByText(/cancel invitation/i).first().click();

      // Confirm dialog
      await expect(page.getByText(/cancel this invitation/i)).toBeVisible();

      const deleteResponse = page.waitForResponse(
        (resp) => resp.url().includes('/invitations/') && resp.request().method() === 'DELETE',
        { timeout: 10000 },
      );
      await page.getByRole('button', { name: /yes.*cancel/i }).click();
      await deleteResponse;

      // Pending section should disappear
      await expect(page.getByTestId('pending-invitations-section')).not.toBeVisible({ timeout: 5000 });
    }
  });
});
