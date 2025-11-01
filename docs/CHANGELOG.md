# Changelog

All notable changes to Honeymelon will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

## [0.1.0] - 2025-10-30

This is the initial public release. See [Unreleased] section for complete feature list.

[Unreleased]: https://github.com/honeymelon-app/honeymelon/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/honeymelon-app/honeymelon/releases/tag/v0.1.0
