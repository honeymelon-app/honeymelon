# Security Audit Status

**Last Updated**: February 5, 2026

## Overview

Honeymelon undergoes automated security audits via GitHub Actions on every push and pull request.

## Current Status

✅ **No Critical Vulnerabilities**

- npm production dependencies: 0 vulnerabilities
- Rust dependencies: 0 vulnerabilities (patched)

## Recent Security Fixes

### RUSTSEC-2026-0007: bytes Integer Overflow (Fixed)

**Date Fixed**: February 5, 2026  
**Severity**: Critical  
**Issue**: Integer overflow in `BytesMut::reserve` in bytes 1.10.1  
**Resolution**: Updated bytes from 1.10.1 → 1.11.1 via `cargo update -p bytes`  
**Advisory**: https://github.com/advisories/GHSA-434x-w66g-qw3r

## Known Non-Issues

### gtk-rs GTK3 Unmaintained Warnings

**Status**: Not Applicable (macOS-only app)

The following crates show "unmaintained" warnings in cargo-audit:

- atk, atk-sys (RUSTSEC-2024-0413, RUSTSEC-2024-0416)
- gdk, gdk-sys (RUSTSEC-2024-0412, RUSTSEC-2024-0418)
- gdkwayland-sys (RUSTSEC-2024-0411)
- fxhash (RUSTSEC-2025-0057)

**Why This Is Safe**:

1. These are Linux-only dependencies (GTK3 bindings via webkit2gtk)
2. Honeymelon targets **macOS Apple Silicon only** (macOS 13+)
3. These dependencies are never compiled or shipped in production builds
4. They exist only because Tauri has conditional Linux support in its dependency tree

**Platform Support**: macOS 13+ on Apple Silicon (M1/M2/M3/M4) only.

## CI Security Checks

Every commit runs:

1. `npm audit --omit=dev` - Frontend/build-time dependencies
2. `cargo audit` - Rust backend dependencies
3. TruffleHog - Secret scanning in git history

All checks must pass before merge to `main`.

## Reporting Security Issues

If you discover a security vulnerability, please email: tjthavarshan@gmail.com

**Do not** open a public GitHub issue for security vulnerabilities.
