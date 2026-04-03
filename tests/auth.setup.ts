import { test as setup, expect } from '@playwright/test';

const AUTH_FILE = 'tests/.auth/user.json';

setup('authenticate', async ({ page }) => {
  // Go to login page
  await page.goto('/login');

  // Click "Continue with Email"
  await page.click('a[href="/login/email"]');
  await expect(page).toHaveURL('/login/email');

  // Fill in credentials (web test user from dooooBackend seed)
  await page.fill('input[type="email"]', 'web@doooo.co');
  await page.fill('input[type="password"]', 'TestPassword123!');

  // Submit
  await page.click('button[type="submit"]');

  // Wait for redirect to dashboard
  await expect(page).toHaveURL('/home');

  // Verify we're authenticated — dashboard greeting should appear
  await expect(page.getByText(/Good (morning|afternoon|evening)/)).toBeVisible();

  // Save auth state (localStorage with token) for reuse in other tests
  await page.context().storageState({ path: AUTH_FILE });
});
