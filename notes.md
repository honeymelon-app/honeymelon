# Honeymelon Deep-Dive Notes

## 1. Architecture Snapshot

- **Frontend Bootstrap (src/main.ts, src/app.vue)**: Mounts Pinia + i18n, applies native UX guards, and renders the tabbed UI that routes drag/drop inputs into the job queue.
- **App Coordination (use-app-orchestration)**: Loads capability snapshots, manages drag/drop + menu events, controls batch start/cancel flows, and bridges the Pinia `jobs` store with orchestrator actions.
- **Job Orchestrator (use-job-orchestrator)**: Runs probe → plan → execute loops, syncs concurrency limits with Tauri, listens for `ffmpeg://*` events, handles exclusive jobs, and dispatches notifications/output naming.
- **State/Data Layer (stores/jobs + job-\* modules)**: Queue built on `jobRepository` with `JobFactory` initialization, exclusive-job tracking, and lifecycle helpers (progress/log buffers, state transitions).
- **FFmpeg Logic (src/lib/ffmpeg-\*.ts, capability.ts)**: Handles binary discovery, probe parsing, decision planning, preset/container compatibility, and capability filtering.
- **Tauri Backend (src-tauri/src/lib.rs)**: Exposes commands for capability loading, probing, job execution, path expansion, media picking, licensing, and output directory selection; wires native menus/events into the frontend.
- **Runner Subsystem (src-tauri/src/runner)**: Validates args/concurrency, prepares temp outputs, spawns FFmpeg via `ProcessSpawner`, monitors progress, and emits completion/progress events with atomic cleanup.

## 2. De-Bloating / Refactor Plan

1. **Modularize `use-app-orchestration`**
   - Extract capability gating into `use-capability-gate` (handles `loadCapabilities`, preset readiness, default preset selection).
   - Move drag/drop + menu wiring to `use-desktop-bridge` composable for clarity and easier testing.
   - Keep queue/batch control in a trimmed orchestration file that simply composes the specialized hooks.
2. **Split `use-job-orchestrator` Responsibilities**
   - Create `orchestrator/planner-client.ts`, `orchestrator/runner-client.ts`, and `orchestrator/event-subscriber.ts` so the main composable coordinates <200 LOC.
   - Encapsulate Tauri event subscription/cleanup logic, making it testable with mocked listeners.
3. **Normalize Repository Access**
   - Wrap `jobRepository` behind a service API (findByStatus, findDuplicates, transactional updates) to prevent ad-hoc map mutations.
   - Co-locate duplicate detection + logging rules there, simplifying `job-queue.ts` and friends.
4. **Document & Enforce Job Lifecycle**
   - Introduce a shared `JobLifecycle` module enumerating valid transitions; use exhaustive TypeScript checks in Pinia modules and mirror the state chart in Rust docs/tests.
   - Add runtime assertions (DEV-only) when invalid transitions are attempted for faster regression detection.
5. **Refine Tauri Backend Structure**
   - Split `lib.rs` commands into submodules (`media`, `license`, `filesystem`, `ui`) and re-export handlers via `generate_handler!`.
   - Abstract the process registry so `runner/mod.rs` focuses on orchestration, while concurrency/temp-handling reside in clear structs.

## 3. Testing Roadmap

### 3.1 TypeScript Unit Tests (Vitest)

- Cover `ffmpeg-plan.ts` decision matrix (remux vs encode, quality tiers, container validation).
- Assert `container-rules.ts` and `presets.ts` enforce codec/container compatibility and preset generation.
- Test `jobRepository`, `JobFactory`, and queue helpers for duplicate prevention, exclusive flags, and timestamp updates.
- Mock preset lists to validate `use-file-handler` selection logic (default preset, media-kind filters, Tauri/web flows).
- Upcoming targeted additions:
  - `ffmpeg-plan`: tier override resolution, capability filtering (missing encoder warnings), exclusive job flag propagation into planner decisions.
  - `presets`: verify tier metadata per media kind, ensure remux-only presets never downgrade codecs, assert every preset defines `sourceContainers` with de-duped values.
  - Queue helpers (`job-queue.ts` utilities): cover bulk enqueue duplicates, exclusive job queuing side effects, and summary/progress propagation to records.
  - `use-file-handler`: simulate Tauri vs browser flows, preset readiness fallback, and GIF/audio-only filter behavior when drop payload mixes media kinds.

### 3.2 Integration / Service Tests

- Stub `invoke`/`listen` to exercise `use-job-orchestrator` responses to probe/progress/completion events and concurrency changes.
- Contract tests ensuring capability snapshots from Rust remain backwards-compatible with frontend parsing.

### 3.3 Rust Unit Tests

