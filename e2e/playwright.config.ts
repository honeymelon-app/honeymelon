import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for Tauri E2E tests
 * See https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',
  globalSetup: './tests/global-setup.ts',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Tauri apps should run one at a time
  reporter: process.env.CI ? 'github' : 'html',
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'tauri-macos',
      testMatch: '**/*.spec.ts',
      use: {
        ...devices['Desktop macOS'],
      },
    },
  ],

  timeout: 180000, // generous per-test timeout for Tauri boot + connection
  expect: {
    timeout: 10000, // 10 seconds for assertions
  },
});
