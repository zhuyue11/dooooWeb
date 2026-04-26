import { test, expect } from '@playwright/test';
import { SEED_PLANS, SEED_PLAN_TEMPLATES } from './seed-data';

/**
 * Phase 4.4 — Plan detail page (list view) E2E tests.
 * Tests the PlanDetailPage with template list, view toggle,
 * action buttons, empty state, and navigation.
 *
 * Uses seeded plans from dooooBackend/prisma/seed.ts:
 * - Morning Routine (user-owned, 4 templates)
 * - Learn Guitar Basics (AI-generated, 2 templates)
 * - Empty Plan (0 templates)
 */

test.describe('Plan detail — not found', () => {
  test('navigating to invalid plan ID shows not-found state', async ({ page }) => {
    await page.goto('/plans/nonexistent-plan-id-12345');
    await page.waitForSelector('[data-testid="plan-detail-page"]');

    await expect(page.getByText('Plan not found')).toBeVisible();
    await expect(page.getByText('Plan & Course')).toBeVisible();
  });

  test('not-found back link navigates to /plans', async ({ page }) => {
    await page.goto('/plans/nonexistent-plan-id-12345');
    await page.waitForSelector('[data-testid="plan-detail-page"]');

    await page.getByText('Plan & Course').click();
    await expect(page).toHaveURL('/plans');
    await expect(page.getByTestId('plan-list-page')).toBeVisible();
  });
});

