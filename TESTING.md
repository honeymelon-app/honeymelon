# Testing Guide for Honeymelon

This guide covers all testing strategies and tools used in the Honeymelon project.

## Table of Contents

- [Overview](#overview)
- [Unit Testing](#unit-testing)
- [E2E Testing](#e2e-testing)
- [Pre-commit Hooks](#pre-commit-hooks)
- [Continuous Integration](#continuous-integration)
- [Writing Tests](#writing-tests)
- [Troubleshooting](#troubleshooting)

## Overview

Honeymelon uses a multi-layered testing approach:

1. **Unit Tests**: Test individual functions and components in isolation (Vitest)
2. **E2E Tests**: Test complete user workflows in the full application (Playwright)
3. **Pre-commit Hooks**: Automatically lint and format code before commits (Husky + lint-staged)
4. **Type Checking**: TypeScript and Rust type safety (vue-tsc + cargo)

## Unit Testing

### Technology

- **Framework**: [Vitest](https://vitest.dev/)
- **Environment**: happy-dom (lightweight DOM implementation)
- **Coverage**: v8 provider

### Running Unit Tests

```bash
# Run all unit tests
npm run test:unit

# Run tests in watch mode (auto-rerun on file changes)
npm run test:unit:watch

# Run tests with UI interface
npm run test:unit:ui

# Run tests with coverage report
npm run test:unit:coverage
```

### Test Location

Unit tests are located alongside the code they test:

```
src/
├── lib/
│   ├── ffmpeg-plan.ts
│   └── __tests__/
│       └── ffmpeg-plan.test.ts
├── composables/
│   ├── use-job-orchestrator.ts
│   └── __tests__/
│       └── use-job-orchestrator.test.ts
└── stores/
    ├── jobs.ts
    └── __tests__/
        └── jobs.test.ts
```

### Writing Unit Tests

Example unit test structure:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { planConversion } from '@/lib/ffmpeg-plan';

describe('planConversion', () => {
  it('should choose copy when codec matches', () => {
    const probe = {
      videoCodec: 'h264',
      audioCodec: 'aac',
      // ... other probe data
    };
    const preset = {
      container: 'mp4',
      video: { codec: 'h264' },
      audio: { codec: 'aac' },
      // ... other preset data
    };

    const decision = planConversion(probe, preset);

    expect(decision.isRemux).toBe(true);
    expect(decision.ffmpegArgs).toContain('-c:v copy');
    expect(decision.ffmpegArgs).toContain('-c:a copy');
  });

  it('should transcode when codec does not match', () => {
    const probe = {
      videoCodec: 'vp9',
      audioCodec: 'opus',
      // ... other probe data
    };
    const preset = {
      container: 'mp4',
      video: { codec: 'h264' },
      audio: { codec: 'aac' },
      // ... other preset data
    };

    const decision = planConversion(probe, preset);

    expect(decision.isRemux).toBe(false);
    expect(decision.ffmpegArgs).toContain('-c:v');
    expect(decision.ffmpegArgs).toContain('-c:a');
  });
});
```

### Best Practices

1. **Test behavior, not implementation**: Focus on what functions do, not how they do it
2. **Use descriptive test names**: Test names should clearly explain what is being tested
3. **Mock external dependencies**: Mock Tauri commands, FFmpeg, file system operations
4. **Keep tests isolated**: Each test should be independent
5. **Arrange-Act-Assert**: Structure tests with clear setup, execution, and verification

### Coverage Goals

Current coverage thresholds (configured in `vitest.config.ts`):

- Lines: 80%
- Functions: 80%
- Branches: 80%
- Statements: 80%

Coverage includes:

- `src/lib/**/*.ts` - Core business logic
- `src/composables/**/*.ts` - Vue composables
- `src/stores/**/*.ts` - Pinia stores

Coverage excludes:

- `src/components/ui/**` - Auto-generated shadcn-vue components
- `**/*.config.*` - Configuration files
- `**/types.ts` - Type definitions
- `**/*.d.ts` - Type declaration files

## E2E Testing

### Technology

- **Framework**: [Playwright](https://playwright.dev/)
- **Target**: Tauri desktop application
- **Configuration**: `e2e/playwright.config.ts`

### Running E2E Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run E2E tests with UI mode
npm run test:e2e:ui

# Debug E2E tests (step-by-step execution)
npm run test:e2e:debug
```

### Test Location

E2E tests are located in the `e2e/` directory:

```
e2e/
├── playwright.config.ts          # Playwright configuration
├── tests/
│   ├── app-launch.spec.ts       # App initialization tests
│   ├── preset-selection.spec.ts # Preset UI tests
│   └── conversion-flow.spec.ts  # End-to-end conversion tests
└── README.md                     # E2E testing documentation
```

### Current Implementation Status

The E2E test infrastructure is set up with placeholder tests. The tests verify that the test framework works correctly, but do not yet interact with the actual Tauri WebView.

To fully implement E2E testing:

1. Configure Tauri to expose a debug port for the WebView
2. Implement helper functions to connect Playwright to the Tauri WebView
3. Replace placeholder tests with actual UI interactions
4. Add test fixtures for sample media files

See [e2e/README.md](e2e/README.md) for detailed implementation instructions.

### Writing E2E Tests

Example E2E test structure:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Conversion Flow', () => {
  test('should complete a full conversion', async ({ page }) => {
    // 1. Launch the app and wait for it to be ready
    await launchApp();

    // 2. Add a test media file
    await page.locator('[data-testid="drop-zone"]').click();
    // Simulate file drop...

    // 3. Select a preset
    await page.locator('[data-testid="preset-mp4-h264"]').click();

    // 4. Start conversion
    await page.locator('[data-testid="start-button"]').click();

    // 5. Verify progress updates
    await expect(page.locator('[data-testid="progress-bar"]')).toBeVisible();

    // 6. Wait for completion
    await expect(page.locator('[data-testid="job-status"]')).toHaveText('Completed', {
      timeout: 60000,
    });

    // 7. Verify output file exists
    // Check file system...
  });
});
```

## Pre-commit Hooks

Pre-commit hooks automatically run code quality checks before each commit to catch issues early.

### Technology

- **Git Hooks**: [Husky](https://typicode.github.io/husky/)
- **Staged Files**: [lint-staged](https://github.com/lint-staged/lint-staged)

### Setup

Install pre-commit hooks after cloning the repository:

```bash
npm run prepare
```

This installs git hooks that will run automatically on `git commit`.

### What Runs on Commit

The pre-commit hook runs the following checks on staged files only:

1. **ESLint** on `*.{js,ts,vue,mjs,cjs}` files
   - Auto-fixes issues where possible
   - Blocks commit if unfixable errors remain

2. **Prettier** on `*.{js,ts,vue,json,css,scss,md}` files
   - Auto-formats code
   - Blocks commit if formatting fails

3. **Rust fmt** on `*.rs` files (in `src-tauri/`)
   - Auto-formats Rust code
   - Blocks commit if formatting fails

### Hook Configuration

- `.husky/pre-commit` - Git hook script
- `.lintstagedrc.json` - Staged file processing configuration
- `.pre-commit-config.yaml` - Documentation of available hooks

### Bypassing Hooks

To commit without running hooks (not recommended):

```bash
git commit --no-verify
```

Only bypass hooks when absolutely necessary, such as:

- Committing work-in-progress to a feature branch
- Emergency hotfixes
- Intentionally committing broken code for later fixing

### Manual Linting and Formatting

Run these checks manually without committing:

```bash
# Lint and auto-fix all code
npm run lint:fix

# Format all code
npm run format

# Check formatting without changes
npm run format:check

# Lint JavaScript/TypeScript/Vue
npm run lint:js

# Lint Rust
npm run lint:rust

# Type-check TypeScript
npm run type-check
```

## Continuous Integration

### CI Checks

When CI is configured, it should run:

1. **Linting**:
   - `npm run lint`
   - `npm run format:check`

2. **Type Checking**:
   - `npm run type-check`
   - `cd src-tauri && cargo check`

3. **Unit Tests**:
   - `npm run test:unit`

4. **E2E Tests** (on supported runners):
   - `npm run test:e2e`

5. **Build**:
   - `npm run build`
   - `npm run tauri:build`

### Platform Requirements

- **Unit Tests**: Can run on any platform with Node.js
- **E2E Tests**: Require macOS for Tauri app testing
- **Build**: Require macOS with Xcode for Tauri compilation

## Writing Tests

### General Guidelines

1. **Test user-facing behavior**: Focus on what users experience, not internal implementation
2. **Use data-testid attributes**: Add `data-testid` to UI elements for reliable selectors
3. **Make tests deterministic**: Avoid flaky tests by using proper waits and assertions
4. **Keep tests fast**: Unit tests should run in milliseconds, E2E tests in seconds
5. **Document complex tests**: Add comments explaining non-obvious test logic

### Testing Tauri Commands

When testing code that calls Tauri commands, mock the `@tauri-apps/api` module:

```typescript
import { vi, describe, it, expect } from 'vitest';
import { invoke } from '@tauri-apps/api/core';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

describe('probeMedia', () => {
  it('should call the probe_media command', async () => {
    const mockInvoke = vi.mocked(invoke);
    mockInvoke.mockResolvedValue({
      videoCodec: 'h264',
      audioCodec: 'aac',
      // ... mock probe data
    });

    const result = await probeMedia('/path/to/file.mp4');

    expect(mockInvoke).toHaveBeenCalledWith('probe_media', {
      path: '/path/to/file.mp4',
    });
    expect(result.videoCodec).toBe('h264');
  });
});
```

### Testing Vue Components

Use Vitest's Vue testing utilities:

```typescript
import { mount } from '@vue/test-utils';
import { describe, it, expect } from 'vitest';
import PresetPicker from '@/components/preset-picker.vue';

describe('PresetPicker', () => {
  it('should render available presets', () => {
    const wrapper = mount(PresetPicker, {
      props: {
        presets: [
          { id: 'mp4-h264', name: 'MP4 (H.264)' },
          { id: 'webm-vp9', name: 'WebM (VP9)' },
        ],
      },
    });

    expect(wrapper.text()).toContain('MP4 (H.264)');
    expect(wrapper.text()).toContain('WebM (VP9)');
  });

  it('should emit selection event when preset is clicked', async () => {
    const wrapper = mount(PresetPicker, {
      props: {
        presets: [{ id: 'mp4-h264', name: 'MP4 (H.264)' }],
      },
    });

    await wrapper.find('[data-testid="preset-mp4-h264"]').trigger('click');

    expect(wrapper.emitted('select')).toBeTruthy();
    expect(wrapper.emitted('select')[0]).toEqual(['mp4-h264']);
  });
});
```

## Troubleshooting

### Unit Tests

**Problem**: Tests fail with "Cannot find module '@/...'"

**Solution**: Check that `vitest.config.ts` has the correct path alias configuration:

```typescript
resolve: {
  alias: {
    '@': path.resolve(__dirname, './src'),
  },
}
```

**Problem**: Tests fail with "ReferenceError: window is not defined"

**Solution**: Ensure `environment: 'happy-dom'` is set in `vitest.config.ts`

**Problem**: Coverage reports show 0% coverage

**Solution**: Check that test files are named with `.test.ts` or `.spec.ts` suffix and are located within the coverage include paths

### E2E Tests

**Problem**: Playwright cannot connect to the app

**Solution**:

1. Ensure the app is built: `npm run tauri:build`
2. Check that FFmpeg is installed and accessible
3. Verify macOS security settings allow the app to run

**Problem**: Tests are flaky and sometimes fail

**Solution**:

1. Increase timeout values in `playwright.config.ts`
2. Add explicit waits for elements: `await expect(element).toBeVisible()`
3. Ensure test isolation by cleaning up state between tests

**Problem**: E2E tests fail on CI

**Solution**: E2E tests require macOS runners. Ensure your CI configuration uses macOS images.

### Pre-commit Hooks

**Problem**: Hooks don't run on commit

**Solution**:

1. Run `npm run prepare` to reinstall hooks
2. Check that `.husky/pre-commit` is executable: `chmod +x .husky/pre-commit`
3. Verify that `.git/hooks/pre-commit` exists

**Problem**: Hooks fail with "lint-staged not found"

**Solution**: Ensure dependencies are installed: `npm install`

**Problem**: Rust formatting fails in hook

**Solution**: Ensure `rustfmt` is installed: `rustup component add rustfmt`

### TypeScript

**Problem**: Type errors in test files

**Solution**: Ensure `vitest/globals` types are included in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "types": ["vitest/globals"]
  }
}
```

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Tauri Testing Guide](https://tauri.app/v1/guides/testing/webdriver/introduction)
- [Vue Test Utils](https://test-utils.vuejs.org/)
- [Husky Documentation](https://typicode.github.io/husky/)
- [lint-staged Documentation](https://github.com/lint-staged/lint-staged)

## Contributing

When adding new tests:

1. Follow the existing test structure and naming conventions
2. Add tests for all new features and bug fixes
3. Ensure tests pass before submitting a PR: `npm test`
4. Update this documentation if adding new testing patterns

For more details, see [CONTRIBUTING.md](CONTRIBUTING.md).
