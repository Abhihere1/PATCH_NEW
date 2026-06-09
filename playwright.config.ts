import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  use: { baseURL: 'https://patch-new.vercel.app', headless: true },
  timeout: 30000,
  retries: 1,
});