- `runner::validator` and `concurrency` modules: exclusive job enforcement, concurrency limit handling, invalid argument rejection.
- `output_manager`: temp path creation, atomic renames, cleanup on failure.
- `ffmpeg_probe`: JSON parsing fidelity using recorded ffprobe outputs.
- `fs_utils::expand_media_paths`: recursion/duplicate handling, symlinks, hidden files.

### 3.4 Rust Integration Tests

- Use mocked FFmpeg binaries to verify `ProcessSpawner` + `ProgressMonitor` wiring without real media work.
- License flow tests (verify → activate → persist → remove) including event emission assertions.

### 3.5 End-to-End Coverage (Playwright)

- Extend existing specs to cover drag/drop, preset switching, batch start/cancel, exclusive job behavior, and license gating.
- Add regression scenario ensuring remux-only jobs run concurrently while encoding jobs enforce exclusivity.

### 3.6 Tooling & CI

- Add `npm run test:unit` wiring Vitest + coverage thresholds; ensure CI installs FFmpeg or stubs binary calls.
- Update GitHub Actions to run `npm run lint`, `npm run test:unit`, `npm run build`, and `cargo test` (with `npm run download-ffmpeg` pre-step).
- Document testing prerequisites in `README.md` (Vitest setup, mocked binaries) so contributors can run suites locally.

## 4. Current Progress

- Extracted capability gating and desktop bridge logic into `use-capability-gate.ts` and `use-desktop-bridge.ts`, slimming `use-app-orchestration` to focus on queue control and orchestration.
- Added the first Vitest suite at `src/repositories/__tests__/job-repository.test.ts`, covering repository read/write, filtering, mutation, and clearing operations to guard against future persistence regressions.
- Extracted FFmpeg event subscription logic into `src/composables/orchestrator/event-subscriber.ts`, keeping `use-job-orchestrator.ts` focused on queue orchestration while centralizing listener lifecycle management.
- Extended `src/lib/__tests__/ffmpeg-plan.test.ts` with an input-without-video scenario to assert warnings surface when presets expect video streams.
- Finished splitting `use-job-orchestrator.ts` by introducing `orchestrator/planner-client.ts` and `orchestrator/runner-client.ts`, wiring everything through the centralized event subscriber so the main composable now focuses solely on queue coordination.
- Verified the refactor with `npm run type-check` (clean) and documented the new orchestrator shape so upcoming tests can target the planner/runner clients directly.
- Wrapped `jobRepository` access in `src/services/job-service.ts`, updated the Pinia queue store to consume it, and added Vitest coverage to lock in duplicate detection, transactional saves, and timestamp patching.
- Added a shared `JobLifecycle` module (`src/lib/job-lifecycle.ts`) with DEV-only assertions, updated `job-state.ts` + Pinia tests to require valid transitions, and mirrored the same state chart plus tests in `src-tauri/src/job_lifecycle.rs`.
- Audited the Tauri backend: commands/services separation exists, but `lib.rs` still owns all wiring, `ServiceRegistry` lacks domain submodules, and the runner coordinator remains a single global with no backend persistence or logging hooks.
- Expanded frontend Vitest coverage with new suites for `ffmpeg-plan`, `presets`, `job-queue`, and `use-file-handler`, capturing tier fallback notes, container-rule warnings, batch enqueue deduping, and browser vs Tauri file-selection flows.
- Performed a frontend↔backend integration pass confirming each composable/invoke/listen call maps to a concrete Tauri command or emitter (capabilities, file handling, orchestration, licensing, dialogs), and captured follow-up to keep Playwright/e2e runs aligned with these contracts.
- Exercised the new `useJobOrchestrator` teardown helper directly inside its Vitest suite so every instantiated orchestrator is cleaned up between specs, preventing lingering listeners/timers.
- Tightened CI (`ci.yml`) to run dedicated type-check, Markdown lint/format checks, and release (`release.yml`) to enforce the same lint/type-check/build/coverage gates prior to shipping artifacts.

## 5. Todo

### Refactors & Architecture

- Restructure `src-tauri/src/lib.rs` into domain submodules (`media`, `license`, `filesystem`, `ui`) and extract the process registry so concurrency/temp management lives outside `runner/mod.rs`.
- Introduce dependency-injected runner services (split `JobCoordinator` state from spawn/logging concerns) so commands can be tested without the global singleton.

### Testing

- Expand Vitest suites for `ffmpeg-plan.ts`, `container-rules.ts`, `presets.ts`, `JobFactory`, queue helpers, and `use-file-handler`; add orchestrator integration tests via mocked `invoke`/`listen` targeting the new planner/runner clients.
- Bring up Rust unit/integration coverage for `runner::validator`, `concurrency`, `output_manager`, `ffmpeg_probe`, `fs_utils::expand_media_paths`, mocked FFmpeg runs, and the license flow.
- Extend Playwright specs to exercise drag/drop, preset switching, batch cancellation, exclusive-job enforcement, license gating, and remux-vs-encode concurrency.
- Add backend integration tests that call `commands::jobs::*` with mocked services/runner to verify logging, concurrency, and lifecycle enforcement end-to-end.

