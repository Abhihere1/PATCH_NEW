// Shared test helpers
import { Page } from '@playwright/test';

export const TEST_USER = {
  username: 'e2etestuser',
  email: 'e2etest@example.com',
  password: 'TestPassword123',
};

export async function loginAs(page: Page, email = TEST_USER.email, password = TEST_USER.password) {
  await page.goto('/login');
  await page.getByTestId('login-email-input').fill(email);
  await page.getByTestId('login-password-input').fill(password);
  await page.getByTestId('login-submit-btn').click();
  // Wait for redirect away from login
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10000 });
}

export async function ensureUserExists(page: Page) {
  // Attempt signup; ignore errors if user already exists
  await page.goto('/signup');
  await page.getByTestId('signup-username-input').fill(TEST_USER.username);
  await page.getByTestId('signup-email-input').fill(TEST_USER.email);
  await page.getByTestId('signup-password-input').fill(TEST_USER.password);
  await page.getByTestId('signup-submit-btn').click();
  // Either redirects to /login (success) or shows error (user exists) — both are fine
  await page.waitForTimeout(2000);
}
