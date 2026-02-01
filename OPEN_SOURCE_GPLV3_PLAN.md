# Open Source + GPLv3 Transition Plan

## Purpose

This document outlines the full process for open-sourcing Honeymelon and transitioning the repository
to the GNU GPLv3 license. It is intended to be executed sequentially and tracked as a checklist.

## Current Status

- Repository is **proprietary** with a custom LICENSE.
- Goal: transition to **GPLv3** while keeping FFmpeg process separation and LGPL compliance intact.
- This plan focuses on legal readiness, repository updates, and operational launch steps.

## Phase 0: Legal & Ownership Readiness

- Confirm the copyright holder(s) and ensure all contributors have granted rights.
- Review any contributor agreements, employment contracts, or vendor agreements for open-source rights.
- Identify trademarks or brand assets that should remain restricted (e.g., name, logo).

## Phase 1: Dependency & Asset License Audit

- Inventory all dependencies:
  - npm packages (`package-lock.json`)
  - Rust crates (`src-tauri/Cargo.lock`)
  - Bundled binaries (FFmpeg/FFprobe)
  - Fonts, icons, and UI assets
- Validate GPLv3 compatibility for each dependency and asset.
- Replace or remove any incompatible licenses.
- Produce an explicit `THIRD_PARTY_NOTICES.md` and store major licenses in `LICENSES/`.

## Phase 2: Security & Hygiene Review

- Scan for secrets, credentials, internal endpoints, or private documentation.
- Confirm `.env.example` contains only safe defaults.
- Remove or redact internal notes not meant for public release.
- Ensure CI/CD logs do not expose private paths or tokens.

## Phase 3: Repository Licensing Changes (Future Implementation)

- Replace `LICENSE` with the full GPLv3 text.
- Update license declarations:
  - `package.json` + `package-lock.json`
  - `src-tauri/Cargo.toml`
- Update public docs and UI references:
  - README license badge + Legal & Licensing section
  - CONTRIBUTING and SECURITY policies
  - About dialog license label in the app UI
- Add a `NOTICE` file if required for attribution or trademark usage.

## Phase 4: Contribution & Governance Updates

- Update `CONTRIBUTING.md` to reflect GPLv3 and open-source contribution terms.
- Decide on DCO vs. CLA and add the chosen workflow.
- Define maintainer roles, review expectations, and code-of-conduct escalation paths.

## Phase 5: Release & Launch Plan

- Tag the final proprietary release (e.g., `v1.0.0-proprietary`).
- Bump version for GPLv3 release and update `CHANGELOG.md`.
- Flip repository visibility to public and add GitHub topics.
- Publish announcement notes with the new license and contribution guidelines.

## Phase 6: Post-Launch Compliance

- Ensure distribution artifacts include GPLv3 text and third-party notices.
- Provide source availability details for bundled binaries.
- Monitor issue intake and triage new community requests.

## Repository Checklist (Target Files for License Flip)

- `LICENSE` (GPLv3 text)
- `package.json`, `package-lock.json` license fields
- `src-tauri/Cargo.toml` license field
- `README.md` license badge + licensing section
- `CONTRIBUTING.md` + `SECURITY.md`
- `src/components/AboutDialog.vue`
- `THIRD_PARTY_NOTICES.md` and `LICENSES/` updates
