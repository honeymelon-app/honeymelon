# Changelog

All notable changes to Honeymelon will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

_No unreleased changes._

## [0.0.1] - 2025-11-11

This is the initial public release. See [Unreleased] section for complete feature list.

### Added

- Initial public release of Honeymelon media converter
- Remux-first FFmpeg workflow for lossless stream copying
- Three-stage conversion pipeline: Probe → Plan → Execute
- Preset system with quality tiers (fast, balanced, high)
- Support for H.264, HEVC, VP9, and AV1 video codecs
- Support for AAC, Opus, and other audio codecs
- MP4, WebM, MOV, and MKV container support
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

- Rust backend now loads `.env` at build time and forwards `LICENSE_PUBLIC_KEY` to the compiler for license verification (via `build.rs` and `dotenvy`).
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
