// Ticket: PATCH-1
import { test, expect } from '@playwright/test';
import { TEST_USER, ensureUserExists } from './helpers';

test.describe('PATCH-1: Authentication Login and Signup pages', () => {

  test('AC1: /login shows split-screen layout with branded left panel and form right panel', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByTestId('login-page')).toBeVisible();
    await expect(page.getByTestId('login-left-panel')).toBeVisible();
    await expect(page.getByTestId('login-right-panel')).toBeVisible();
  });

  test('AC2: Left panel shows Patch logo and hero text', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByTestId('patch-logo')).toBeVisible();
    await expect(page.getByTestId('left-panel-title')).toContainText('Discount Tire Information Center');
    await expect(page.getByTestId('left-panel-subtitle')).toContainText('IT support, resolved faster.');
  });

  test('AC3: Login form has Email, Password fields and Sign In button', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByTestId('login-email-input')).toBeVisible();
    await expect(page.getByTestId('login-password-input')).toBeVisible();
    await expect(page.getByTestId('login-submit-btn')).toBeVisible();
    await expect(page.getByTestId('login-submit-btn')).toContainText('Sign In');
  });

  test('AC5: Submitting invalid credentials shows inline error message', async ({ page }) => {
    await page.goto('/login');
    await page.getByTestId('login-email-input').fill('notexist@example.com');
    await page.getByTestId('login-password-input').fill('wrongpassword');
    await page.getByTestId('login-submit-btn').click();
    await expect(page.getByTestId('login-error')).toBeVisible({ timeout: 8000 });
  });

  test('AC6: Clicking signup link navigates to /signup', async ({ page }) => {
    await page.goto('/login');
    await page.getByTestId('signup-link').click();
    await expect(page).toHaveURL(/\/signup/, { timeout: 8000 });
  });

  test('AC7: Signup page has split-screen layout with Username, Email, Password fields and Sign Up button', async ({ page }) => {
    await page.goto('/signup');
    await expect(page.getByTestId('signup-page')).toBeVisible();
    await expect(page.getByTestId('signup-left-panel')).toBeVisible();
    await expect(page.getByTestId('signup-right-panel')).toBeVisible();
    await expect(page.getByTestId('signup-username-input')).toBeVisible();
    await expect(page.getByTestId('signup-email-input')).toBeVisible();
    await expect(page.getByTestId('signup-password-input')).toBeVisible();
    await expect(page.getByTestId('signup-submit-btn')).toContainText('Sign Up');
  });

  test('AC9: Clicking sign in link on signup navigates back to /login', async ({ page }) => {
    await page.goto('/signup');
    await page.getByTestId('login-link').click();
    await expect(page).toHaveURL(/\/login/, { timeout: 8000 });
  });

  test('AC8: Successful signup redirects to /login with success message', async ({ page }) => {
    // Use a unique email each time to avoid duplicate conflicts
    const uniqueEmail = `e2e_${Date.now()}@example.com`;
    await page.goto('/signup');
    await page.getByTestId('signup-username-input').fill('newtestuser');
    await page.getByTestId('signup-email-input').fill(uniqueEmail);
    await page.getByTestId('signup-password-input').fill('TestPassword123');
    await page.getByTestId('signup-submit-btn').click();
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
    await expect(page.getByTestId('signup-success-message')).toBeVisible({ timeout: 5000 });
  });

  test('AC4: Valid credentials log the user in and redirect to /', async ({ page }) => {
    await ensureUserExists(page);
    await page.goto('/login');
    await page.getByTestId('login-email-input').fill(TEST_USER.email);
    await page.getByTestId('login-password-input').fill(TEST_USER.password);
    await page.getByTestId('login-submit-btn').click();
    await expect(page).toHaveURL(/\/$/, { timeout: 10000 });
  });

});
