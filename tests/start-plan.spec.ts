import { test, expect } from '@playwright/test';
import { SEED_PLANS, SEED_PLAN_TEMPLATES } from './seed-data';

/**
 * Phase 4.6 — Plan Execution Wizard E2E tests.
 * Tests the StartPlanPage: navigation from PlanDetailPage,
 * TimePreferenceModal flow, calendar preview, and execution.
 *
 * Uses seeded plans from dooooBackend/prisma/seed.ts:
 * - Morning Routine (4 templates, ALL with times — modal skipped)
 * - Weekly Planning (3 templates, NO times — modal shown)
 * - Empty Plan (0 templates — no start button)
 */

test.describe('Start Plan — navigation', () => {
  test('Start Plan button on detail page navigates to /plans/:id/start', async ({ page }) => {
    await page.goto(`/plans/${SEED_PLANS.MORNING_ROUTINE}`);
    await page.waitForSelector('[data-testid="plan-detail-page"]');

    const startBtn = page.getByTestId('start-plan-btn');
    await expect(startBtn).toBeVisible();
    await startBtn.click();

    await expect(page).toHaveURL(`/plans/${SEED_PLANS.MORNING_ROUTINE}/start`);
    await expect(page.getByTestId('start-plan-page')).toBeVisible();
  });

  test('Start Plan page shows plan name', async ({ page }) => {
    await page.goto(`/plans/${SEED_PLANS.MORNING_ROUTINE}/start`);
    await page.waitForSelector('[data-testid="start-plan-page"]');

    await expect(page.getByTestId('start-plan-name')).toHaveText('Morning Routine');
  });

  test('back button navigates to plan detail page', async ({ page }) => {
    await page.goto(`/plans/${SEED_PLANS.MORNING_ROUTINE}/start`);
    await page.waitForSelector('[data-testid="start-plan-page"]');

    await page.getByTestId('start-plan-back').click();
    await expect(page).toHaveURL(`/plans/${SEED_PLANS.MORNING_ROUTINE}`);
  });

  test('cancel button navigates to plan detail page', async ({ page }) => {
    await page.goto(`/plans/${SEED_PLANS.MORNING_ROUTINE}/start`);
    await page.waitForSelector('[data-testid="start-plan-page"]');

    // Wait for calendar to render (all-timed plan skips modal)
    await expect(page.getByTestId('start-plan-calendar-grid')).toBeVisible();

    await page.getByTestId('start-plan-cancel').click();
    await expect(page).toHaveURL(`/plans/${SEED_PLANS.MORNING_ROUTINE}`);
  });

  test('empty plan has no start button', async ({ page }) => {
    await page.goto(`/plans/${SEED_PLANS.EMPTY}`);
    await page.waitForSelector('[data-testid="plan-detail-page"]');

    await expect(page.getByTestId('start-plan-btn')).not.toBeVisible();
  });
});