test.describe('Plan detail — user-owned plan with templates', () => {
  test('shows plan name and description', async ({ page }) => {
    await page.goto(`/plans/${SEED_PLANS.MORNING_ROUTINE}`);
    await page.waitForSelector('[data-testid="plan-detail-page"]');

    await expect(page.getByTestId('plan-detail-name')).toHaveText('Morning Routine');
    await expect(page.getByText('A productive morning routine to start the day right')).toBeVisible();
  });

  test('back button navigates to /plans', async ({ page }) => {
    await page.goto(`/plans/${SEED_PLANS.MORNING_ROUTINE}`);
    await page.waitForSelector('[data-testid="plan-detail-page"]');

    await page.getByTestId('plan-detail-back').click();
    await expect(page).toHaveURL('/plans');
  });

  test('AI badge does NOT show for non-AI plans', async ({ page }) => {
    await page.goto(`/plans/${SEED_PLANS.MORNING_ROUTINE}`);
    await page.waitForSelector('[data-testid="plan-detail-page"]');

    await expect(page.getByTestId('plan-ai-badge')).not.toBeVisible();
  });

  test('view toggle renders with List active', async ({ page }) => {
    await page.goto(`/plans/${SEED_PLANS.MORNING_ROUTINE}`);
    await page.waitForSelector('[data-testid="plan-detail-page"]');

    await expect(page.getByTestId('view-toggle')).toBeVisible();
    await expect(page.getByTestId('view-toggle-list')).toHaveClass(/bg-primary/);
    await expect(page.getByTestId('view-toggle-calendar')).not.toHaveClass(/bg-primary/);
  });

  test('template list renders all 4 templates with correct order', async ({ page }) => {
    await page.goto(`/plans/${SEED_PLANS.MORNING_ROUTINE}`);
    await page.waitForSelector('[data-testid="plan-detail-page"]');

    const templateList = page.getByTestId('plan-templates-list');
    await expect(templateList).toBeVisible();

    // 4 template items
    const items = page.locator('[data-testid^="plan-template-item-"]');
    await expect(items).toHaveCount(4);

    // Verify template titles in order
    for (let i = 0; i < SEED_PLAN_TEMPLATES.MORNING_ROUTINE.length; i++) {
      const tmpl = SEED_PLAN_TEMPLATES.MORNING_ROUTINE[i];
      const item = page.getByTestId(`plan-template-item-${i}`);
      await expect(item).toBeVisible();
      await expect(item.getByText(tmpl.title)).toBeVisible();

      // Order badge shows correct number
      await expect(item.getByText(`${i + 1}`, { exact: true })).toBeVisible();
    }
  });

  test('template items show time and duration badges', async ({ page }) => {
    await page.goto(`/plans/${SEED_PLANS.MORNING_ROUTINE}`);
    await page.waitForSelector('[data-testid="plan-templates-list"]');

    // First template: Morning Stretch — 7 AM, 10m, has repeat
    const item0 = page.getByTestId('plan-template-item-0');
    await expect(item0.getByText('7 AM')).toBeVisible();
    await expect(item0.getByText('10m')).toBeVisible();

    // Fourth template: Review Daily Goals — 7:45 AM, 10m, +1d gap
    const item3 = page.getByTestId('plan-template-item-3');
    await expect(item3.getByText('7:45 AM')).toBeVisible();
    await expect(item3.getByText('10m')).toBeVisible();
    await expect(item3.getByText('+1d')).toBeVisible();
  });

  test('clicking a template opens detail panel with title and fields', async ({ page }) => {
    await page.goto(`/plans/${SEED_PLANS.MORNING_ROUTINE}`);
    await page.waitForSelector('[data-testid="plan-templates-list"]');

    // Click the first template (Morning Stretch)
    await page.getByTestId('plan-template-item-0').click();

    // Detail panel opens
    const panel = page.getByTestId('template-detail-panel');
    await expect(panel).toBeVisible();

    // Shows template title
    await expect(page.getByTestId('template-detail-title')).toHaveText('Morning Stretch');

    // Shows detail card with time and duration
    const detailCard = page.getByTestId('template-detail-card');
    await expect(detailCard).toBeVisible();
    await expect(detailCard.getByText('7:00 AM')).toBeVisible();
    await expect(detailCard.getByText('10 min')).toBeVisible();
  });

  test('template detail panel closes on close button', async ({ page }) => {
    await page.goto(`/plans/${SEED_PLANS.MORNING_ROUTINE}`);
    await page.waitForSelector('[data-testid="plan-templates-list"]');

    // Open panel
    await page.getByTestId('plan-template-item-0').click();
    await expect(page.getByTestId('template-detail-panel')).toBeVisible();

    // Close via close button
    await page.getByTestId('template-detail-close').click();

    // Panel should be gone after animation
    await expect(page.getByTestId('template-detail-panel')).not.toBeVisible();
  });

  test('template detail panel shows gap days for templates with gaps', async ({ page }) => {
    await page.goto(`/plans/${SEED_PLANS.MORNING_ROUTINE}`);
    await page.waitForSelector('[data-testid="plan-templates-list"]');

    // Click the 4th template (Review Daily Goals, gapDays: 1)
    await page.getByTestId('plan-template-item-3').click();

    const panel = page.getByTestId('template-detail-panel');
    await expect(panel).toBeVisible();
    await expect(page.getByTestId('template-detail-title')).toHaveText('Review Daily Goals');

    // Shows gap days in detail card
    const detailCard = page.getByTestId('template-detail-card');
    await expect(detailCard.getByText('+1 day')).toBeVisible();
  });

  test('Start Plan button visible with correct text', async ({ page }) => {
    await page.goto(`/plans/${SEED_PLANS.MORNING_ROUTINE}`);
    await page.waitForSelector('[data-testid="plan-detail-page"]');

    await expect(page.getByTestId('start-plan-bar')).toBeVisible();
    await expect(page.getByTestId('start-plan-btn')).toBeVisible();
    await expect(page.getByTestId('start-plan-btn')).toContainText('Start Plan');
  });

  test('delete button shows for plan owner', async ({ page }) => {
    await page.goto(`/plans/${SEED_PLANS.MORNING_ROUTINE}`);
    await page.waitForSelector('[data-testid="plan-detail-page"]');

    await expect(page.getByTestId('plan-delete-btn')).toBeVisible();
    await expect(page.getByTestId('plan-remove-btn')).not.toBeVisible();
  });

  test('delete button opens confirm dialog, cancel closes it', async ({ page }) => {
    await page.goto(`/plans/${SEED_PLANS.MORNING_ROUTINE}`);
    await page.waitForSelector('[data-testid="plan-detail-page"]');

    await page.getByTestId('plan-delete-btn').click();

    await expect(page.getByText('Delete Plan')).toBeVisible();
    await expect(page.getByText('Are you sure you want to delete')).toBeVisible();

    await page.getByRole('button', { name: 'Cancel' }).click();

    // Page still visible after cancel
    await expect(page.getByTestId('plan-detail-name')).toHaveText('Morning Routine');
  });

  test('calendar view toggle shows coming soon placeholder', async ({ page }) => {
    await page.goto(`/plans/${SEED_PLANS.MORNING_ROUTINE}`);
    await page.waitForSelector('[data-testid="plan-detail-page"]');

    await page.getByTestId('view-toggle-calendar').click();

    await expect(page.getByTestId('calendar-placeholder')).toBeVisible();
    await expect(page.getByText('Coming Soon')).toBeVisible();

    // Template list should be hidden
    await expect(page.getByTestId('plan-templates-list')).not.toBeVisible();

    // Switch back to list
    await page.getByTestId('view-toggle-list').click();
    await expect(page.getByTestId('plan-templates-list')).toBeVisible();
    await expect(page.getByTestId('calendar-placeholder')).not.toBeVisible();
  });
});

