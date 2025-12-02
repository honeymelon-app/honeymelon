# FFmpeg Pipeline Tests

This document describes Honeymelon's FFmpeg pipeline test infrastructure, including the test media corpus, the regression test harness, and how these are integrated into CI.

## Overview

The FFmpeg pipeline test system ensures that:

1. **Normal media files** are probed and converted successfully
2. **Edge cases** (vertical video, audio-only, etc.) are handled correctly
3. **Known-bad files** (corrupted, truncated, fake) fail gracefully with proper error classification
4. **No panics or unwrapped errors** escape to the user

## Test Media Corpus

Test media files are located in `test-media/` at the repository root:

```
test-media/
├── normal/                    # Standard files that should work
│   ├── h264_aac_1080p.mp4    # H.264 + AAC, 1080p
│   ├── h264_aac_4k.mp4       # H.264 + AAC, 4K
│   ├── hevc_720p.mp4         # HEVC/H.265, 720p
│   ├── vp9_opus.webm         # VP9 + Opus, WebM
│   ├── audio_stereo.mp3      # MP3 audio
│   ├── audio_lossless.flac   # FLAC audio
│   ├── audio_pcm.wav         # WAV audio
│   ├── image_test.png        # PNG image
│   ├── image_photo.jpg       # JPEG image
│   └── image_web.webp        # WebP image
├── edge-cases/               # Unusual but valid files
│   ├── video_no_audio.mp4    # Video-only (no audio track)
│   ├── vertical_video.mp4    # Portrait orientation (720x1280)
│   ├── square_video.mp4      # Square aspect ratio (500x500)
│   └── audio_only.m4a        # Audio-only M4A
└── known-bad/                # Files that should fail gracefully
    ├── zero_bytes.mp4        # Empty file (0 bytes)
    ├── random_data.mp4       # Random binary data
    ├── truncated.mp4         # Truncated MP4 file
    └── text_as_mp4.mp4       # Plain text renamed as .mp4
```

### Generating Test Media

Test media files are generated using FFmpeg's test sources. To regenerate them:

```bash
# From repository root
npm run download-ffmpeg  # Ensure FFmpeg is available

# Generate normal files
src-tauri/bin/ffmpeg -y -f lavfi -i "testsrc=duration=1:size=1920x1080:rate=30" \
  -f lavfi -i "sine=frequency=440:duration=1" \
  -c:v libx264 -preset ultrafast -crf 28 \
  -c:a aac -b:a 64k \
  test-media/normal/h264_aac_1080p.mp4

# See test-media generation commands in src-tauri/tests/ffmpeg_pipeline.rs
```

## Running Tests Locally

### Prerequisites

1. Install Node.js dependencies:

   ```bash
   npm ci
   ```

2. Download FFmpeg binaries:

   ```bash
   npm run download-ffmpeg
   ```

3. Verify FFmpeg is working:
   ```bash
   src-tauri/bin/ffmpeg -version
   src-tauri/bin/ffprobe -version
   ```

### Running All Rust Tests

```bash
cd src-tauri
cargo test --all-features
```

### Running FFmpeg Pipeline Tests Specifically

```bash
cd src-tauri

# Run all pipeline tests with output
cargo test --test ffmpeg_pipeline -- --nocapture

# Run specific test categories
cargo test --test ffmpeg_pipeline normal -- --nocapture      # Normal files
cargo test --test ffmpeg_pipeline edge_case -- --nocapture   # Edge cases
cargo test --test ffmpeg_pipeline known_bad -- --nocapture   # Known-bad files
cargo test --test ffmpeg_pipeline full_pipeline -- --nocapture  # End-to-end test
```

### Test Output

When tests pass, you'll see output like:

```
 Testing: normal/h264_aac_1080p.mp4
  [OK] Probe OK: 1920x1080, 1.00s, video=h264, audio=aac

 Testing: known-bad/random_data.mp4
  [OK] Failed gracefully as expected

 Full Pipeline Test: probe > convert > validate
  Step 1: Probing input...
    [OK] Probe OK: 1920x1080, 1.00s
  Step 2: Validating input streams...
    [OK] Input has video and audio
  Step 3: Converting (transcode)...
    [OK] Conversion completed: 67179 bytes
  Step 4: Validating output...
    [OK] Output validated: 1920x1080, 1.02s

   Full pipeline test PASSED

test result: ok. 16 passed; 0 failed
```

