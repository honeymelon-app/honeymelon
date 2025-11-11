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

## Structure

```
e2e/
├── playwright.config.ts          # Playwright configuration
├── helpers/                      # Test helper utilities
│   ├── tauri.ts                 # Tauri app launch and control
│   ├── media-fixtures.ts        # Test media file generation
│   └── index.ts                 # Helper exports
├── tests/                        # Test files
│   ├── app-launch.spec.ts       # App initialization tests
│   ├── preset-selection.spec.ts # Preset UI tests
│   ├── conversion-flow.spec.ts  # End-to-end conversion tests
│   ├── settings.spec.ts         # Settings and preferences tests
│   ├── job-queue.spec.ts        # Job queue management tests
│   ├── license.spec.ts          # License activation tests
│   ├── error-handling.spec.ts   # Error handling and recovery tests
│   └── i18n.spec.ts             # Internationalization tests
└── README.md                     # This file
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
npx playwright test e2e/tests/settings.spec.ts
npx playwright test e2e/tests/job-queue.spec.ts
npx playwright test e2e/tests/license.spec.ts
npx playwright test e2e/tests/error-handling.spec.ts
npx playwright test e2e/tests/i18n.spec.ts
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

## Test Coverage

The test suite includes comprehensive coverage of all major features:

### App Launch and Initialization ([app-launch.spec.ts](tests/app-launch.spec.ts))

- Application launch without errors
- Main window display and UI elements
- File drop handling

### Preset Selection ([preset-selection.spec.ts](tests/preset-selection.spec.ts))

- Available presets display
- Capability-based preset filtering
- Preset details display
- Quality tier selection

### Conversion Flow ([conversion-flow.spec.ts](tests/conversion-flow.spec.ts))

- Full conversion workflow (probe → plan → execute)
- Conversion cancellation
- Progress reporting
- Error handling during conversion
- Batch conversion
- Concurrency control

### Settings Management ([settings.spec.ts](tests/settings.spec.ts))

- Settings dialog display
- Output directory configuration
- FFmpeg path configuration
- Settings persistence across restarts
- Default preset and tier configuration
- Concurrency settings
- Theme switching
- Advanced settings (temp directory, hardware acceleration, log level)

### Job Queue Operations ([job-queue.spec.ts](tests/job-queue.spec.ts))

- Adding files to queue
- Batch file addition
- Job removal and clearing
- Job count badges
- Media type filtering
- Job state transitions (queued → probing → planning → running → completed/failed/cancelled)
- Job actions (start, cancel, retry, duplicate)
- Concurrency control and exclusive jobs
- Job persistence across restarts
- Job details and metadata display
- Search and filtering

### License Management ([license.spec.ts](tests/license.spec.ts))

- License activation dialog
- Valid/invalid license key handling
- Network error handling during activation
- Trial mode activation and countdown
- Trial expiration warnings
- License status display
- License validation and revalidation
- Multi-device activation management
- Feature gating based on license status
- License recovery and import/export

### Error Handling ([error-handling.spec.ts](tests/error-handling.spec.ts))

- Invalid file handling (non-media, corrupted, missing, permission errors)
- FFmpeg errors (not found, crash, invalid arguments, missing encoders)
- Disk space errors (insufficient space, disk full, unavailable directories)
- Network errors (capability detection, license validation)
- System resource errors (memory, permissions, CPU/GPU overload)
- Conversion-specific errors (audio-only files, unusual durations/aspect ratios, multiple streams)
- Error recovery and retry functionality
- App stability and crash resilience

### Internationalization ([i18n.spec.ts](tests/i18n.spec.ts))

- Language selection and switching
- Language persistence
- System language detection
- Translation coverage (UI elements, settings, job statuses, errors, presets, dialogs)
- Supported languages (English, French, Spanish, German, Japanese, Chinese, Korean, Russian, Portuguese, etc.)
- Right-to-left (RTL) support (Arabic, Hebrew)
- Fallback and missing translation handling
- Pluralization and interpolation
- Layout adaptation for different text lengths
- Font rendering for different scripts
- Accessibility label translation

## Helper Utilities

The test suite includes helper utilities for common tasks:

### Tauri Helpers ([helpers/tauri.ts](helpers/tauri.ts))

- `launchTauriApp()` - Launch the Tauri app for testing
- `connectToTauriWebView()` - Connect Playwright to the WebView
- `clearAppData()` - Clear app data for clean test state
- `setAppData()` - Pre-populate app data for testing
- `waitFor()` - Wait for conditions
- `simulateFileDrop()` - Simulate file drag-and-drop
- `mockTauriCommands()` - Mock Tauri backend commands

### Media Fixture Helpers ([helpers/media-fixtures.ts](helpers/media-fixtures.ts))

- `createTestVideo()` - Generate test video files with FFmpeg
- `createTestAudio()` - Generate test audio files
- `createTestImage()` - Generate test images
- `createCorruptedVideo()` - Create corrupted files for error testing
- `createLargeVideo()` - Create large files for disk space testing
- `createVideoWithCodec()` - Create files with specific codecs
- `createMultiAudioVideo()` - Create videos with multiple audio tracks
- `createVideoWithSubtitles()` - Create videos with subtitles
- `createTestFixtureSet()` - Create a complete set of test fixtures
- `cleanupFixtures()` - Clean up temporary test files

## Current Implementation Status

The E2E tests are currently set up with:

- ✅ Playwright configuration
- ✅ Comprehensive test file structure (8 test files)
- ✅ Test scaffolding with detailed placeholder tests (200+ test cases)
- ✅ Helper utilities for Tauri app control
- ✅ Media fixture generation with FFmpeg
- ⏳ Tauri WebView connection (helper functions ready, needs Tauri config)
- ⏳ Actual UI interaction tests (scaffolding complete, needs implementation)

The placeholder tests verify that the test infrastructure works correctly and provide a complete blueprint for implementation. To fully implement E2E testing:

1. Configure Tauri to expose a debug port for the WebView
2. Use the helper functions to connect Playwright to the Tauri WebView
3. Replace placeholder test bodies with actual UI interactions using the provided test structure
4. Generate test media files using the media fixture helpers

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
