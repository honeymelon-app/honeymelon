---
title: Pipeline Internals
description: Internal reference documenting the FFmpeg pipeline implementation details for maintainers.
---

# Pipeline Internals

> **Internal reference for maintainers** — Documents the media conversion pipeline implementation details, error handling, and key file locations.

## Pipeline Overview

Honeymelon converts media files through a three-stage pipeline:

```
┌─────────┐    ┌─────────┐    ┌─────────┐
│  PROBE  │ ─► │  PLAN   │ ─► │ EXECUTE │
└─────────┘    └─────────┘    └─────────┘
```

### 1. Probe Stage

**Purpose:** Extract metadata from source file and validate it's a usable media file.

**Implementation:**

- **Rust:** `src-tauri/src/ffmpeg_probe.rs` > `probe_media()` function
- **TypeScript wrapper:** `src/lib/ffmpeg-probe.ts` > `probeMedia()` function

**Process:**

1. Resolve `ffprobe` binary path via `binary_resolver.rs` cascading strategy:
   - `HONEYMELON_FFPROBE_PATH` env var
   - Development bundled binary (`src-tauri/bin/ffprobe`)
   - App bundle binary (`Resources/bin/ffprobe`)
   - System PATH fallback
2. Execute: `ffprobe -hide_banner -loglevel error -print_format json -show_format -show_streams <path>`
3. Parse JSON output into `FfprobeOutput` struct
4. Generate `ProbeSummary` with normalized metadata:
   - `durationSec`, `width`, `height`, `fps`
   - `vcodec`, `acodec` (lowercase normalized)
   - `hasTextSubs`, `hasImageSubs`
   - `channels`, `color` metadata

**Current validation:** Rejects zero-byte inputs and files with no usable streams, and surfaces ffprobe errors as `probe_*` codes.

### 2. Plan Stage

**Purpose:** Decide encoding strategy based on source metadata and user-selected preset.

**Implementation:**

- **TypeScript:** `src/lib/ffmpeg-plan.ts` > `planJob()` function
- **Planners:**
  - `src/lib/planners/video-planner.ts` — decides copy vs transcode for video
  - `src/lib/planners/audio-planner.ts` — decides copy vs transcode for audio
  - `src/lib/planners/subtitle-planner.ts` — subtitle handling strategy
- **Args builder:** `src/lib/builders/ffmpeg-args-builder.ts` > `FFmpegArgsBuilder` class

**Process:**

1. Resolve `Preset` from `presetId` (or default)
2. Call `VideoPlanner.plan()` > returns `VideoAction` (copy/transcode/drop)
3. Call `AudioPlanner.plan()` > returns `AudioAction` (copy/transcode/drop)
4. Call `SubtitlePlanner.plan()` > returns `SubtitlePlanDecision`
5. Use `FFmpegArgsBuilder` to assemble args:
   - Input file (`-i`)
   - Video codec and options
   - Audio codec and options
   - Subtitle handling
   - Container-specific flags (faststart, muxer)
   - Progress output (`-progress pipe:2 -nostats`)

**Output:** `PlannerDecision` with `ffmpegArgs: string[]`, `remuxOnly: boolean`, `notes`, `warnings`

**Note:** Subtitle burn-in is currently surfaced as a warning; filters are not injected yet.

### 3. Execute Stage

**Purpose:** Spawn FFmpeg process and monitor progress until completion.

**Implementation:**

- **TypeScript orchestration:** `src/composables/use-job-orchestrator.ts`
- **Runner client:** `src/composables/orchestrator/runner-client.ts`
- **Tauri commands:** `src-tauri/src/commands/jobs.rs`
- **Rust coordinator:** `src-tauri/src/runner/coordinator.rs`
- **Process spawner:** `src-tauri/src/runner/process_spawner.rs`
- **Progress monitor:** `src-tauri/src/runner/progress_monitor.rs`

**Process:**

1. **Tauri command** `start_job(job_id, args, output_path, exclusive)`:
   - Validates args via `JobValidator`
   - Resolves FFmpeg path via `ProcessSpawner::resolve_ffmpeg()`
   - Creates temp output path (`<stem>.tmp.<ext>`)
   - Spawns FFmpeg via `Command::new(ffmpeg_path).args(args).arg(temp_path)`
   - Registers job in `JobRegistry`
2. **Progress monitoring** in background thread:
   - Reads stderr line by line
   - Parses progress metrics (`time=`, `fps=`, `speed=`)
   - Emits `ffmpeg://progress` events to frontend
   - Stores recent logs in circular buffer
3. **Completion handling:**
   - Captures exit status
   - On success: validates output and moves temp file to final path via `OutputManager::finalize()`
   - On failure: cleans up temp file
   - Emits `ffmpeg://completion` event with success/failure/cancelled status

---

## Command Construction

FFmpeg arguments are built entirely in TypeScript (`FFmpegArgsBuilder`) as a `string[]`.

**Canonical pattern:**

