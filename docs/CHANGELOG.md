# Changelog

All notable changes to Honeymelon will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.1/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- VitePress documentation site with comprehensive guides
- Architecture documentation covering conversion pipeline, FFmpeg integration, state management, and tech stack
- Development guides for contributing, building, and testing
- User guides for converting files, presets, batch processing, and preferences

### Changed

- Project converted from open source to closed source (proprietary)
- Enhanced accessibility features
- Improved CI workflow

### Fixed

- Build issues resolved
- Various bug fixes and improvements

## [0.1.0] - 2025-01-01

### Added

- Initial release of Honeymelon
- Native macOS application for Apple Silicon
- Drag-and-drop file conversion interface
- FFmpeg integration with out-of-process execution
- Remux-first conversion strategy
- Dynamic preset generation system
- Hardware acceleration via Apple VideoToolbox
- Batch processing with configurable concurrency
- Real-time progress monitoring
- Three quality tiers (Fast, Balanced, High)
- Support for major video containers (MP4, MOV, MKV, WebM)
- Support for major audio formats (M4A, MP3, FLAC, WAV)
- Modern codec support (H.264, H.265, VP9, AV1, ProRes)
- Pinia state management with discriminated unions
- shadcn-vue UI components
- Tailwind CSS styling
- Comprehensive test coverage (Vitest, Cargo tests, Playwright)
- TypeScript strict mode
- Rust backend with Tauri 2

### Technical Details

- **Frontend**: Vue 3 + TypeScript + Vite
- **Backend**: Rust + Tauri 2 + Tokio
- **UI**: shadcn-vue + Tailwind CSS 4
- **State**: Pinia stores
- **Testing**: Vitest + Cargo test + Playwright
- **Build**: Optimized production builds for Apple Silicon

---

## Version History

- **0.1.0** - Initial Release (2025-01-01)

---

## Future Plans

### Planned Features

- [ ] Custom preset creation and management
- [ ] Image sequence support
- [ ] Video filters (crop, scale, denoise)
- [ ] Advanced stream selection
- [ ] Two-pass encoding option
- [ ] Job queue persistence
- [ ] Scheduled conversions
- [ ] Notifications integration
- [ ] Auto-update system
- [ ] Light/Dark theme toggle
- [ ] iCloud settings sync
- [ ] Job history and analytics

### Under Consideration

- [ ] Windows support (via WSL)
- [ ] Linux support
- [ ] Plugin system for custom workflows
- [ ] GPU encoding options
- [ ] Cloud storage integration
- [ ] Batch preset templates

---

## Release Notes Format

Each release includes:

- **Added**: New features
- **Changed**: Changes to existing functionality
- **Deprecated**: Soon-to-be removed features
- **Removed**: Removed features
- **Fixed**: Bug fixes
- **Security**: Security improvements

---

## Contributing

See [Contributing Guide](/development/contributing) for information on how to contribute to Honeymelon.

## License

Honeymelon is proprietary software. See [Commercial License](/legal/commercial-license) for details.
