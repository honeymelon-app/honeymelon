---
title: Testing Strategy
description: Learn how Honeymelon approaches unit, integration, and end-to-end testing across the stack.
---

# Testing

Honeymelon has comprehensive test coverage across frontend, backend, and end-to-end scenarios. This guide explains our testing strategy and how to write effective tests.

## Test Structure

```
honeymelon/
├── src/
│   └── **/__tests__/          # Frontend unit tests
├── src-tauri/src/
│   └── **/*.rs               # Rust tests (inline)
└── e2e/
    └── tests/                # E2E tests

```

## Frontend Testing

### Technology

- **Vitest**: Fast, Vite-native test runner
- **@vue/test-utils**: Vue component testing utilities
- **happy-dom**: Lightweight DOM implementation

### Running Tests

```bash
# Run all tests
npm run test:unit

# Watch mode
npm run test:unit:watch

# UI mode
npm run test:unit:ui

# Coverage
npm run test:unit:coverage

```

### Writing Unit Tests

**Test file naming**: `ComponentName.spec.ts` or `function.spec.ts`

**Example - Testing a Function**:

```typescript
// src/lib/__tests__/ffmpeg-plan.spec.ts
import { describe, it, expect } from 'vitest';
import { generatePlan } from '../ffmpeg-plan';

describe('generatePlan', () => {
  it('generates a remux plan for compatible codecs', () => {
    const probe = {
      videoCodec: 'h264',
      audioCodec: 'aac',
    };

    const plan = generatePlan(probe, 'video-to-mp4', 'fast');

    expect(plan.videoAction).toBe('copy');
    expect(plan.audioAction).toBe('copy');
  });

  it('generates a transcode plan for incompatible codecs', () => {
    const probe = {
      videoCodec: 'vp9',
      audioCodec: 'opus',
    };

    const plan = generatePlan(probe, 'video-to-mp4', 'balanced');

    expect(plan.videoAction).toBe('transcode');
    expect(plan.videoCodec).toBe('h264');
    expect(plan.audioAction).toBe('transcode');
    expect(plan.audioCodec).toBe('aac');
  });
});
```

**Example - Testing a Component**:

```typescript
// src/components/__tests__/JobQueueItem.spec.ts
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import JobQueueItem from '../JobQueueItem.vue';

describe('JobQueueItem', () => {
  it('renders queued job', () => {
    const wrapper = mount(JobQueueItem, {
      props: {
        job: {
          id: '1',
          status: 'queued',
          sourceFile: '/path/to/video.mp4',
        },
      },
    });

    expect(wrapper.text()).toContain('video.mp4');
    expect(wrapper.find('[data-testid="job-status"]').text()).toBe('Queued');
  });

  it('displays progress for running job', () => {
    const wrapper = mount(JobQueueItem, {
      props: {
        job: {
          id: '1',
          status: 'running',
          progress: 50,
          fps: 30,
          sourceFile: '/path/to/video.mp4',
        },
      },
    });

    expect(wrapper.find('[data-testid="progress-bar"]').attributes('value')).toBe('50');
    expect(wrapper.text()).toContain('30 fps');
  });
});
```

### Testing Stores

```typescript
// src/stores/__tests__/jobs.spec.ts
import { setActivePinia, createPinia } from 'pinia';
import { describe, it, expect, beforeEach } from 'vitest';
import { useJobsStore } from '../jobs';

describe('Jobs Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('adds a job', () => {
    const store = useJobsStore();
    store.addJob('/file.mp4', 'video-to-mp4', 'balanced');

    expect(store.jobs).toHaveLength(1);
    expect(store.jobs[0].status).toBe('queued');
  });

  it('starts a job', async () => {
    const store = useJobsStore();
    store.addJob('/file.mp4', 'video-to-mp4', 'balanced');

    await store.startJob(store.jobs[0].id);

    expect(store.jobs[0].status).toBe('probing');
  });
});
```

