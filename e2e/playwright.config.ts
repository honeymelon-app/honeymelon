import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for Tauri E2E tests using Remote UI plugin approach.
 *
 * This configuration supports two modes:
 * 1. Remote UI mode (macOS): Tests connect to the Tauri app via the Remote UI plugin
 * 2. Browser mode (CI/Linux): Tests run against the Vite dev server with mocked Tauri APIs
 *
 * See https://playwright.dev/docs/test-configuration
 */

// Remote UI port for Tauri app connection
const REMOTE_UI_PORT = process.env.REMOTE_UI_PORT ?? '9090';

// Check if we're running in Tauri Remote UI mode (macOS with actual Tauri app)
const isRemoteUiMode = process.env.TAURI_REMOTE_UI === 'true';

// Base URL depends on mode
const baseUrl = isRemoteUiMode ? `http://localhost:${REMOTE_UI_PORT}` : 'http://localhost:1420';

export default defineConfig({
  testDir: './tests',
  globalSetup: './tests/global-setup.ts',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Run tests sequentially for consistent state
  reporter: process.env.CI ? 'github' : 'html',
  use: {
    baseURL: baseUrl,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      testMatch: '**/*.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],

  // Configure webServer to start Vite dev server in browser mode
  ...(isRemoteUiMode
    ? {}
    : {
        webServer: {
          command: 'npm run dev -- --host 127.0.0.1 --port 1420 --strictPort',
          url: 'http://localhost:1420',
          reuseExistingServer: !process.env.CI,
          timeout: 120 * 1000,
          env: {
            VITE_E2E_SIMULATION: 'true',
          },
        },
      }),

  timeout: 60000, // 60 seconds per test
  expect: {
    timeout: 10000, // 10 seconds for assertions
  },
});
