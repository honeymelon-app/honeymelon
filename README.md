# Honeymelon

A professional media converter application designed exclusively for macOS Apple Silicon devices.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![macOS](https://img.shields.io/badge/macOS-13.0+-blue.svg)](https://www.apple.com/macos)
[![Apple Silicon](https://img.shields.io/badge/Apple%20Silicon-Native-brightgreen.svg)](https://www.apple.com/mac/)

**Technology Stack**: Tauri 2.x, Vue 3, TypeScript, Rust, shadcn-vue UI components

**Architecture**: FFmpeg out-of-process execution, LGPL compliant, Apple Silicon (ARM64) native

**Core Philosophy**: Remux-first approach prioritizing lossless stream copying over re-encoding to preserve quality and maximize performance.

---

## Table of Contents

- [Overview](#overview)
- [System Requirements](#system-requirements)
- [Supported Formats](#supported-formats)
- [Conversion Pipeline](#conversion-pipeline)
- [Architecture](#architecture)
- [Installation](#installation)
- [Building from Source](#building-from-source)
- [Configuration](#configuration)
- [Usage](#usage)
- [Development](#development)
- [Legal & Licensing](#legal--licensing)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

Honeymelon is a native macOS application that provides professional-grade media conversion capabilities through an intuitive drag-and-drop interface. Built specifically for Apple Silicon processors, the application leverages hardware acceleration and modern encoding technologies to deliver fast, reliable conversions while maintaining the highest possible quality.

### Key Features

#### Intelligent Conversion Engine

- Remux-first strategy preserves original quality by copying streams when container constraints permit
- Automatic detection of optimal conversion path (remux, partial transcode, or full re-encode)
- Hardware-accelerated encoding via Apple VideoToolbox for H.264/HEVC
- Support for modern codecs including VP9 and AV1 when available
- Configurable quality tiers: Fast (remux-prioritized), Balanced (optimized bitrates), High (maximum quality)

#### User Experience

- Drag-and-drop file interface with batch processing support
- Real-time progress monitoring with accurate ETA calculation
- Concurrent job processing with configurable limits (1-4 simultaneous conversions)
- Per-job cancellation capability with detailed conversion logs
- Preset-based workflow eliminates complex configuration requirements
- Native macOS menu bar integration with keyboard shortcuts

#### Technical Excellence

- FFmpeg process isolation ensuring LGPL compliance for commercial distribution
- Automatic encoder capability detection with graceful preset degradation
- Native Apple Silicon binary with hardware acceleration support
- Minimal disk footprint (approximately 200 MB including bundled FFmpeg)
- No internet connectivity required for operation
- Fully local processing ensures media privacy

---

## System Requirements

### Minimum Requirements

- **Operating System**: macOS 13.0 (Ventura) or later
- **Processor**: Apple Silicon (M1, M2, M3, or later)
- **Memory**: 4 GB RAM (8 GB recommended for 4K content)
- **Disk Space**: 200 MB for application and bundled FFmpeg
- **Additional Space**: Variable, depending on source media and output settings

### Recommended Configuration

- **Operating System**: macOS 14.0 (Sonoma) or later
- **Processor**: Apple M2 or later for optimal hardware encoding performance
- **Memory**: 16 GB RAM for concurrent 4K processing
- **Disk Space**: 500 MB free for temporary conversion files

### Network Requirements

- **Internet**: Not required for conversion operations
- **Optional**: Internet connectivity for software updates (when implemented)

---

## Supported Formats

### Input Formats

Honeymelon accepts a wide variety of input formats through FFmpeg's comprehensive codec support:

**Video Containers**: MP4, M4V, MOV, MKV, WebM, AVI, MPG, MPEG, TS, M2TS, MXF, FLV, OGV, WMV

**Audio Containers**: MP3, AAC, M4A, FLAC, WAV, AIFF, AIF, OGG, Opus, WMA, ALAC

### Output Presets

#### Video Presets

**MP4 | H.264 + AAC**

- Codec: H.264 (via VideoToolbox hardware acceleration)
- Audio: AAC
- Compatibility: Universal compatibility across devices and platforms
- Use Case: General-purpose conversion, web delivery, device playback
- Quality Tiers: Fast (remux-first), Balanced (~5-7 Mbps @ 1080p), High (higher bitrate)

**MP4 | HEVC + AAC**

- Codec: HEVC/H.265 (via VideoToolbox hardware acceleration)
- Audio: AAC
- Compatibility: Modern devices (iOS 11+, macOS 10.13+)
- Use Case: Reduced file sizes with maintained quality
- Quality Tiers: Fast (remux-first), Balanced (~3-5 Mbps @ 1080p), High (higher bitrate)

**WebM | VP9 + Opus**

- Codec: VP9 (requires libvpx in FFmpeg build)
- Audio: Opus (requires libopus in FFmpeg build)
- Compatibility: Modern web browsers, YouTube
- Use Case: Web video, open-source codec preference
- Quality Tiers: Fast (remux-first), Balanced (optimized), High (quality-focused)

**WebM | AV1 + Opus**

- Codec: AV1 (requires libaom in FFmpeg build)
- Audio: Opus (requires libopus in FFmpeg build)
- Compatibility: Latest browsers, experimental support
- Use Case: Maximum compression efficiency for modern platforms
- Quality Tiers: Balanced (optimized), High (quality-focused)
- Note: AV1 encoding is computationally intensive

**MOV | ProRes 422 HQ + PCM**

- Codec: ProRes 422 HQ (via prores_ks encoder)
- Audio: PCM (uncompressed)
- Compatibility: Professional video editing applications
- Use Case: Editing workflows, archival, post-production
- Quality: Lossless/near-lossless quality

**MKV | Passthrough**

- Codec: Stream copy (remux only)
- Audio: Stream copy (remux only)
- Compatibility: Universal container for diverse codec combinations
- Use Case: Container conversion without re-encoding

**GIF**

- Format: Animated GIF
- Use Case: Short clips, animations
- Note: Limited to short durations and small resolutions due to file size considerations

#### Audio-Only Presets

**M4A (AAC)**: Lossy compression, good quality-to-size ratio
**MP3**: Universal compatibility, lossy compression
**FLAC**: Lossless compression, archival quality
**WAV**: Uncompressed, maximum quality

---

## Conversion Pipeline

Honeymelon implements a three-stage conversion pipeline optimized for quality and performance:

### Stage 1: Probe

**Purpose**: Extract comprehensive metadata from input media files

**Process**:

1. Execute `ffprobe` via Tauri command interface
2. Parse JSON output for codec information, duration, resolution, color metadata, subtitle tracks
3. Generate `ProbeSummary` object for planning stage

**Implementation**: `src/lib/ffmpeg-probe.ts`, `src-tauri/src/ffmpeg_probe.rs`

**Output**: Complete media metadata including:

- Video codec, resolution, frame rate, color space information
- Audio codec, sample rate, channel configuration
- Subtitle tracks with type classification (text/image)
- Total duration and bitrate information

### Stage 2: Plan

**Purpose**: Determine optimal conversion strategy based on source characteristics and target preset

**Process**:

1. Evaluate source codecs against target preset requirements
2. Check container compatibility using constraint rules
3. Query encoder capability detection for available encoders
4. Generate FFmpeg command-line arguments
5. Set remux flag if lossless stream copy is possible

**Decision Matrix**:

- **Full Remux**: Source codec and container both match target (no re-encoding)
- **Container Remux**: Source codec matches target, only container differs (stream copy)
- **Partial Transcode**: Video stream copied, audio re-encoded (or vice versa)
- **Full Transcode**: Both video and audio require re-encoding

**Implementation**: `src/lib/ffmpeg-plan.ts`, `src/lib/container-rules.ts`, `src/lib/presets.ts`

**Output**: `PlannerDecision` object containing:

- Complete FFmpeg argument array
- Remux flag indicating stream copy usage
- Warning messages for quality/compatibility considerations
- Estimated processing complexity

### Stage 3: Execute

**Purpose**: Execute FFmpeg conversion with progress tracking and error handling

**Process**:

1. Spawn FFmpeg as separate child process via Rust backend
2. Parse stderr output for progress information (time processed, FPS, encoding speed)
3. Emit progress events to frontend via Tauri event system
4. Handle cancellation requests via process termination
5. Emit completion event with success/failure status

**Progress Tracking**:

- Time-based progress when duration is known
- Frame-based progress for duration-less sources
- Real-time FPS and encoding speed metrics
- ETA calculation based on processing velocity

**Concurrency Management**:

- Configurable concurrent job limit (1-4 jobs)
- Exclusive lock system for resource-intensive codecs (AV1, ProRes)
- Automatic queue management and job scheduling

**Implementation**: `src-tauri/src/ffmpeg_runner.rs`, `src/composables/use-job-orchestrator.ts`

**Events**:

- `ffmpeg://progress`: Periodic progress updates during conversion
- `ffmpeg://completion`: Final status (success, error, cancelled)

---

## Architecture

### Technology Stack

**Frontend**

- **Framework**: Vue 3 with Composition API and `<script setup>` syntax
- **Language**: TypeScript (strict mode)
- **State Management**: Pinia for job queue and user preferences
- **UI Components**: shadcn-vue (Radix Vue/Reka UI components)
- **Styling**: Tailwind CSS 4.x with utility-first approach
- **Build Tool**: Vite 6.x

**Backend**

- **Framework**: Tauri 2.x for native desktop integration
- **Language**: Rust with async/await runtime
- **Process Management**: Tokio async runtime for FFmpeg process handling
- **IPC**: Tauri command system for frontend-backend communication

**External Dependencies**

- **Media Processing**: FFmpeg/FFprobe (out-of-process execution)
- **Hardware Acceleration**: Apple VideoToolbox (system-provided)

### Project Structure

```
honeymelon/
├── src/                            # Frontend source code
│   ├── app.vue                     # Root application component
│   ├── lib/                        # Core business logic
│   │   ├── ffmpeg-probe.ts         # FFprobe wrapper and metadata extraction
│   │   ├── ffmpeg-plan.ts          # Conversion planning engine
│   │   ├── container-rules.ts      # Container codec compatibility rules
│   │   ├── presets.ts              # Preset definitions with quality tiers
│   │   ├── capability.ts           # Encoder capability detection
│   │   ├── types.ts                # TypeScript type definitions
│   │   └── utils.ts                # Utility functions (file size, duration formatting)
│   ├── stores/                     # Pinia state management
│   │   ├── jobs.ts                 # Job queue state machine
│   │   └── prefs.ts                # User preferences persistence
│   ├── composables/                # Vue composables
│   │   └── use-job-orchestrator.ts # Job lifecycle orchestration
│   ├── components/                 # Vue components
│   │   ├── JobQueueItem.vue        # Individual job display
│   │   ├── AboutDialog.vue         # About window
│   │   ├── PreferencesDialog.vue   # Preferences window
│   │   └── ui/                     # shadcn-vue components
│   └── assets/                     # Static assets
│
├── src-tauri/                      # Rust backend
│   ├── src/
│   │   ├── lib.rs                  # Main application setup and menu
│   │   ├── ffmpeg_probe.rs         # FFprobe command execution
│   │   ├── ffmpeg_runner.rs        # FFmpeg process spawning and management
│   │   ├── ffmpeg_capabilities.rs  # Encoder/format detection
│   │   ├── fs_utils.rs             # File system utilities
│   │   └── error.rs                # Unified error handling
│   ├── tauri.conf.json             # Tauri configuration
│   ├── Cargo.toml                  # Rust dependencies
│   └── resources/                  # Bundled resources
│       └── bin/                    # Optional bundled FFmpeg binaries
│           ├── ffmpeg
│           └── ffprobe
│
├── LICENSES/                       # Third-party license files
│   └── FFMPEG-LGPL.txt             # FFmpeg LGPL license
├── LICENSE                         # MIT license for Honeymelon
├── THIRD_PARTY_NOTICES.md          # Comprehensive dependency attribution
├── COMMERCIAL_LICENSE.md           # Commercial use guide
├── LICENSE_COMPLIANCE.md           # Technical compliance documentation
├── CONTRIBUTING.md                 # Contribution guidelines
├── CODE_OF_CONDUCT.md              # Community code of conduct
├── CODEOWNERS                      # Code ownership definitions
├── BUILD.md                        # Build instructions
├── CLAUDE.md                       # AI assistant development guide
├── package.json                    # Node.js dependencies
└── README.md                       # This file
```

### Architectural Principles

**Process Separation**

- FFmpeg runs as completely separate process (no library linking)
- Ensures LGPL compliance without contaminating application license
- Enables easy FFmpeg binary replacement and updates
- Provides process-level isolation for stability

**Reactive State Management**

- Pinia stores manage job queue with discriminated union types
- Job state transitions: `queued → probing → planning → running → completed/failed/cancelled`
- Real-time UI updates via Vue reactivity system
- Persistent preferences across application restarts

**Event-Driven Progress**

- Tauri event system for asynchronous FFmpeg output streaming
- Non-blocking progress updates maintain UI responsiveness
- Backpressure handling for high-frequency progress events

**Capability Detection**

- Runtime detection of available FFmpeg encoders and formats
- Automatic preset disabling when required encoders unavailable
- Graceful degradation for incomplete FFmpeg builds

---

## Installation

### Option 1: Pre-built Binary (Recommended)

1. Download the latest DMG from the [Releases](../../releases) page
2. Open the downloaded DMG file
3. Drag Honeymelon.app to your Applications folder
4. Launch Honeymelon from Applications or Spotlight

**First Launch**: macOS may display a security warning for unsigned applications. To allow:

- Control-click the app icon
- Select "Open" from the context menu
- Click "Open" in the confirmation dialog

### Option 2: Build from Source

See [Building from Source](#building-from-source) section below.

---

## Building from Source

### Prerequisites

**Required Tools**:

- **Xcode Command Line Tools**: `xcode-select --install`
- **Rust**: Install via rustup: `curl https://sh.rustup.rs -sSf | sh`
- **Node.js**: Version 18 or later
- **npm**: Included with Node.js (alternatively use pnpm or yarn)

**Optional**:

- **FFmpeg**: System installation or place binaries in `src-tauri/resources/bin/`

### Build Steps

1. **Clone the repository**:

   ```bash
   git clone https://github.com/YOUR_USERNAME/honeymelon.git
   cd honeymelon
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Run in development mode**:

   ```bash
   npm run tauri:dev
   ```

   This launches the app with hot-reload enabled for rapid development.

4. **Build for production**:

   ```bash
   npm run tauri:build
   ```

   Output location: `src-tauri/target/release/bundle/dmg/Honeymelon_*.dmg`

### Advanced Build Configuration

**Target Architectures**:

- **Apple Silicon only** (default): `npm run tauri:build`
- **Universal binary**: `npm run tauri:build:universal`

**FFmpeg Configuration**:

- **Bundled**: Place `ffmpeg` and `ffprobe` binaries in `src-tauri/resources/bin/`
- **System**: Configure path in application Preferences after building

**Code Signing** (for distribution):

1. Obtain Apple Developer ID Application certificate
2. Set environment variables:

   ```bash
   export APPLE_ID="your@apple.id"
   export APPLE_PASSWORD="app-specific-password"
   export APPLE_TEAM_ID="YOUR_TEAM_ID"
   ```

3. Run build command: `npm run tauri:build`

See [BUILD.md](BUILD.md) for comprehensive build documentation.

---

## Configuration

### Application Preferences

Access via menu: **Honeymelon → Preferences...** or keyboard shortcut: `Cmd+,`

**Concurrent Conversions**

- Range: 1-4 simultaneous jobs
- Default: 2 jobs
- Recommendation: Match to available CPU cores and memory

**Output Directory**

- Default: Same directory as source file
- Configurable: Choose custom output location

**FFmpeg Binary Path**

- Default: Bundled binary (if available) or system FFmpeg
- Custom: Specify alternative FFmpeg installation

**Filename Options**

- Include format in output filename (e.g., `video_h264.mp4`)
- Include quality tier in output filename (e.g., `video_balanced.mp4`)

### Preset Configuration

Presets are defined in `src/lib/presets.ts` with the following structure:

```typescript
{
  id: 'mp4-h264-aac',
  label: 'MP4 | H.264/AAC',
  container: 'mp4',
  video: {
    codec: 'h264',
    copyColorMetadata: true,
    tiers: {
      fast: { /* remux-first settings */ },
      balanced: { /* optimized bitrate */ },
      high: { /* high quality */ }
    }
  },
  audio: {
    codec: 'aac',
    tiers: { /* quality configurations */ }
  }
}
```

### Environment Variables

**Development**:

- `VITE_DEV_SERVER_URL`: Override Vite dev server URL
- `RUST_LOG`: Enable Rust logging (e.g., `RUST_LOG=debug`)

**Build**:

- `APPLE_ID`: Apple Developer account email (for notarization)
- `APPLE_PASSWORD`: App-specific password
- `APPLE_TEAM_ID`: Apple Developer Team ID

---

## Usage

### Basic Workflow

1. **Launch Application**: Open Honeymelon from Applications or Spotlight

2. **Add Media Files**:
   - Drag and drop files directly into the application window
   - Click "Choose Files" button to browse for files
   - Supports batch processing of multiple files

3. **Select Conversion Settings**:
   - Choose output preset from dropdown menu (e.g., "MP4 | H.264/AAC")
   - Select quality tier: Fast (remux-first), Balanced (optimized), or High (maximum quality)
   - Settings apply per-job or can be set as default

4. **Monitor Progress**:
   - Real-time progress bar with percentage completion
   - ETA calculation based on encoding speed
   - Current FPS and processing speed display
   - View detailed logs by expanding job item

5. **Manage Conversions**:
   - Cancel individual jobs via cancel button
   - Cancel all active jobs via "Cancel All" button
   - Clear completed jobs via "Clear All" in completed section

6. **Access Output Files**:
   - Default: Same directory as source file
   - Custom: Location specified in Preferences
   - Click "Reveal in Finder" to locate converted files

### Keyboard Shortcuts

- `Cmd+,`: Open Preferences
- `Cmd+Q`: Quit Application

### Menu Bar

**Honeymelon Menu**:

- About Honeymelon
- Preferences...
- Quit Honeymelon

---

## Development

### Development Environment Setup

```bash
# Install dependencies
npm install

# Run development server with hot reload
npm run tauri:dev

# Type-check TypeScript
npm run build

# Run Rust tests
cd src-tauri && cargo test
```

### Development Guidelines

**TypeScript Standards**:

- Strict mode enabled
- Explicit return types for functions
- Avoid `any` type; use `unknown` with type guards
- Use discriminated unions for state management

**Vue Standards**:

- Use `<script setup>` syntax
- Composition API over Options API
- Extract reusable logic into composables
- Keep components focused and under 300 lines

**Rust Standards**:

- Follow Rust idioms and conventions
- Use `Result` for error handling
- Document public APIs with doc comments
- Keep Tauri commands minimal and focused

**Code Style**:

- 2-space indentation for TypeScript/Vue
- 4-space indentation for Rust
- Line length: 100 characters (soft limit)
- Use Prettier for TypeScript formatting
- Use rustfmt for Rust formatting

### Testing

**Frontend Testing**:

- Unit tests for utility functions and business logic
- Component tests for Vue components (planned)
- Test framework: Vitest (to be configured)

**Backend Testing**:

- Rust unit tests in module files
- Integration tests in `src-tauri/tests/` directory
- Run tests: `cd src-tauri && cargo test`

**Manual Testing Checklist**:

- Drag and drop functionality
- Multiple file formats
- Concurrent job processing
- Cancellation behavior
- Edge cases: special characters in filenames, very large files
- Error handling: missing encoders, disk space issues

---

## Legal & Licensing

### Commercial Use

**Honeymelon can be sold commercially** under its MIT license. The application executes FFmpeg as a separate, external process without any linking, ensuring full LGPL compliance while allowing proprietary commercial distribution.

For comprehensive commercial use guidance, see [COMMERCIAL_LICENSE.md](COMMERCIAL_LICENSE.md).

### FFmpeg Licensing

**License**: LGPL v2.1 or later

**Compliance Method**: Process Separation

- Honeymelon executes FFmpeg as a completely separate process
- No static linking to FFmpeg libraries
- No dynamic linking to FFmpeg libraries
- Communication via standard input/output and file system only
- This approach satisfies LGPL requirements without affecting Honeymelon's MIT license

**Implications**:

- Honeymelon source code can remain proprietary
- No obligation to provide Honeymelon source code to users
- Must include FFmpeg license file with distribution
- Must provide information on obtaining FFmpeg source code
- Cannot modify FFmpeg without offering source (Honeymelon doesn't modify FFmpeg)

See [LICENSES/FFMPEG-LGPL.txt](LICENSES/FFMPEG-LGPL.txt) for complete license text.

### Patent Considerations

Certain audio and video codecs may be subject to patent claims in various jurisdictions:

**H.264/H.265 (HEVC)**:

- Patent pools managed by MPEG LA and HEVC Advance
- Honeymelon uses Apple VideoToolbox hardware encoders
- Apple handles patent licensing for system-provided codecs
- Included with macOS at no additional cost to users

**AAC**:

- Patent pool managed by Via Licensing
- Provided by system codecs when using hardware acceleration
- Covered by Apple's licensing arrangements

**VP9/AV1/Opus**:

- Royalty-free codecs without patent licensing requirements
- Available through open-source encoder libraries

**User Responsibility**: Users who compile custom FFmpeg builds with additional software encoders (x264, x265, fdk-aac) are responsible for ensuring proper patent licensing in their jurisdiction.

### Third-Party Software

All third-party dependencies are documented with proper attribution:

**License Documentation**:

- [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md): Complete list of dependencies and licenses
- [LICENSES/](LICENSES/): Individual license files for major dependencies

**Key Dependencies**:

- **Tauri**: MIT/Apache-2.0 dual license
- **Vue.js**: MIT license
- **Rust ecosystem**: Primarily MIT/Apache-2.0 dual licensed crates
- **shadcn-vue**: MIT license
- **Tailwind CSS**: MIT license

### Distribution Requirements

When distributing Honeymelon (commercially or otherwise), include:

1. **LICENSE** file (MIT license for Honeymelon source code)
2. **LICENSES/FFMPEG-LGPL.txt** (FFmpeg LGPL license)
3. **THIRD_PARTY_NOTICES.md** (all dependency attributions)
4. Link to FFmpeg source code (provided in notices)

**This approach is legally sound for commercial sale.**

For technical implementation details, see [LICENSE_COMPLIANCE.md](LICENSE_COMPLIANCE.md).

---

## Troubleshooting

### Common Issues

**Preset Unavailable / Greyed Out**

- **Cause**: FFmpeg lacks required encoder (e.g., libvpx for VP9, libaom for AV1)
- **Solution**: Use bundled FFmpeg with required encoders, or install system FFmpeg with necessary libraries
- **Verification**: Check FFmpeg encoders: `ffmpeg -encoders | grep <encoder_name>`

**Conversion Progress Stuck at 0%**

- **Cause**: Input file lacks duration metadata
- **Solution**: Progress will fall back to frame-based estimation; conversion continues normally
- **Note**: Some formats (live streams, damaged files) may not provide duration information

**Subtitle Handling Issues**

- **PGS Subtitles in MP4**: MP4 container doesn't support image-based subtitles (PGS/VOBSUB)
  - Solution: Use burn-in option (rasterizes subtitles onto video) or output to MKV
- **Text Subtitle Conversion**: MP4 converts SRT/ASS to mov_text; MKV preserves original format

**Choppy HEVC Playback**

- **Cause**: High bitrate or profile incompatibility with playback device
- **Solution**: Use H.264 preset, or reduce quality tier from High to Balanced
- **Note**: Some older devices lack hardware HEVC decoding support

**Large GIF Files**

- **Cause**: GIF format is inefficient for long or high-resolution animations
- **Solution**: Keep clips under 10 seconds and resolution under 720p
- **Alternative**: Use WebM format for better compression with animation support

**FFmpeg Not Found**

- **Cause**: No bundled FFmpeg and system FFmpeg not in PATH
- **Solution**: Install FFmpeg via Homebrew (`brew install ffmpeg`) or specify custom path in Preferences

**Conversion Fails with Codec Error**

- **Cause**: Input file uses unsupported or proprietary codec
- **Solution**: Check FFmpeg codec support: `ffmpeg -decoders`
- **Workaround**: Convert file with another tool to supported format first

### Performance Optimization

**Maximize Conversion Speed**:

- Use remux-first presets (Fast tier) when possible
- Increase concurrent job limit if system has available resources
- Ensure sufficient free disk space for temporary files
- Close resource-intensive applications during conversion

**Reduce Memory Usage**:

- Decrease concurrent job limit to 1-2
- Process files sequentially rather than in batch
- Restart application if memory usage becomes excessive

### Getting Help

**Before Reporting Issues**:

1. Check this Troubleshooting section
2. Review [GitHub Discussions](../../discussions) for similar questions
3. Verify FFmpeg installation and encoder availability
4. Check Console.app for error messages (filter by "Honeymelon")

**Bug Reports**:

- Use [Bug Report template](.github/ISSUE_TEMPLATE/bug_report.md)
- Include macOS version, chip type, Honeymelon version
- Provide sample file details (format, codec, size) if applicable
- Attach relevant log output from Console.app

**Feature Requests**:

- Use [Feature Request template](.github/ISSUE_TEMPLATE/feature_request.md)
- Describe use case and expected behavior
- Include examples or mockups if helpful

---

## Contributing

Contributions are welcome and appreciated. Please read [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines on:

- Code of conduct
- Development setup
- Coding standards
- Commit message format
- Pull request process

### Development Priorities

**High Priority**:

- Bug fixes for reported issues
- Performance optimizations
- FFmpeg integration improvements
- Documentation enhancements

**Medium Priority**:

- Additional preset configurations
- UI/UX refinements
- Automated testing infrastructure
- Accessibility improvements

**Future Enhancements**:

- Batch folder processing
- Video trimming and cropping
- Multi-track audio selection
- Advanced subtitle handling

### Code Style Requirements

- **TypeScript**: Strict mode, explicit types, functional programming patterns
- **Vue**: Composition API with `<script setup>`, reactive state management
- **Rust**: Idiomatic Rust, comprehensive error handling, minimal unsafe code
- **Testing**: Unit tests for business logic, integration tests for critical paths

---

## Acknowledgements

This project builds upon the excellent work of many open-source communities:

- **FFmpeg Team**: Comprehensive media processing framework
- **Tauri Team**: Modern desktop application framework
- **Vue.js Team**: Reactive UI framework
- **Rust Community**: Safe systems programming language
- **shadcn-vue Community**: Beautiful, accessible UI components
- **All Contributors**: Code, documentation, bug reports, and feature suggestions

---

## License

### Honeymelon Application

Licensed under the MIT License. See [LICENSE](LICENSE) file for complete terms.

Copyright (c) 2025 Honeymelon Contributors

### FFmpeg

Licensed under the LGPL v2.1 or later. See [LICENSES/FFMPEG-LGPL.txt](LICENSES/FFMPEG-LGPL.txt) for complete terms.

Copyright (c) 2000-2025 FFmpeg Developers

### Third-Party Dependencies

All third-party software licenses and attributions are documented in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

---

**Project Status**: Active Development

**Version**: 0.1.0

**Maintained By**: Honeymelon Contributors

**Repository**: <https://github.com/YOUR_USERNAME/honeymelon>
