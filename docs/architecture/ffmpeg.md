---
title: FFmpeg Integration
description: How Honeymelon discovers capabilities, constructs command plans, and manages FFmpeg processes.
---

# FFmpeg Integration

Honeymelon integrates with FFmpeg through out-of-process execution, ensuring LGPL compliance and process isolation. This document explains the integration architecture and implementation details.

## Why Out-of-Process?

### LGPL Compliance

FFmpeg is licensed under LGPL (Lesser General Public License), which imposes restrictions on linking:

**Prohibited**:

- Static linking to FFmpeg libraries
- Dynamic linking without providing object files
- Distribution of combined works without LGPL license

**Allowed**:

- Out-of-process execution (no linking)
- Communication via stdin/stdout/stderr
- File-based input/output

Honeymelon uses **out-of-process execution exclusively**, enabling proprietary licensing while using FFmpeg.

### Benefits

1. **Legal Compliance**: No LGPL contamination of proprietary code
2. **Process Isolation**: FFmpeg crashes don't affect the app
3. **Version Flexibility**: Easily swap FFmpeg versions
4. **Resource Management**: Independent process resource limits
5. **Security**: Limited privilege escalation surface

## FFmpeg Discovery

Honeymelon resolves FFmpeg and FFprobe using a four-tier fallback implemented in `src-tauri/src/binary_resolver.rs`:

### 1. Environment Overrides

```bash
export HONEYMELON_FFMPEG_PATH=/custom/path/to/ffmpeg
export HONEYMELON_FFPROBE_PATH=/custom/path/to/ffprobe

```

### 2. Development Bundled Binaries

```text
src-tauri/bin/ffmpeg
src-tauri/bin/ffprobe

```

`npm install` (or `npm run download-ffmpeg`) populates these paths for local development.

### 3. Packaged App Resources

When shipped, the macOS bundle includes binaries under:

```text
Honeymelon.app/Contents/Resources/bin/{ffmpeg,ffprobe}

```

### 4. System PATH Fallback

If none of the above exist, Honeymelon falls back to the first matching binary on `PATH` (for example `/opt/homebrew/bin/ffmpeg`).

### Implementation

**Location**: `src-tauri/src/binary_resolver.rs`

```rust
use std::process::Command;
use crate::binary_resolver::resolve_ffmpeg_paths;

let candidates = resolve_ffmpeg_paths(&app);

let ffmpeg_path = candidates
    .into_iter()
    .find(|path| Command::new(path).arg("-version").output().is_ok())
    .ok_or_else(|| anyhow::anyhow!("FFmpeg not found"))?;
```

## FFprobe Integration

### Purpose

Extract media file metadata without full decoding.

### Execution

**Command**:

```bash
ffprobe \
    -v quiet \
    -print_format json \
    -show_format \
    -show_streams \
    input.mp4

```

Parse JSON with `serde_json`:

```rust
let output = Command::new(&ffprobe_path)
    .args(&args)
    .output()?;

let probe_result: FFprobeOutput =
    serde_json::from_slice(&output.stdout)?;

```

### FFprobe: Error Handling

Common FFprobe errors:

```rust
match result {
        Err(e) if e.contains("Invalid data") => {
                return Err("Corrupted file".into())
        },
        Err(e) if e.contains("No such file") => {
                return Err("File not found".into())
        },
        Err(e) => return Err(format!("FFprobe error: {}", e)),
        Ok(data) => data,
}

```

## FFmpeg Execution

### Command Construction

**Location**: `src/lib/ffmpeg-plan.ts` and `src/lib/builders/ffmpeg-args-builder.ts`

`planJob()` returns a `PlannerDecision` with `ffmpegArgs` built by `FFmpegArgsBuilder`. The args include the input, stream maps, codec selections, container muxer, and `-progress pipe:2 -nostats` for progress reporting.

### Process Spawning

**Location**: runner modules under `src-tauri/src/runner` (see `src-tauri/src/runner/mod.rs` and its submodules)

```rust
use std::io::{BufRead, BufReader};
use std::process::{Command, Stdio};

let mut child = Command::new(ffmpeg_path)
    .args(&ffmpeg_args)
    .stdin(Stdio::null())
    .stdout(Stdio::piped())
    .stderr(Stdio::piped())
    .spawn()?;

let stderr = child.stderr.take().unwrap();
let reader = BufReader::new(stderr);

for line in reader.lines() {
    if let Ok(line) = line {
        emit_progress_event(&app, &job_id, &line)?;
    }
}
```

### Progress Parsing

FFmpeg outputs progress to **stderr**:

```text
frame=  150 fps= 30 q=28.0 size=    1024kB time=00:00:05.00 bitrate=1677.7kbits/s speed=1.0x

```

Progress parsing accepts both key-value progress lines (`out_time=...`) and inline status lines (`time=...`) to extract `processed_seconds`, `fps`, and `speed`.

### Event Streaming

