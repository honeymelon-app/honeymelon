# Honeymelon Codebase Refactoring Plan

A comprehensive refactor to fix SOLID/DRY/KISS violations, introduce clear patterns, and preserve existing behavior and tests.

---

## Phase 1 — Foundation: Remove Duplicates ✅ **Completed**

**Duration:** ~1 day (planned 1–2 weeks)

### 1.1 Shared Binary Resolver (Rust) ✅

- **File:** `src-tauri/src/binary_resolver.rs` (~197 lines)
- **What changed:**
  - Centralized FFmpeg/FFprobe path resolution (extracted from 3 files).
  - Unified 4-tier fallback: **env var → dev bundle → app bundle → PATH**.
  - Updated call sites: `ffmpeg_probe.rs`, `ffmpeg_capabilities.rs`, `ffmpeg_runner.rs`.
  - Removed ~95 lines of duplication.

- **Tests:** All **78** Rust tests passing.

### 1.2 Consolidated Progress Parsing ✅

- **What changed:**
  - Removed frontend parsing in `use-job-orchestrator.ts` (~119 lines deleted).
  - Kept single parsing implementation in `ffmpeg_runner.rs`.
  - Frontend now consumes parsed progress events directly from Rust.
  - Removed: `parseProgressFromRaw()`, `mergeProgressMetrics()`, `parseTimecode()`.

- **Tests:** TypeScript builds successfully.

### 1.3 Error Handler (TypeScript) ✅

- **File:** `src/lib/error-handler.ts` (~91 lines)
- **What changed:**
  - Centralized error parsing/formatting (4 call sites updated in `use-job-orchestrator.ts`).
  - Replaced duplicate `parseErrorDetails()` with:
    - `ErrorHandler.parseErrorDetails()`
    - `ErrorHandler.formatCompletionError()`

- **Tests:** TypeScript builds successfully.

**Phase 1 Results**

- All functionality preserved.
- **78**/78 Rust tests passing; TS builds clean.
- **~210+** duplicate lines removed.
- DRY applied across Rust/TypeScript.
- Improved Single Responsibility across modules.

---

## Phase 2 — Break Up God Objects (Medium Risk)

**Duration:** 2–3 weeks

### 2.1 Split `ffmpeg-plan.ts` (684 → ~4 files)

**New files**

- `src/lib/planners/video-planner.ts` — video action planning
- `src/lib/planners/audio-planner.ts` — audio action planning
- `src/lib/planners/subtitle-planner.ts` — subtitle handling
- `src/lib/builders/ffmpeg-args-builder.ts` — argument construction

**Refactor `planJob()`**

```ts
// Before: monolithic ~241 lines
export function planJob(...) { /* 241 lines */ }

// After: composition of focused classes
export function planJob(summary, preset, tier, capabilities) {
  const videoPlanner = new VideoPlanner(capabilities);
  const audioPlanner = new AudioPlanner(capabilities);
  const subtitlePlanner = new SubtitlePlanner();
  const argsBuilder = new FFmpegArgsBuilder();

  const videoAction = videoPlanner.plan(summary, preset, tier);
  const audioAction = audioPlanner.plan(summary, preset, tier);
  const subtitlePlan = subtitlePlanner.plan(summary, preset);

  const ffmpegArgs = argsBuilder
    .withVideo(videoAction)
    .withAudio(audioAction)
    .withSubtitles(subtitlePlan)
    .build();

  return { preset, ffmpegArgs, remuxOnly, notes, warnings };
}
```

### 2.2 Split `ffmpeg_runner.rs` (1,223 → ~6 files)

**New modules**

- `src-tauri/src/runner/validator.rs` — args & concurrency validation
- `src-tauri/src/runner/concurrency.rs` — concurrency limits
- `src-tauri/src/runner/output_manager.rs` — output/temp path handling
- `src-tauri/src/runner/process_spawner.rs` — FFmpeg spawn
- `src-tauri/src/runner/progress_monitor.rs` — progress/events
- `src-tauri/src/runner/mod.rs` — public API orchestration

**Refactor `start_job()`**

```rust
// Before: ~288 lines
pub async fn start_job(...) { /* 288 lines */ }

// After: orchestrates dedicated modules
pub async fn start_job(job_id: String, args: Vec<String>, ...) -> Result<()> {
    JobValidator::new()
        .validate_args(&args)?
        .validate_concurrency(&job_id)?;

    let ffmpeg_path = BinaryResolver::resolve_ffmpeg()?;
    let output_path = OutputManager::prepare(&output, exclusive)?;

    let mut process = ProcessSpawner::spawn(ffmpeg_path, &args, &output_path)?;
    ProgressMonitor::start(job_id, &mut process, duration_hint).await
}
```

### 2.3 Split `jobs.ts` (425 → ~4 files)

**New files**

- `src/stores/job-queue.ts` — queue ops (add/remove/peek)
- `src/stores/job-state.ts` — state transitions
- `src/stores/job-progress.ts` — progress tracking
- `src/stores/job-logs.ts` — log management

**Facade**

```ts
export const useJobsStore = defineStore('jobs', () => {
  const queue = useJobQueue();
  const state = useJobState();
  const progress = useJobProgress();
  const logs = useJobLogs();
  return { ...queue, ...state, ...progress, ...logs };
});
```

### 2.4 Split `use-job-orchestrator.ts` (853 → ~5 files)

**New composables**

- `src/composables/use-event-manager.ts` — Tauri event handling
- `src/composables/use-notification-service.ts` — desktop notifications
- `src/composables/use-path-sanitizer.ts` — path utilities
- `src/composables/use-probe-service.ts` — media probing
- `src/composables/use-execution-service.ts` — job execution

---

## Phase 3 — Design Patterns (Medium Risk)