### Tooling & CI

- Wire up `npm run test:unit` with coverage thresholds, ensure CI installs/stubs FFmpeg, and update GitHub Actions to run lint/unit/build/cargo test with the download step plus updated README instructions.

---

## End-to-End Testing: Current State and Expansion Plan

This document describes where the E2E test suite stands today and a concrete plan to turn it into a robust, production-grade end-to-end testing setup for the Tauri/Vue app.

---

## 1. Current State

Right now the E2E layer is mostly scaffolding:

- **Playwright configuration and helpers exist but are mostly placeholders**
  - `e2e/playwright.config.ts` is present, along with helper modules such as:
    - `e2e/helpers/tauri.ts`
    - `e2e/helpers/media-fixtures.ts`

  - Most of the functions inside these helpers are stubs or incomplete.
  - No tests actually **launch the real Tauri bundle** or **attach to the live WebView**.

- **Spec files are descriptive but not functional**
  - There are eight spec files under `e2e/tests/`.
  - Each file contains **comments and scenario descriptions**, but there are **no real UI interactions** (no clicks, assertions, or flows implemented yet).

- **Key helper behavior is not implemented**
  - Drag & drop simulation is not wired up.
  - Tauri IPC mocking (e.g. intercepting `invoke` calls) is missing.
  - Utilities for seeding and clearing application data (local stores, job queues, etc.) are not implemented.

- **Vitest covers logic, but not the full vertical integration**
  - Vitest already exercises orchestration and service logic, for example:
    - `src/services/**tests**/job-service.test.ts`
    - `src/composables/orchestrator/**tests**/orchestrator-clients.integration.test.ts`

  - However, there is **no cross-check** that the **frontend bridge actually talks to the real Tauri backend** and behaves correctly end-to-end (UI → bridge → Tauri → filesystem).

---

## 2. Plan to Expand E2E Coverage

### 2.1 Foundation / Infrastructure

Goal: Make it trivial for any E2E test to boot the real Tauri app, attach a Playwright `page` to the WebView, and start from a clean, deterministic app state.

- **Enable remote debugging for the Tauri production bundle**
  - In `tauri.conf.json`, enable `enableRemoteDebugging`.
  - This allows Playwright to connect to the Tauri WebView via the Chrome DevTools Protocol (CDP).

- **Complete `launchTauriApp` helper**
  - Implement `launchTauriApp` in `e2e/helpers/tauri.ts` to:
    - Resolve the correct path to the built Tauri bundle (e.g. `.app` on macOS).
    - Start the app process and wait until it is ready (main window available, devtools endpoint active).
    - Ensure proper cleanup after each test (close windows, kill process).

- **Implement `connectToTauriWebView`**
  - Use CDP to attach Playwright’s `page` object to the Tauri WebView.
  - Wrap this logic in a `test.extend` fixture so every spec automatically gets something like:

    ```ts
    test('...', async ({ app, page }) => { ... })
    ```

  - This standardizes how tests acquire `app` and `page`, reducing boilerplate.

- **Add storage helpers for app data**
  - Detect the app data directory on macOS (e.g. `~/Library/Application Support/com.honeymelon.app`).
  - Implement:
    - `clearAppData()` to wipe relevant JSON/SQLite stores (preferences, jobs, licenses, etc.).
    - `setAppData()` to seed specific scenarios (e.g. existing jobs, trial state, license expired).

  - These helpers ensure tests start from a known baseline and can reproduce tricky stateful flows.

- **Implement realistic drag & drop**
  - Introduce a `simulateFileDrop` helper that:
    - Uses `page.evaluateHandle` to create and dispatch `DragEvent`s.
    - Injects a `DataTransfer` object with fake file entries that the app can read.

  - This lets tests exercise the same drag & drop flow users experience when adding media.

- **Implement Tauri command mocking (`mockTauriCommands`)**
  - Inject JS in the WebView that wraps `window.__TAURI_INTERNALS__.invoke` (or the equivalent) and:
    - Returns mocked responses for specific commands.
    - Enables tests to force error scenarios without hitting the real backend.

  - Ideal for stress-testing error flows, edge cases, and telemetry paths.

- **Introduce fixture generation via `media-fixtures.ts`**
  - Use `e2e/helpers/media-fixtures.ts` to:
    - Pre-generate small media files (e.g. tiny MP4, MP3, and intentionally corrupted files).
    - Run this as a pre-step for CI and cache the artifacts.

  - This keeps tests fast, deterministic, and independent of external assets.

---

### 2.2 Playwright Scenario Coverage

Goal: Encode the core user journeys and critical edge cases as executable Playwright specs.

