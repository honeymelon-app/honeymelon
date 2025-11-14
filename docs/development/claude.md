---
title: Claude Assistant Guide
description: Instructions tailored for Claude-based coding agents collaborating on the Honeymelon repository.
---

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Honeymelon is a macOS Apple Silicon media converter built with Tauri + Vue 3. It implements a "remux-first" FFmpeg workflow that prioritizes lossless stream copying over re-encoding. The architecture splits between a Vue frontend (UI, planning logic) and Rust backend (FFmpeg process management).

## Development Commands

### Frontend Development

- `npm run dev` — Vite dev server for UI iteration only
- `npm run tauri dev` — Full desktop app with live reload (preferred for development)
- `npm run build` — Type-check with vue-tsc and build production assets
- `npm run tauri build` — Compile macOS bundle for distribution

### Backend Development (Rust)

- `cd src-tauri && cargo test` — Run Rust tests
- `cd src-tauri && cargo build` — Build Rust backend only

### Package Management

- Uses `npm` with `package-lock.json` for dependency tracking
- Install dependencies: `npm install`

## Architecture

### Core Conversion Pipeline: Probe → Plan → Execute

The application follows a three-stage conversion pipeline implemented across frontend and backend:

1. **Probe** ([src/lib/ffmpeg-probe.ts](https://github.com/honeymelon-app/honeymelon/blob/main/src/lib/ffmpeg-probe.ts), [src-tauri/src/ffmpeg_probe.rs](https://github.com/honeymelon-app/honeymelon/blob/main/src-tauri/src/ffmpeg_probe.rs))
   - Invokes `ffprobe` via Tauri command to extract media metadata
   - Returns `ProbeSummary` with codecs, duration, resolution, color metadata, subtitle types

2. **Plan** ([src/lib/ffmpeg-plan.ts](src/lib/ffmpeg-plan.ts))
   - Pure TypeScript planning engine that decides copy vs. transcode
   - Evaluates container rules ([src/lib/container-rules.ts](src/lib/container-rules.ts)) and encoder capabilities
   - Returns `PlannerDecision` with FFmpeg arguments, remux flag, warnings
   - Key decision logic:
     - If source codec matches preset codec → copy
     - If codec matches but container differs → copy if container allows
     - Otherwise → transcode with tier-specific quality settings

3. **Execute** (runner modules under `src-tauri/src/runner`)
   - Rust side spawns FFmpeg as child process
   - Parses stderr for progress events (time, fps, speed)
   - Emits `ffmpeg://progress` and `ffmpeg://completion` events to frontend
   - Manages job concurrency and exclusive locks for heavy codecs (AV1, ProRes)

### Preset System ([src/lib/presets.ts](src/lib/presets.ts))

Presets define target container + codec combinations with quality tiers:

- Each preset specifies `container`, `video.codec`, `audio.codec`
- Three tiers per preset: `fast` (remux-first), `balanced` (moderate bitrate), `high` (quality-focused)
- Tier defaults stored in `video.tiers` and `audio.tiers` (bitrate, CRF, profile)
- Container rules validate codec compatibility before execution

### Capability Detection ([src/lib/capability.ts](https://github.com/honeymelon-app/honeymelon/blob/main/src/lib/capability.ts), [src-tauri/src/ffmpeg_capabilities.rs](https://github.com/honeymelon-app/honeymelon/blob/main/src-tauri/src/ffmpeg_capabilities.rs))

- On startup, queries `ffmpeg -encoders` and `-formats` to build `CapabilitySnapshot`
- Presets auto-disable if required encoder unavailable
- Supports bundled FFmpeg (`src-tauri/resources/bin/`) or system FFmpeg path

### Job Queue & Orchestrator

- `src/stores/job-queue.ts` owns enqueue/start/cancel flows and delegates persistence to the job service
- `src/stores/job-state.ts` applies lifecycle transitions validated against `src/lib/job-lifecycle.ts` (DEV-only assertions mirror the Rust state chart)
- `src/services/job-service.ts` wraps the repository for duplicate detection, timestamp patching, and transactional saves
- `src/composables/orchestrator/{planner-client,runner-client,event-subscriber}.ts` isolate planner invocation, runner control, and Tauri listener management
- `src/composables/use-job-orchestrator.ts` now composes those clients while `use-app-orchestration.ts` focuses on queue coordination, `use-capability-gate.ts` on preset readiness, and `use-desktop-bridge.ts` on drag/drop + menu wiring
- Exclusive jobs (AV1, ProRes) still block parallel execution; concurrency settings stay synced with the Rust backend

### Tauri Commands ([src-tauri/src/lib.rs](https://github.com/honeymelon-app/honeymelon/blob/main/src-tauri/src/lib.rs))

Exposed commands:

- `load_capabilities` — Returns encoder/format availability
- `probe_media` — Runs ffprobe on input file
- `start_job` — Spawns FFmpeg process with args and output path
- `cancel_job` — Kills running FFmpeg process
- `set_max_concurrency` — Adjusts parallel job limit
- `expand_media_paths` — Recursively discovers media files in dropped folders

## File Organization

### Frontend (`src/`)

- `app.vue` — Root component with dropzone and preset picker
- `lib/` — Core conversion logic (all kebab-case):
  - `ffmpeg-plan.ts` — Planning engine (main business logic)
  - `ffmpeg-probe.ts` — Tauri probe command wrapper
  - `container-rules.ts` — MP4/WebM/MOV/MKV codec constraints
  - `presets.ts` — Preset definitions with tier defaults
  - `capability.ts` — Capability loading and preset filtering
  - `job-lifecycle.ts` — Shared lifecycle assertions for frontend + Rust
  - `types.ts` — Shared TypeScript types
- `services/`:
  - `job-service.ts` — Repository proxy that enforces duplicate detection and transactional writes
- `stores/` — Pinia stores:
  - `job-queue.ts` — Job queue operations (enqueue/start/cancel)
  - `job-state.ts` — Status transitions validated by `job-lifecycle`
  - `prefs.ts` — User preferences (FFmpeg path, output directory, defaults)
- `composables/` — Vue composables:
  - `use-app-orchestration.ts` — Bridges UI events into queue actions
  - `use-capability-gate.ts` — Capability snapshot loading + preset readiness
  - `use-desktop-bridge.ts` — Drag/drop and menu event wiring
  - `use-job-orchestrator.ts` — Coordinates planner/runner clients
  - `orchestrator/` folder for `planner-client.ts`, `runner-client.ts`, and `event-subscriber.ts`
- `components/ui/` — shadcn-vue UI components (auto-generated, edit carefully)

### Backend (`src-tauri/src/`)

- `lib.rs` — Tauri command handler registration
- `ffmpeg_probe.rs` — ffprobe command execution and JSON parsing
- runner modules (`src-tauri/src/runner`) — FFmpeg process spawning, progress parsing, event emission
- `ffmpeg_capabilities.rs` — Encoder/format detection
- `fs_utils.rs` — Recursive media file discovery
- `error.rs` — Unified error type for Tauri commands

## Development Patterns

### TypeScript Style

- Use `<script setup>` with Composition API
- 2-space indentation
- Import order: external packages → `@/` local modules
- Component names: PascalCase; lib modules: kebab-case

### Rust Style

- snake_case for modules and functions
- Add `#[cfg(test)]` blocks for Rust logic tests
- Document Tauri commands with `///` when behavior non-obvious

### Tailwind Classes

- Group by: layout → spacing → color
- Use `tw-animate-css` for animations
- Prefer `class-variance-authority` for component variants

### Adding New Presets

1. Define preset object in [src/lib/presets.ts](src/lib/presets.ts) with container, codecs, tiers
2. Add container rules to [src/lib/container-rules.ts](src/lib/container-rules.ts) if new container
3. Update encoder mappings in [src/lib/ffmpeg-plan.ts](src/lib/ffmpeg-plan.ts) (`VIDEO_ENCODERS`, `AUDIO_ENCODERS`)
4. Test with various inputs to validate copy vs. transcode logic

### Testing Strategy

- Frontend: Vitest suites cover planners, presets, job services, orchestrator clients, and file handlers. Run with `npm run test:unit`, `npm run test:unit:watch`, or `npm run test:unit:coverage` (ensure `npm run download-ffmpeg` has fetched binaries first).
- Backend: `cd src-tauri && cargo test` executes Rust unit + integration suites, mirroring the `JobLifecycle` invariants and runner validator/concurrency logic.
- E2E: Playwright specs under `e2e/tests` require `npm run tauri dev` in another terminal; launch via `npm run test:e2e` or `npm run test:e2e:ui` for debugging.
- CI: `ci.yml` enforces lint → type-check → Vitest → build → `cargo test`; match that locally before pushing.
- Use the shared orchestrator teardown helper in tests to avoid leaking mocked `listen` subscriptions between runs.

## FFmpeg Integration Notes

### Bundled vs. System FFmpeg

- Bundled: Place binaries in `src-tauri/resources/bin/{ffmpeg,ffprobe}`
- System: Configure path in app Settings
- LGPL compliance: Honeymelon runs FFmpeg out-of-process (no static linking)
- Recommended codecs: VideoToolbox (H.264/HEVC), libvpx-vp9, libaom-av1, libopus

### Subtitle Handling

- Text subs (SRT/ASS): MP4 converts to `mov_text`, MKV keeps original
- Image subs (PGS): Burn-in planned (not yet implemented in execution layer)
- Preset subtitle mode: `keep` | `convert` | `burn` | `drop`

### Color Metadata

- When transcoding, planner copies color primaries, TRC, and colorspace from source
- Controlled by `preset.video.copyColorMetadata` flag

## Common Tasks

### Adding a New Tauri Command

1. Add async function in appropriate `src-tauri/src/*.rs` module
2. Export from module with `pub` if needed
3. Add `#[tauri::command]` attribute
4. Register in `invoke_handler![]` in [src-tauri/src/lib.rs](https://github.com/honeymelon-app/honeymelon/blob/main/src-tauri/src/lib.rs)
5. Call from frontend via `import { invoke } from '@tauri-apps/api/core'`

### Debugging FFmpeg Arguments

- Enable logs in job card UI (shows full FFmpeg stderr)
- Check `decision.ffmpegArgs` in planner output
- Use `simulate: true` in orchestrator to test without FFmpeg

### Modifying Job State Machine

- Enqueue/start/cancel logic resides in [src/stores/job-queue.ts](src/stores/job-queue.ts); state mutations live in [src/stores/job-state.ts](src/stores/job-state.ts).
- Legal transitions are defined once in [src/lib/job-lifecycle.ts](src/lib/job-lifecycle.ts) (DEV-only assertions) and mirrored in the Rust backend.
- Repository writes go through [src/services/job-service.ts](src/services/job-service.ts) to enforce duplicate detection + timestamp patching.
- Helper guards like `isActiveState()` and `isTerminalState()` stay in [src/lib/types.ts](src/lib/types.ts).

## Platform Notes

- **Target**: macOS 13+ on Apple Silicon (arm64) only
- **Signing**: Configure `APPLE_ID`, `APPLE_PASSWORD`, `APPLE_TEAM_ID` for notarization
- **Distribution**: DMG output in `src-tauri/target/release/bundle/dmg/`

## Additional References

See [AGENTS.md](./agents.md) for detailed commit/PR guidelines and [README.md](../README.md) for user-facing documentation.
