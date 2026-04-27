import { test, expect } from '@playwright/test';
import { SEED_PLANS, waitForDashboardLoad } from './seed-data';

/**
 * Phase 4.11 — Plan execution review + scoring E2E tests.
 *
 * Tests the PlanReviewModal (triggered by plan execution completion)
 * and the PlanExecutionDeleteModal (stop/clear execution from detail page).
 *
 * The review modal flow requires a task toggle to return planExecutionCompleted,
 * which only happens when the last task in a plan execution is completed.
 * We use route interception to mock this response.
 */

test.describe('Plan review modal — via mocked toggle response', () => {
  // Mock the toggle response to include planExecutionCompleted signal
  async function setupToggleMock(page: import('@playwright/test').Page, options?: { existingReview?: boolean }) {
    await page.route('**/api/tasks/*/toggle', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: 'mock-task-id',
            title: 'Mock Task',
            isCompleted: true,
            status: 'completed',
          },
          planExecutionCompleted: {
            planExecutionId: 'mock-exec-id',
            planId: SEED_PLANS.MORNING_ROUTINE,
            planName: 'Morning Routine',
            existingReview: options?.existingReview
              ? { id: 'review-1', userId: 'u1', planId: SEED_PLANS.MORNING_ROUTINE, score: 4, note: 'Great plan!', createdAt: '2026-04-27', updatedAt: '2026-04-27' }
              : null,
          },
        }),
      });
    });
  }

  // Helper: load dashboard and find a toggleable task row
  async function loadDashboardAndGetToggle(page: import('@playwright/test').Page) {
    await waitForDashboardLoad(page);
    // Find a task row with a toggle button (rounded-full button inside task-row)
    const taskRow = page.locator('[data-testid^="task-row-"]').first();
    await expect(taskRow).toBeAttached({ timeout: 5000 });
    const toggle = taskRow.locator('button.rounded-full').first();
    return toggle;
  }

  test('toggling a task that completes a plan shows the review modal', async ({ page }) => {
    await setupToggleMock(page);
    const toggle = await loadDashboardAndGetToggle(page);
    await toggle.click();

    // Review modal should appear
    const modal = page.getByTestId('plan-review-modal');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Check modal content
    await expect(modal.getByText('Plan Complete!')).toBeVisible();
    await expect(modal.getByText(/Morning Routine/)).toBeVisible();
    await expect(modal.getByText('Rate this plan')).toBeVisible();

    // 5 stars should be visible
    const stars = page.getByTestId('plan-review-stars');
    await expect(stars).toBeVisible();
    for (let i = 1; i <= 5; i++) {
      await expect(page.getByTestId(`star-${i}`)).toBeVisible();
    }

    // Submit and skip buttons
    await expect(page.getByTestId('plan-review-submit')).toBeVisible();
    await expect(page.getByTestId('plan-review-skip')).toBeVisible();
  });

  test('submit button is disabled until a star is selected', async ({ page }) => {
    await setupToggleMock(page);
    const toggle = await loadDashboardAndGetToggle(page);
    await toggle.click();

    await page.waitForSelector('[data-testid="plan-review-modal"]', { timeout: 5000 });

    // Submit should be disabled (no stars selected)
    await expect(page.getByTestId('plan-review-submit')).toBeDisabled();

    // Click star 3
    await page.getByTestId('star-3').click();

    // Submit should now be enabled
    await expect(page.getByTestId('plan-review-submit')).toBeEnabled();
  });

  test('clicking skip closes the modal', async ({ page }) => {
    await setupToggleMock(page);
    const toggle = await loadDashboardAndGetToggle(page);
    await toggle.click();

    await page.waitForSelector('[data-testid="plan-review-modal"]', { timeout: 5000 });

    await page.getByTestId('plan-review-skip').click();
    await expect(page.getByTestId('plan-review-modal')).not.toBeVisible();
  });

  test('submitting a review with stars and note calls API and closes modal', async ({ page }) => {
    // Mock the review submission endpoint
    let reviewPayload: unknown = null;
    await page.route('**/api/plans/*/review', (route) => {
      reviewPayload = route.request().postDataJSON();
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { id: 'r1', userId: 'u1', planId: SEED_PLANS.MORNING_ROUTINE, score: 4, note: 'Loved it', createdAt: '2026-04-27', updatedAt: '2026-04-27' },
        }),
      });
    });

    await setupToggleMock(page);
    const toggle = await loadDashboardAndGetToggle(page);
    await toggle.click();

    await page.waitForSelector('[data-testid="plan-review-modal"]', { timeout: 5000 });

    // Select 4 stars
    await page.getByTestId('star-4').click();

    // Type a note
    await page.getByTestId('plan-review-note').fill('Loved it');

    // Submit
    await page.getByTestId('plan-review-submit').click();

    // Modal should close
    await expect(page.getByTestId('plan-review-modal')).not.toBeVisible();

    // Verify the API was called with correct payload
    expect(reviewPayload).toEqual({ score: 4, note: 'Loved it' });
  });

  test('pre-filled update mode shows existing score and note', async ({ page }) => {
    await setupToggleMock(page, { existingReview: true });
    const toggle = await loadDashboardAndGetToggle(page);
    await toggle.click();

    await page.waitForSelector('[data-testid="plan-review-modal"]', { timeout: 5000 });

    // Should show "Update your rating" prompt
    await expect(page.getByText('Update your rating')).toBeVisible();

    // Submit button should say "Update Review"
    await expect(page.getByTestId('plan-review-submit')).toHaveText('Update Review');

    // Note should be pre-filled
    await expect(page.getByTestId('plan-review-note')).toHaveValue('Great plan!');

    // Submit should be enabled (score pre-filled to 4)
    await expect(page.getByTestId('plan-review-submit')).toBeEnabled();
  });
});

