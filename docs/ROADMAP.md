---
title: Product Roadmap
description: Long-term Honeymelon roadmap covering the current release, upcoming milestones, and ongoing initiatives.
---

# Honeymelon Product Roadmap

This roadmap shares Honeymelon's product direction. It complements the shorter [Development Roadmap](/development/roadmap) with deeper detail on completed work, in-flight milestones, and future exploration areas.

Use it to understand where the app is going, how releases are sequenced, and which initiatives need help. Dates represent targets rather than guarantees and will adjust as we validate user feedback.

## Version Naming

Honeymelon follows semantic versioning. Each release trains on three pillars:

- **Foundation**: Platform stability, licensing, commercial readiness
- **Experience**: User workflow improvements and polish
- **Expansion**: New codecs, formats, automation, and integrations

## Version 0.0.1 - Foundation & Core Features

**Status**: Shipped (November 2025)

### Highlights

- Remux-first conversion pipeline with probe → plan → execute stages
- FFmpeg capability detection and automatic preset availability
- Batch job queue with concurrency controls and progress telemetry
- License activation flow with offline verification and event hooks
- Vue 3 + Tauri 2 desktop shell with native macOS styling
- Complete legal package (EULA, privacy policy, third-party notices)

### Outstanding Follow-Ups

- Harden the Playwright suite to cover activation, queue exclusivity, and preset switching end-to-end
- Restructure `src-tauri/src/lib.rs` into domain submodules and extract the runner registry for better backend testability

## Version 0.1.0 - Polish & Testing Infrastructure

**Target**: Q1 2026

### Major Goals

- Stabilize UI/UX rough edges discovered during launch
- Grow Vitest coverage beyond planners/services to components and stores, enforcing coverage thresholds in CI
- Prioritize end-to-end tests (Playwright) for core conversion flows
- Improve empty and error states across the application
- Harden logging, FFmpeg error surfacing, and user messaging

### Key Deliverables

- Component-level visual smoke tests
- Automated regression suite as part of CI
- Refined onboarding and activation experience
- Expanded documentation (support, troubleshooting, licensing)

## Version 0.2.0 - Advanced Media Workflows

**Target**: Q2 2026

### Major Goals

- Subtitle burn-in and advanced subtitle conversion options
- Audio-only pipelines with waveform preview hooks
- Filter graph presets for common visual adjustments
- Drag-and-drop folder import improvements with smarter dedupe
- Advanced batch management (queue groups, rule-based presets)

### Key Deliverables

- Preset editor upgrades with custom ffmpeg args
- Preview indicators for expected output size and bitrate deltas
- Extended hardware acceleration coverage (VideoToolbox tuning)

## Version 0.3.0 - Extensibility & Automation

**Target**: Q3 2026

### Major Goals

- Custom scripting hooks for invoking Honeymelon via CLI or Apple Shortcuts
- Exportable preset bundles and team sharing
- Watch folders with background processing rules
- First-party integrations (Final Cut Pro, DaVinci Resolve handoff)

### Key Deliverables

- Automation-safe queue orchestration APIs
- Plugin concept exploration (minimal API surface, securely sandboxed)
- Remote notification support for long-running batches

## Version 1.0.0 - Stability & Commercial Launch

**Target**: Q4 2026 / Q1 2027

### Major Goals

- Freeze-breaking bugs and eliminate crashers through telemetry & testing
- Streamline notarization, code signing, and update delivery pipeline
- Finalize documentation, onboarding, and customer support processes
- Performance benchmarking and optimization for 4K and HDR workloads

### Key Deliverables

- Self-update channel with delta patching
- Spotlight/Handoff integration for macOS continuity features
- In-app help center with contextual guidance
- Enterprise license enforcement (offline activation improvements)

## Beyond 1.0

Ideas under exploration after the 1.0 release:

- Windows release feasibility study (requires dedicated Rust backend track)
- Optional AI-assisted presets for content-aware encoding decisions
- Cloud offload for extremely heavy transcodes (opt-in, privacy-aware)
- Visual timeline editing for quick trims and overlays
- Collaborative queue monitoring for teams

## Roadmap Maintenance

The roadmap is reviewed monthly after triaging feedback, support tickets, and backlog grooming. Proposed changes flow through the following steps:

1. Capture ideas in GitHub Issues or Discussions under the `roadmap` label
2. Evaluate feasibility and align with existing milestone goals
3. Update this document and the [Development Roadmap](/development/roadmap) accordingly
4. Announce significant shifts in the README or release notes

If you would like to advocate for a specific feature, open a ticket tagged `enhancement`, provide context, and link to the relevant section of this roadmap.