Progress events sent to frontend:

```rust
app.emit("ffmpeg://progress", ProgressPayload {
    job_id,
    progress: ProgressMetrics {
        processed_seconds,
        fps,
        speed,
    },
    raw,
})?;

```

Frontend receives via Tauri events:

```typescript
import { listen } from '@tauri-apps/api/event';

listen<ProgressPayload>('ffmpeg://progress', (event) => {
  updateJobProgress(event.payload.progress);
});
```

## Hardware Acceleration

### Apple VideoToolbox

FFmpeg supports hardware encoding via VideoToolbox, most commonly for H.264:

```bash
-c:v h264_videotoolbox
```

### Automatic Selection

**Location**: `src/lib/strategies/encoder-strategy.ts`

Encoder selection prefers hardware encoders (VideoToolbox/QSV/NVENC) when available in the detected capabilities, then falls back to software encoders.

### Performance Comparison

| Encoder                | Speed (1080p) | Quality   | Power |
| ---------------------- | ------------- | --------- | ----- |
| libx264 (SW)           | Moderate      | Excellent | High  |
| h264_videotoolbox (HW) | Fast          | Good      | Low   |

## Capability Detection

### Capability: Purpose

Detect which encoders are available in the user's FFmpeg installation.

### Capability: Implementation

**Location**: [src-tauri/src/ffmpeg_capabilities.rs](https://github.com/honeymelon-app/honeymelon/blob/main/src-tauri/src/ffmpeg_capabilities.rs)

**Command**:

```bash
ffmpeg -encoders -hide_banner

```

**Output**:

```text
Encoders:
 V..... libx264              libx264 H.264 / AVC / MPEG-4 AVC / MPEG-4 part 10
 V..... libx265              libx265 H.265 / HEVC
 V..... h264_videotoolbox    VideoToolbox H.264 Encoder
 A..... aac                  AAC (Advanced Audio Coding)

```

**Parse**:

```rust
pub fn detect_capabilities(ffmpeg_path: &Path) -> Result<Capabilities> {
    let output = Command::new(ffmpeg_path)
        .args(&["-encoders", "-hide_banner"])
        .output()?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let encoders = parse_encoders(&stdout);

    Ok(Capabilities { encoders })
}

fn parse_encoders(output: &str) -> Vec<String> {
    output.lines()
        .filter_map(|line| {
            let parts: Vec<&str> = line.split_whitespace().collect();
            if parts.len() >= 2 && (parts[0].contains('V') || parts[0].contains('A')) {
                Some(parts[1].to_string())
            } else {
                None
            }
        })
        .collect()
}

```

### Filtering Presets

`src/lib/capability.ts` exposes `presetIsAvailable` and `availablePresets`, which gate presets based on detected encoders and container formats. Presets that cannot be encoded with the current FFmpeg build are hidden from the UI.

## Error Handling

### FFmpeg Exit Codes

Completion events include `success`, `cancelled`, `exit_code`, and a classified error category with a user-facing message when available.

### Common FFmpeg Errors

| Error                       | Cause           | Solution              |
| --------------------------- | --------------- | --------------------- |
| "Invalid data found"        | Corrupted file  | Verify file integrity |
| "No such file or directory" | Invalid path    | Check file exists     |
| "Encoder ... not found"     | Missing encoder | Install full FFmpeg   |
| "Permission denied"         | File access     | Grant permissions     |
| "Disk quota exceeded"       | No space        | Free up disk space    |

### Stderr Parsing

`ffmpeg_errors.rs` extracts relevant stderr lines and maps common failure patterns to categories such as input problems, unsupported combinations, resource issues, and timeouts.

## Process Management

### Cancellation

Cancellation kills the FFmpeg process, cleans up the temp output, and emits a completion event flagged as cancelled.

### Timeout Handling

Timeouts are calculated from media duration (`calculate_timeout`) and enforced in the progress monitor.

## Testing FFmpeg Integration

### Unit Tests

**Location**: [src-tauri/src/ffmpeg_probe.rs](https://github.com/honeymelon-app/honeymelon/blob/main/src-tauri/src/ffmpeg_probe.rs)

```rust
#[cfg(test)]
mod tests {
    #[test]
    fn test_parse_ffprobe_output() {
        let json = r#"{"format": {...}, "streams": [...]}"#;
        let result = parse_probe_result(json).unwrap();
        assert_eq!(result.video_codec, Some("h264".to_string()));
    }
}

```

### Integration Tests

FFmpeg pipeline tests live under `docs/FFMPEG_PIPELINE_TESTS.md` and the Rust runner/unit tests validate argument handling and output verification.

## Next Steps

- Understand [State Management](/architecture/state) for job tracking
- Review [Tech Stack](/architecture/tech-stack) choices
- Explore the [Conversion Pipeline](/architecture/pipeline) flow
- See [Pipeline Internals](/architecture/pipeline-internals) for error classification and timeout handling
