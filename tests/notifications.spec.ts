import { test, expect, type Page } from '@playwright/test';

/**
 * Phase 3.8 + 5.2 — Notification page, group invitation, & notification actions E2E tests.
 *
 * Tests the notification inbox page structure, tab switching, empty states,
 * navigation, and the notification badge in the sidebar/header.
 * Phase 5.2 adds: click-to-navigate, delete button hiding for invitations,
 * and chevron indicator for navigable notifications (using mocked data).
 *
 * The logged-in user (web@doooo.co) is the group OWNER, so they send
 * invitations but don't receive GROUP_INVITATION notifications themselves.
 * These tests verify the page renders correctly and handles both populated
 * and empty notification states.
 *
 * Tests run in serial mode because later tests depend on state from earlier
 * ones (e.g., creating invitations that generate notifications).
 */

// ── Mock notification data for Phase 5.2 tests ──

const MOCK_TASK_ID = 'mock-task-id-001';
const MOCK_EVENT_ID = 'mock-event-id-001';
const MOCK_GROUP_ID = 'mock-group-id-001';

const MOCK_NOTIFICATIONS = [
  {
    id: 'notif-task-assigned',
    type: 'TASK_ASSIGNED',
    isRead: false,
    data: { taskId: MOCK_TASK_ID, taskTitle: 'Review docs', assignedByUserId: 'u1', assignedByName: 'Alice' },
    createdAt: new Date().toISOString(),
    readAt: null,
  },
  {
    id: 'notif-event-updated',
    type: 'EVENT_UPDATED',
    isRead: true,
    data: { eventId: MOCK_EVENT_ID, eventTitle: 'Team standup', updatedByUserId: 'u2' },
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    readAt: new Date().toISOString(),
  },
  {
    id: 'notif-group-member-joined',
    type: 'GROUP_MEMBER_JOINED',
    isRead: true,
    data: { groupId: MOCK_GROUP_ID, groupName: 'Project Alpha', newMemberId: 'u3', newMemberName: 'Bob' },
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    readAt: new Date().toISOString(),
  },
  {
    id: 'notif-group-invitation',
    type: 'GROUP_INVITATION',
    isRead: false,
    data: { groupId: 'g2', groupName: 'Beta Team', invitedByUserId: 'u4', invitedByName: 'Carol', role: 'MEMBER', invitationId: 'inv-001' },
    createdAt: new Date(Date.now() - 10800000).toISOString(),
    readAt: null,
  },
  {
    id: 'notif-daily-digest',
    type: 'DAILY_DIGEST',
    isRead: true,
    data: { type: 'daily', summary: { total: 5, byType: {} } },
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    readAt: new Date().toISOString(),
  },
];

/** Set up route mocks for notification API endpoints with mock data. */
async function setupNotificationMocks(page: Page) {
  await page.route('**/api/notifications', (route) => {
    if (route.request().method() === 'GET') {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: MOCK_NOTIFICATIONS }),
      });
    } else {
      route.continue();
    }
  });

  await page.route('**/api/notifications/unread-count', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: { count: 2 } }),
    });
  });

  // Mark as read — just succeed
  await page.route('**/api/notifications/*/read', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    });
  });
}

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

// ── Phase 5.2 — Notification actions (mocked data) ──

test.describe('Notification actions — click-to-navigate', () => {
  test('clicking a task notification navigates to /items/:taskId', async ({ page }) => {
    await setupNotificationMocks(page);
    await page.goto('/notifications');
    await expect(page.getByTestId('notifications-heading')).toBeVisible({ timeout: 10000 });

    // Switch to All tab to see all mocked notifications
    await page.getByTestId('tab-all').click();
    await expect(page.getByTestId('notifications-list')).toBeVisible({ timeout: 5000 });

    // Click the TASK_ASSIGNED notification
    await page.getByTestId('notification-item-notif-task-assigned').click();

    // Should navigate to the task item view
    await expect(page).toHaveURL(`/items/${MOCK_TASK_ID}`);
  });

  test('clicking an event notification navigates to /items/:eventId?type=event', async ({ page }) => {
    await setupNotificationMocks(page);
    await page.goto('/notifications');
    await expect(page.getByTestId('notifications-heading')).toBeVisible({ timeout: 10000 });

    await page.getByTestId('tab-all').click();
    await expect(page.getByTestId('notifications-list')).toBeVisible({ timeout: 5000 });

    // Click the EVENT_UPDATED notification
    await page.getByTestId('notification-item-notif-event-updated').click();

    // Should navigate to the event item view with type=event
    await expect(page).toHaveURL(`/items/${MOCK_EVENT_ID}?type=event`);
  });

  test('clicking a group member notification navigates to /groups/:groupId', async ({ page }) => {
    await setupNotificationMocks(page);
    await page.goto('/notifications');
    await expect(page.getByTestId('notifications-heading')).toBeVisible({ timeout: 10000 });

    await page.getByTestId('tab-all').click();
    await expect(page.getByTestId('notifications-list')).toBeVisible({ timeout: 5000 });

    // Click the GROUP_MEMBER_JOINED notification
    await page.getByTestId('notification-item-notif-group-member-joined').click();

    // Should navigate to the group detail (redirects to /groups/:groupId/tasks)
    await expect(page).toHaveURL(new RegExp(`/groups/${MOCK_GROUP_ID}`));
  });
});

