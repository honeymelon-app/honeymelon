<h1 align="center">Honeymelon</h1>

<p align="center">
  A professional media converter built for macOS Apple Silicon.<br />
  Remux-first, privacy-minded, and tuned for post-production workflows.
</p>

<p align="center">
  <a href="#license"><img src="https://img.shields.io/badge/License-Proprietary-red.svg" alt="License: Proprietary"></a>
  <a href="https://www.apple.com/macos"><img src="https://img.shields.io/badge/macOS-13.0+-blue.svg" alt="macOS 13+"></a>
  <a href="https://www.apple.com/mac/"><img src="https://img.shields.io/badge/Apple%20Silicon-Native-brightgreen.svg" alt="Apple Silicon Native"></a>
</p>

---

- [Overview](#overview)
- [Feature Highlights](#feature-highlights)
- [System Requirements](#system-requirements)
- [Install Honeymelon](#install-honeymelon)
- [Development Quick Start](#development-quick-start)
- [Command Reference](#command-reference)
- [Architecture Notes](#architecture-notes)
- [Testing \& QA](#testing--qa)
- [Release Checklist](#release-checklist)
- [Documentation](#documentation)
- [License](#license)
  - [Stage 1: Probe](#stage-1-probe)
  - [Stage 2: Plan](#stage-2-plan)
  - [Stage 3: Execute](#stage-3-execute)
- [Architecture](#architecture)
  - [Technology Stack](#technology-stack)
  - [Project Structure](#project-structure)
  - [Architectural Principles](#architectural-principles)
- [Installation](#installation)
  - [Option 1: Pre-built Binary (Recommended)](#option-1-pre-built-binary-recommended)
  - [Option 2: Build from Source](#option-2-build-from-source)
- [Building from Source](#building-from-source)
  - [Prerequisites](#prerequisites)
  - [Build Steps](#build-steps)
  - [Advanced Build Configuration](#advanced-build-configuration)
- [Configuration](#configuration)
  - [Application Preferences](#application-preferences)
  - [Preset System](#preset-system)
  - [Environment Variables](#environment-variables)
- [Usage](#usage)
  - [Basic Workflow](#basic-workflow)
  - [Keyboard Shortcuts](#keyboard-shortcuts)
  - [Menu Bar](#menu-bar)
- [Development](#development)
  - [Development Environment Setup](#development-environment-setup)
  - [Available npm Scripts](#available-npm-scripts)
  - [Development Guidelines](#development-guidelines)
  - [Testing](#testing)
- [Legal \& Licensing](#legal--licensing)
  - [Proprietary Software](#proprietary-software)
  - [FFmpeg Licensing](#ffmpeg-licensing)
  - [Patent Considerations](#patent-considerations)
  - [Third-Party Software](#third-party-software)
  - [Distribution Requirements](#distribution-requirements)
- [Troubleshooting](#troubleshooting)
  - [Common Issues](#common-issues)
  - [Performance Optimization](#performance-optimization)
  - [Getting Help](#getting-help)
- [Contributing](#contributing)
  - [Development Priorities](#development-priorities)
  - [Code Style Requirements](#code-style-requirements)
- [Acknowledgements](#acknowledgements)
- [License](#license-1)
  - [Honeymelon Application](#honeymelon-application)
  - [FFmpeg](#ffmpeg)
  - [Third-Party Dependencies](#third-party-dependencies)

---

## Overview

Honeymelon is a native desktop application that wraps FFmpeg with a thoughtful user experience tailored to editors and finishing teams. The app prioritises lossless remuxing, file privacy, and predictable render times. All conversions run locally on Apple Silicon and no media ever leaves the machine.

Key technology:

- **Frontend**: Vue 3 + TypeScript, Pinia state, shadcn-vue components, Tailwind CSS.
- **Backend**: Tauri 2.x with a Rust command layer that probes, plans, and executes FFmpeg jobs out of process.
- **Processes**: FFmpeg and FFprobe binaries are bundled (LGPL compliant) and orchestrated with concurrency limits, exclusive locks, and streaming progress events.

---

## Feature Highlights

- **Remux-first conversion pipeline**
  Dynamically decides between stream copy or transcode based on container rules, capabilities, and preset tiers.

- **Preset library across media types**
  Ready-to-ship presets for video, audio, and stills (PNG/JPEG/WebP) with tiered quality defaults, subtitle handling policies, and colour metadata preservation.

- **Job queue designed for teams**
  Drag-and-drop folders, edit preset assignments before start, track ETA, view logs, and receive macOS notifications on completion or failure.

- **FFmpeg capability awareness**
  Bundled FFmpeg binaries are interrogated at runtime so unsupported encoders are filtered automatically.

- **Privacy by design**
  No telemetry, network access, or cloud dependencies. Output destination is configurable per machine with a dedicated chooser.

---

## System Requirements

| Requirement      | Minimum                          | Recommended                         |
| ---------------- | -------------------------------- | ----------------------------------- |
| Operating system | macOS 13 (Ventura)               | macOS 14 (Sonoma) or newer          |
| Hardware         | Apple Silicon (M1/M2/M3/M4)      | M2 Pro/Max for heavy 4K+ workloads  |
| Memory           | 4 GB                             | 16 GB for concurrent 4K conversions |
| Disk space       | 50 MB app + headroom for outputs | ≥ 500 MB free for temporary files   |
| Network          | Not required for day-to-day use  | Optional for future update channels |

> **Note**: Honeymelon is compiled exclusively for Apple Silicon (ARM64 architecture). Intel-based Macs are **not supported**.

---

## Install Honeymelon

1. Download the latest signed DMG from the [Releases](../../releases) page.
2. Drag `Honeymelon.app` into `/Applications`.
3. On first launch, macOS Gatekeeper may prompt you to confirm the developer; choose **Open**.
4. (Optional) Grant **Full Disk Access** if you intend to read or write media inside protected folders (Library, Photos, removable drives, etc.).

For air-gapped deployments you can distribute the DMG and FFmpeg binaries internally—no activation or online checks occur.

---

## Development Quick Start

```bash
# 1. Install dependencies (FFmpeg binaries download during postinstall)
npm install

# 2. Start the web UI in Vite (useful when iterating on Vue components)
npm run dev

# 3. Launch the desktop shell with live reload
npm run tauri dev
```

To regenerate the bundled FFmpeg and FFprobe binaries for Apple Silicon:

```bash
npm run download-ffmpeg
```

> The script fetches arm64 builds from osxexperts.net and places them under `src-tauri/resources/bin`. Ensure you review licensing obligations before shipping custom builds.

---

## Command Reference

| Task                          | Command                             |
| ----------------------------- | ----------------------------------- |
| Install dependencies          | `npm install`                       |
| Format source (Prettier)      | `npm run format` / `format:js`      |
| Lint (ESLint + Clippy)        | `npm run lint`                      |
| Unit tests (Vitest)           | `npm run test:unit`                 |
| End-to-end tests (Playwright) | `npm run test:e2e` (optional suite) |
| Type-check Vue components     | `npm run type-check`                |
| Build web assets              | `npm run build`                     |
| Run Tauri desktop app         | `npm run tauri dev`                 |
| Build signed macOS bundle     | `npm run tauri build`               |
| Generate docs locally         | `npm run docs:dev`                  |

Rust-specific tooling can be invoked inside `src-tauri/`:

```bash
cd src-tauri
cargo fmt --all
cargo clippy --all-targets --all-features -- -D warnings
cargo test
```

---

## Architecture Notes

- **Probe → Plan → Execute workflow**
  1. The Rust layer calls FFprobe and summarises duration, codecs, resolution, subtitles, and colour metadata.
  2. The TypeScript planner (`src/lib/ffmpeg-plan.ts`) selects an appropriate preset tier, determines copy vs transcode strategy, and produces FFmpeg arguments.
  3. The Rust runner streams progress via Tauri events, managing exclusive locks for heavy codecs (AV1, ProRes) and writing to temporary files before atomic rename.

- **Notification support**
  Successful or failed jobs trigger macOS toast notifications (via `@tauri-apps/plugin-notification`); permission prompts occur only once.

- **Capability snapshots**
  FFmpeg encoder, format, and filter lists are cached in `~/Library/Caches/com.honeymelon.desktop/ffmpeg-capabilities.json` to avoid repeated probes.

---

## Testing & QA

| Stage              | Command                           | Purpose                                                    |
| ------------------ | --------------------------------- | ---------------------------------------------------------- |
| Type safety        | `npm run type-check`              | Validates Vue + TypeScript integration                     |
| Unit tests (JS)    | `npm run test:unit`               | Exercises planners, stores, utilities                      |
| Unit tests (Rust)  | `cargo test` (inside `src-tauri`) | Validates error handling, path logic, FFmpeg runner        |
| Lint / formatting  | `npm run lint`, `npm run format`  | Enforces project conventions                               |
| Desktop smoke test | `npm run tauri dev`               | Manual verification of queue management and UI             |
| Distribution build | `npm run tauri build`             | Produces signed `.app` and `.dmg` under `src-tauri/target` |

Continuous integration should cover at least `npm run lint`, `npm run test:unit`, `npm run build`, and `cargo test` to prevent regressions.

---

## Release Checklist

Follow this checklist for production-ready releases:

1. **Version Bump**: Increment versions in `package.json`, `src-tauri/Cargo.toml`, and `src-tauri/tauri.conf.json`.
2. **Changelog**: Update `CHANGELOG.md` with release notes and link references.
3. **Quality Assurance**: Run full QA suite:

   ```bash
   npm run format
   npm run lint
   npm run test:unit
   npm run build
   (cd src-tauri && cargo test)
   ```

4. **Code Signing Setup**: Ensure environment variables are set (see Advanced Build Configuration above):
   - `APPLE_ID`
   - `APPLE_PASSWORD`
   - `APPLE_TEAM_ID`
   - `APPLE_SIGNING_IDENTITY`
5. **Build Signed Bundle**: `npm run tauri:build` (includes automatic notarization)
6. **Verify Signature**: Run verification commands on the built app:

   ```bash
   codesign -vvv --deep --strict src-tauri/target/aarch64-apple-darwin/release/bundle/macos/Honeymelon.app
   spctl -a -vvv -t install src-tauri/target/aarch64-apple-darwin/release/bundle/macos/Honeymelon.app
   ```

7. **Generate Checksum**: Create SHA256 checksum for the DMG:

   ```bash
   shasum -a 256 src-tauri/target/aarch64-apple-darwin/release/bundle/dmg/Honeymelon_*.dmg > SHA256SUMS.txt
   ```

8. **Create GitHub Release**: Upload the DMG, changelog, and checksum to the GitHub Release tagged `vX.Y.Z`.
9. **Smoke Test**: Test the distributed binary on a clean Apple Silicon machine:
   - First launch (Gatekeeper check)
   - Basic conversion workflow
   - Preferences and settings
   - Notification permissions
10. **Announce**: Update documentation and notify users of the new release.

---

## Documentation

The full documentation set lives under [`docs/`](./docs/), powered by VitePress:

- [User Guide](./docs/guide/) – onboarding, presets, batch conversion, troubleshooting.
- [Architecture](./docs/architecture/) – deep dive into the planner, stores, and native integration.
- [Development](./docs/development/) – contribution workflow, coding standards, commit strategy.
- [Legal](./docs/legal/) – license compliance, third-party notices, and distribution guidance.

Generate and preview locally:

```bash
npm run docs:dev   # live preview at http://localhost:5173
npm run docs:build # emit static assets into docs/.vitepress/dist
```

---

## License

Honeymelon is distributed under a proprietary licence. See the [LICENSE](LICENSE) file for terms, and review the LGPL obligations outlined in [`docs/legal`](./docs/legal/) when shipping bundled FFmpeg binaries.

### Stage 1: Probe

**Purpose**: Extract comprehensive metadata from input media files

**Process**:

1. Execute `ffprobe` via Tauri command interface (`probe_media`)
2. Parse JSON output with `-print_format json -show_format -show_streams`
3. Generate `ProbeSummary` object containing:
   - Duration in seconds
   - Video: codec name, width, height, FPS, color metadata (primaries, TRC, colorspace)
   - Audio: codec name, channels, sample rate
   - Subtitles: presence flags for text vs. image-based subtitles

**Implementation**:

- Frontend: `src/lib/ffmpeg-probe.ts`
- Backend: `src-tauri/src/ffmpeg_probe.rs`

**Output**: `ProbeSummary` type passed to planning stage

### Stage 2: Plan

**Purpose**: Determine optimal conversion strategy based on source characteristics and target preset

**Process**:

1. Resolve preset by ID from dynamically-generated preset list
2. Evaluate source codecs against target preset requirements
3. Apply container compatibility rules from `src/lib/container-rules.ts`
4. Determine action for each stream type:
   - **Copy**: Source codec matches target codec → use `-c:v copy` or `-c:a copy`
   - **Transcode**: Codec mismatch → use encoder (e.g., `-c:v libx264`)
   - **Drop**: Stream not needed → use `-vn`, `-an`, or `-sn`
5. Apply tier-specific quality settings (bitrate, CRF, profile)
6. Add container-specific flags (e.g., `-movflags +faststart` for MP4)
7. Generate complete FFmpeg argument array

**Decision Matrix**:

- **Full Remux**: Video copy + Audio copy + Subtitle copy → `remuxOnly = true`
- **Container Remux**: Codec compatible, different container → stream copy
- **Partial Transcode**: One stream copied, another transcoded
- **Full Transcode**: All streams require re-encoding

**Special Cases**:

- **GIF output**: Uses complex filter chain for palette generation:

  ```
  [0:v]fps=<fps>,scale=<width>:-2:flags=lanczos,split[s0][s1];
  [s0]palettegen=stats_mode=single[p];[s1][p]paletteuse[out]
  ```

- **Color metadata**: Copied when transcoding and `copyColorMetadata: true`
- **Subtitle conversion**: Text subs → mov_text for MP4, kept as-is for MKV

**Implementation**: `src/lib/ffmpeg-plan.ts`, `src/lib/container-rules.ts`, `src/lib/presets.ts`

**Output**: `PlannerDecision` object containing:

- `ffmpegArgs`: Complete argument array (e.g., `['-map', '0:v:0?', '-c:v', 'copy', ...]`)
- `remuxOnly`: Boolean flag (true if all streams copied)
- `notes`: Human-readable decision explanations
- `warnings`: Potential compatibility or quality issues

### Stage 3: Execute

**Purpose**: Execute FFmpeg conversion with progress tracking and concurrency management

**Process**:

1. **Job Validation**:
   - Check if job already running
   - Validate concurrency limit (default: 2 jobs, max: determined by user preference)
   - Check exclusive job constraints (AV1, ProRes block other jobs)

2. **FFmpeg Path Resolution** (in order):
   - Check `$HONEYMELON_FFMPEG_PATH` environment variable
   - Look for development bundled binary: `src-tauri/resources/bin/ffmpeg`
   - Look for production bundled binary: `<ResourceDir>/bin/ffmpeg`
   - Fall back to system `ffmpeg` in PATH

3. **Output File Handling**:
   - Create parent directories if needed
   - Write to temporary file: `<output>.tmp` (atomic safety)
   - On success: Rename `.tmp` → final filename (atomic operation)
   - On failure: Remove `.tmp` file (cleanup)

4. **Process Spawning**:

   ```rust
   Command::new(ffmpeg_path)
       .args(["-y", "-nostdin", "-progress", "pipe:2", "-i", <input>, ...args])
       .arg(&temp_output_path)
       .stdin(Stdio::null())
       .stdout(Stdio::null())
       .stderr(Stdio::piped())  // Capture for progress parsing
       .spawn()
   ```

5. **Background Monitoring**:
   - Reads stderr line-by-line in async task
   - Parses progress lines: `frame=X fps=Y time=HH:MM:SS.MS speed=Zx`
   - Emits `ffmpeg://progress` event with parsed metrics
   - Emits `ffmpeg://stderr` event with raw stderr lines
   - Stores last 500 log lines in circular buffer

6. **Progress Parsing**:
   - Extract `processed_seconds` from `time=HH:MM:SS.MS`
   - Extract `fps` (frames per second during encoding)
   - Extract `speed` (encoding speed relative to playback, e.g., `2.5x`)
   - Calculate ratio: `processed / duration` (if duration known)

7. **Completion Handling**:
   - Wait for process exit
   - Check exit code (0 = success, non-zero = failure)
   - On success: Rename temp → final output
   - Emit `ffmpeg://completion` event with status
   - Remove process from active jobs map

**Concurrency Management**:

- **Active job limit**: Configurable (default: 2, range: 1-∞)
- **Exclusive jobs**: AV1 and ProRes codecs set `exclusive: true`
  - Blocks all other jobs from starting
  - Prevents resource exhaustion on CPU-intensive encodes
- **Queue behavior**: Jobs return `job_concurrency_limit` error → frontend requeues automatically

**Implementation**:

- Backend: `src-tauri/src/ffmpeg_runner.rs`
- Frontend: `src/composables/use-job-orchestrator.ts`

**Events**:

- `ffmpeg://progress`: Emitted per stderr line (~10 times/sec during active encoding)
- `ffmpeg://stderr`: Raw stderr lines for logging
- `ffmpeg://completion`: Final status with success/failure/cancellation flag

---

## Architecture

### Technology Stack

**Frontend**

- **Framework**: Vue 3 with Composition API and `<script setup>` syntax
- **Language**: TypeScript (strict mode enabled)
- **State Management**: Pinia for job queue (`jobs.ts`) and user preferences (`prefs.ts`)
- **UI Components**: shadcn-vue (Reka UI primitives + Tailwind styling)
- **Styling**: Tailwind CSS 4.x with utility-first approach
- **Build Tool**: Vite 6.x with vue-tsc type checking

**Backend**

- **Framework**: Tauri 2.x for native desktop integration
- **Language**: Rust (Edition 2021) with async/await
- **Process Management**: Tokio async runtime for FFmpeg child process handling
- **IPC**: Tauri command system (invoke) and event emitter
- **Concurrency**: Mutex-based process map with atomic counters

**External Dependencies**

- **Media Processing**: FFmpeg/FFprobe (out-of-process, no linking)
- **Hardware Acceleration**: Apple VideoToolbox (system-provided, used by libx264/libx265 on macOS)

### Project Structure

```
honeymelon/
├── src/                            # Frontend source code (Vue + TypeScript)
│   ├── app.vue                     # Root component (dropzone, job list, menu events)
│   ├── lib/                        # Core business logic (pure functions, no I/O)
│   │   ├── ffmpeg-probe.ts         # FFprobe wrapper (Tauri command invocation)
│   │   ├── ffmpeg-plan.ts          # Conversion planning engine (copy vs transcode logic)
│   │   ├── container-rules.ts      # MP4/MKV/WebM/MOV codec compatibility rules
│   │   ├── presets.ts              # Dynamic preset generation (all container pairs)
│   │   ├── media-formats.ts        # Container type arrays and helpers
│   │   ├── capability.ts           # Encoder capability detection (loads from backend)
│   │   ├── file-discovery.ts       # Tauri command wrapper for recursive file expansion
│   │   ├── types.ts                # TypeScript type definitions (discriminated unions)
│   │   └── utils.ts                # File size/duration formatting, path manipulation
│   ├── stores/                     # Pinia state management
│   │   ├── jobs.ts                 # Job queue state machine (queued→probing→planning→running→completed/failed/cancelled)
│   │   └── prefs.ts                # User preferences (concurrency, output dir, filename options)
│   ├── composables/                # Vue composables
│   │   └── use-job-orchestrator.ts # Probe→Plan→Execute lifecycle orchestration + event listeners
│   ├── components/                 # Vue components
│   │   ├── JobQueueItem.vue        # Individual job card (progress, status, actions)
│   │   ├── AboutDialog.vue         # About window
│   │   ├── PreferencesDialog.vue   # Settings dialog
│   │   └── ui/                     # shadcn-vue components (auto-generated from CLI)
│   └── assets/                     # Static assets (icons, images)
│
├── src-tauri/                      # Rust backend
│   ├── src/
│   │   ├── lib.rs                  # Main entry point, Tauri setup, native menu bar
│   │   ├── main.rs                 # Binary entry (delegates to lib.rs)
│   │   ├── ffmpeg_probe.rs         # Spawns ffprobe, parses JSON, returns ProbeSummary
│   │   ├── ffmpeg_runner.rs        # FFmpeg process spawning, progress parsing, concurrency
│   │   ├── ffmpeg_capabilities.rs  # Queries `ffmpeg -encoders/-formats`, caches results
│   │   ├── fs_utils.rs             # Recursive media file discovery, file filtering
│   │   └── error.rs                # Unified AppError type for Tauri commands
│   ├── tauri.conf.json             # Tauri configuration (app ID, window settings, bundle config)
│   ├── Cargo.toml                  # Rust dependencies
│   ├── resources/                  # Bundled resources
│   │   └── bin/                    # Optional: bundled FFmpeg binaries
│   │       ├── ffmpeg              # (Place custom build here)
│   │       └── ffprobe
│   └── tests/                      # Rust integration tests
│       ├── command_integration_tests.rs
│       └── integration_tests.rs
│
├── e2e/                            # Playwright end-to-end tests (infrastructure exists, minimal tests)
├── docs/                           # Project documentation
│   ├── development/                # Development-related documentation
│   │   ├── AGENTS.md               # Commit/PR guidelines
│   │   ├── CLAUDE.md               # AI assistant development guide (codebase context)
│   │   ├── CONTRIBUTING.md         # Contribution guidelines
│   │   └── notes.md                # Development notes and scratchpad
│   ├── legal/                      # Legal and licensing documentation
│   │   ├── COMMERCIAL_LICENSE.md   # Commercial use guidance
│   │   ├── LICENSE_COMPLIANCE.md   # Technical LGPL compliance documentation
│   │   └── THIRD_PARTY_NOTICES.md  # Comprehensive dependency attribution
│   ├── CHANGELOG.md                # Version history and release notes
│   └── CODE_OF_CONDUCT.md          # Community code of conduct
├── LICENSES/                       # Third-party license files
│   └── FFMPEG-LGPL.txt             # FFmpeg LGPL v2.1 license
├── LICENSE                         # MIT license for Honeymelon application
├── CODEOWNERS                      # Code ownership definitions
├── package.json                    # Node.js dependencies and scripts
├── tsconfig.json                   # TypeScript compiler configuration
├── vite.config.ts                  # Vite build configuration
├── vitest.config.ts                # Vitest test configuration
├── eslint.config.js                # ESLint linting rules
└── README.md                       # This file
```

### Architectural Principles

**Process Separation (LGPL Compliance)**

- FFmpeg runs as **completely separate process** (spawned via `std::process::Command`)
- **No static linking** to FFmpeg libraries
- **No dynamic linking** to FFmpeg libraries
- Communication **exclusively** via:
  - Standard input/output (stdin/stdout/stderr)
  - File system (input files, output files)
- This approach satisfies LGPL requirements without affecting Honeymelon's MIT license

**Reactive State Management**

- Pinia stores manage job queue with **discriminated union types** for type-safe state transitions
- Job state flow: `queued → probing → planning → running → completed | failed | cancelled`
- **Immutable update pattern**: Each state mutation creates new JobRecord (enables time-travel debugging)
- Vue reactivity system ensures UI updates automatically when job state changes

**Event-Driven Progress**

- Tauri event system for **asynchronous** FFmpeg output streaming
- Frontend subscribes to events: `ffmpeg://progress`, `ffmpeg://completion`, `ffmpeg://stderr`
- **Non-blocking** progress updates maintain UI responsiveness
- Backend emits events from background async task (Tokio runtime)

**Capability Detection**

- Runtime detection of available FFmpeg encoders via `ffmpeg -encoders`
- Cached in `~/.cache/honeymelon/ffmpeg-capabilities.json`
- Currently **informational only** - presets not filtered based on capabilities (see improvement plan)
- Designed for future enhancement: disable presets when required encoder unavailable

**Type Safety**

- TypeScript strict mode enforced
- Discriminated unions for job states prevent invalid state access
- Rust type system prevents memory safety issues
- Tauri command serialization ensures type consistency across IPC boundary

---

## Installation

### Option 1: Pre-built Binary (Recommended)

1. Download the latest DMG from the [Releases](../../releases) page
2. Open the downloaded DMG file
3. Drag Honeymelon.app to your Applications folder
4. Launch Honeymelon from Applications or Spotlight

**First Launch**: macOS may display a security warning for unsigned applications. To allow:

- Control-click the app icon in Applications
- Select "Open" from the context menu
- Click "Open" in the confirmation dialog
- Subsequent launches will open normally

**Note**: Code signing and notarization are planned for future releases.

### Option 2: Build from Source

See [Building from Source](#building-from-source) section below.

---

## Building from Source

### Prerequisites

**Required Tools**:

- **Xcode Command Line Tools**: `xcode-select --install`
- **Rust**: Install via rustup: `curl https://sh.rustup.rs -sSf | sh`
  - Ensure Rust toolchain is up to date: `rustup update`
- **Node.js**: Version 18 or later (recommend using nvm or Homebrew)
- **npm**: Included with Node.js

**Optional**:

- **FFmpeg**:
  - System installation: `brew install ffmpeg` (includes all common encoders)
  - Custom build: Place binaries in `src-tauri/resources/bin/ffmpeg` and `src-tauri/resources/bin/ffprobe`

### Build Steps

1. **Clone the repository**:

   ```bash
   git clone https://github.com/honeymelon-app/honeymelon.git
   cd honeymelon
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

   This automatically runs the `postinstall` script which attempts to download FFmpeg binaries (can be skipped if using system FFmpeg).

3. **Run in development mode**:

   ```bash
   npm run tauri:dev
   ```

   This launches the full Tauri application with hot-reload enabled for rapid development.

4. **Build for production**:

   ```bash
   npm run tauri:build
   ```

   Output location: `src-tauri/target/aarch64-apple-darwin/release/bundle/dmg/Honeymelon_*.dmg`

### Advanced Build Configuration

**Target Architecture**:

Honeymelon is built exclusively for Apple Silicon (ARM64):

```bash
npm run tauri:build
```

This compiles the app for the `aarch64-apple-darwin` target only. Intel-based Macs are not supported.

**FFmpeg Configuration**:

The application resolves FFmpeg in this order:

1. `$HONEYMELON_FFMPEG_PATH` environment variable
2. Development bundled: `src-tauri/resources/bin/ffmpeg`
3. Production bundled: `<app.app>/Contents/Resources/bin/ffmpeg`
4. System FFmpeg in PATH

To bundle FFmpeg with your build:

- Place `ffmpeg` and `ffprobe` executables in `src-tauri/resources/bin/`
- Ensure they are executable: `chmod +x src-tauri/resources/bin/ff*`

**Code Signing & Notarization** (required for production distribution):

For production releases, the app must be signed with an Apple Developer ID certificate and notarized by Apple. This ensures:

- Users can open the app without security warnings
- The app can be distributed outside the Mac App Store
- macOS Gatekeeper will trust the application

**Setup Steps**:

1. **Enroll in Apple Developer Program** ($99/year)
2. **Obtain Developer ID Application certificate** from Apple Developer portal
3. **Install certificate** in your macOS Keychain
4. **Generate app-specific password** for notarization at [appleid.apple.com](https://appleid.apple.com)
5. **Configure environment variables**:

   ```bash
   export APPLE_ID="your@apple.id"
   export APPLE_PASSWORD="app-specific-password"
   export APPLE_TEAM_ID="YOUR_TEAM_ID"
   export APPLE_SIGNING_IDENTITY="Developer ID Application: Your Name (TEAM_ID)"
   ```

6. **Update tauri.conf.json** with your signing identity:

   ```json
   {
     "bundle": {
       "macOS": {
         "signingIdentity": "Developer ID Application: Your Name (TEAM_ID)"
       }
     }
   }
   ```

7. **Build signed and notarized bundle**:

   ```bash
   npm run tauri:build
   ```

Tauri will automatically sign the app bundle and submit it to Apple's notarization service. The process takes 5-15 minutes. Once complete, the notarized DMG will be in `src-tauri/target/aarch64-apple-darwin/release/bundle/dmg/`.

**Verification**:

```bash
# Check code signature
codesign -vvv --deep --strict /path/to/Honeymelon.app

# Check notarization
spctl -a -vvv -t install /path/to/Honeymelon.app
```

---

## Configuration

### Application Preferences

Access via menu: **Honeymelon → Preferences...** or keyboard shortcut: `Cmd+,`

**Concurrent Conversions**

- Range: 1 or more simultaneous jobs (no hard upper limit, but 2-4 recommended)
- Default: 2 jobs
- Recommendation:
  - 2 jobs for M1/M2 base models
  - 3-4 jobs for M2 Pro/Max or M3+ with sufficient RAM
- Note: Exclusive jobs (AV1, ProRes) run alone regardless of this setting

**Output Directory**

- Default: Same directory as source file
- Configurable: Choose custom output location (all conversions go here)

**FFmpeg Binary Path**

- Default: Auto-detected (bundled → system PATH)
- Custom: Specify path to alternative FFmpeg installation
- Use case: Testing custom FFmpeg builds with specific encoders

**Filename Options**

- **Include preset in filename**: Appends preset ID (e.g., `video-mp4-to-mkv`) to output
- **Include tier in filename**: Appends quality tier (e.g., `balanced`) to output
- **Filename separator**: Character used to join components (default: `-`)

Example with all options enabled:

- Input: `example.mp4`
- Preset: `video-mp4-to-mkv`
- Tier: `balanced`
- Output: `example-video-mp4-to-mkv-balanced.mkv`

### Preset System

Presets are **dynamically generated** in `src/lib/presets.ts` by iterating all valid source×target container pairs.

**Preset Structure**:

```typescript
{
  id: 'video-mp4-to-mkv',              // Source container - to - target container
  label: 'MP4 → MKV',                  // Display name
  container: 'mkv',                    // Output container
  mediaKind: 'video',                  // 'video' or 'audio'
  sourceContainers: ['mp4'],           // Valid input containers for this preset
  description: 'Convert MP4 video to MKV.',
  video: {
    codec: 'copy',                     // Target video codec ('copy' = stream copy when possible)
    copyColorMetadata: true,           // Copy color primaries/TRC/colorspace when transcoding
    tiers: {                           // Quality tier overrides (optional)
      fast: { /* settings */ },
      balanced: { crf: 23, bitrateK: 5000 },
      high: { crf: 18, bitrateK: 10000 }
    }
  },
  audio: {
    codec: 'copy',                     // Target audio codec
    bitrateK: 128,                     // Default audio bitrate (if transcoding)
    tiers: { /* tier overrides */ }
  },
  subs: {
    mode: 'keep',                      // 'keep' | 'convert' | 'burn' | 'drop'
  },
  remuxOnly: true,                     // True if preset only uses stream copy (no transcode)
  outputExtension: 'mkv'               // File extension for output
}
```

**Adding Custom Presets**: Modify `buildVideoPresets()` or `buildAudioPresets()` functions to add new target profiles.

### Environment Variables

**Development**:

- `VITE_DEV_SERVER_URL`: Override Vite dev server URL (rarely needed)
- `RUST_LOG`: Enable Rust logging (e.g., `RUST_LOG=debug npm run tauri:dev`)
- `HONEYMELON_FFMPEG_PATH`: Force specific FFmpeg binary path

**Build/Distribution**:

- `APPLE_ID`: Apple Developer account email (for notarization)
- `APPLE_PASSWORD`: App-specific password (not your Apple ID password)
- `APPLE_TEAM_ID`: Apple Developer Team ID (10-character string)

---

## Usage

### Basic Workflow

1. **Launch Application**: Open Honeymelon from Applications or Spotlight

2. **Add Media Files**:
   - **Drag and drop** files or folders directly into the application window
   - **Click "Choose Files"** button to open file picker
   - **Batch processing**: Select multiple files or entire folders (recursive media discovery)

3. **Preset Auto-Selection**:
   - Application automatically selects appropriate preset based on file extension
   - Example: `.mp4` file → suggests `video-mp4-to-mkv` or similar
   - Override by selecting different preset from dropdown

4. **Quality Tier Selection**:
   - **Fast**: Prioritizes remux (copy) when possible, minimal transcoding
   - **Balanced**: Optimized bitrate settings for good quality/size ratio
   - **High**: Maximum quality settings (higher bitrates, lower CRF)

5. **Monitor Progress**:
   - **Progress bar**: Visual percentage completion
   - **ETA**: Estimated time remaining based on encoding speed
   - **Metrics**: Current FPS, encoding speed (e.g., `2.5x` realtime)
   - **Logs**: Expand job card to view FFmpeg stderr output (last 500 lines)

6. **Manage Conversions**:
   - **Cancel job**: Click cancel button on individual job
   - **Cancel all**: Click "Cancel All" button to stop all active jobs
   - **Change preset**: Modify preset/tier for queued jobs before they start
   - **Clear completed**: Remove finished/failed jobs from list

7. **Access Output Files**:
   - **Default location**: Same directory as source file
   - **Custom location**: Set in Preferences (all outputs go to chosen directory)
   - **Reveal in Finder**: Click "Show in Finder" button (when implemented) or navigate manually

### Keyboard Shortcuts

- `Cmd+,`: Open Preferences
- `Cmd+Q`: Quit Application
- `Cmd+O`: Open file picker (menu: File → Open)
- `Cmd+W`: Close window (if job confirmation allows)
- `Cmd+M`: Minimize window
- `Cmd+Alt+I`: Toggle Developer Tools (dev builds only, non-functional in Tauri v2)

### Menu Bar

**Honeymelon Menu**:

- About Honeymelon
- Preferences... (`Cmd+,`)
- Hide Honeymelon
- Quit Honeymelon (`Cmd+Q`)

**File Menu**:

- Open... (`Cmd+O`) - File picker
- Close Window (`Cmd+W`)

**Edit Menu**:

- Standard edit commands (Cut, Copy, Paste, Select All)

**View Menu**:

- Toggle Developer Tools (dev builds)

**Window Menu**:

- Minimize (`Cmd+M`)
- Zoom
- Bring All to Front

---

## Development

### Development Environment Setup

```bash
# Install dependencies
npm install

# Run development server with hot reload (full Tauri app)
npm run tauri:dev

# Run frontend only (Vite dev server, no Rust/FFmpeg)
npm run dev

# Type-check TypeScript without building
npm run type-check

# Build frontend for production
npm run build

# Run Rust tests
cd src-tauri && cargo test

# Run Rust linting
cd src-tauri && cargo clippy --all-targets --all-features -- -D warnings

# Format Rust code
cd src-tauri && cargo fmt --all
```

### Available npm Scripts

**Development**:

- `npm run dev` - Vite dev server (frontend only, no Tauri)
- `npm run tauri:dev` - Full Tauri app with hot reload (recommended)

**Building**:

- `npm run build` - Type-check + Vite build (frontend only)
- `npm run tauri:build` - Full production build for Apple Silicon (DMG output)

**Linting & Formatting**:

- `npm run lint` - Run both JS and Rust linting
- `npm run lint:js` - ESLint for TypeScript/Vue
- `npm run lint:js:fix` - Auto-fix ESLint issues
- `npm run lint:rust` - Cargo clippy with strict warnings
- `npm run format` - Format both JS and Rust
- `npm run format:js` - Prettier for TypeScript/Vue
- `npm run format:rust` - rustfmt for Rust

**Testing**:

- `npm run type-check` - TypeScript type validation (vue-tsc)
- `npm test` - Run all tests (unit + e2e)
- `npm run test:unit` - Vitest unit tests
- `npm run test:e2e` - Playwright end-to-end tests

### Development Guidelines

**TypeScript Standards**:

- **Strict mode enabled** - no implicit `any`, all types explicit
- **Explicit return types** for exported functions
- **Avoid `any`** - use `unknown` with type guards instead
- **Use discriminated unions** for state management (see `JobState` type)
- **Prefer `const` over `let`** - immutability by default

**Vue Standards**:

- **Use `<script setup>`** syntax (Composition API)
- **Avoid Options API** - prefer Composition API for consistency
- **Extract reusable logic** into composables (`src/composables/`)
- **Keep components focused** - aim for <300 lines, single responsibility
- **Reactive state in Pinia stores** - avoid component-level state for shared data

**Rust Standards**:

- **Follow Rust idioms** - use pattern matching, iterators, ownership correctly
- **Use `Result<T, E>`** for error handling (avoid `unwrap()` in production code)
- **Document public APIs** with `///` doc comments
- **Keep Tauri commands minimal** - delegate complex logic to helper functions
- **Async/await** for I/O operations (FFmpeg spawning, file operations)

**Code Style**:

- **TypeScript/Vue**: 2-space indentation
- **Rust**: 4-space indentation (default rustfmt)
- **Line length**: 100 characters (soft limit, enforced by Prettier/rustfmt)
- **Quotes**: Single quotes in TypeScript (enforced by Prettier)
- **Semicolons**: Required in TypeScript (enforced by ESLint)

**File Naming**:

- **TypeScript lib files**: kebab-case (`ffmpeg-plan.ts`, `container-rules.ts`)
- **Vue components**: PascalCase (`JobQueueItem.vue`, `AboutDialog.vue`)
- **Rust modules**: snake_case (`ffmpeg_runner.rs`, `fs_utils.rs`)

### Testing

**Frontend Testing**:

- **Framework**: Vitest (configured in `vitest.config.ts`)
- **Test location**: `src/lib/__tests__/` (co-located with source files)
- **Coverage**: Run `npm run test:unit:coverage`
- **Current status**: Basic tests for core logic (planning, presets), more coverage needed

**Backend Testing**:

- **Rust unit tests**: In module files (e.g., `#[cfg(test)]` blocks in `ffmpeg_runner.rs`)
- **Integration tests**: `src-tauri/tests/` directory
- **Run tests**: `cd src-tauri && cargo test`
- **Current coverage**: ~108 tests covering probe parsing, capabilities, runner logic

**Manual Testing Checklist**:

- [ ] Drag and drop single file
- [ ] Drag and drop folder (recursive discovery)
- [ ] Multiple concurrent jobs
- [ ] Job cancellation (individual and batch)
- [ ] Preset/tier changes before job starts
- [ ] Progress tracking accuracy
- [ ] ETA calculation
- [ ] Edge cases:
  - [ ] Special characters in filenames (spaces, unicode)
  - [ ] Very large files (>10 GB)
  - [ ] Corrupted media files
  - [ ] Missing encoders (preset filtering)
- [ ] Error handling:
  - [ ] Disk space exhausted
  - [ ] Permission denied (Full Disk Access)
  - [ ] Invalid output path

---

## Legal & Licensing

### Proprietary Software

**Honeymelon is proprietary software**. All rights are reserved by the copyright holder. The source code, binaries, and documentation are confidential and may not be used, copied, modified, or distributed without explicit written permission from Jerome Thayananthajothy.

For commercial licensing inquiries, please contact <tjthavarshan@gmail.com>.

### FFmpeg Licensing

**License**: LGPL v2.1 or later

**Compliance Method**: Process Separation

- Honeymelon executes FFmpeg as a **completely separate process** (no shared memory, no library calls)
- **No static linking** to FFmpeg libraries (`.a` files)
- **No dynamic linking** to FFmpeg libraries (`.so`/`.dylib` files)
- Communication **exclusively** via:
  - Command-line arguments
  - Standard input/output/error streams
  - File system (input files, output files)
- This approach satisfies LGPL requirements **without affecting Honeymelon's proprietary license**

**Implications for Honeymelon**:

- Honeymelon remains proprietary and confidential
- FFmpeg's LGPL license does not affect Honeymelon's proprietary status due to process separation
- Must include FFmpeg license file with distribution
- Must provide information on obtaining FFmpeg source code
- Cannot modify FFmpeg without offering source (Honeymelon doesn't modify FFmpeg)

See [LICENSES/FFMPEG-LGPL.txt](LICENSES/FFMPEG-LGPL.txt) for complete license text.

### Patent Considerations

Certain audio and video codecs may be subject to patent claims in various jurisdictions:

**H.264/HEVC (H.265)**:

- Patent pools managed by MPEG LA and HEVC Advance
- When using hardware encoders (VideoToolbox), Apple handles patent licensing
- Software encoders (libx264, libx265) may require separate licensing in some jurisdictions
- **Recommendation**: Use system-provided hardware encoders when possible

**AAC**:

- Patent pool managed by Via Licensing
- Provided by system codecs when using hardware acceleration
- Covered by Apple's licensing for system-provided encoders

**VP9/AV1/Opus**:

- **Royalty-free** codecs without patent licensing requirements
- Open-source encoder libraries (libvpx, libaom, libopus)
- No additional licensing needed

**User Responsibility**: Users who compile custom FFmpeg builds with software encoders (x264, x265, fdk-aac) are responsible for ensuring proper patent licensing in their jurisdiction.

### Third-Party Software

All third-party dependencies are documented with proper attribution:

**License Documentation**:

- [THIRD_PARTY_NOTICES.md](docs/legal/THIRD_PARTY_NOTICES.md): Complete list of dependencies and licenses
- [LICENSES/](LICENSES/): Individual license files for major dependencies

**Key Dependencies** (all used in compliance with their respective licenses):

- **Tauri**: MIT/Apache-2.0 dual license
- **Vue.js**: MIT license
- **Rust ecosystem**: Primarily MIT/Apache-2.0 dual licensed crates
- **shadcn-vue**: MIT license
- **Tailwind CSS**: MIT license
- **FFmpeg**: LGPL v2.1+ (process-separated, not linked)

### Distribution Requirements

Distribution of Honeymelon requires explicit written permission from the copyright holder. When authorized distribution occurs, the following must be included:

1. **LICENSE** file (Proprietary license for Honeymelon)
2. **LICENSES/FFMPEG-LGPL.txt** (FFmpeg LGPL license)
3. **THIRD_PARTY_NOTICES.md** (all dependency attributions)
4. Link to FFmpeg source code: <https://ffmpeg.org/download.html>

For licensing inquiries, contact: <tjthavarshan@gmail.com>

---

## Troubleshooting

### Common Issues

**Conversion fails immediately with error**

- **Check FFmpeg availability**:

  ```bash
  which ffmpeg
  ffmpeg -version
  ```

- **Verify encoder support**:

  ```bash
  ffmpeg -encoders | grep <encoder_name>
  # Example: ffmpeg -encoders | grep libx264
  ```

- **Check application logs**: Open Console.app, filter by "Honeymelon", look for error messages

**Progress stuck at 0%**

- **Cause**: Input file lacks duration metadata (common with streaming formats, damaged files)
- **Solution**: Conversion continues normally - progress falls back to frame-based estimation
- **Note**: ETA will be inaccurate or unavailable

**Subtitle handling issues**

- **PGS/VOBSUB subtitles in MP4**:
  - MP4 container **does not support** image-based subtitles
  - Solution: Use burn-in option (hardcodes subs onto video) or output to MKV
- **Text subtitle conversion**:
  - MP4 automatically converts SRT/ASS to `mov_text` format
  - MKV preserves original subtitle format unchanged

**Output file not created despite "success" status**

- **Cause**: Temp file rename failed (disk full, permissions, file locked)
- **Check**: Look for `.tmp` file in output directory
- **Solution**: Ensure sufficient disk space, check write permissions

**Choppy HEVC playback on older devices**

- **Cause**: High bitrate or profile incompatibility, lack of hardware decoding
- **Solution**:
  - Use H.264 preset instead (broader compatibility)
  - Reduce quality tier from High to Balanced
  - Test playback on target device before batch conversion

**Large GIF file sizes**

- **Cause**: GIF format is inefficient for long or high-resolution animations
- **Application automatically warns**: Duration >20 seconds
- **Solution**:
  - Keep clips under 10 seconds
  - Resolution automatically limited to 640px width
  - Consider WebM format for better compression

**FFmpeg not found error**

- **Cause**: No bundled FFmpeg and system FFmpeg not in PATH
- **Solution**:
  - Install via Homebrew: `brew install ffmpeg`
  - Or specify custom path in Preferences
  - Or bundle FFmpeg with app (see Building from Source)

**Permission denied error (macOS Full Disk Access)**

- **Symptom**: Error code `job_output_permission`
- **Cause**: macOS security prevents writing to certain directories
- **Solution**:
  1. Open **System Settings** → **Privacy & Security** → **Full Disk Access**
  2. Click `+` and add Honeymelon.app
  3. Restart application

**Conversion extremely slow (AV1, ProRes)**

- **Cause**: These codecs are computationally intensive
- **Expected behavior**:
  - AV1 encoding: 0.05-0.5x realtime speed (10-minute video → 20-200 minutes)
  - ProRes encoding: 0.5-2x realtime speed
- **Note**: Exclusive job system prevents multiple slow jobs from running simultaneously

### Performance Optimization

**Maximize conversion speed**:

- Use **Fast tier** (prioritizes remux/copy when possible)
- Ensure source and target codecs match (enables stream copy)
- Increase concurrent job limit if system has available CPU/RAM
- Use MKV as target container (accepts any codec → more remux opportunities)
- Ensure sufficient free disk space (temp files can be large)
- Close resource-intensive applications during conversion

**Reduce memory usage**:

- Decrease concurrent job limit to 1-2
- Process files sequentially rather than in large batches
- Clear completed jobs regularly
- Restart application periodically for long batch jobs

### Getting Help

**Before reporting issues**:

1. Check this Troubleshooting section
2. Review [GitHub Discussions](../../discussions) for similar questions
3. Verify FFmpeg installation: `ffmpeg -version`
4. Check encoder availability: `ffmpeg -encoders`
5. Review Console.app logs (filter: "Honeymelon")

**Bug reports**:

- Use [GitHub Issues](../../issues/new) with bug report template
- Include:
  - macOS version (e.g., "macOS 14.2 Sonoma")
  - Chip type (e.g., "Apple M2 Pro")
  - Honeymelon version (from About dialog)
  - Sample file details (format, codec, resolution, duration)
  - FFmpeg version: `ffmpeg -version`
  - Relevant log output from job card or Console.app

**Feature requests**:

- Use [GitHub Issues](../../issues/new) with feature request template
- Describe use case and expected behavior
- Include examples or mockups if applicable

---

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](docs/development/CONTRIBUTING.md) for detailed guidelines on:

- Code of conduct
- Development setup
- Coding standards and conventions
- Commit message format (Conventional Commits)
- Pull request process

### Development Priorities

**High priority** (bug fixes and stability):

- Fix race conditions in job concurrency management
- Improve error handling and user feedback
- Performance optimizations (debounce progress events, optimize job store updates)
- FFmpeg integration improvements

**Medium priority** (features and UX):

- Additional preset configurations
- UI/UX refinements and accessibility
- Automated testing infrastructure
- Documentation enhancements

**Future enhancements**:

- Advanced subtitle handling (burn-in support)
- Multi-track audio/subtitle selection
- Video trimming and cropping
- Batch folder processing improvements

### Code Style Requirements

- **TypeScript**: Strict mode, explicit types, functional patterns, discriminated unions
- **Vue**: Composition API with `<script setup>`, reactive state in Pinia
- **Rust**: Idiomatic Rust, `Result`-based error handling, async/await
- **Testing**: Unit tests for pure logic, integration tests for Rust commands

See [AGENTS.md](docs/development/AGENTS.md) for commit message conventions and PR workflow.

---

## Acknowledgements

This project builds upon the excellent work of many open-source communities:

- **FFmpeg Team**: Comprehensive media processing framework
- **Tauri Team**: Modern, secure desktop application framework
- **Vue.js Team**: Progressive, reactive UI framework
- **Rust Community**: Safe, fast systems programming language
- **shadcn Community**: Beautiful, accessible UI component system
- **All Contributors**: Code, documentation, bug reports, and feature suggestions

Special thanks to everyone who has contributed to making Honeymelon better.

---

## License

### Honeymelon Application

**Proprietary License** - All Rights Reserved. See [LICENSE](LICENSE) file for complete terms.

Copyright (c) 2025 Jerome Thayananthajothy <tjthavarshan@gmail.com>

This software is proprietary and confidential. Unauthorized copying, distribution, modification, or use of this software, via any medium, is strictly prohibited without explicit written permission from the copyright holder.

For licensing inquiries, please contact: <tjthavarshan@gmail.com>

### FFmpeg

Licensed under the **LGPL v2.1 or later**. See [LICENSES/FFMPEG-LGPL.txt](LICENSES/FFMPEG-LGPL.txt) for complete terms.

Copyright (c) 2000-2025 FFmpeg Developers

### Third-Party Dependencies

All third-party software licenses and attributions are documented in [THIRD_PARTY_NOTICES.md](docs/legal/THIRD_PARTY_NOTICES.md).

---

**Project Status**: Active Development

**Version**: 0.0.1

**Maintained By**: Honeymelon Contributors

**Repository**: <https://github.com/honeymelon-app/honeymelon>
