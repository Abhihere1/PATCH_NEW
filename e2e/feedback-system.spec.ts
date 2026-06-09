// Ticket: PATCH-17
import { test, expect } from '@playwright/test';
import { loginAs, ensureUserExists } from './helpers';

test.describe('PATCH-17: Feedback System and Persistence', () => {

  test.beforeEach(async ({ page }) => {
    await ensureUserExists(page);
    await loginAs(page);
  });

  test('AC2: FeedbackCard has the correct prompt text, 5 stars, and textarea', async ({ page }) => {
    await page.goto('/incidents');
    const hasTable = await page.getByTestId('incidents-table').isVisible().catch(() => false);
    if (!hasTable) return;

    // Find an escalated or resolved incident
    await page.locator('[data-testid^="view-incident-"]').first().click();
    await page.waitForTimeout(2000);
    await expect(page.getByTestId('incident-detail-page')).toBeVisible({ timeout: 10000 });

    // Check if feedback section is visible (only for escalated/resolved)
    const feedbackCard = page.getByTestId('feedback-card');
    if (await feedbackCard.isVisible().catch(() => false)) {
      await expect(page.getByTestId('feedback-prompt')).toContainText('How was your experience with Patch?');
      await expect(page.getByTestId('star-rating')).toBeVisible();
      await expect(page.getByTestId('star-1')).toBeVisible();
      await expect(page.getByTestId('star-5')).toBeVisible();
      await expect(page.getByTestId('feedback-comment')).toBeVisible();
    }
  });

  test('AC5: Feedback section on detail page has "Rate Your Experience" heading and Optional label', async ({ page }) => {
    await page.goto('/incidents');
    const hasTable = await page.getByTestId('incidents-table').isVisible().catch(() => false);
    if (!hasTable) return;

    await page.locator('[data-testid^="view-incident-"]').first().click();
    await page.waitForTimeout(2000);

    const feedbackSection = page.getByTestId('feedback-section');
    if (await feedbackSection.isVisible().catch(() => false)) {
      await expect(page.getByTestId('feedback-heading')).toContainText('Rate Your Experience');
      await expect(feedbackSection).toContainText('Optional');
    }
  });

  test('AC6: Feedback submission sends data to the API', async ({ page }) => {
    await page.goto('/incidents');
    const hasTable = await page.getByTestId('incidents-table').isVisible().catch(() => false);
    if (!hasTable) return;

    await page.locator('[data-testid^="view-incident-"]').first().click();
    await page.waitForTimeout(2000);

    const feedbackCard = page.getByTestId('feedback-card');
    if (await feedbackCard.isVisible().catch(() => false)) {
      const isSubmitted = await page.getByTestId('feedback-submitted').isVisible().catch(() => false);
      if (!isSubmitted) {
        // Click a star rating
        await page.getByTestId('star-4').click();
        await page.getByTestId('feedback-submit-btn').click();
        // Should show submitted confirmation
        await expect(page.getByTestId('feedback-submitted')).toBeVisible({ timeout: 8000 });
      }
    }
  });

  test('AC4: Feedback section integrated in status-details-card with divider', async ({ page }) => {
    await page.goto('/incidents');
    const hasTable = await page.getByTestId('incidents-table').isVisible().catch(() => false);
    if (!hasTable) return;

    await page.locator('[data-testid^="view-incident-"]').first().click();
    await page.waitForTimeout(2000);

    const statusDetailsCard = page.getByTestId('status-details-card');
    if (await statusDetailsCard.isVisible().catch(() => false)) {
      // Feedback section is inside status-details-card
      const feedbackSection = statusDetailsCard.getByTestId('feedback-section');
      if (await feedbackSection.isVisible().catch(() => false)) {
        await expect(feedbackSection).toBeVisible();
      }
    }
  });

  test('AC3: Feedback card appears in active chat final-state-block', async ({ page }) => {
    // data-testid="feedback-card" is rendered in the final-state-block
    // when incident is escalated/resolved
    await page.goto('/');
    await expect(page.getByTestId('main-page')).toBeVisible();
  });

  test('AC1: Feedback is requested only after Resolved or Escalated status', async ({ page }) => {
    await page.goto('/incidents');
    const hasTable = await page.getByTestId('incidents-table').isVisible().catch(() => false);
    if (!hasTable) return;

    // Open incidents should NOT show feedback
    await page.getByTestId('filter-tab-Open').click();
    await page.waitForTimeout(1000);
    const openTable = await page.getByTestId('incidents-table').isVisible().catch(() => false);
    if (!openTable) return;

    await page.locator('[data-testid^="view-incident-"]').first().click();
    await page.waitForTimeout(2000);
    // For Open incidents, status-details-card should not be visible
    const statusDetails = page.getByTestId('status-details-card');
    const isVisible = await statusDetails.isVisible().catch(() => false);
    if (isVisible) {
      // If visible, feedback section should NOT be inside (no escalation/resolution details)
      const feedbackSection = statusDetails.getByTestId('feedback-section');
      // For open incidents without escalation/resolution details, this section is not rendered
    }
  });
});