**Duration:** 2–3 weeks

### 3.1 Strategy — Encoder Selection

- **File:** `src/lib/strategies/encoder-strategy.ts`

```ts
interface EncoderSelectionStrategy {
  selectEncoder(codec: VCodec, capabilities?: CapabilitySnapshot): string | null;
}
class HardwareFirstStrategy implements EncoderSelectionStrategy {
  /* ... */
}
class SoftwareOnlyStrategy implements EncoderSelectionStrategy {
  /* ... */
}
```

**Replace** hard-coded `VIDEO_ENCODERS` / `AUDIO_ENCODERS` maps with strategies.

### 3.2 Factory — Job Creation

- **File:** `src/factories/job-factory.ts`

```ts
export class JobFactory {
  static create(path: string, preset: Preset, tier: Tier): JobRecord {
    const base = { id: randomUUID(), path, presetId: preset.id, tier };
    if (preset.mediaKind === 'video') return this.createVideoJob(base);
    if (preset.mediaKind === 'audio') return this.createAudioJob(base);
    return this.createImageJob(base);
  }
}
```

### 3.3 Builder — FFmpeg Arguments

- **File:** `src/lib/builders/ffmpeg-args-builder.ts`

```ts
export class FFmpegArgsBuilder {
  private args: string[] = ['-y', '-nostdin'];
  withInput(path: string): this {
    /* ... */
  }
  withVideoCodec(codec: string, options?: VideoOptions): this {
    /* ... */
  }
  withAudioCodec(codec: string, options?: AudioOptions): this {
    /* ... */
  }
  withProgress(): this {
    this.args.push('-progress', 'pipe:2');
    return this;
  }
  build(): string[] {
    return this.args;
  }
}
```

### 3.4 Observer — Job State Changes

- **File:** `src/observers/job-observer.ts`

```ts
interface JobStateObserver {
  onStateChange(jobId: string, oldState: JobState, newState: JobState): void;
}
export class JobMetricsObserver implements JobStateObserver {
  /* ... */
}
export class JobNotificationObserver implements JobStateObserver {
  /* ... */
}
```

### 3.5 Chain of Responsibility — Validation (Rust)

- **File:** `src-tauri/src/runner/validation_chain.rs`

```rust
trait Validator {
    fn validate(&self, ctx: &ValidationContext) -> Result<()>;
    fn next(&self) -> Option<&dyn Validator>;
}
pub struct ArgumentValidator { /* next: Option<Box<dyn Validator>> */ }
pub struct ConcurrencyValidator { /* ... */ }
pub struct PathValidator { /* ... */ }
```

---

## Phase 4 — Service Layer (Low Risk)

**Duration:** ~1 week

**New files**

- `src/services/probe-service.ts` — wrap probe ops
- `src/services/planning-service.ts` — wrap planning
- `src/services/execution-service.ts` — wrap execution

**Benefits**

- Clear separation of concerns
- Easier unit testing & dependency injection
- Reduced orchestrator complexity

---

## Phase 5 — Repository Pattern (Optional)

**Duration:** ~1 week

**New file**

- `src/repositories/job-repository.ts`

```ts
export interface JobRepository {
  getById(id: JobId): JobRecord | undefined;
  getAll(): JobRecord[];
  getByStatus(status: JobStatus): JobRecord[];
  save(job: JobRecord): void;
  delete(id: JobId): void;
}
```

_Note:_ Current in-memory `Map` is fine; repository abstraction enables future persistence (IndexedDB/SQLite).

---

## Testing Strategy

**Per phase**

- **Before:** run full suite — `npm test && cd src-tauri && cargo test`
- **During:** keep all existing tests green (no behavior changes)
- **After:** add integration tests for new abstractions
- **Smoke:** `npm run tauri dev` and validate critical flows with real media

**Coverage goals**

- Keep **100%** of existing Rust tests (~108 tests)
- Maintain existing TS tests
- Add unit tests for all new classes/modules
- Add integration tests for refactored boundaries

---

## Migration Strategy

**Incremental steps**

1. Create new abstraction alongside old code.
2. Add tests around new abstraction.
3. Gradually migrate call sites.
4. Remove old code when unused.
5. One PR per major refactor (reviewable size).

**Example (VideoPlanner)**

```ts
// Step 1
export class VideoPlanner {
  /* ... */
}

// Step 2
const videoPlanner = new VideoPlanner(capabilities);
const videoAction = videoPlanner.plan(summary, preset, tier);
// (Old code temporarily retained/commented)

// Step 3
// Remove old code once validated
```

---

## Risk Mitigation

**High-risk areas**

- `ffmpeg_runner.rs` — core execution & edge cases
- `jobs.ts` — state machine
- `ffmpeg-plan.ts` — complex branching

**Mitigations**

- Start with low-risk extractions
- Add characterization tests first
- Lean on Rust/TS types to prevent regressions
- Manual testing with varied real media
- Granular commits; easy to revert

---

## Success Criteria

**Code metrics**

- No function **> 100** lines
- No file **> 400** lines
- Cyclomatic complexity **< 10** per function
- No duplicate block **> 10** lines

**Maintainability**

- SOLID upheld
- DRY: no duplicate logic
- KISS: simple, clear abstractions
- Patterns used appropriately

**Functionality**

- All existing tests pass
- No public API breakage
- Smoke tests clean
- Performance equal or better

---

## Timeline (Estimate)

| Phase                    | Duration  |
| ------------------------ | --------- |
| 1. Foundation            | **Done**  |
| 2. Break up god objects  | 2–3 weeks |
| 3. Design patterns       | 2–3 weeks |
| 4. Service layer         | 1 week    |
| 5. Repository (optional) | 1 week    |

**Total:** ~7–10 weeks (some phases can run in parallel when dependencies allow).