## Backend Testing

### Running Rust Tests

```bash
cd src-tauri
cargo test

```

**With output**:

```bash
cargo test -- --nocapture

```

**Specific test**:

```bash
cargo test test_name

```

### Writing Rust Tests

**Unit Tests (inline)**:

```rust
// src-tauri/src/ffmpeg_probe.rs
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_duration() {
        let json = r#"{"format": {"duration": "123.45"}}"#;
        let result = parse_ffprobe_output(json).unwrap();
        assert_eq!(result.duration, 123.45);
    }

    #[test]
    fn test_parse_video_codec() {
        let json = r#"{"streams": [{"codec_type": "video", "codec_name": "h264"}]}"#;
        let result = parse_ffprobe_output(json).unwrap();
        assert_eq!(result.video_codec, Some("h264".to_string()));
    }

    #[test]
    #[should_panic(expected = "invalid JSON")]
    fn test_invalid_json() {
        parse_ffprobe_output("not json").unwrap();
    }
}

```

**Async Tests**:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_probe_media() {
        let result = probe_media("test_files/sample.mp4").await;
        assert!(result.is_ok());

        let probe = result.unwrap();
        assert!(probe.duration > 0.0);
    }

    #[tokio::test]
    async fn test_probe_nonexistent_file() {
        let result = probe_media("nonexistent.mp4").await;
        assert!(result.is_err());
    }
}

```

**Integration Tests**:

```rust
// src-tauri/tests/integration_test.rs
use honeymelon::ffmpeg_runner::convert_file;

#[tokio::test]
async fn test_full_conversion() {
    let input = "test_files/input.mp4";
    let output = "/tmp/output.mp4";

    let result = convert_file(input, output).await;

    assert!(result.is_ok());
    assert!(std::path::Path::new(output).exists());

    // Cleanup
    std::fs::remove_file(output).ok();
}

```

### Test Coverage

**Generate coverage report**:

```bash
cargo install cargo-tarpaulin
cargo tarpaulin --out Html

```

## End-to-End Testing

### Technology

- **Playwright**: Cross-browser testing
- **TypeScript**: Type-safe test scripts

### Running E2E Tests

```bash
# Run all E2E tests
npm run test:e2e

# UI mode (interactive)
npm run test:e2e:ui

# Debug mode
npm run test:e2e:debug

# Specific test
npx playwright test -c e2e/playwright.config.ts conversion.spec.ts

```

### Writing E2E Tests

**Test file naming**: `feature-name.spec.ts` in `e2e/tests/`

**Example**:

```typescript
// e2e/tests/conversion.spec.ts
import { test, expect } from '@playwright/test';
import { _electron as electron } from 'playwright';

test.describe('File Conversion', () => {
  test('converts a video file', async () => {
    const app = await electron.launch({
      args: ['.'],
    });

    const window = await app.firstWindow();

    // Add a file
    await window.click('[data-testid="add-file"]');
    // File picker interaction...

    // Select preset
    await window.selectOption('[data-testid="preset-select"]', 'video-to-mp4');

    // Start conversion
    await window.click('[data-testid="start-button"]');

    // Wait for completion
    await window.waitForSelector('[data-testid="job-completed"]', {
      timeout: 60000,
    });

    // Verify output
    const statusText = await window.textContent('[data-testid="job-status"]');
    expect(statusText).toBe('Completed');

    await app.close();
  });

  test('handles conversion error', async () => {
    const app = await electron.launch({ args: ['.'] });
    const window = await app.firstWindow();

    // Add an invalid file
    // ... trigger error

    // Verify error message
    await window.waitForSelector('[data-testid="job-failed"]');
    const errorText = await window.textContent('[data-testid="error-message"]');
    expect(errorText).toContain('Error');

    await app.close();
  });
});
```

### Test Utilities

```typescript
// e2e/utils/helpers.ts
export async function addFile(window: Page, filePath: string) {
  await window.click('[data-testid="add-file"]');
  // Handle file picker
}