test.describe('Plan execution delete modal — plan detail page', () => {
  const MOCK_EXECUTION = {
    id: 'exec-1',
    planId: SEED_PLANS.MORNING_ROUTINE,
    planName: 'Morning Routine',
    planDescription: null,
    isAiGenerated: false,
    status: 'IN_PROGRESS' as const,
    startDate: '2026-04-25',
    completedAt: null,
    createdAt: '2026-04-25',
    completedCount: 2,
    totalCount: 4,
    tasks: [
      { id: 't1', title: 'Task 1', status: 'COMPLETED', isCompleted: true, isRecurring: false, completedInstances: 0, totalOccurrences: null, date: '2026-04-25', hasTime: true, duration: 10, priority: null, categoryId: null, instances: [] },
      { id: 't2', title: 'Task 2', status: 'PENDING', isCompleted: false, isRecurring: false, completedInstances: 0, totalOccurrences: null, date: '2026-04-26', hasTime: true, duration: 15, priority: null, categoryId: null, instances: [] },
    ],
    events: [],
  };

  async function setupExecutionMocks(page: import('@playwright/test').Page) {
    await page.route(`**/api/plans/${SEED_PLANS.MORNING_ROUTINE}`, (route) => {
      if (route.request().method() === 'GET' && !route.request().url().includes('/executions') && !route.request().url().includes('/templates')) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: SEED_PLANS.MORNING_ROUTINE,
              name: 'Morning Routine',
              description: 'A productive morning routine',
              userId: 'web-test-user-id',
              isAiGenerated: false,
              createdAt: '2026-04-01',
              updatedAt: '2026-04-01',
            },
          }),
        });
      } else {
        route.continue();
      }
    });

    await page.route(`**/api/plans/${SEED_PLANS.MORNING_ROUTINE}/executions**`, (route) => {
      if (route.request().url().includes('/executions/exec-1')) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { id: 'exec-1', planId: SEED_PLANS.MORNING_ROUTINE, status: 'IN_PROGRESS' },
          }),
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: [MOCK_EXECUTION] }),
        });
      }
    });

    await page.route(`**/api/plans/${SEED_PLANS.MORNING_ROUTINE}/templates`, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] }),
      });
    });
  }

  test('execution view shows stop/clear button', async ({ page }) => {
    await setupExecutionMocks(page);

    await page.goto(`/plans/${SEED_PLANS.MORNING_ROUTINE}`);
    await page.waitForSelector('[data-testid="plan-detail-page"]', { timeout: 10000 });

    // Should show the execution view
    await expect(page.getByTestId('plan-execution-view')).toBeVisible();

    // Should show the stop button
    const deleteBtn = page.getByTestId('execution-delete-btn');
    await expect(deleteBtn).toBeVisible();
    await expect(deleteBtn).toHaveText(/Stop Plan/);
  });

  test('clicking stop button opens execution delete modal', async ({ page }) => {
    await setupExecutionMocks(page);

    await page.goto(`/plans/${SEED_PLANS.MORNING_ROUTINE}`);
    await page.waitForSelector('[data-testid="plan-detail-page"]', { timeout: 10000 });

    // Click the stop button
    await page.getByTestId('execution-delete-btn').click();

    // Modal should appear
    const modal = page.getByTestId('plan-execution-delete-modal');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Should show Stop Plan title
    await expect(page.getByTestId('execution-delete-title')).toHaveText('Stop Plan');

    // Cancel closes the modal
    await page.getByTestId('execution-delete-cancel').click();
    await expect(modal).not.toBeVisible();
  });
});
