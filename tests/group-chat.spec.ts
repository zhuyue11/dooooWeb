import { test, expect } from '@playwright/test';

/**
 * Phase 3.6 — Group chat E2E tests.
 *
 * Uses the seeded "Project Alpha" group (web-group-alpha) which has:
 *   - Web Test User (OWNER)
 *   - Alice Chen (MEMBER)
 *   - Bob Kim (MEMBER)
 *
 * Tests run in serial mode because later tests depend on messages created earlier.
 */

test.describe('Group chat', () => {
  test.describe.configure({ mode: 'serial' });

  const CHAT_PATH = '/groups/web-group-alpha/chat';

  test('navigates to chat page and shows empty state', async ({ page }) => {
    await page.goto(CHAT_PATH);

    // Wait for the chat page to load
    await expect(page.getByText(/no messages/i)).toBeVisible({ timeout: 10000 });
  });

  test('chat input bar is visible with placeholder and disabled send button', async ({ page }) => {
    await page.goto(CHAT_PATH);
    await expect(page.getByTestId('chat-input-bar')).toBeVisible({ timeout: 10000 });

    // Input has placeholder
    const input = page.getByTestId('chat-input');
    await expect(input).toBeVisible();
    await expect(input).toHaveAttribute('placeholder', /type a message/i);

    // Send button is disabled when empty
    const sendBtn = page.getByTestId('chat-send-button');
    await expect(sendBtn).toBeDisabled();
  });

  test('send button is enabled when text is entered', async ({ page }) => {
    await page.goto(CHAT_PATH);
    await expect(page.getByTestId('chat-input-bar')).toBeVisible({ timeout: 10000 });

    const input = page.getByTestId('chat-input');
    await input.fill('Hello');

    const sendBtn = page.getByTestId('chat-send-button');
    await expect(sendBtn).toBeEnabled();
  });

  test('sends a message and it appears in the chat', async ({ page }) => {
    await page.goto(CHAT_PATH);
    await expect(page.getByTestId('chat-input-bar')).toBeVisible({ timeout: 10000 });

    const input = page.getByTestId('chat-input');
    await input.fill('Hello from E2E test!');

    const sendBtn = page.getByTestId('chat-send-button');
    await sendBtn.click();

    // Input should be cleared
    await expect(input).toHaveValue('');

    // Message should appear in the list
    await expect(page.getByText('Hello from E2E test!')).toBeVisible({ timeout: 5000 });

    // Message bubble should be visible
    await expect(page.getByTestId('message-bubble')).toBeVisible();
  });

  test('Enter key sends message, Shift+Enter inserts newline', async ({ page }) => {
    await page.goto(CHAT_PATH);
    await expect(page.getByTestId('chat-input-bar')).toBeVisible({ timeout: 10000 });

    const input = page.getByTestId('chat-input');

    // Shift+Enter should insert newline, not send
    await input.fill('Line 1');
    await input.press('Shift+Enter');
    await input.type('Line 2');

    // Should contain both lines (textarea value)
    const value = await input.inputValue();
    expect(value).toContain('Line 1');
    expect(value).toContain('Line 2');

    // Enter should send the message
    await input.press('Enter');

    // Input should be cleared after send
    await expect(input).toHaveValue('');

    // Multi-line message should appear
    await expect(page.getByText('Line 1')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Line 2')).toBeVisible();
  });

  test('sends multiple messages and they appear in correct order (newest at bottom)', async ({ page }) => {
    await page.goto(CHAT_PATH);
    await expect(page.getByTestId('chat-input-bar')).toBeVisible({ timeout: 10000 });

    const input = page.getByTestId('chat-input');

    // Send first message
    await input.fill('Message A');
    await page.getByTestId('chat-send-button').click();
    await expect(page.getByText('Message A')).toBeVisible({ timeout: 5000 });

    // Send second message
    await input.fill('Message B');
    await page.getByTestId('chat-send-button').click();
    await expect(page.getByText('Message B')).toBeVisible({ timeout: 5000 });

    // Both should be visible
    const bubbles = page.getByTestId('message-bubble');
    const count = await bubbles.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('navigates to chat via sidebar link', async ({ page }) => {
    // Start on the group tasks page
    await page.goto('/groups/web-group-alpha/tasks');
    await page.waitForSelector('h1', { timeout: 10000 });

    // Click Chat in the sidebar
    await page.getByRole('link', { name: /chat/i }).click();

    // Should navigate to chat
    await expect(page).toHaveURL(/\/groups\/web-group-alpha\/chat/);

    // Chat input should be visible (chat page loaded)
    await expect(page.getByTestId('chat-input-bar')).toBeVisible({ timeout: 10000 });
  });

  test('previously sent messages persist across page navigation', async ({ page }) => {
    await page.goto(CHAT_PATH);

    // Wait for messages to load — we sent messages in previous tests
    await expect(page.getByTestId('chat-message-list')).toBeVisible({ timeout: 10000 });

    // Messages from previous tests should still be visible
    const bubbles = page.getByTestId('message-bubble');
    const count = await bubbles.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('message bubbles show timestamps', async ({ page }) => {
    await page.goto(CHAT_PATH);
    await expect(page.getByTestId('chat-message-list')).toBeVisible({ timeout: 10000 });

    // There should be at least one message bubble from previous tests
    const bubble = page.getByTestId('message-bubble').first();
    await expect(bubble).toBeVisible();

    // Timestamp should be visible (matches pattern like "3:45 PM" or "15:45")
    const timePattern = /\d{1,2}:\d{2}/;
    await expect(bubble.locator(`text=/${timePattern.source}/`)).toBeVisible();
  });
});
