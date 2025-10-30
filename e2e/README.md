# E2E Testing for Honeymelon

This directory contains end-to-end tests for the Honeymelon application using Playwright.

## Overview

The E2E tests verify the complete application workflow from the user's perspective, including:

- App launch and initialization
- File handling and drag-and-drop
- Preset selection and configuration
- Complete conversion pipeline (probe → plan → execute)
- Error handling and edge cases

## Structure

```
e2e/
├── playwright.config.ts       # Playwright configuration
├── tests/                     # Test files
│   ├── app-launch.spec.ts    # App initialization tests
│   ├── preset-selection.spec.ts # Preset UI tests
│   └── conversion-flow.spec.ts  # End-to-end conversion tests
└── README.md                  # This file
```

## Running Tests

### Prerequisites

1. Install dependencies:

   ```bash
   npm install
   ```

2. Install Playwright browsers:

   ```bash
   npx playwright install
   ```

3. Build the Tauri app (required for E2E tests):
   ```bash
   npm run tauri:build
   ```

### Run All Tests

```bash
npm run test:e2e
```

### Run Tests in UI Mode

```bash
npm run test:e2e:ui
```

### Run Specific Test File

```bash
npx playwright test e2e/tests/app-launch.spec.ts
```

### Debug Tests

```bash
npm run test:e2e:debug
```

## Writing Tests

### Test Structure

Each test file follows this pattern:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test('should do something', async ({ page }) => {
    // Test implementation
  });
});
```

### Best Practices

1. **Use descriptive test names**: Test names should clearly describe what is being tested
2. **One assertion per test**: Keep tests focused on a single behavior
3. **Clean up resources**: Use `afterAll` hooks to clean up spawned processes
4. **Handle timeouts**: Tauri app launch can be slow, adjust timeouts accordingly
5. **Test isolation**: Each test should be independent and not rely on previous test state

### Connecting to Tauri WebView

The current test implementation uses placeholder tests. To connect to the actual Tauri WebView:

1. Launch the Tauri app in development mode
2. Enable remote debugging in the WebView
3. Connect Playwright to the debug port
4. Interact with the UI using Playwright selectors

Example (to be implemented):

```typescript
test('should launch app', async ({ page }) => {
  // Launch Tauri app
  const tauriProcess = spawnTauriDev();

  // Wait for WebView debug port
  await waitForDebugPort(9222);

  // Connect Playwright
  await page.goto('http://localhost:9222');

  // Test UI
  await expect(page.locator('[data-testid="app-title"]')).toBeVisible();

  // Cleanup
  tauriProcess.kill();
});
```

## Current Implementation Status

The E2E tests are currently set up with:

- ✅ Playwright configuration
- ✅ Test file structure
- ✅ Basic test scaffolding
- ⏳ Tauri WebView connection (placeholder)
- ⏳ Actual UI interaction tests (placeholder)

The placeholder tests verify that the test infrastructure works correctly. To fully implement E2E testing:

1. Configure Tauri to expose a debug port for the WebView
2. Implement helper functions to connect Playwright to the Tauri WebView
3. Replace placeholder tests with actual UI interactions
4. Add test fixtures for sample media files

## Troubleshooting

### Tests fail to launch the app

- Ensure the app is built: `npm run tauri:build`
- Check that FFmpeg is installed and accessible
- Verify macOS security settings allow the app to run

### WebView connection fails

- Check that the debug port is not already in use
- Verify the Tauri app is configured to enable remote debugging
- Ensure firewall settings allow localhost connections

### Tests are flaky

- Increase timeout values in `playwright.config.ts`
- Add explicit waits for elements to be visible
- Ensure test isolation by cleaning up state between tests

## Resources

- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Tauri Testing Guide](https://tauri.app/v1/guides/testing/webdriver/introduction)
- [Project CLAUDE.md](../CLAUDE.md) for architecture details
