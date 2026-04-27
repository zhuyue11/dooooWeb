import { test, expect } from '@playwright/test';

/**
 * Phase 4.8 — AI Chat conversation UI E2E tests.
 * Tests page structure, input bar behavior, chat history panel,
 * navigation from targets, and Start Over flow.
 *
 * Note: Tests that depend on actual AI streaming responses are limited
 * to UI structure validation since the AI backend may not be available
 * in all test environments.
 */

test.describe('AI Chat — conversation UI', () => {
  test('page renders with header and input bar', async ({ page }) => {
    await page.goto('/ai-chat');

    // Wait for page to load (either loading spinner or the chat page)
    await page.waitForSelector('[data-testid="ai-chat-page"]', { timeout: 10000 });

    // Header buttons
    await expect(page.getByTestId('ai-chat-back')).toBeVisible();
    await expect(page.getByTestId('ai-chat-history-button')).toBeVisible();

    // Input bar
    await expect(page.getByTestId('ai-chat-input-bar')).toBeVisible();
    await expect(page.getByTestId('ai-chat-input')).toBeVisible();
    await expect(page.getByTestId('ai-chat-send-button')).toBeVisible();
  });

  test('send button is disabled when input is empty', async ({ page }) => {
    await page.goto('/ai-chat');
    await page.waitForSelector('[data-testid="ai-chat-page"]', { timeout: 10000 });

    // Wait for loading to finish
    await page.waitForSelector('[data-testid="ai-chat-input-bar"]', { timeout: 10000 });

    const sendButton = page.getByTestId('ai-chat-send-button');
    await expect(sendButton).toBeDisabled();
  });

  test('send button enables when text is entered', async ({ page }) => {
    await page.goto('/ai-chat');
    await page.waitForSelector('[data-testid="ai-chat-input-bar"]', { timeout: 10000 });

    const input = page.getByTestId('ai-chat-input');
    const sendButton = page.getByTestId('ai-chat-send-button');

    // Initially disabled
    await expect(sendButton).toBeDisabled();

    // Type text → enabled
    await input.fill('Hello AI');
    await expect(sendButton).toBeEnabled();

    // Clear → disabled again
    await input.fill('');
    await expect(sendButton).toBeDisabled();
  });

  test('input bar limits to 500 characters', async ({ page }) => {
    await page.goto('/ai-chat');
    await page.waitForSelector('[data-testid="ai-chat-input-bar"]', { timeout: 10000 });

    const input = page.getByTestId('ai-chat-input');
    const longText = 'A'.repeat(600);

    await input.fill(longText);
    const value = await input.inputValue();
    expect(value.length).toBe(500);
  });

  test('Shift+Enter adds newline without sending', async ({ page }) => {
    await page.goto('/ai-chat');
    await page.waitForSelector('[data-testid="ai-chat-input-bar"]', { timeout: 10000 });

    const input = page.getByTestId('ai-chat-input');

    await input.click();
    await input.type('Line 1');
    await page.keyboard.down('Shift');
    await page.keyboard.press('Enter');
    await page.keyboard.up('Shift');
    await input.type('Line 2');

    const value = await input.inputValue();
    expect(value).toContain('Line 1');
    expect(value).toContain('Line 2');
    expect(value).toContain('\n');
  });

  test('chat history panel opens and closes', async ({ page }) => {
    await page.goto('/ai-chat');
    await page.waitForSelector('[data-testid="ai-chat-page"]', { timeout: 10000 });

    // Open history panel
    await page.getByTestId('ai-chat-history-button').click();
    await expect(page.getByTestId('chat-history-panel')).toBeVisible();

    // Verify header content
    const panel = page.getByTestId('chat-history-panel');
    await expect(panel.getByText('Chat History')).toBeVisible();
    await expect(page.getByTestId('chat-history-new-chat')).toBeVisible();
    await expect(page.getByTestId('chat-history-close')).toBeVisible();

    // Close via close button
    await page.getByTestId('chat-history-close').click();
    await expect(page.getByTestId('chat-history-panel')).not.toBeVisible();
  });

  test('chat history panel closes on Escape key', async ({ page }) => {
    await page.goto('/ai-chat');
    await page.waitForSelector('[data-testid="ai-chat-page"]', { timeout: 10000 });

    // Open
    await page.getByTestId('ai-chat-history-button').click();
    await expect(page.getByTestId('chat-history-panel')).toBeVisible();

    // Close via Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300); // animation
    await expect(page.getByTestId('chat-history-panel')).not.toBeVisible();
  });

  test('back button navigates away from AI chat', async ({ page }) => {
    // Navigate to targets first, then AI chat
    await page.goto('/targets');
    await page.waitForSelector('[data-testid="ai-fab"]', { timeout: 10000 });

    await page.goto('/ai-chat');
    await page.waitForSelector('[data-testid="ai-chat-page"]', { timeout: 10000 });

    // Click back
    await page.getByTestId('ai-chat-back').click();

    // Should navigate away from ai-chat
    await expect(page).not.toHaveURL(/\/ai-chat/);
  });

  test('navigates from target detail with URL params', async ({ page }) => {
    // First create a target so we have one to navigate from
    await page.goto('/targets');
    await page.waitForSelector('[data-testid="ai-fab"]', { timeout: 10000 });

    await page.getByTestId('create-target-button').click();
    await expect(page.getByRole('heading', { name: 'New Target' })).toBeVisible({ timeout: 5000 });

    await page.locator('input[maxlength="100"]').fill('AI Chat Test Target');
    await page.getByRole('button', { name: 'Create' }).click();

    // Wait for target card to appear, then click it
    await page.waitForSelector('[data-testid^="target-card-"]', { timeout: 10000 });
    await page.locator('[data-testid^="target-card-"]').first().click();

    // Wait for detail page
    await page.waitForSelector('[data-testid="generate-plan-button"]', { timeout: 10000 });

    // Click "Generate a plan" button
    await page.getByTestId('generate-plan-button').click();

    // Verify URL contains targetId and targetName params
    await expect(page).toHaveURL(/\/ai-chat\?targetId=.+&targetName=/);

    // Page should load
    await page.waitForSelector('[data-testid="ai-chat-page"]', { timeout: 10000 });
  });

  test('message list container is visible', async ({ page }) => {
    await page.goto('/ai-chat');
    await page.waitForSelector('[data-testid="ai-chat-page"]', { timeout: 10000 });

    // Message list container should be visible
    await expect(page.getByTestId('ai-chat-message-list')).toBeVisible();

    // Input bar should be visible and ready for interaction
    await expect(page.getByTestId('ai-chat-input-bar')).toBeVisible();
    await expect(page.getByTestId('ai-chat-input')).toBeVisible();
  });

  test('AI FAB on targets page navigates to AI chat', async ({ page }) => {
    await page.goto('/targets');
    await page.waitForSelector('[data-testid="ai-fab"]', { timeout: 10000 });

    await page.getByTestId('ai-fab').click();
    await expect(page).toHaveURL('/ai-chat');
    await page.waitForSelector('[data-testid="ai-chat-page"]', { timeout: 10000 });
  });

  test('AI FAB on plans page navigates to AI chat', async ({ page }) => {
    await page.goto('/plans');
    await page.waitForSelector('[data-testid="ai-fab"]', { timeout: 10000 });

    await page.getByTestId('ai-fab').click();
    await expect(page).toHaveURL('/ai-chat');
    await page.waitForSelector('[data-testid="ai-chat-page"]', { timeout: 10000 });
  });
});
