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
src-tauri/resources/bin/ffmpeg
src-tauri/resources/bin/ffprobe

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

**Location**: [src/lib/ffmpeg-plan.ts](https://github.com/honeymelon-app/honeymelon/blob/main/src/lib/ffmpeg-plan.ts)

Build FFmpeg arguments from plan:

```typescript
function buildFFmpegCommand(plan: FFmpegPlan): string[] {
  const args = [
    '-i',
    inputFile,
    '-c:v',
    plan.videoAction === 'copy' ? 'copy' : plan.videoCodec,
    '-c:a',
    plan.audioAction === 'copy' ? 'copy' : plan.audioCodec,
  ];

  if (plan.videoAction === 'transcode') {
    args.push(...plan.videoOptions);
  }

  if (plan.audioAction === 'transcode') {
    args.push(...plan.audioOptions);
  }

  args.push(outputFile);
  return args;
}
```

**Example Output**:

```bash
['-i', 'input.mkv', '-c:v', 'libx264', '-preset', 'medium',
 '-crf', '23', '-c:a', 'aac', '-b:a', '192k', 'output.mp4']

```

### Process Spawning

**Location**: runner modules under `src-tauri/src/runner` (see `src-tauri/src/runner/mod.rs` and its submodules)

```rust
use std::process::{Command, Stdio};
use tokio::io::{BufReader, AsyncBufReadExt};

let mut child = Command::new(ffmpeg_path)
    .args(&ffmpeg_args)
    .stdin(Stdio::null())
    .stdout(Stdio::piped())
    .stderr(Stdio::piped())
    .spawn()?;

let stderr = child.stderr.take().unwrap();
let reader = BufReader::new(stderr);
let mut lines = reader.lines();

while let Some(line) = lines.next_line().await? {
    if let Some(progress) = parse_progress(&line) {
        emit_progress_event(&app, &job_id, progress)?;
    }
}

let status = child.wait().await?;

```

### Progress Parsing

FFmpeg outputs progress to **stderr**:

```text
frame=  150 fps= 30 q=28.0 size=    1024kB time=00:00:05.00 bitrate=1677.7kbits/s speed=1.0x

```

**Regex Pattern**:

```rust
static PROGRESS_REGEX: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"frame=\s*(\d+) fps=\s*([\d.]+) .* time=(\S+) .* speed=\s*([\d.]+)x")
        .unwrap()
});

```

**Parse Function**:

```rust
fn parse_progress(line: &str) -> Option<Progress> {
    let caps = PROGRESS_REGEX.captures(line)?;

    Some(Progress {
        frame: caps[1].parse().ok()?,
        fps: caps[2].parse().ok()?,
        time: parse_time(&caps[3])?,
        speed: caps[4].parse().ok()?,
    })
}

```

### Event Streaming

Progress events sent to frontend:

```rust
app.emit("ffmpeg://progress", ProgressPayload {
    job_id,
    frame,
    fps,
    time_seconds,
    percentage,
    eta_seconds,
    speed_factor,
})?;

```

Frontend receives via Tauri events:

```typescript
import { listen } from '@tauri-apps/api/event';

listen<ProgressPayload>('ffmpeg://progress', (event) => {
  updateJobProgress(event.payload);
});
```

## Hardware Acceleration

### Apple VideoToolbox

FFmpeg supports hardware encoding via VideoToolbox:

```bash
# H.264 hardware encoding
-c:v h264_videotoolbox

# H.265 hardware encoding
-c:v hevc_videotoolbox

```

### Automatic Selection

**Location**: [src/lib/ffmpeg-plan.ts](https://github.com/honeymelon-app/honeymelon/blob/main/src/lib/ffmpeg-plan.ts)

```typescript
function selectEncoder(codec: string, hwAccel: boolean): string {
  if (!hwAccel) {
    return getSwEncoderForCodec(codec); // 'libx264', 'libx265', etc.
  }

  // Check if running on Apple Silicon
  if (platform === 'darwin' && arch === 'aarch64') {
    if (codec === 'h264') return 'h264_videotoolbox';
    if (codec === 'hevc') return 'hevc_videotoolbox';
  }

  // Fallback to software
  return getSwEncoderForCodec(codec);
}
```

### Performance Comparison

| Encoder                | Speed (1080p) | Quality   | Power |
| ---------------------- | ------------- | --------- | ----- |
| libx264 (SW)           | 30-50 fps     | Excellent | High  |
| h264_videotoolbox (HW) | 80-120 fps    | Good      | Low   |
| libx265 (SW)           | 10-20 fps     | Excellent | High  |
| hevc_videotoolbox (HW) | 40-70 fps     | Good      | Low   |

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

Presets are filtered based on detected capabilities:

```typescript
function filterPresets(allPresets: Preset[], capabilities: Capabilities): Preset[] {
  return allPresets.filter((preset) => {
    const videoEncoderAvailable =
      !preset.videoCodec || capabilities.encoders.includes(preset.videoCodec);

    const audioEncoderAvailable =
      !preset.audioCodec || capabilities.encoders.includes(preset.audioCodec);

    return videoEncoderAvailable && audioEncoderAvailable;
  });
}
```

Users only see presets their FFmpeg installation can handle.

## Error Handling

### FFmpeg Exit Codes

```rust
match status.code() {
    Some(0) => {
        // Success
        emit_completion_event(job_id, output_path)?;
    },
    Some(code) => {
        // Error with exit code
        let error_msg = extract_error_from_stderr(&stderr_output);
        emit_error_event(job_id, error_msg)?;
    },
    None => {
        // Killed by signal
        emit_cancelled_event(job_id)?;
    }
}

```

### Common FFmpeg Errors

| Error                       | Cause           | Solution              |
| --------------------------- | --------------- | --------------------- |
| "Invalid data found"        | Corrupted file  | Verify file integrity |
| "No such file or directory" | Invalid path    | Check file exists     |
| "Encoder ... not found"     | Missing encoder | Install full FFmpeg   |
| "Permission denied"         | File access     | Grant permissions     |
| "Disk quota exceeded"       | No space        | Free up disk space    |

### Stderr Parsing

Extract meaningful errors from FFmpeg output:

```rust
fn extract_error(stderr: &str) -> String {
    // Look for FFmpeg error lines
    for line in stderr.lines().rev() {
        if line.contains("Error") || line.contains("Invalid") {
            return line.to_string();
        }
    }

    // Fallback to last non-empty line
    stderr.lines()
        .filter(|l| !l.trim().is_empty())
        .last()
        .unwrap_or("Unknown error")
        .to_string()
}

```

## Process Management

### Cancellation

User cancels a running job:

```rust
pub async fn cancel_job(job_id: &str) -> Result<()> {
    let mut jobs = RUNNING_JOBS.lock().await;

    if let Some(child) = jobs.get_mut(job_id) {
        child.kill().await?;
        jobs.remove(job_id);

        // Clean up partial output
        if let Some(output) = get_output_path(job_id) {
            let _ = tokio::fs::remove_file(output).await;
        }

        Ok(())
    } else {
        Err("Job not found".into())
    }
}

```

### Timeout Handling

Prevent hung processes:

```rust
use tokio::time::{timeout, Duration};

let result = timeout(
    Duration::from_secs(3600), // 1 hour max
    child.wait()
).await;

match result {
    Ok(Ok(status)) => handle_completion(status),
    Ok(Err(e)) => handle_error(e),
    Err(_) => {
        child.kill().await?;
        handle_timeout()
    }
}

```

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

Test actual FFmpeg execution with sample files:

```rust
#[tokio::test]
async fn test_actual_conversion() {
    let input = "test_files/sample.mp4";
    let output = "/tmp/output.mp4";

    let result = convert_file(input, output, ConversionOptions::default()).await;

    assert!(result.is_ok());
    assert!(Path::new(output).exists());
}
```

## Next Steps

- Understand [State Management](/architecture/state) for job tracking
- Review [Tech Stack](/architecture/tech-stack) choices
- Explore the [Conversion Pipeline](/architecture/pipeline) flow
