import { test, expect } from '@playwright/test';

// These tests run WITHOUT auth state (unauthenticated)
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Login flow', () => {
  test('redirects unauthenticated user to /login', async ({ page }) => {
    await page.goto('/home');
    await expect(page).toHaveURL('/login');
  });

  test('shows login page with OAuth and email buttons', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByText('Welcome to DOOOO')).toBeVisible();
    await expect(page.getByText('Continue with Google')).toBeVisible();
    await expect(page.getByText('Continue with Apple')).toBeVisible();
    await expect(page.getByText('Continue with Email')).toBeVisible();
  });

  test('navigates to email login page', async ({ page }) => {
    await page.goto('/login');
    await page.click('a[href="/login/email"]');

    await expect(page).toHaveURL('/login/email');
    await expect(page.getByText('Sign in with Email')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('shows error on invalid credentials', async ({ page }) => {
    await page.goto('/login/email');

    await page.fill('input[type="email"]', 'wrong@email.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    await expect(page.getByText('Login Failed')).toBeVisible();
    await expect(page).toHaveURL('/login/email');
  });

  test('successful login redirects to dashboard', async ({ page }) => {
    await page.goto('/login/email');

    await page.fill('input[type="email"]', 'test@doooo.co');
    await page.fill('input[type="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/home');
    await expect(page.getByText(/Good (morning|afternoon|evening)/)).toBeVisible();
  });

  test('back to login options link works', async ({ page }) => {
    await page.goto('/login/email');

    await page.click('text=Back to login options');
    await expect(page).toHaveURL('/login');
  });

  test('forgot password link navigates correctly', async ({ page }) => {
    await page.goto('/login/email');

    await page.click('text=Forgot password?');
    await expect(page).toHaveURL('/forgot-password');
    await expect(page.getByText('Reset password')).toBeVisible();
  });

  test('sign up link navigates to register', async ({ page }) => {
    await page.goto('/login/email');

    await page.click('text=Sign up');
    await expect(page).toHaveURL('/register');
    await expect(page.getByText('Create account')).toBeVisible();
  });
});