## CI Integration

### Main CI Workflow (`.github/workflows/ci.yml`)

The `rust-check` job runs on every PR and push to `main`/`develop`:

1. **Download FFmpeg binaries** via `npm run download-ffmpeg`
2. **Verify FFmpeg binaries** are present and executable
3. **Run Clippy** for Rust linting
4. **Run Rust unit tests** (`cargo test --lib`)
5. **Run Rust integration tests** (`cargo test --tests`)
6. **Run FFmpeg pipeline regression tests** (`cargo test --test ffmpeg_pipeline`)

If any step fails, the entire CI fails and blocks the PR.

### Release Workflow (`.github/workflows/release.yml`)

The `pre-release-checks` job runs before any release build:

1. All linting and formatting checks
2. Frontend tests with coverage
3. Rust tests including **FFmpeg pipeline regression tests**
4. FFmpeg binary verification

If pipeline tests fail, the release is blocked.

### Where to Find Failures

If FFmpeg pipeline tests fail in CI:

1. **GitHub Actions** > Click the failed job
2. Look for the step **"Run FFmpeg pipeline regression tests"**
3. The output shows:
   - Which file failed
   - Whether it was expected to succeed or fail
   - The error category (InputProblem, UnsupportedCombination, etc.)

Example failure output:

```
 Testing: normal/h264_aac_1080p.mp4
assertion failed: Probe failed for normal/h264_aac_1080p.mp4: Some("Invalid data found")
```

## Test Categories

### Normal File Tests

Tests that standard media files:

- Probe successfully with correct stream detection
- Convert (remux) successfully
- Transcode successfully
- Produce valid output files

### Edge Case Tests

Tests that unusual but valid files:

- Video-only files (no audio) are detected correctly
- Vertical/portrait videos have correct dimensions
- Square videos have equal width/height
- Audio-only containers are handled

### Known-Bad File Tests

Tests that invalid files:

- Zero-byte files fail with `InputProblem`
- Random binary data fails gracefully
- Truncated files fail with proper error classification
- Non-media files renamed as media fail gracefully

### Error Categories

When files fail, they should be classified into:

| Category                 | Description                                   |
| ------------------------ | --------------------------------------------- |
| `InputProblem`           | File is corrupted, unsupported, or unreadable |
| `UnsupportedCombination` | Codec/container combination not supported     |
| `ResourceIssue`          | Disk full, permissions, I/O errors            |
| `InternalPipelineError`  | Bug in Honeymelon's argument construction     |
| `Timeout`                | Conversion exceeded time limit                |
| `Cancelled`              | User cancelled the job                        |
| `Unknown`                | Unclassified error                            |

## Adding New Tests

To add a new test file to the corpus:

1. Add the file to the appropriate `test-media/` subdirectory
2. Update `src-tauri/tests/ffmpeg_pipeline.rs` to include the new file
3. Run tests locally to verify
4. Commit both the test file and test code changes

Example for adding a new edge case:

```rust
#[test]
fn edge_case_new_format_probes_correctly() {
    if !check_ffmpeg_available() || !check_test_media_available() {
        eprintln!("⚠ Skipping test: Dependencies not available");
        return;
    }

    let path = test_media_dir().join("edge-cases/new_format.mkv");
    let result = probe_file(&path);

    assert!(result.success, "Probe failed: {:?}", result.error);
    // Add specific assertions...
}
```

## Troubleshooting

### Tests Skipped with "Dependencies not available"

This means either FFmpeg binaries or test media files are missing:

```bash
npm run download-ffmpeg   # Get FFmpeg
# Ensure test-media/ directory exists with files
```

### Test Media Files Missing

If test media files are missing (e.g., after a fresh clone), generate them:

```bash
# Quick generation script - see test-media section above
```

### FFmpeg Binaries Not Found

```bash
npm run download-ffmpeg
ls -la src-tauri/bin/  # Should show ffmpeg and ffprobe
```

### Tests Pass Locally but Fail in CI

1. Check that test-media/ is committed to the repository
2. Verify the CI workflow downloads FFmpeg before running tests
3. Check for platform-specific issues (tests run on macOS in CI)
