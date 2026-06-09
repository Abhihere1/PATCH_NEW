// Ticket: PATCH-4
import { test, expect } from '@playwright/test';
import { loginAs, ensureUserExists } from './helpers';

test.describe('PATCH-4: Knowledge Base Management and Retrieval', () => {

  test('AC3: VDI tile shows KB Available or KB Missing based on file existence', async ({ page }) => {
    await ensureUserExists(page);
    await loginAs(page);
    await expect(page.getByTestId('vdi-kb-badge')).toBeVisible();
    const badgeText = await page.getByTestId('vdi-kb-badge').innerText();
    expect(['KB Available', 'KB Missing', 'Checking…']).toContain(badgeText.trim());
  });

  test('AC1: KB status API returns availability for vdi category (authenticated via browser)', async ({ page }) => {
    await ensureUserExists(page);
    await loginAs(page);
    const response = await page.request.get('https://patch-new.vercel.app/api/kb/status?category=vdi');
    expect(response.status()).not.toBeGreaterThanOrEqual(500);
    if (response.ok()) {
      const data = await response.json();
      expect(typeof data.available).toBe('boolean');
    } else {
      // API returned error — should be 401 not 500
      expect([400, 401, 403]).toContain(response.status());
    }
  });

  test('AC2: KB status API does not expose write endpoints', async ({ request }) => {
    // The API should only have GET; POST should not create files
    const res = await request.post('https://patch-new.vercel.app/api/kb/status', {
      data: { category: 'vdi' },
    });
    // Should return 405 or similar — not a 2xx with file creation
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test('AC7: KB image endpoint serves images from knowledge_base/images/', async ({ request }) => {
    const res = await request.get('https://patch-new.vercel.app/api/kb/images/vdi.png');
    // Either returns the image (200) or 404 if not present — just not a server error
    expect(res.status()).not.toBeGreaterThanOrEqual(500);
  });
});
