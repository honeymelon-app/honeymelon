import base from '@playwright/test';

import { clearAppData, setAppData, type AppDataSnapshot } from '../helpers/tauri';
import { createMockConfig, getTauriMockImplementation } from '../helpers/tauri-mocks';

type Fixtures = {
  initialAppData: AppDataSnapshot | undefined;
};

/**
 * Custom Playwright test fixture for Honeymelon E2E tests.
 *
 * This fixture handles:
 * - Setting up initial app data (license, preferences, jobs)
 * - Injecting Tauri API mocks when running in browser-only mode
 * - Navigating to the app URL
 */
export const test = base.extend<Fixtures>({
  initialAppData: [undefined, { option: true }],

  page: async ({ page, initialAppData, baseURL }, use) => {
    // Clear any previous app data for clean state
    await clearAppData();

    // Set up initial app data if provided
    if (initialAppData) {
      await setAppData(initialAppData);
    }

    // Inject Tauri mocks BEFORE navigating - this ensures mocks are available
    // before Vue app initializes
    const isRemoteUiMode = process.env.TAURI_REMOTE_UI === 'true';
    if (!isRemoteUiMode) {
      const mockConfig = createMockConfig(initialAppData);
      const mockImpl = getTauriMockImplementation();

      // Use addInitScript to inject mocks before page loads
      await page.addInitScript(`(${mockImpl})(${JSON.stringify(mockConfig)})`);
    }

    // Navigate to the app
    await page.goto(baseURL ?? 'http://localhost:1420');

    // Wait for the app to be ready
    await page.waitForLoadState('domcontentloaded');

    await use(page);
  },
});

export const expect = test.expect;