test.describe('Notification actions — chevron indicator', () => {
  test('navigable notifications show chevron, non-navigable do not', async ({ page }) => {
    await setupNotificationMocks(page);
    await page.goto('/notifications');
    await expect(page.getByTestId('notifications-heading')).toBeVisible({ timeout: 10000 });

    await page.getByTestId('tab-all').click();
    await expect(page.getByTestId('notifications-list')).toBeVisible({ timeout: 5000 });

    // Task notification (navigable) — should have chevron
    const taskItem = page.getByTestId('notification-item-notif-task-assigned');
    await expect(taskItem.locator('span:has-text("chevron_right")')).toBeVisible();

    // Event notification (navigable) — should have chevron
    const eventItem = page.getByTestId('notification-item-notif-event-updated');
    await expect(eventItem.locator('span:has-text("chevron_right")')).toBeVisible();

    // Group member notification (navigable) — should have chevron
    const groupItem = page.getByTestId('notification-item-notif-group-member-joined');
    await expect(groupItem.locator('span:has-text("chevron_right")')).toBeVisible();

    // Daily digest (non-navigable) — should NOT have chevron
    const digestItem = page.getByTestId('notification-item-notif-daily-digest');
    await expect(digestItem.locator('span:has-text("chevron_right")')).not.toBeVisible();
  });
});

test.describe('Notification actions — delete button hiding', () => {
  test('invitation cards do not show delete button', async ({ page }) => {
    await setupNotificationMocks(page);
    await page.goto('/notifications');
    await expect(page.getByTestId('notifications-heading')).toBeVisible({ timeout: 10000 });

    // Switch to Invitations tab where GROUP_INVITATION renders as GroupInvitationCard
    await page.getByTestId('tab-invitations').click();
    await expect(page.getByTestId('notifications-list')).toBeVisible({ timeout: 5000 });

    // GroupInvitationCard should have Accept/Decline but no close/delete button
    const invitationCard = page.getByTestId('invitation-card-notif-group-invitation');
    await expect(invitationCard).toBeVisible();
    await expect(invitationCard.getByTestId('accept-invitation-button')).toBeVisible();
    await expect(invitationCard.getByTestId('decline-invitation-button')).toBeVisible();

    // No close/delete icon button (the icon text "close" should not appear)
    await expect(invitationCard.locator('button:has(span:has-text("close"))')).not.toBeVisible();
  });

  test('regular notifications show delete button on hover', async ({ page }) => {
    await setupNotificationMocks(page);
    await page.goto('/notifications');
    await expect(page.getByTestId('notifications-heading')).toBeVisible({ timeout: 10000 });

    await page.getByTestId('tab-all').click();
    await expect(page.getByTestId('notifications-list')).toBeVisible({ timeout: 5000 });

    // Task notification should have a delete button (visible on hover via CSS)
    const taskItem = page.getByTestId('notification-item-notif-task-assigned');
    const deleteButton = taskItem.locator('button:has(span:has-text("close"))');
    // Button exists in DOM even if opacity-0 before hover
    await expect(deleteButton).toBeAttached();
  });
});

// ── Phase 5.3 — Unread notification badge ──

test.describe('Notification unread badge', () => {
  test('badge shows unread count in sidebar', async ({ page }) => {
    await setupNotificationMocks(page);
    await page.goto('/home');
    await expect(page.getByText(/Good (morning|afternoon|evening)/i)).toBeVisible({ timeout: 10000 });

    const badge = page.getByTestId('notification-badge');
    await expect(badge).toBeVisible();
    await expect(badge).toHaveText('2');
  });

  test('badge is hidden when unread count is 0', async ({ page }) => {
    await page.route('**/api/notifications/unread-count', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { count: 0 } }),
      });
    });
    await page.goto('/home');
    await expect(page.getByText(/Good (morning|afternoon|evening)/i)).toBeVisible({ timeout: 10000 });

    await expect(page.getByTestId('notification-badge')).not.toBeVisible();
  });

  test('badge shows 99+ for large unread counts', async ({ page }) => {
    await page.route('**/api/notifications/unread-count', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { count: 150 } }),
      });
    });
    await page.goto('/home');
    await expect(page.getByText(/Good (morning|afternoon|evening)/i)).toBeVisible({ timeout: 10000 });

    const badge = page.getByTestId('notification-badge');
    await expect(badge).toBeVisible();
    await expect(badge).toHaveText('99+');
  });
});
