import { test, expect } from '@playwright/test';

/**
 * Phase 3.4 — Group member management E2E tests.
 *
 * Uses the seeded "Project Alpha" group (web-group-alpha) which has:
 *   - Web Test User (OWNER)
 *   - Alice Chen (MEMBER)
 *   - Bob Kim (MEMBER)
 *
 * Tests run in serial mode because later tests depend on state from earlier ones
 * (e.g., role changes, member removal, invitations).
 */

test.describe('Group member management', () => {
  test.describe.configure({ mode: 'serial' });

  // Navigate to the seeded group's members page
  const SEED_GROUP_PATH = '/groups/web-group-alpha/members';

  test('members page displays all seeded members with correct roles', async ({ page }) => {
    await page.goto(SEED_GROUP_PATH);

    // Wait for members heading to load
    const heading = page.getByTestId('members-heading');
    await expect(heading).toBeVisible({ timeout: 10000 });
    await expect(heading).toContainText('Members');
    await expect(heading).toContainText('3');

    // Members list should be visible
    const membersList = page.getByTestId('members-list');
    await expect(membersList).toBeVisible();

    // Verify all 3 members are displayed (scoped to members list to avoid sidebar matches)
    const list = page.getByTestId('members-list');
    await expect(list.getByText('Web Test User')).toBeVisible();
    await expect(list.getByText('Alice Chen')).toBeVisible();
    await expect(list.getByText('Bob Kim')).toBeVisible();

    // Verify email addresses
    await expect(list.getByText('web@doooo.co')).toBeVisible();
    await expect(list.getByText('web-member-a@doooo.co')).toBeVisible();
    await expect(list.getByText('web-member-b@doooo.co')).toBeVisible();
  });

  test('role badges show correct roles', async ({ page }) => {
    await page.goto(SEED_GROUP_PATH);
    await expect(page.getByTestId('members-heading')).toBeVisible({ timeout: 10000 });

    // Owner badge for web user
    await expect(page.getByText('OWNER')).toBeVisible();

    // Two MEMBER badges for Alice and Bob
    const memberBadges = page.getByText('MEMBER', { exact: true });
    await expect(memberBadges).toHaveCount(2);
  });

  test('owner sees invite button', async ({ page }) => {
    await page.goto(SEED_GROUP_PATH);
    await expect(page.getByTestId('members-heading')).toBeVisible({ timeout: 10000 });

    // Invite button visible for owner
    await expect(page.getByTestId('invite-member-button')).toBeVisible();
  });

  test('owner sees action menus for non-owner members', async ({ page }) => {
    await page.goto(SEED_GROUP_PATH);
    await expect(page.getByTestId('members-heading')).toBeVisible({ timeout: 10000 });

    // Action buttons should exist for Alice and Bob (non-owner members)
    // but NOT for the owner (web test user)
    const actionButtons = page.locator('[data-testid^="member-actions-"]');
    await expect(actionButtons).toHaveCount(2);
  });

  test('action menu shows role change and remove options', async ({ page }) => {
    await page.goto(SEED_GROUP_PATH);
    await expect(page.getByTestId('members-heading')).toBeVisible({ timeout: 10000 });

    // Open action menu for first non-owner member
    const firstActionBtn = page.locator('[data-testid^="member-actions-"]').first();
    await firstActionBtn.click();

    // Should see role change options (Alice is MEMBER, so "Make Admin" and "Make Viewer" should show)
    await expect(page.getByText('Make Admin')).toBeVisible();
    await expect(page.getByText('Make Viewer')).toBeVisible();

    // Should see Remove option
    await expect(page.getByText('Remove from Group')).toBeVisible();

    // "Make Member" should NOT be visible since they're already a member
    await expect(page.getByText('Make Member')).not.toBeVisible();

    // Close menu by clicking outside
    await page.keyboard.press('Escape');
    await page.locator('body').click({ position: { x: 10, y: 10 } });
  });

  test('change member role to ADMIN with confirmation', async ({ page }) => {
    await page.goto(SEED_GROUP_PATH);
    await expect(page.getByTestId('members-heading')).toBeVisible({ timeout: 10000 });

    // Find Alice's action button
    const aliceRow = page.getByText('Alice Chen').locator('..').locator('..');
    const aliceActionBtn = aliceRow.locator('[data-testid^="member-actions-"]');
    await aliceActionBtn.click();

    // Click "Make Admin"
    await page.getByText('Make Admin').click();

    // Confirmation dialog should appear
    await expect(page.getByText('Change Role')).toBeVisible();
    await expect(page.getByText(/Change.*role to.*ADMIN/i)).toBeVisible();

    // Confirm the change
    const apiResponse = page.waitForResponse(
      (resp) => resp.url().includes('/members/') && resp.request().method() === 'PUT',
      { timeout: 10000 },
    );
    await page.getByRole('button', { name: 'Change' }).click();
    await apiResponse;

    // Wait for the role badge to update
    await page.waitForTimeout(500);

    // Alice should now show ADMIN badge
    await expect(page.getByText('ADMIN')).toBeVisible();
  });

  test('change Alice back to MEMBER', async ({ page }) => {
    await page.goto(SEED_GROUP_PATH);
    await expect(page.getByTestId('members-heading')).toBeVisible({ timeout: 10000 });

    // Alice should currently be ADMIN from previous test
    await expect(page.getByText('ADMIN')).toBeVisible();

    // Open Alice's action menu
    const aliceRow = page.getByText('Alice Chen').locator('..').locator('..');
    const aliceActionBtn = aliceRow.locator('[data-testid^="member-actions-"]');
    await aliceActionBtn.click();

    // Click "Make Member"
    await page.getByText('Make Member').click();

    // Confirm
    const apiResponse = page.waitForResponse(
      (resp) => resp.url().includes('/members/') && resp.request().method() === 'PUT',
      { timeout: 10000 },
    );
    await page.getByRole('button', { name: 'Change' }).click();
    await apiResponse;

    await page.waitForTimeout(500);

    // Alice should be MEMBER again
    const memberBadges = page.getByText('MEMBER', { exact: true });
    await expect(memberBadges).toHaveCount(2);
  });

  test('invite modal opens and shows delivery method + role selection', async ({ page }) => {
    await page.goto(SEED_GROUP_PATH);
    await expect(page.getByTestId('members-heading')).toBeVisible({ timeout: 10000 });

    // Click invite button
    await page.getByTestId('invite-member-button').click();

    // Modal should be visible
    await expect(page.getByRole('heading', { name: 'Invite Member' })).toBeVisible();

    // Delivery method options (match by description text to avoid ambiguity)
    await expect(page.getByText('Share invitation code via messaging')).toBeVisible();
    await expect(page.getByText('Send invitation via email')).toBeVisible();
    await expect(page.getByText('Email + code sharing')).toBeVisible();

    // Role options (match by description)
    await expect(page.getByText('Can view and complete tasks')).toBeVisible();
    await expect(page.getByText('Can manage tasks and invite members')).toBeVisible();
    await expect(page.getByText('Can only view tasks (read-only)')).toBeVisible();

    // Info text
    await expect(page.getByText(/invitation will be sent/i)).toBeVisible();
  });

  test('invite modal validates email for EMAIL delivery method', async ({ page }) => {
    await page.goto(SEED_GROUP_PATH);
    await expect(page.getByTestId('members-heading')).toBeVisible({ timeout: 10000 });

    await page.getByTestId('invite-member-button').click();
    await expect(page.getByRole('heading', { name: 'Invite Member' })).toBeVisible();

    // Switch to EMAIL delivery (click the card with the description)
    await page.getByText('Send invitation via email').click();

    // Email input should now be visible
    const emailInput = page.getByPlaceholder('member@example.com');
    await expect(emailInput).toBeVisible();

    // Try to submit without email — button should be disabled
    const sendButton = page.getByRole('button', { name: 'Send', exact: true });
    await expect(sendButton).toBeDisabled();

    // Type invalid email
    await emailInput.fill('not-an-email');
    await sendButton.click();
    await expect(page.getByText(/valid email/i)).toBeVisible();

    // Type already-member email
    await emailInput.fill('web-member-a@doooo.co');
    await sendButton.click();
    await expect(page.getByText(/already a member/i)).toBeVisible();
  });

  test('invite modal closes on X button', async ({ page }) => {
    await page.goto(SEED_GROUP_PATH);
    await expect(page.getByTestId('members-heading')).toBeVisible({ timeout: 10000 });

    await page.getByTestId('invite-member-button').click();
    await expect(page.getByRole('heading', { name: 'Invite Member' })).toBeVisible();

    // Close via X button (the button contains a span with text "close" - the Material Symbol icon name)
    await page.locator('button:has(span.material-symbols-rounded:text("close"))').click();
    await expect(page.getByRole('heading', { name: 'Invite Member' })).not.toBeVisible();
  });

  test('send invitation via LINK delivery creates pending invitation', async ({ page }) => {
    await page.goto(SEED_GROUP_PATH);
    await expect(page.getByTestId('members-heading')).toBeVisible({ timeout: 10000 });

    // No pending invitations section initially
    await expect(page.getByTestId('pending-invitations-section')).not.toBeVisible();

    // Open invite modal
    await page.getByTestId('invite-member-button').click();
    await expect(page.getByRole('heading', { name: 'Invite Member' })).toBeVisible();

    // LINK is default delivery method, select role MEMBER (default)
    // Click Share button
    const apiResponse = page.waitForResponse(
      (resp) => resp.url().includes('/invitations') && resp.request().method() === 'POST',
      { timeout: 10000 },
    );
    await page.getByRole('button', { name: 'Share', exact: true }).click();
    await apiResponse;

    // Wait for modal to close and data to refresh
    await page.waitForTimeout(2500);

    // Pending invitations section should now be visible
    await expect(page.getByTestId('pending-invitations-section')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('PENDING INVITATIONS')).toBeVisible();
  });

  test('cancel pending invitation with confirmation', async ({ page }) => {
    await page.goto(SEED_GROUP_PATH);
    await expect(page.getByTestId('members-heading')).toBeVisible({ timeout: 10000 });

    // Wait for invitations to load
    await expect(page.getByTestId('pending-invitations-section')).toBeVisible({ timeout: 10000 });

    // Click cancel button on the invitation
    await page.getByText('Cancel Invitation').first().click();

    // Confirmation dialog should appear
    await expect(page.getByText(/cancel this invitation/i)).toBeVisible();

    // Confirm cancellation
    const apiResponse = page.waitForResponse(
      (resp) => resp.url().includes('/invitations/') && resp.request().method() === 'DELETE',
      { timeout: 10000 },
    );
    await page.getByRole('button', { name: 'Yes, Cancel' }).click();
    await apiResponse;

    // Wait for refresh
    await page.waitForTimeout(500);

    // Pending invitations section should be gone
    await expect(page.getByTestId('pending-invitations-section')).not.toBeVisible();
  });

  test('no pending invitations section after all invitations cancelled', async ({ page }) => {
    await page.goto(SEED_GROUP_PATH);
    await expect(page.getByTestId('members-heading')).toBeVisible({ timeout: 10000 });

    // Should not see pending invitations
    await expect(page.getByTestId('pending-invitations-section')).not.toBeVisible();
  });
});

test.describe('Group members — navigation from sidebar', () => {
  test('clicking Members nav navigates to members page', async ({ page }) => {
    // Go to the seeded group's tasks page first
    await page.goto('/groups/web-group-alpha/tasks');
    await page.waitForSelector('h1', { timeout: 10000 });

    // Click Members in sidebar
    await page.getByRole('link', { name: /members/i }).click();
    await expect(page).toHaveURL('/groups/web-group-alpha/members');

    // Members heading should be visible
    await expect(page.getByTestId('members-heading')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('members-heading')).toContainText('Members');
  });
});
