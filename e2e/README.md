# E2E Testing for Honeymelon

This directory contains end-to-end tests for the Honeymelon application using Playwright.

## Overview

The E2E tests verify the complete application workflow from the user's perspective, including:

- App launch and initialization
- File handling and drag-and-drop
- Preset selection and configuration
- Complete conversion pipeline (probe → plan → execute)
- Settings and preferences management
- Job queue operations and state management
- License activation and validation
- Comprehensive error handling and recovery
- Internationalization (i18n) and localization

## Testing Approach

The tests use the **Tauri Remote UI plugin** approach for macOS, which allows Playwright to control the Vue.js UI through a web browser while the Tauri backend continues running. This approach works around macOS's lack of WebDriver support for WKWebView.

### Two Modes of Operation

1. **Remote UI Mode (macOS)**: Tests connect to the actual Tauri app via the Remote UI plugin's WebSocket server. The app serves its UI on a local port (default: 9090), allowing Playwright to interact with it like a web application.

2. **Browser Mode (CI/Linux)**: Tests run against the Vite dev server with mocked Tauri APIs. This enables testing the UI logic without requiring the Tauri backend, useful for CI pipelines or development on non-macOS systems.

## Structure

```
e2e/
├── playwright.config.ts          # Playwright configuration
├── tauri.e2e.conf.json           # Tauri-specific config for E2E
├── helpers/                       # Test helper utilities
│   ├── tauri.ts                  # Tauri mocking and control
│   ├── media-fixtures.ts         # Test media file generation
│   └── index.ts                  # Helper exports
├── tests/                         # Test files
│   ├── fixtures.ts               # Playwright test fixtures
│   ├── global-setup.ts           # Global setup (fixture generation)
│   ├── support/                  # Test support utilities
│   │   └── app-state.ts          # App state helpers (license, etc.)
│   ├── app-launch.spec.ts        # App initialization tests
│   ├── preset-selection.spec.ts  # Preset UI tests
│   ├── conversion-flow.spec.ts   # End-to-end conversion tests
│   ├── settings.spec.ts          # Settings and preferences tests
│   ├── job-queue.spec.ts         # Job queue management tests
│   ├── license.spec.ts           # License activation tests
│   ├── error-handling.spec.ts    # Error handling and recovery tests
│   ├── media-browse.spec.ts      # Picker-based enqueue + image flows
│   └── i18n.spec.ts              # Internationalization tests
└── README.md                      # This file
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

3. (Optional) Install FFmpeg for real media fixture generation:

   ```bash
   # macOS
   brew install ffmpeg

   # Ubuntu/Debian
   apt-get install ffmpeg
   ```

### Browser Mode (Default - works on any platform)

Run tests against the Vite dev server with mocked Tauri APIs:

```bash
npm run test:e2e
```

### Remote UI Mode (macOS only)

To run tests against the actual Tauri app:

1. Build the app with Remote UI enabled:

   ```bash
   PLAYWRIGHT_E2E=true npm run tauri:build
   ```

2. Start the app with Remote UI server:

   ```bash
   PLAYWRIGHT_E2E=true ./path/to/Honeymelon.app/Contents/MacOS/Honeymelon
   ```

3. Run tests in Remote UI mode:

   ```bash
   TAURI_REMOTE_UI=true npm run test:e2e
   ```

### Run Tests in UI Mode

```bash
npm run test:e2e:ui
```

### Run Specific Test File

```bash
npx playwright test -c e2e/playwright.config.ts e2e/tests/app-launch.spec.ts
```

### Debug Tests

```bash
npm run test:e2e:debug
```

## Helper Utilities

The fixtures and helpers under `e2e/helpers` provide a high-level API for testing:

### Test Fixtures ([tests/fixtures.ts](tests/fixtures.ts))

- `initialAppData` option seeds `settings.json`, `jobs.json`, and `license.json`
- Extended `page` fixture handles page setup with Tauri mocks injection
- Automatically injects Tauri API mocks in browser mode

### Tauri Helpers ([helpers/tauri.ts](helpers/tauri.ts))

- `clearAppData()` - Clear app data for clean test state
- `setAppData()` - Pre-populate app data for testing
- `mockTauriCommands()` - Override specific Tauri commands
- `mockCommandError()` - Create mock error responses
- `simulateFileDrop()` - Simulate file drag-and-drop events
- `waitFor()` - Wait for conditions

### Media Fixture Helpers ([helpers/media-fixtures.ts](helpers/media-fixtures.ts))

- `createTestVideo()` - Generate test video files with FFmpeg
- `createTestAudio()` - Generate test audio files
- `createTestImage()` - Generate test images
- `createCorruptedVideo()` - Create corrupted files for error testing
- `createTestFixtureSet()` - Create a complete set of test fixtures

## Writing Tests

### Test Structure

```typescript
import { test, expect } from './fixtures';
import { withLicense } from './support/app-state';

