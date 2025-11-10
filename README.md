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

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [System Requirements](#system-requirements)
- [Quick Start](#quick-start)
  - [Installation](#installation)
  - [Development Setup](#development-setup)
- [How It Works](#how-it-works)
  - [Stage 1: Probe](#stage-1-probe)
  - [Stage 2: Plan](#stage-2-plan)
  - [Stage 3: Execute](#stage-3-execute)
- [Architecture](#architecture)
  - [Technology Stack](#technology-stack)
  - [Project Structure](#project-structure)
  - [Core Principles](#core-principles)
- [Usage](#usage)
  - [Basic Workflow](#basic-workflow)
  - [Keyboard Shortcuts](#keyboard-shortcuts)
  - [Configuration](#configuration)
- [Development](#development)
  - [Build Commands](#build-commands)
  - [Code Style](#code-style)
  - [Testing](#testing)
  - [Release Process](#release-process)
- [Troubleshooting](#troubleshooting)
- [Legal & Licensing](#legal--licensing)
- [Contributing](#contributing)
- [Acknowledgements](#acknowledgements)

---

## Overview

Honeymelon is a native macOS desktop application that provides an intelligent interface for FFmpeg-powered media conversion. Built exclusively for Apple Silicon, it emphasizes lossless stream copying (remuxing) over re-encoding whenever possible, delivering faster conversions with zero quality loss.

**Core Philosophy:**

- **Remux-first**: Automatically detects when lossless stream copying is possible
- **Privacy by design**: All processing happens locally—no network access, no telemetry
- **Performance-optimized**: Leverages Apple VideoToolbox hardware acceleration
- **Production-ready**: Manages concurrent jobs, preserves color metadata, handles subtitle formats

**Technology Stack:**

- **Frontend**: Vue 3 (Composition API) + TypeScript + Pinia + Tailwind CSS + shadcn-vue
- **Backend**: Tauri 2.x + Rust + FFmpeg (out-of-process, LGPL-compliant)
- **Platform**: macOS 13+ on Apple Silicon (M1/M2/M3/M4)

---

## Key Features

### Intelligent Conversion Engine

- **Remux-first strategy**: Automatically detects codec compatibility and uses lossless stream copying when possible
- **Smart planning**: Three-phase pipeline (Probe → Plan → Execute) ensures optimal conversion strategy
- **Container-aware**: Validates codec compatibility with target containers (MP4, MKV, WebM, MOV)
- **Quality tiers**: Fast (remux-priority), Balanced (quality/size), High (maximum quality)

### Professional Media Handling

- **Color metadata preservation**: Copies color primaries, transfer characteristics, and colorspace during transcoding
- **Subtitle support**: Text subtitle conversion (mov_text for MP4), image subtitle detection
- **Hardware acceleration**: Leverages Apple VideoToolbox for H.264, HEVC, and ProRes encoding
- **Multi-format support**: Video (MP4, MKV, MOV, WebM, GIF), Audio (M4A, MP3, FLAC, WAV), Image (PNG, JPEG, WebP)

### Production-Ready Workflow

- **Concurrent job management**: Configurable parallel processing with intelligent concurrency limits
- **Exclusive codec handling**: Heavy codecs (AV1, ProRes) run exclusively to prevent resource exhaustion
- **Real-time progress**: Live FPS, encoding speed, ETA calculations with circular log buffers
- **Atomic operations**: Temp file strategy ensures safe output with automatic cleanup on failure
- **macOS notifications**: Desktop alerts on job completion or failure

### Privacy & Security

- **100% local processing**: All conversions happen on-device with no network access
- **No telemetry**: Zero data collection or external communication
- **Command injection protection**: Security-first validation of all FFmpeg arguments
- **Full Disk Access support**: Optional permission for protected directory access

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

## Quick Start

### Installation

1. Download the latest signed DMG from the [Releases](../../releases) page
2. Drag `Honeymelon.app` into `/Applications`
3. On first launch, macOS Gatekeeper may prompt you to confirm the developer—choose **Open**
4. (Optional) Grant **Full Disk Access** in System Settings for access to protected directories

**Note**: For air-gapped deployments, distribute the DMG and bundled FFmpeg binaries internally—no activation or online checks are required.

### Development Setup

```bash
# 1. Clone and install dependencies
git clone https://github.com/honeymelon-app/honeymelon.git
cd honeymelon
npm install

# 2. Download FFmpeg binaries (Apple Silicon arm64)
npm run download-ffmpeg

# 3. Launch development app with hot reload
npm run tauri dev

# 4. Or run frontend only (no FFmpeg access)
npm run dev
```

---

## How It Works

Honeymelon uses a three-stage conversion pipeline that intelligently decides between lossless stream copying and transcoding.

### Stage 1: Probe

**Extract comprehensive metadata from input files**

- **Backend**: Executes `ffprobe` with JSON output (`-print_format json -show_format -show_streams`)
- **Parsing**: Normalizes codec names, handles multiple frame rate formats, categorizes subtitle types
- **Output**: `ProbeSummary` with duration, dimensions, codecs, color metadata (bt709, bt2020, etc.), subtitle flags

**Implementation**: [ffmpeg-probe.ts](src/lib/ffmpeg-probe.ts) (frontend) + [ffmpeg_probe.rs](src-tauri/src/ffmpeg_probe.rs) (backend, 957 lines)

**Binary Resolution** (4-tier fallback):

1. `$HONEYMELON_FFPROBE_PATH` environment variable
2. Development bundle: `src-tauri/resources/bin/ffprobe`
3. Application bundle resource directory
4. System PATH

### Stage 2: Plan

**Determine optimal conversion strategy (copy vs. transcode)**

- **Decision Logic**: Matches source codec against target preset codec—if identical, uses stream copy; otherwise transcodes
- **Container Rules**: Validates codec compatibility (e.g., MP4 only supports H.264/HEVC/AV1 video, AAC/ALAC audio)
- **Quality Tiers**: Fast (remux-priority), Balanced (moderate bitrate), High (low CRF/high bitrate)
- **Special Handling**: GIF palette generation, color metadata copying, subtitle format conversion

**Implementation**: [ffmpeg-plan.ts](src/lib/ffmpeg-plan.ts) (684 lines) + [container-rules.ts](src/lib/container-rules.ts) + [presets.ts](src/lib/presets.ts)

**Decision Matrix**:

- **Full Remux**: All streams copied (`remuxOnly = true`) → fastest, lossless
- **Partial Transcode**: Some streams copied, others re-encoded
- **Full Transcode**: All streams require encoding → applies tier-specific settings

**Output**: `PlannerDecision` with complete FFmpeg arguments array, remux flag, human-readable notes, warnings

### Stage 3: Execute

**Spawn FFmpeg process with real-time progress tracking**

- **Concurrency Control**: Atomic validation with configurable limits (default: 2 concurrent jobs)
- **Exclusive Mode**: Heavy codecs (AV1, ProRes) block other jobs to prevent resource exhaustion
- **Temp File Strategy**: Writes to `<output>.tmp`, atomically renames on success, auto-cleanup on failure
- **Progress Parsing**: Background thread parses stderr for time/fps/speed metrics, emits Tauri events
- **Security**: Command injection prevention validates all arguments before spawning

**Implementation**: [ffmpeg_runner.rs](src-tauri/src/ffmpeg_runner.rs) (1223 lines, Rust) + [use-job-orchestrator.ts](src/composables/use-job-orchestrator.ts) (frontend orchestration)

**Event System**:

- `ffmpeg://progress` → Real-time metrics (processed seconds, FPS, encoding speed)
- `ffmpeg://stderr` → Raw FFmpeg output for debugging
- `ffmpeg://completion` → Final status with success/failure/cancellation flag

**Circular Log Buffer**: Last 500 lines retained per job, prevents unbounded memory growth

---

## Architecture

### Technology Stack

| Layer        | Technology                           | Purpose                                   |
| ------------ | ------------------------------------ | ----------------------------------------- |
| **Frontend** | Vue 3 (Composition API) + TypeScript | UI components, business logic             |
|              | Pinia                                | State management (jobs, preferences)      |
|              | shadcn-vue + Tailwind CSS            | UI components and styling                 |
|              | Vite 6.x                             | Build tooling and dev server              |
| **Backend**  | Tauri 2.x + Rust (2021 edition)      | Native integration, FFmpeg orchestration  |
|              | Tokio async runtime                  | Process management and IPC                |
|              | Serde + JSON                         | Type-safe serialization                   |
| **Media**    | FFmpeg/FFprobe (out-of-process)      | Media probing and conversion              |
|              | Apple VideoToolbox                   | Hardware acceleration (H.264/HEVC/ProRes) |

### Project Structure

**Key Directories:**

```text
src/
├── lib/                    # Core business logic
│   ├── ffmpeg-plan.ts      # Planning engine (684 lines, main logic)
│   ├── ffmpeg-probe.ts     # Probe wrapper
│   ├── container-rules.ts  # Codec compatibility
│   ├── presets.ts          # Dynamic preset generation
│   └── types.ts            # TypeScript definitions
├── stores/                 # Pinia state
│   ├── jobs.ts             # Job queue state machine
│   └── prefs.ts            # User preferences
├── composables/            # Vue composables
│   └── use-job-orchestrator.ts  # Main orchestrator
└── components/             # Vue UI components

src-tauri/src/
├── ffmpeg_runner.rs        # Process orchestration (1223 lines)
├── ffmpeg_probe.rs         # Media probing (957 lines)
├── ffmpeg_capabilities.rs  # Capability detection (782 lines)
├── fs_utils.rs             # File discovery
└── error.rs                # Unified error handling
```

**Documentation:**

- [CLAUDE.md](CLAUDE.md) – Comprehensive codebase guide for AI assistants
- [AGENTS.md](docs/development/AGENTS.md) – Commit conventions and PR workflow
- [CONTRIBUTING.md](docs/development/CONTRIBUTING.md) – Contribution guidelines

### Core Principles

1. **LGPL Compliance**: FFmpeg runs as separate process—no static/dynamic linking, communication via stdin/stdout/files only
2. **Type-Safe State Machine**: Discriminated union types for job states prevent invalid transitions
3. **Event-Driven Progress**: Tauri events stream FFmpeg output asynchronously, non-blocking UI updates
4. **Atomic Operations**: Temp file writes + atomic renames ensure data integrity
5. **Security First**: Command injection validation, path sanitization, permission checks

---

## Usage

### Basic Workflow

1. **Add Files**: Drag-and-drop files/folders or click "Choose Files"
2. **Select Preset**: Auto-selected based on file type, or choose from dropdown
3. **Choose Quality Tier**:
   - **Fast**: Remux-priority (lossless copy when possible)
   - **Balanced**: Moderate bitrate for good quality/size ratio
   - **High**: Maximum quality (low CRF, high bitrate)
4. **Monitor Progress**: Real-time progress bar, FPS, encoding speed, ETA
5. **Access Output**: Default location same as source, or configure custom output directory

### Keyboard Shortcuts

| Shortcut | Action           |
| -------- | ---------------- |
| `Cmd+,`  | Open Preferences |
| `Cmd+O`  | Open file picker |
| `Cmd+Q`  | Quit Application |
| `Cmd+W`  | Close Window     |
| `Cmd+M`  | Minimize Window  |

### Configuration

**Access**: `Cmd+,` or menu: Honeymelon → Preferences

**Settings:**

- **Concurrent Jobs**: 1-∞ (default: 2, recommended 2-4 based on Mac model)
- **Output Directory**: Choose custom location or use source directory
- **FFmpeg Path**: Auto-detected or specify custom binary
- **Filename Options**: Include preset/tier in output filenames, configure separator

**Environment Variables:**

- `HONEYMELON_FFMPEG_PATH` – Override FFmpeg binary path
- `RUST_LOG=debug` – Enable Rust logging for development

---

## Development

### Build Commands

| Command                        | Purpose                                    |
| ------------------------------ | ------------------------------------------ |
| `npm install`                  | Install dependencies                       |
| `npm run tauri dev`            | Run full app with hot reload (recommended) |
| `npm run dev`                  | Run frontend only (no FFmpeg)              |
| `npm run build`                | Build frontend assets                      |
| `npm run tauri build`          | Build production DMG                       |
| `npm run lint`                 | Lint TypeScript + Rust                     |
| `npm run format`               | Format all code                            |
| `npm run type-check`           | Validate TypeScript                        |
| `npm test`                     | Run all tests                              |
| `cd src-tauri && cargo test`   | Run Rust tests                             |
| `cd src-tauri && cargo clippy` | Lint Rust code                             |

### Code Style

**TypeScript/Vue:**

- Strict mode, explicit types, no `any`
- Use `<script setup>` (Composition API)
- 2-space indentation, single quotes
- File naming: kebab-case for libs, PascalCase for components

**Rust:**

- Idiomatic Rust with `Result<T, E>` error handling
- Async/await for I/O operations
- 4-space indentation, snake_case modules
- Document public APIs with `///`

**General:**

- Discriminated unions for state machines
- Immutability by default (`const` over `let`)
- Extract reusable logic into composables/helper functions
- Keep functions focused (<100 lines ideal)

### Testing

- **Frontend**: Vitest for unit tests (`npm run test:unit`)
- **Backend**: ~108 Rust tests covering probe parsing, capabilities, runner logic
- **Integration**: Playwright E2E tests (infrastructure in place, minimal coverage)
- **Coverage**: Run `npm run test:unit:coverage` for frontend coverage report

### Release Process

1. Bump versions in `package.json`, `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`
2. Update `CHANGELOG.md` with release notes
3. Run full QA: `npm run lint && npm test && npm run build && cd src-tauri && cargo test`
4. Configure code signing environment variables (APPLE_ID, APPLE_PASSWORD, APPLE_TEAM_ID)
5. Build signed bundle: `npm run tauri build`
6. Verify signature: `codesign -vvv --deep --strict <app>` and `spctl -a -vvv -t install <app>`
7. Generate SHA256 checksum for DMG
8. Create GitHub Release with DMG, changelog, and checksum
9. Smoke test on clean machine

**Output**: `src-tauri/target/aarch64-apple-darwin/release/bundle/dmg/Honeymelon_*.dmg`

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

| Issue                            | Solution                                                                                                                                                  |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Conversion fails immediately** | Check FFmpeg: `which ffmpeg && ffmpeg -version`. Verify encoder support: `ffmpeg -encoders \| grep <name>`. Check Console.app logs (filter: "Honeymelon") |
| **Progress stuck at 0%**         | Input lacks duration metadata. Conversion continues normally, but ETA unavailable. Common with streaming formats.                                         |
| **Image subtitles in MP4**       | MP4 doesn't support PGS/VOBSUB. Use burn-in (hardcoded) or output to MKV. Text subs auto-convert to `mov_text`.                                           |
| **Output file missing**          | Temp rename failed. Check for `.tmp` file. Ensure sufficient disk space and write permissions.                                                            |
| **Choppy HEVC playback**         | Use H.264 preset for broader compatibility. Reduce quality tier from High to Balanced.                                                                    |
| **Large GIF files**              | Keep clips <10s. Resolution auto-limited to 640px width. Consider WebM for better compression.                                                            |
| **FFmpeg not found**             | Install: `brew install ffmpeg`, or specify custom path in Preferences, or bundle with app.                                                                |
| **Permission denied**            | Grant Full Disk Access: System Settings → Privacy & Security → Full Disk Access → Add Honeymelon.app                                                      |
| **Slow AV1/ProRes encoding**     | Expected: AV1 (0.05-0.5x realtime), ProRes (0.5-2x). Exclusive mode prevents concurrent slow jobs.                                                        |

### Performance Tips

**Speed**:

- Use Fast tier (remux-priority)
- Match source/target codecs (enables stream copy)
- Increase concurrent jobs if CPU/RAM available
- Use MKV (accepts any codec → more remux opportunities)

**Memory**:

- Decrease concurrent jobs to 1-2
- Process files sequentially
- Clear completed jobs regularly

### Getting Help

**Before Reporting**:

1. Check troubleshooting above
2. Review [GitHub Discussions](../../discussions)
3. Verify: `ffmpeg -version` and `ffmpeg -encoders`
4. Check Console.app (filter: "Honeymelon")

**Bug Reports**: [GitHub Issues](../../issues/new) with macOS version, chip type, Honeymelon version, file details, FFmpeg version, logs

**Feature Requests**: [GitHub Issues](../../issues/new) with use case, expected behavior, examples

---

## Contributing

Contributions welcome! See [CONTRIBUTING.md](docs/development/CONTRIBUTING.md) for:

- Code of conduct
- Development setup
- Coding standards (TypeScript strict mode, Vue `<script setup>`, Rust idioms)
- Commit format (Conventional Commits)
- PR workflow

**Priorities**:

- **High**: Concurrency management, error handling, performance optimizations
- **Medium**: New presets, UI/UX refinements, testing infrastructure
- **Future**: Subtitle burn-in, multi-track selection, video trimming

See [AGENTS.md](docs/development/AGENTS.md) for commit conventions.

---

## Acknowledgements

Built with gratitude for:

- **FFmpeg Team** – Comprehensive media processing
- **Tauri Team** – Modern desktop framework
- **Vue.js Team** – Reactive UI framework
- **Rust Community** – Safe systems programming
- **shadcn Community** – Accessible UI components
- **All Contributors** – Code, docs, bug reports, suggestions

---

## License

**Honeymelon**: Proprietary. Copyright © 2025 Jerome Thayananthajothy. See [LICENSE](LICENSE).

**FFmpeg**: LGPL v2.1+. Process-separated (no linking). See [LICENSES/FFMPEG-LGPL.txt](LICENSES/FFMPEG-LGPL.txt).

**Dependencies**: See [THIRD_PARTY_NOTICES.md](docs/legal/THIRD_PARTY_NOTICES.md) for full attributions.

**Licensing inquiries**: <tjthavarshan@gmail.com>

---

<p align="center">
  <strong>Version 0.0.1</strong> • <a href="https://github.com/honeymelon-app/honeymelon">GitHub Repository</a>
</p>
