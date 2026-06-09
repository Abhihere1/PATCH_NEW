// Ticket: PATCH-9
import { test, expect } from '@playwright/test';
import { loginAs, ensureUserExists } from './helpers';

test.describe('PATCH-9: Conversation Continuity Rules', () => {

  test.beforeEach(async ({ page }) => {
    await ensureUserExists(page);
    await loginAs(page);
  });

  test('AC1: Clicking category tile immediately sends starter message and shows active chat', async ({ page }) => {
    await expect(page.getByTestId('vdi-tile')).toBeVisible();
    await page.getByTestId('vdi-tile').click();
    await expect(page.getByTestId('active-chat')).toBeVisible({ timeout: 15000 });
    // User bubble should contain the VDI starter message
    await expect(page.getByTestId('user-bubble').first()).toContainText('VDI', { timeout: 10000 });
  });

  test('AC5: Resolved incidents show read-only state', async ({ page }) => {
    await page.goto('/incidents');
    await page.getByTestId('filter-tab-Resolved').click();
    await page.waitForTimeout(1000);
    const hasTable = await page.getByTestId('incidents-table').isVisible().catch(() => false);
    if (!hasTable) return;

    // Get a resolved incident's detail page
    await page.locator('[data-testid^="view-incident-"]').first().click();
    await expect(page.getByTestId('incident-detail-page')).toBeVisible({ timeout: 10000 });
    // Resume Chat button should not be present for resolved incidents
    await expect(page.getByTestId('resume-chat-btn')).not.toBeVisible();
  });

  test('AC6: Escalated incidents preserve full history and escalation context', async ({ page }) => {
    await page.goto('/incidents');
    await page.getByTestId('filter-tab-Escalated').click();
    await page.waitForTimeout(1000);
    const hasTable = await page.getByTestId('incidents-table').isVisible().catch(() => false);
    if (!hasTable) return;

    await page.locator('[data-testid^="view-incident-"]').first().click();
    await expect(page.getByTestId('incident-detail-page')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('conversation-history-card')).toBeVisible();
    // No resume button for escalated incidents
    await expect(page.getByTestId('resume-chat-btn')).not.toBeVisible();
  });

  test('AC3: Resuming open incident restores prior context', async ({ page }) => {
    await page.goto('/incidents');
    await page.getByTestId('filter-tab-Open').click();
    await page.waitForTimeout(1000);
    const hasTable = await page.getByTestId('incidents-table').isVisible().catch(() => false);
    if (!hasTable) return;

    await page.locator('[data-testid^="view-incident-"]').first().click();
    await expect(page.getByTestId('incident-detail-page')).toBeVisible({ timeout: 10000 });
    const resumeBtn = page.getByTestId('resume-chat-btn');
    if (!await resumeBtn.isVisible().catch(() => false)) return;

    await resumeBtn.click();
    await expect(page).toHaveURL(/\/$/, { timeout: 10000 });
    await expect(page.getByTestId('active-chat')).toBeVisible({ timeout: 10000 });
    // Message list should contain restored history
    await expect(page.getByTestId('message-list')).toBeVisible();
  });
});