```
-i <input>
-map 0:v:0? -c:v <video_codec> [video_options...]
-map 0:a:0? -c:a <audio_codec> [audio_options...]
-map 0:s? -c:s copy|mov_text [subtitle_options...]
-movflags +faststart (for MP4/MOV)
-f <muxer>
-progress pipe:2 -nostats
```

**Security:** `JobValidator.validate_args()` rejects args containing shell metacharacters (`;`, `|`, `&`, `$(`, `` ` ``).

**Process spawning:** Uses `std::process::Command::new(path).args(args)` — **no shell invocation**.

---

## stdout/stderr Handling

- **stdout:** `Stdio::null()` — FFmpeg output goes to stderr
- **stderr:** `Stdio::piped()` — captured and processed
- **stdin:** `Stdio::null()` — prevents FFmpeg prompts

**Progress parsing** (`ProgressMonitor::parse_progress_line`):

- Handles both key=value format (`out_time=00:01:30.00`) and inline format (`time=00:01:30.00`)
- Extracts: `processed_seconds`, `fps`, `speed`

**Log storage:** Last 500 lines kept in `RunningProcess.logs` circular buffer.

---

## Exit Code Handling

**Current mapping** (`explain_ffmpeg_exit_code`):

- `1` > "Encoding failed. Check input file format and codec support."
- `2` > "Invalid FFmpeg arguments. Please report this issue."
- `69` > "Output file already exists and cannot be overwritten."
- Other > No specific explanation

**Exit status categories:**

- `status.success()` && not cancelled > Job success
- Cancelled flag set > Job cancelled
- Otherwise > Job failed

---

## Cancellation Handling

**Current implementation:**

1. Frontend calls `cancel_job(job_id)` Tauri command
2. `JobCoordinator::cancel_job()`:
   - Sets `process.cancelled` atomic flag
   - Calls `child.kill()` on the FFmpeg process
   - Cleans up temp file via `OutputManager::cleanup_temp()`
   - Removes from registry

**Frontend state:** Transitions job to `cancelled` status.

---

## Concurrency Handling

**Current model:**

- Single `max_concurrency` limit (default: 2)
- Configurable via `set_max_concurrency()` command
- `JobRegistry.register()` checks `active_jobs.len() < limit`
- Exclusive jobs (`exclusive: true`) block all other jobs

**No distinction** between heavy (AV1, ProRes) and light (remux, H.264) jobs.

---

## Timeout Handling

**Current:** Adaptive timeout based on media duration (`calculate_timeout`), with a 10-minute minimum and a 2-hour cap.

---

## Output Validation

**Current:** Validates output for existence, non-zero size, and expected audio/video streams using a quick ffprobe check (`src-tauri/src/runner/output_validator.rs`).

---

## Error Classification

**Current codes:**

- `probe_ffprobe_exec` — FFprobe execution failed
- `probe_parse_json` / `probe_parse_struct` — FFprobe output parsing failed
- `job_ffmpeg_not_found` — FFmpeg binary not found
- `job_spawn_failed` — Process spawn failed
- `job_invalid_args` — Args validation failed
- `job_output_directory` — Directory creation failed
- `job_output_permission` — Write permission denied
- `job_output_prepare` — Output preparation failed
- `job_output_invalid` — Invalid UTF-8 in path
- `job_cancel_failed` — Process kill failed
- `job_finalize_failed` — File rename failed
- `job_complete` — Success
- `job_failed` — Generic failure
- `job_cancelled` — User cancelled
- `validation_*` — Output validation failures

**Classification:** `ffmpeg_errors.rs` parses stderr patterns into categories and user-facing messages.

---

## Known Gaps

1. **Subtitle burn-in not implemented** — Planner warns but filters are not injected yet.
2. **No user-controlled stream selection** — Default streams are used for all jobs.
3. **No job persistence** — Queue does not survive restarts.

---

## Key Files Reference

| Component            | File                                            |
| -------------------- | ----------------------------------------------- |
| FFprobe execution    | `src-tauri/src/ffmpeg_probe.rs`                 |
| Binary resolution    | `src-tauri/src/binary_resolver.rs`              |
| Capability detection | `src-tauri/src/ffmpeg_capabilities.rs`          |
| Job planning         | `src/lib/ffmpeg-plan.ts`                        |
| Args builder         | `src/lib/builders/ffmpeg-args-builder.ts`       |
| Job orchestration    | `src/composables/use-job-orchestrator.ts`       |
| Runner client        | `src/composables/orchestrator/runner-client.ts` |
| Tauri commands       | `src-tauri/src/commands/jobs.rs`                |
| Job coordinator      | `src-tauri/src/runner/coordinator.rs`           |
| Process spawner      | `src-tauri/src/runner/process_spawner.rs`       |
| Progress monitor     | `src-tauri/src/runner/progress_monitor.rs`      |
| Output manager       | `src-tauri/src/runner/output_manager.rs`        |
| Job state types      | `src/lib/types.ts`                              |
| Job state store      | `src/stores/job-state.ts`                       |
| Error handler        | `src/lib/error-handler.ts`                      |