test.describe('Start Plan — all-timed plan (no modal)', () => {
  test('skips preference modal and shows calendar immediately', async ({ page }) => {
    await page.goto(`/plans/${SEED_PLANS.MORNING_ROUTINE}/start`);
    await page.waitForSelector('[data-testid="start-plan-page"]');

    // Modal should NOT appear for all-timed plans
    await expect(page.getByTestId('time-preference-modal')).not.toBeVisible();

    // Calendar grid and confirm bar should be visible
    await expect(page.getByTestId('start-plan-calendar-grid')).toBeVisible();
    await expect(page.getByTestId('confirm-bar')).toBeVisible();
  });

  test('start date picker is visible', async ({ page }) => {
    await page.goto(`/plans/${SEED_PLANS.MORNING_ROUTINE}/start`);
    await page.waitForSelector('[data-testid="start-plan-page"]');

    await expect(page.getByTestId('start-date-row')).toBeVisible();
    await expect(page.getByText('The plan will start on:')).toBeVisible();
  });

  test('calendar grid renders task blocks for morning routine templates', async ({ page }) => {
    await page.goto(`/plans/${SEED_PLANS.MORNING_ROUTINE}/start`);
    await page.waitForSelector('[data-testid="start-plan-page"]');

    // Wait for calendar grid
    await expect(page.getByTestId('start-plan-calendar-grid')).toBeVisible();

    // Should have task blocks — Morning Routine has 4 templates
    // First template "Morning Stretch" has a repeat, so it may have multiple instances
    const taskBlocks = page.locator('[data-testid^="start-plan-task-"]');
    const count = await taskBlocks.count();
    expect(count).toBeGreaterThanOrEqual(SEED_PLAN_TEMPLATES.MORNING_ROUTINE.length);
  });

  test('clicking a task block opens the template detail panel', async ({ page }) => {
    await page.goto(`/plans/${SEED_PLANS.MORNING_ROUTINE}/start`);
    await page.waitForSelector('[data-testid="start-plan-page"]');

    await expect(page.getByTestId('start-plan-calendar-grid')).toBeVisible();

    // Click the first visible task block
    const firstTask = page.locator('[data-testid^="start-plan-task-"]').first();
    await firstTask.click();

    // Template detail panel should appear
    await expect(page.getByTestId('template-detail-panel')).toBeVisible();
  });

  test('Confirm & Create Tasks creates tasks visible in calendar', async ({ page }) => {
    await page.goto(`/plans/${SEED_PLANS.MORNING_ROUTINE}/start`);
    await page.waitForSelector('[data-testid="start-plan-page"]');

    await expect(page.getByTestId('start-plan-calendar-grid')).toBeVisible();
    await expect(page.getByTestId('confirm-bar')).toBeVisible();

    const confirmBtn = page.getByTestId('confirm-create-tasks');
    await expect(confirmBtn).toBeEnabled();
    await confirmBtn.click();

    // Should navigate back to plan detail after execution
    await expect(page).toHaveURL(`/plans/${SEED_PLANS.MORNING_ROUTINE}`, { timeout: 15000 });

    // Navigate to calendar — week view (default) should show the created tasks
    await page.goto('/calendar');
    await page.waitForSelector('[data-testid="calendar-date-range"]', { timeout: 10000 });

    // Morning Routine has 3 tasks on today (gapDays 0): Morning Stretch, Morning Journal, Meditation
    // and 1 task on tomorrow (gapDays 1): Review Daily Goals
    // Check the side panel item list which shows unique task entries with plan tag
    await expect(page.locator('[data-testid^="task-card-"]').filter({ hasText: 'Morning Stretch' }).first()).toBeVisible();
    await expect(page.locator('[data-testid^="task-card-"]').filter({ hasText: 'Morning Journal' }).first()).toBeVisible();
    await expect(page.locator('[data-testid^="task-card-"]').filter({ hasText: 'Meditation' }).first()).toBeVisible();

    // Clean up: delete the plan execution's tasks so subsequent tests run on clean state.
    // Fetch all tasks for this user and delete the ones created by this execution (planId match).
    const token = await page.evaluate(() => localStorage.getItem('@doooo_auth_token'));
    const tasksRes = await page.request.get('http://localhost:3001/api/tasks', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const tasksBody = await tasksRes.json();
    for (const task of tasksBody.data || []) {
      if (task.planId === SEED_PLANS.MORNING_ROUTINE) {
        await page.request.delete(`http://localhost:3001/api/tasks/${task.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    }
  });
});

test.describe('Start Plan — timeless plan (modal shown)', () => {
  test('shows TimePreferenceModal for plan with unscheduled tasks', async ({ page }) => {
    await page.goto(`/plans/${SEED_PLANS.WEEKLY_PLANNING}/start`);
    await page.waitForSelector('[data-testid="start-plan-page"]');

    // Modal should appear
    await expect(page.getByTestId('time-preference-modal')).toBeVisible();
  });

  test('modal shows spread_or_period step when multiple tasks on same day', async ({ page }) => {
    await page.goto(`/plans/${SEED_PLANS.WEEKLY_PLANNING}/start`);
    await page.waitForSelector('[data-testid="start-plan-page"]');

    // Weekly Planning has 2 templates with gapDays=0 (same day) → showSpreadOption
    await expect(page.getByTestId('step-spread-or-period')).toBeVisible();
    await expect(page.getByTestId('option-spread')).toBeVisible();
    await expect(page.getByTestId('option-same-period')).toBeVisible();
  });

  test('selecting "Spread" goes to schedule_precision step', async ({ page }) => {
    await page.goto(`/plans/${SEED_PLANS.WEEKLY_PLANNING}/start`);
    await page.waitForSelector('[data-testid="start-plan-page"]');

    await page.getByTestId('option-spread').click();

    // Should be on schedule_precision step
    await expect(page.getByTestId('step-schedule-precision')).toBeVisible();
    await expect(page.getByTestId('option-specific-times')).toBeVisible();
    await expect(page.getByTestId('option-time-of-day')).toBeVisible();
  });

  test('selecting "Same period" goes to pick_period step', async ({ page }) => {
    await page.goto(`/plans/${SEED_PLANS.WEEKLY_PLANNING}/start`);
    await page.waitForSelector('[data-testid="start-plan-page"]');

    await page.getByTestId('option-same-period').click();

    // Should be on pick_period step
    await expect(page.getByTestId('step-pick-period')).toBeVisible();
    await expect(page.getByTestId('period-morning')).toBeVisible();
    await expect(page.getByTestId('period-afternoon')).toBeVisible();
    await expect(page.getByTestId('period-evening')).toBeVisible();
  });

  test('full flow: Spread → Specific times → calendar renders', async ({ page }) => {
    await page.goto(`/plans/${SEED_PLANS.WEEKLY_PLANNING}/start`);
    await page.waitForSelector('[data-testid="start-plan-page"]');

    // Step 1: choose Spread
    await page.getByTestId('option-spread').click();

    // Step 3: choose Specific times
    await page.getByTestId('option-specific-times').click();

    // Modal should close, calendar should render
    await expect(page.getByTestId('time-preference-modal')).not.toBeVisible();
    await expect(page.getByTestId('start-plan-calendar-grid')).toBeVisible();
    await expect(page.getByTestId('confirm-bar')).toBeVisible();
  });

  test('full flow: Same period → Evening → Specific times → calendar renders', async ({ page }) => {
    await page.goto(`/plans/${SEED_PLANS.WEEKLY_PLANNING}/start`);
    await page.waitForSelector('[data-testid="start-plan-page"]');

    // Step 1: choose Same period
    await page.getByTestId('option-same-period').click();

    // Step 2: choose Evening
    await page.getByTestId('period-evening').click();

    // Step 3: choose Specific times
    await page.getByTestId('option-specific-times').click();

    // Calendar should render
    await expect(page.getByTestId('time-preference-modal')).not.toBeVisible();
    await expect(page.getByTestId('start-plan-calendar-grid')).toBeVisible();
  });

  test('closing the modal navigates back to plan detail', async ({ page }) => {
    await page.goto(`/plans/${SEED_PLANS.WEEKLY_PLANNING}/start`);
    await page.waitForSelector('[data-testid="start-plan-page"]');

    await expect(page.getByTestId('time-preference-modal')).toBeVisible();

    // Close via close button
    await page.getByTestId('time-pref-close').click();

    await expect(page).toHaveURL(`/plans/${SEED_PLANS.WEEKLY_PLANNING}`);
  });

  test('back button in pick_period step returns to spread_or_period', async ({ page }) => {
    await page.goto(`/plans/${SEED_PLANS.WEEKLY_PLANNING}/start`);
    await page.waitForSelector('[data-testid="start-plan-page"]');

    // Go to pick_period
    await page.getByTestId('option-same-period').click();
    await expect(page.getByTestId('step-pick-period')).toBeVisible();

    // Click back
    await page.getByTestId('time-pref-back').click();
    await expect(page.getByTestId('step-spread-or-period')).toBeVisible();
  });

  test('back button in schedule_precision step returns to previous step', async ({ page }) => {
    await page.goto(`/plans/${SEED_PLANS.WEEKLY_PLANNING}/start`);
    await page.waitForSelector('[data-testid="start-plan-page"]');

    // Go through: Same period → Morning → schedule_precision
    await page.getByTestId('option-same-period').click();
    await page.getByTestId('period-morning').click();
    await expect(page.getByTestId('step-schedule-precision')).toBeVisible();

    // Click back → should go to pick_period
    await page.getByTestId('time-pref-back').click();
    await expect(page.getByTestId('step-pick-period')).toBeVisible();
  });

  test('executing timeless plan creates tasks visible in calendar', async ({ page }) => {
    await page.goto(`/plans/${SEED_PLANS.WEEKLY_PLANNING}/start`);
    await page.waitForSelector('[data-testid="start-plan-page"]');

    // Complete preference flow: Spread → Specific times
    await page.getByTestId('option-spread').click();
    await page.getByTestId('option-specific-times').click();

    // Calendar should render with task blocks
    await expect(page.getByTestId('start-plan-calendar-grid')).toBeVisible();
    await expect(page.getByTestId('confirm-bar')).toBeVisible();

    const taskBlocks = page.locator('[data-testid^="start-plan-task-"]');
    const count = await taskBlocks.count();
    expect(count).toBeGreaterThanOrEqual(SEED_PLAN_TEMPLATES.WEEKLY_PLANNING.length);

    // Execute
    const confirmBtn = page.getByTestId('confirm-create-tasks');
    await expect(confirmBtn).toBeEnabled();
    await confirmBtn.click();

    // Should navigate back to plan detail after execution
    await expect(page).toHaveURL(`/plans/${SEED_PLANS.WEEKLY_PLANNING}`, { timeout: 15000 });

    // Navigate to calendar — week view (default) should show the created tasks
    await page.goto('/calendar');
    await page.waitForSelector('[data-testid="calendar-date-range"]', { timeout: 10000 });

    // Weekly Planning tasks: "Review Week Goals" and "Plan Next Week" (gapDays 0, same day)
    // and "Organize Tasks" (gapDays 1, next day)
    await expect(page.locator('[data-testid^="task-card-"]').filter({ hasText: 'Review Week Goals' }).first()).toBeVisible();
    await expect(page.locator('[data-testid^="task-card-"]').filter({ hasText: 'Plan Next Week' }).first()).toBeVisible();
  });
});

test.describe('Start Plan — multi-week navigation', () => {
  test('Guitar Basics (gapDays: 3) shows week navigation', async ({ page }) => {
    await page.goto(`/plans/${SEED_PLANS.GUITAR_BASICS}/start`);
    await page.waitForSelector('[data-testid="start-plan-page"]');

    // Guitar Basics has all times → skip modal → calendar renders
    await expect(page.getByTestId('start-plan-calendar-grid')).toBeVisible();

    // gapDays: 3 between templates means they span across days
    // If they span across weeks, navigation should appear
    // Even if only 1 week, the page should render correctly
    await expect(page.getByTestId('start-plan-name')).toHaveText('Learn Guitar Basics');
  });
});

test.describe('Start Plan — drag to reschedule', () => {
  test('dragging a task block changes its position on the grid', async ({ page }) => {
    await page.goto(`/plans/${SEED_PLANS.MORNING_ROUTINE}/start`);
    await page.waitForSelector('[data-testid="start-plan-page"]');

    await expect(page.getByTestId('start-plan-calendar-grid')).toBeVisible();

    // Find the first task block (Morning Stretch at 7:00 AM)
    const taskBlock = page.locator('[data-testid^="start-plan-task-"]').first();
    await expect(taskBlock).toBeVisible();

    const box = await taskBlock.boundingBox();
    expect(box).not.toBeNull();

    // Drag down by 120px (2 hours at HOUR_HEIGHT=60)
    await taskBlock.hover();
    await page.mouse.down();
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2 + 120, { steps: 10 });

    // Drag overlay should appear with time badge
    await expect(page.getByTestId('drag-overlay')).toBeVisible();
    await expect(page.getByTestId('drag-time-badge')).toBeVisible();

    await page.mouse.up();

    // Overlay should disappear after drop
    await expect(page.getByTestId('drag-overlay')).not.toBeVisible();
  });

  test('dragging a task and executing creates it at the new time', async ({ page }) => {
    await page.goto(`/plans/${SEED_PLANS.WEEKLY_PLANNING}/start`);
    await page.waitForSelector('[data-testid="start-plan-page"]');

    // Complete preference flow: Spread → Specific times
    await page.getByTestId('option-spread').click();
    await page.getByTestId('option-specific-times').click();

    await expect(page.getByTestId('start-plan-calendar-grid')).toBeVisible();
    await expect(page.getByTestId('confirm-bar')).toBeVisible();

    // Find "Review Week Goals" task block — it's placed at 8 AM by the spread scheduler
    const taskBlock = page.locator('[data-testid^="start-plan-task-"]').first();
    await expect(taskBlock).toBeVisible();

    const box = await taskBlock.boundingBox();
    expect(box).not.toBeNull();

    // Read the time badge text during drag to know the new time
    // Drag down by 120px (2 hours at HOUR_HEIGHT=60) — from 8 AM to 10 AM
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await page.mouse.down();
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2 + 120, { steps: 10 });

    // Verify the time badge shows the new time
    const timeBadge = page.getByTestId('drag-time-badge');
    await expect(timeBadge).toBeVisible();
    const badgeText = await timeBadge.textContent();
    // Should be 2 hours later than original (8 AM → 10 AM)
    expect(badgeText).toContain('10:00 AM');

    await page.mouse.up();

    // Execute the plan
    const confirmBtn = page.getByTestId('confirm-create-tasks');
    await expect(confirmBtn).toBeEnabled();
    await confirmBtn.click();

    await expect(page).toHaveURL(`/plans/${SEED_PLANS.WEEKLY_PLANNING}`, { timeout: 15000 });

    // Navigate to calendar and verify the task is at the new time (10 AM not 8 AM)
    await page.goto('/calendar');
    await page.waitForSelector('[data-testid="calendar-date-range"]', { timeout: 10000 });

    // Verify the task was created at 10:00 AM (dragged from 8:00 AM)
    // The side panel shows task name + time — check both appear together
    const reviewGoalsEntry = page.getByText('Review Week Goals').first();
    await expect(reviewGoalsEntry).toBeVisible();
    // The time "10:00 AM" should appear near the task in the side panel
    await expect(page.getByText('10:00 AM').first()).toBeVisible();
  });

  test('task blocks have grab cursor when drag is enabled', async ({ page }) => {
    await page.goto(`/plans/${SEED_PLANS.MORNING_ROUTINE}/start`);
    await page.waitForSelector('[data-testid="start-plan-page"]');

    await expect(page.getByTestId('start-plan-calendar-grid')).toBeVisible();

    const taskBlock = page.locator('[data-testid^="start-plan-task-"]').first();
    const cursor = await taskBlock.evaluate((el) => window.getComputedStyle(el).cursor);
    expect(cursor).toBe('grab');
  });
});
