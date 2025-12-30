## Test Coverage Gaps and Plan

This document tracks the remaining test coverage gaps for Honeymelon and the
plan to close them. It should be updated as each gap is addressed.

### Current Strengths

- Unit coverage for planners, container rules, and encoder strategies.
- Rust FFmpeg pipeline harness for a small corpus of normal/edge/known-bad files.
- Job orchestration/store logic has unit tests.

### Key Gaps (Priority Order)

1. Preset matrix coverage (all containers/presets not exercised end-to-end).
2. Image pipeline conversions across all image outputs (beyond probing).
3. Capability-driven behavior (missing encoder/muxer handling).
4. JS planner -> runner contract (real planner args into execution).

### Proposed Test Matrix (Minimal CI Cost)

#### 1) Unit (TS) - Full Preset Sweep

- For every preset in `PRESETS`, assert key argument invariants:
  - Input handling: `-i` injected, `-progress pipe:2` present.
  - Image presets: `-frames:v 1` + `-f <format>` for png/jpg/webp/bmp/tiff.
  - GIF preset: palettegen/paletteuse + `-loop 0`, `-an`, `-sn`.
  - Audio presets: `-vn` + expected audio codec/muxer.
  - Video presets: expected muxer + codec selection behavior.

#### 2) Rust FFmpeg Pipeline - Representative Conversions

- Keep short durations to reduce CI time, but cover output families:
  - Video outputs: mp4 -> mp4, webm, mkv, mov, gif (palette), optionally avi/ts/ogv/mpeg.
  - Audio outputs: mp3 -> m4a, ogg/opus, aiff, aac (adts).
  - Image outputs: png -> png/jpg/webp/bmp/tiff (include temp-suffix outputs).

#### 3) Capability Regression Tests

- Remove codec/muxer from capability snapshot -> ensure warnings and fallback.
- Ensure `availablePresets` excludes presets when required encoders/muxers are missing.

#### 4) Planner -> Runner Contract Tests

- Use real planner output with mocked Tauri invoke:
  - `planJob` -> `ensureDecisionHasInput` -> `execution.start` args asserted.
  - Output path extension and separator rules validated.

### Progress Tracker

- [x] Add full preset sweep unit tests.
- [x] Expand test media corpus for missing containers/formats.
- [x] Expand Rust pipeline tests to cover output families.
- [x] Add capability regression tests.
- [x] Add planner-runner contract integration tests.

## Documentation Sync Plan

Track doc updates to keep user-facing guides aligned with the current codebase.

1. [x] Align supported formats and preset documentation with current presets and file discovery.
2. [x] Audit user guide workflows (converting files, batch processing, preferences, troubleshooting, support).
3. [x] Audit architecture and API references (pipeline, FFmpeg notes, API reference).
4. [ ] Confirm docs index/changelog references remain consistent.