test.use({
  initialAppData: withLicense(),
});

test.describe('Feature Name', () => {
  test('should do something', async ({ page }) => {
    // Wait for app to be ready
    await page.waitForSelector('[data-test="file-dropzone"]', {
      state: 'visible',
      timeout: 30000,
    });

    // Test implementation
    await expect(page.locator('[data-test="app-main"]')).toBeVisible();
  });
});
```

### Best Practices

1. **Use data-test attributes**: Use `[data-test="..."]` selectors for reliable element targeting
2. **Set appropriate timeouts**: The app may take time to initialize, use generous timeouts
3. **Clean test state**: Use `initialAppData` fixture to set up clean state for each test
4. **Test UI feedback**: Focus on visible UI changes (progress bars, status messages) rather than file outputs
5. **Handle async operations**: Use Playwright's built-in waiting mechanisms

### Mocking Tauri Commands

```typescript
import { mockTauriCommands, mockCommandError } from '../helpers/tauri';

test('handles API errors', async ({ page }) => {
  await mockTauriCommands(page, {
    some_command: mockCommandError('Error message', 'error_code'),
  });

  // Trigger the command and verify error handling
  await page.click('[data-test="trigger-button"]');
  await expect(page.locator('[data-test="error-message"]')).toContainText('Error message');
});
```

## Test Coverage

### App Launch ([app-launch.spec.ts](tests/app-launch.spec.ts))

- Primary window visibility and chrome controls
- Drop-zone renders and accepts files

### Preset Selection ([preset-selection.spec.ts](tests/preset-selection.spec.ts))

- Preset dropdowns for queued jobs
- Preset label updates on selection
- Media-type-specific preset filtering

### Conversion Flow ([conversion-flow.spec.ts](tests/conversion-flow.spec.ts))

- Happy-path conversion (queued → running → completed)
- Cancellation during running state
- Error message display on failure
- Batch queue validation

### Settings Controls ([settings.spec.ts](tests/settings.spec.ts))

- Destination chooser dialog
- Custom output folder selection
- Theme toggle

### Job Queue ([job-queue.spec.ts](tests/job-queue.spec.ts))

- Add/remove jobs
- Tab-based filtering
- Start All / Cancel All

### License Management ([license.spec.ts](tests/license.spec.ts))

- First-run activation dialog
- Activation success/failure flows
- Licensed startup bypass

### Internationalization ([i18n.spec.ts](tests/i18n.spec.ts))

- Language switcher
- Locale persistence

### Error Handling ([error-handling.spec.ts](tests/error-handling.spec.ts))

- Failure banners on jobs
- Permission-specific guidance

### Media Browsing ([media-browse.spec.ts](tests/media-browse.spec.ts))

- Audio picker integration
- Image conversion flow

## CI Integration

The tests are designed to run in CI without requiring macOS or the Tauri backend:

```yaml
# Example GitHub Actions workflow
jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run test:e2e
```

For macOS-specific tests that require the actual Tauri backend, use a macOS runner with `TAURI_REMOTE_UI=true`.

## Troubleshooting

### Tests timeout waiting for app

- Ensure the Vite dev server starts correctly
- Check that port 1420 is available
- Increase timeout in `playwright.config.ts` if needed

### Tauri mocks not working

- Tauri mocks are automatically injected by the Playwright `page` fixture; no manual function call is needed
- Check browser console for mock-related error messages

### FFmpeg fixtures fail

- Install FFmpeg on your system
- Tests will use placeholder fixtures if FFmpeg is unavailable

### Tests are flaky

- Add explicit waits for elements to be visible
- Use data-test attributes for stable selectors
- Increase assertion timeouts for slow operations

## Resources

- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Tauri Remote UI Plugin](https://docs.rs/tauri-remote-ui)
- [Tauri Testing Guide](https://v2.tauri.app/develop/tests/)
- [Project CLAUDE.md](../CLAUDE.md) for architecture details