- **Launch & Smoke Tests (`app-launch.spec.ts`)**
  - Verify the splash screen (if any) and main window appear.
  - Confirm the primary UI loads and the initial preset list renders.
  - Detect and assert capability errors (e.g. missing FFmpeg, unsupported codecs).

- **Preset Selection & Settings**
  - Interact with preset filters and categories.
  - Change preferences (e.g. default output folder, quality settings).
  - Close and reopen the app to confirm preferences persist correctly.

- **Conversion Flow**
  - Simulate dropping multiple files via `simulateFileDrop`.
  - Select different presets and trigger conversions.
  - Observe queue states transitioning from `queued → running → completed`.
  - Assert that:
    - Output files exist in the target directory, **or**
    - The UI clearly shows success (progress bars, status text, job cards).

- **Error Handling**
  - Use `mockTauriCommands` to inject backend failures such as:
    - `job_invalid_args`
    - `job_already_running`
    - Disk full errors
    - Corrupted probe/metadata responses

  - Assert that:
    - `job://error` events are emitted.
    - Error toasts, banners, or logs appear as expected.

- **Job Queue Behavior**
  - Add, remove, and duplicate jobs in the queue.
  - Validate “exclusive job” behavior (e.g. certain jobs block others).
  - Adjust the concurrency slider and ensure it drives the backend (e.g. `set_max_concurrency` command).

- **License Flows**
  - Seed license data via `setAppData` for different states:
    - Fresh trial
    - Expired trial
    - Activated license

  - Test activation flow with valid and invalid network responses (mocked or proxied).
  - Ensure UI reflects trial countdown, grace periods, and locked features.

- **Internationalization (i18n)**
  - Change locale from the UI or seeded state.
  - Verify key screens render translated text.
  - Confirm directionality and layout if right-to-left (RTL) languages are added later.

- **Drag & Drop + Desktop Bridges**
  - Use `simulateFileDrop` to ensure `useDesktopBridge` reacts correctly.
  - Test menu keyboard shortcuts (e.g. ⌘O, ⌘Q) by emitting app events (`app.emit`) and verifying behavior.

- **Recovery & Resilience**
  - Start a conversion queue, then forcibly close/kill the Tauri app mid-run.
  - Relaunch the app and verify that:
    - Persisted jobs rehydrate correctly.
    - The queue resumes or recovers gracefully.

---

### 2.3 Vitest + Bridge Coverage

Goal: Strengthen the “bridge” layer between frontend code and Tauri APIs, ensuring orchestration logic and UI stay in sync.

- **Service behavior with mocked Tauri API**
  - Add Vitest suites that mock `@tauri-apps/api/core` to validate:
    - `executionService.start()` correctly handles already-running or exclusive jobs.
    - `executionService.cancel()` performs proper cleanup and error handling.

  - Some groundwork already exists in:
    - `src/services/**tests**/execution-service.integration.test.ts`

- **Event bridge and telemetry**
  - Add tests for composables such as `useDesktopBridge` and `useTauriEvents` to ensure:
    - `job://error` and other telemetry events are consumed correctly.
    - Queue stores and UI state update as expected when new events arrive.

---

### 2.4 CI & Developer Ergonomics

Goal: Make running and maintaining E2E tests easy for both local development and CI.

- **NPM scripts**
  - Add scripts such as:
    - `"test:e2e"` – headless, full E2E suite.
    - `"test:e2e:ui"` – launches Playwright’s UI mode for local debugging.
    - `"test:e2e:smoke"` – a fast subset for quick checks on PRs.

- **E2E documentation**
  - Create a short `e2e/README.md` with:
    - Prerequisites (FFmpeg installed, remote debugging enabled).
    - How to generate media fixtures.
    - Common commands and troubleshooting tips (e.g. what to do when the app doesn’t launch).

- **CI artifacts**
  - Configure Playwright’s HTML report and upload it as a CI artifact.
  - Optionally, capture video or screenshot artifacts for failing tests to speed up debugging.

---

### 2.5 Stretch Goals

These are enhancements that can be tackled once the core E2E pipeline is in place.

- **Cross-platform E2E configuration**
  - Parameterize Playwright config to support Windows and Linux once Tauri bundles for those platforms are available.
  - Ensure path resolution, app data directories, and environment specifics are handled per OS.

- **Component-level UI testing**
  - Use Playwright component testing or Storybook to test Vue components that rely heavily on Tauri events.
  - Mock Tauri APIs at the component level to verify behavior without booting the entire app.

- **Synthetic license server / proxy**
  - Introduce a small mock license server or HTTP proxy:
    - Avoids hardcoding license keys in tests.
    - Enables controlled responses for activation, renewal, and revocation flows.

  - Integrate this mock into both E2E and integration tests for consistent license behavior.
