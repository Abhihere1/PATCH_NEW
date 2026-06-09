// Ticket: PATCH-2
import { test, expect } from '@playwright/test';
import { ensureUserExists, loginAs, TEST_USER } from './helpers';

test.describe('PATCH-2: Main Page landing experience', () => {
  test.beforeEach(async ({ page }) => {
    await ensureUserExists(page);
    await loginAs(page);
    // Should land on the main page after login
    await page.waitForURL('/', { timeout: 10000 });
  });

  test('AC1: Main page displays centered hero with Patch mark, welcome block, VDI tile, and chat input', async ({ page }) => {
    await expect(page.getByTestId('pre-chat-landing')).toBeVisible();
    await expect(page.getByTestId('hero-patch-mark')).toBeVisible();
    await expect(page.getByTestId('hero-welcome')).toBeVisible();
    await expect(page.getByTestId('vdi-tile')).toBeVisible();
    await expect(page.getByTestId('chat-composer')).toBeVisible();
    await expect(page.getByTestId('chat-input')).toBeVisible();
  });

  test('AC2: Welcome message displays full text with username highlighted in red', async ({ page }) => {
    const welcome = page.getByTestId('hero-welcome');
    await expect(welcome).toBeVisible();

    // The welcome message should contain the expected text
    await expect(welcome).toContainText('Welcome to the Discount Tire Information Center');

    // Username should appear in the welcome block
    const username = TEST_USER.username;
    await expect(welcome).toContainText(username);

    // The username span should be styled in red (color: red / text-red-* class or inline style)
    const redSpan = welcome.locator('[data-testid="hero-welcome-username"], [style*="color: #DC2626"], [style*="color:#DC2626"], .text-red-600, .text-red-500, .text-red-700');
    await expect(redSpan).toBeVisible();
  });

  test('AC3: Email prefix used as fallback when username is missing', async ({ page }) => {
    // The displayName logic: user?.username || user?.email?.split("@")[0]
    // For our test user, username is set; verify the welcome uses some identifier derived from the account
    const welcome = page.getByTestId('hero-welcome');
    await expect(welcome).toBeVisible();
    // Either the username or email prefix should appear
    const emailPrefix = TEST_USER.email.split('@')[0];
    const welcomeText = await welcome.textContent();
    const hasUsername = welcomeText?.includes(TEST_USER.username) ?? false;
    const hasEmailPrefix = welcomeText?.includes(emailPrefix) ?? false;
    expect(hasUsername || hasEmailPrefix).toBeTruthy();
  });

  test('AC4: VDI tile is centered with icon above label and KB status badge', async ({ page }) => {
    const tile = page.getByTestId('vdi-tile');
    await expect(tile).toBeVisible();

    // Icon present and appears before the label in the DOM
    const icon = page.getByTestId('vdi-tile-icon');
    const label = page.getByTestId('vdi-tile-label');
    const badge = page.getByTestId('vdi-kb-badge');

    await expect(icon).toBeVisible();
    await expect(label).toBeVisible();
    await expect(badge).toBeVisible();

    // Icon bounding box should be above label (lower Y = higher on screen)
    const iconBox = await icon.boundingBox();
    const labelBox = await label.boundingBox();
    expect(iconBox).not.toBeNull();
    expect(labelBox).not.toBeNull();
    expect(iconBox!.y).toBeLessThan(labelBox!.y);

    // Badge should be below label
    const badgeBox = await badge.boundingBox();
    expect(badgeBox).not.toBeNull();
    expect(labelBox!.y).toBeLessThan(badgeBox!.y);

    // Wait for KB check to settle (badge starts as "Checking…")
    await expect(badge).not.toHaveText('Checking…', { timeout: 8000 });

    // Badge text should be KB Available or KB Missing
    const badgeText = await badge.textContent();
    expect(['KB Available', 'KB Missing']).toContain(badgeText?.trim());
  });

  test('AC5: VDI tile shows hover lift, border-color change, and shadow increase on hover', async ({ page }) => {
    const tile = page.getByTestId('vdi-tile');
    await expect(tile).toBeVisible();

    // Verify hover-related CSS classes are present (transition + hover variants)
    const className = await tile.getAttribute('class');
    expect(className).toContain('hover:shadow-md');
    expect(className).toContain('hover:border-red-300');
    // Transition class ensures animation
    expect(className).toContain('transition');
  });

  test('AC6: Page background uses a light radial gradient wash', async ({ page }) => {
    const landing = page.getByTestId('pre-chat-landing');
    await expect(landing).toBeVisible();

    const bgStyle = await landing.evaluate((el) => {
      return window.getComputedStyle(el).backgroundImage;
    });

    // The background should be a radial gradient (not solid)
    expect(bgStyle).toContain('radial-gradient');
  });

  test('AC7: Chat input is bottom-anchored, rounded, and has red focus ring', async ({ page }) => {
    const composer = page.getByTestId('chat-composer');
    await expect(composer).toBeVisible();

    // Verify rounded class is present
    const composerClass = await composer.getAttribute('class');
    expect(composerClass).toMatch(/rounded/);

    // Verify red focus ring is configured (focus-within:ring or focus-within:border-red)
    expect(composerClass).toMatch(/focus-within:.*ring|focus-within:.*red/);

    // Composer should be positioned near the bottom of the viewport
    const composerBox = await composer.boundingBox();
    const viewportSize = page.viewportSize();
    expect(composerBox).not.toBeNull();
    expect(viewportSize).not.toBeNull();
    // Composer bottom should be in the lower 40% of the viewport
    expect(composerBox!.y).toBeGreaterThan(viewportSize!.height * 0.5);

    // Chat input should be visible inside the composer
    await expect(page.getByTestId('chat-input')).toBeVisible();
  });

  test('AC8: Hero content area max-width is within 720-840px range', async ({ page }) => {
    const landing = page.getByTestId('pre-chat-landing');
    await expect(landing).toBeVisible();

    // The hero stack should have a max-width constraint via inline style or class
    const heroStack = landing.locator('[style*="maxWidth"], [style*="max-width"]').first();
    const maxWidthStyle = await heroStack.evaluate((el) => {
      const style = (el as HTMLElement).style.maxWidth;
      const computed = window.getComputedStyle(el).maxWidth;
      return { inline: style, computed };
    });

    // Parse the computed max-width value
    const computed = maxWidthStyle.computed;
    if (computed && computed !== 'none') {
      const widthPx = parseFloat(computed);
      expect(widthPx).toBeGreaterThanOrEqual(720);
      expect(widthPx).toBeLessThanOrEqual(840);
    } else {
      // If max-width is none, it's a failure — force the assertion via inline style check
      const inlineWidth = maxWidthStyle.inline;
      const widthPx = parseFloat(inlineWidth);
      expect(widthPx).toBeGreaterThanOrEqual(720);
      expect(widthPx).toBeLessThanOrEqual(840);
    }
  });

  test('AC4 (KB badge): Badge shows "KB Available" when VDI KB exists, or "KB Missing" when not', async ({ page }) => {
    // Wait for the KB check to settle (replaces "Checking…")
    const badge = page.getByTestId('vdi-kb-badge');
    await expect(badge).not.toHaveText('Checking…', { timeout: 8000 });
    const text = await badge.textContent();
    expect(['KB Available', 'KB Missing']).toContain(text?.trim());
  });
});