export async function waitForJobCompletion(window: Page, jobId: string) {
  await window.waitForSelector(`[data-job-id="${jobId}"][data-status="completed"]`, {
    timeout: 120000,
  });
}
```

## Test Data

### Test Files

Store test media files in `test_files/`:

```

test_files/
├── small.mp4         # 1 second, 640x480
├── sample.mkv        # 5 seconds, 1920x1080
└── audio.m4a         # Audio-only file

```

### Generating Test Files

```bash
# Create a small test video
ffmpeg -f lavfi -i testsrc=duration=1:size=640x480:rate=30 \
  -f lavfi -i sine=frequency=1000:duration=1 \
  -pix_fmt yuv420p test_files/small.mp4

```

## Mocking

### Mocking FFmpeg

For unit tests, mock FFmpeg interactions:

```typescript
import { vi } from 'vitest';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn((command, args) => {
    if (command === 'probe_media') {
      return Promise.resolve({
        duration: 10.5,
        videoCodec: 'h264',
        audioCodec: 'aac',
      });
    }
  }),
}));
```

### Mocking Tauri Events

```typescript
vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn((event, callback) => {
    if (event === 'ffmpeg://progress') {
      // Simulate progress updates
      setTimeout(() => callback({ payload: { progress: 50 } }), 100);
    }
    return Promise.resolve(() => {});
  }),
}));
```

## Continuous Integration

### GitHub Actions

**.github/workflows/test.yml**:

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: macos-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Setup Rust
        uses: actions-rs/toolchain@v1
        with:
          toolchain: stable

      - name: Install dependencies
        run: npm install

      - name: Run frontend tests
        run: npm run test:unit -- --coverage

      - name: Run backend tests
        run: cd src-tauri && cargo test

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

## Test Best Practices

### 1. Test Behavior, Not Implementation

```typescript
// Bad: Testing implementation
expect(store._internalState).toBe('running');

// Good: Testing behavior
expect(store.isRunning).toBe(true);
```

### 2. Use Descriptive Test Names

```typescript
// Bad
it('works', () => {});

// Good
it('generates remux plan when codecs are compatible', () => {});
```

### 3. Arrange-Act-Assert Pattern

```typescript
it('updates job progress', () => {
  // Arrange
  const store = useJobsStore();
  store.addJob('/file.mp4', 'video-to-mp4', 'balanced');

  // Act
  store.updateJobProgress(store.jobs[0].id, 50);

  // Assert
  expect(store.jobs[0].progress).toBe(50);
});
```

### 4. Test Edge Cases

```typescript
it('handles empty file path', () => {
  expect(() => validateFilePath('')).toThrow('Invalid path');
});

it('handles very long file names', () => {
  const longName = 'a'.repeat(1000) + '.mp4';
  expect(validateFilePath(longName)).toBe(true);
});
```

### 5. Keep Tests Isolated

```typescript
beforeEach(() => {
  // Reset state before each test
  setActivePinia(createPinia());
});

afterEach(() => {
  // Clean up after each test
  vi.clearAllMocks();
});
```

## Debugging Tests

### Vitest UI

```bash
npm run test:unit:ui

```

Opens interactive UI for debugging tests.

### VS Code Debugging

**.vscode/launch.json**:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Vitest",
  "runtimeExecutable": "npm",
  "runtimeArgs": ["run", "test:unit"],
  "console": "integratedTerminal"
}
```

### Rust Test Debugging

```bash
RUST_BACKTRACE=1 cargo test
```

## Coverage Goals

- **Frontend**: 80%+ coverage
- **Backend**: 85%+ coverage (currently 108 tests)
- **E2E**: Critical user workflows

## Next Steps

- Read [Contributing Guidelines](/development/contributing)
- Set up [Development Environment](/development/building)
- Understand the [Architecture](/architecture/overview)
