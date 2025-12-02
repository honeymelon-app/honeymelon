# Changelog

All notable changes to Honeymelon will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Expanded format support (ported from Comet):
  - Video containers: AVI, FLV, M4V, TS, OGV, MPEG (now 11 total)
  - Audio containers: OGG, AAC, AIFF, Opus (now 8 total)
  - Image containers: BMP, TIFF (now 5 total)
  - Video codecs: VP8, Theora, MPEG-4, FLV1, MPEG-2
  - Audio codecs: MP2, AC3, PCM (24-bit)
- New container compatibility rules for all added formats
- Encoder strategies for legacy codecs (Theora, MPEG-2, FLV1)
- UI animations for better user experience:
  - Theme switcher: horizontal flip on hover
  - Language switcher (globe): spin animation on hover
  - Destination folder: folder-open tilt on hover
  - Job queue items: entrance animations and hover effects
  - Progress bar: shimmer effect during conversion
  - Status badges: pulse for completed, shake for failed

### Changed

- Removed footer from app shell, integrated controls into job queue toolbar
- Toolbar now uses icon buttons with tooltips instead of text buttons
- Updated presets system with dynamic generation from target profiles
- Container rules refactored with comprehensive codec compatibility matrix

### Documentation

- Updated supported formats documentation with all 24 containers
- Added detailed codec compatibility matrices for each container
- Updated README with accurate format lists and line counts
- Synced VitePress docs with expanded format support

## [0.0.1] - 2025-11-11

This is the initial public release. See [Unreleased] section for complete feature list.

### Added

- Initial public release of Honeymelon media converter
- Remux-first FFmpeg workflow for lossless stream copying
- Three-stage conversion pipeline: Probe → Plan → Execute
- Preset system with quality tiers (fast, balanced, high)
- Support for H.264, HEVC, VP9, AV1, VP8, Theora, MPEG-4, FLV1, and MPEG-2 video codecs
- Support for AAC, MP3, Opus, Vorbis, FLAC, PCM, MP2, and AC3 audio codecs
- MP4, MOV, MKV, WebM, GIF, AVI, FLV, M4V, TS, OGV, and MPEG container support
- PNG, JPEG, WebP, BMP, and TIFF image format support
- Real-time progress tracking with FFmpeg process management
- Job queue with concurrency limiting
- Drag-and-drop media file interface
- FFmpeg capability detection and automatic preset filtering
- Batch conversion support with exclusive locks for heavy codecs (AV1, ProRes)
- Subtitle handling (keep, convert, drop)
- Color metadata preservation during transcoding
- Custom FFmpeg path configuration
- Output directory settings
- Recursive media file discovery for dropped folders

### Changed

- Rust backend now loads `.env` at build time and forwards `LICENSE_SIGNING_PUBLIC_KEY` to the compiler for license verification (via `build.rs` and `dotenvy`).
- Added `dotenvy` to Rust build dependencies.
- Improved license key verification: key available at both build and runtime; temporary test for key loading added and removed after verification.
- Replaced all dynamic imports of Tauri API modules with static imports in frontend files to resolve Vite warnings:
  - `src/stores/license.ts`
  - `src/composables/use-file-handler.ts`
  - `src/composables/use-job-orchestrator.ts`
  - `src/lib/file-discovery.ts`
  - `src/components/DestinationChooser.vue`
- Added and improved docblocks and comments in Rust modules for clarity and maintainability (`lib.rs`, `license.rs`, `ffmpeg_capabilities.rs`).
- Embedded custom macOS `Info.plist` overrides to require native arm64 execution, enforce Retina support, and predeclare camera/microphone usage descriptions for notarization.
- Limited bundling to DMG artifacts to avoid redundant `.app` archives on Apple Silicon builds.

### Documentation

- Initial README with feature overview
- BUILD.md with compilation instructions for macOS
- CONTRIBUTING.md with development guidelines
- CODE_OF_CONDUCT.md (Contributor Covenant)
- CLAUDE.md for AI code assistant context
- AGENTS.md for commit/PR guidelines
- THIRD_PARTY_NOTICES.md for dependencies
- LICENSE_COMPLIANCE.md for LGPL compliance details
- COMMERCIAL_LICENSE.md for alternative licensing
- README now highlights the Apple Silicon-focused packaging, bundled arm64 FFmpeg sidecars, and adds a release checklist step to verify their architecture.

### Known Limitations

- macOS only (Apple Silicon / arm64 target)
- Image-based subtitle burn-in not yet implemented
- JavaScript automated tests framework pending (use Vitest)
- Subtitle mode configuration not exposed in UI (can be set via presets)

### Architecture

- Vue 3 frontend with TypeScript and Tailwind CSS
- Tauri 2 desktop framework
- Rust backend for FFmpeg integration
- Pinia state management
- shadcn-vue UI components