test.describe('Plan detail — AI-generated plan', () => {
  test('AI badge shows for AI-generated plans', async ({ page }) => {
    await page.goto(`/plans/${SEED_PLANS.GUITAR_BASICS}`);
    await page.waitForSelector('[data-testid="plan-detail-page"]');

    await expect(page.getByTestId('plan-ai-badge')).toBeVisible();
    await expect(page.getByTestId('plan-detail-name')).toHaveText('Learn Guitar Basics');
  });

  test('HTML description renders correctly', async ({ page }) => {
    await page.goto(`/plans/${SEED_PLANS.GUITAR_BASICS}`);
    await page.waitForSelector('[data-testid="plan-detail-page"]');

    // The description contains HTML — should be sanitized and rendered
    await expect(page.getByText('AI-generated')).toBeVisible();
  });

  test('template list shows 2 templates with gap days', async ({ page }) => {
    await page.goto(`/plans/${SEED_PLANS.GUITAR_BASICS}`);
    await page.waitForSelector('[data-testid="plan-templates-list"]');

    const items = page.locator('[data-testid^="plan-template-item-"]');
    await expect(items).toHaveCount(2);

    // Second template has +3d gap
    const item1 = page.getByTestId('plan-template-item-1');
    await expect(item1.getByText('First Three Chords')).toBeVisible();
    await expect(item1.getByText('+3d')).toBeVisible();
  });
});

test.describe('Plan detail — empty plan', () => {
  test('shows empty template state', async ({ page }) => {
    await page.goto(`/plans/${SEED_PLANS.EMPTY}`);
    await page.waitForSelector('[data-testid="plan-detail-page"]');

    await expect(page.getByTestId('plan-templates-empty')).toBeVisible();
    await expect(page.getByText('No task templates')).toBeVisible();
    await expect(page.getByText('Add tasks to your plan to get started')).toBeVisible();
  });

  test('view toggle and start plan bar hidden when no templates', async ({ page }) => {
    await page.goto(`/plans/${SEED_PLANS.EMPTY}`);
    await page.waitForSelector('[data-testid="plan-detail-page"]');

    await expect(page.getByTestId('view-toggle')).not.toBeVisible();
    await expect(page.getByTestId('start-plan-bar')).not.toBeVisible();
  });
});

test.describe('Plan detail — navigation from list', () => {
  test('clicking a plan card in list navigates to detail', async ({ page }) => {
    await page.goto('/plans');
    await page.waitForSelector('[data-testid="plan-list-page"]');

    // Click the Morning Routine card
    const card = page.getByTestId(`plan-card-${SEED_PLANS.MORNING_ROUTINE}`);
    await expect(card).toBeVisible();
    await card.click();

    await expect(page).toHaveURL(`/plans/${SEED_PLANS.MORNING_ROUTINE}`);
    await expect(page.getByTestId('plan-detail-name')).toHaveText('Morning Routine');
  });
});
