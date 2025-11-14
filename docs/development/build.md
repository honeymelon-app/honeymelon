---
title: Build Guide
description: Comprehensive instructions for building Honeymelon from source, including development and production builds
editLink: false
---

# Build Guide

This guide provides comprehensive instructions for building Honeymelon from source on macOS, including prerequisites, development builds, production distribution builds, code signing, and notarization.

## Quick Start

```bash
# Clone the repository
git clone https://github.com/honeymelon-app/honeymelon.git
cd honeymelon

# Install dependencies (includes FFmpeg download)
npm install

# For full-stack development with FFmpeg
npm run tauri:dev

# For production build with code signing
npm run tauri:build
```

## Prerequisites

### Required Software

| Software               | Minimum Version | Purpose             | Installation                                  |
| ---------------------- | --------------- | ------------------- | --------------------------------------------- |
| **macOS**              | 13.0 (Ventura)  | Build platform      | N/A                                           |
| **Xcode Command Line** | 14.0+           | C/C++ compiler, SDK | `xcode-select --install`                      |
| **Node.js**            | 20.0+           | JavaScript runtime  | [nodejs.org](https://nodejs.org/) or Homebrew |
| **npm**                | 10.0+           | Package manager     | Included with Node.js                         |
| **Rust**               | 1.75+           | Backend compilation | [rustup.rs](https://rustup.rs/)               |
| **Cargo**              | 1.75+           | Rust build tool     | Included with Rust                            |

### Platform Requirements

- **Apple Silicon Mac** (M1/M2/M3/M4) required
- Intel Macs not supported
- 8 GB RAM minimum (16 GB for concurrent builds)
- 2 GB free disk space for build artifacts

### Install Xcode Command Line Tools

```bash
xcode-select --install
```

Verify installation:

```bash
xcode-select -p
# Expected: /Library/Developer/CommandLineTools or /Applications/Xcode.app/Contents/Developer
```

### Install Node.js

**Via Official Installer** (recommended):

- Download LTS version from [nodejs.org](https://nodejs.org/)

**Via Homebrew**:

```bash
brew install node@20
```

**Verify Installation**:

```bash
node --version  # Should be v20.0.0 or higher
npm --version   # Should be 10.0.0 or higher
```

### Install Rust

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

Restart your terminal after installation.

**Verify Installation**:

```bash
rustc --version  # Should be 1.75.0 or higher
cargo --version  # Should be 1.75.0 or higher
```

**Add Apple Silicon Target**:

```bash
rustup target add aarch64-apple-darwin
```

## Initial Setup

1. **Clone the Repository**

   ```bash
   git clone https://github.com/honeymelon-app/honeymelon.git
   cd honeymelon
   ```

2. **Install Node Dependencies**

   ```bash
   npm install
   ```

   This automatically:
   - Installs all frontend dependencies from `package.json`
   - Runs `npm run download-ffmpeg` via postinstall hook
   - Downloads Apple Silicon FFmpeg binaries to `src-tauri/bin/`

3. **Verify FFmpeg Binaries**

   ```bash
   ls -lh src-tauri/bin/
   # Should show ffmpeg and ffprobe binaries

   file src-tauri/bin/ffmpeg
   # Expected: Mach-O 64-bit executable arm64
   ```

4. **Build Rust Dependencies** (optional but recommended)

   ```bash
   cd src-tauri
   cargo build
   cd ..
   ```

## Development Builds

### Frontend Development Only

For UI-only development (fast hot reload, no FFmpeg):

```bash
npm run dev
```

- Starts Vite dev server at `http://localhost:1420`
- Changes to Vue, TypeScript, and CSS hot-reload automatically
- **Use for**: UI/UX work, component development, styling
- **Limitation**: Cannot test FFmpeg functionality

### Full-Stack Development (Recommended)

For complete development with FFmpeg integration:

```bash
npm run tauri:dev
```

This:

- Builds Rust backend in development mode
- Starts Vite dev server
- Launches Tauri desktop application
- Enables hot reload for frontend changes
- Requires Rust recompilation for backend changes

- **Use for**: Feature development, conversion testing, end-to-end workflows
- **First launch**: 1-2 minutes (Rust compilation)
- **Subsequent launches**: Faster

### Backend-Only Development

For Rust code development:

```bash
cd src-tauri

# Run tests
cargo test

# Check for errors without building
cargo check

# Run Clippy linter
cargo clippy --all-targets --all-features -- -D warnings

# Format code
cargo fmt --all
```

## Production Builds

### Build Configuration

Production builds configured in:

- **Frontend**: `package.json`, `vite.config.ts`
- **Backend**: `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`

### Code Signing & Notarization

::: tip Distribution
To distribute Honeymelon outside the Mac App Store, you must code sign and notarize with an Apple Developer account.
:::

**Requirements**:

1. Active Apple Developer Program membership ($99/year)
2. Developer ID Application certificate in Keychain
3. App-specific password for notarization

**Obtain Certificates**:

1. Go to [Apple Developer Portal](https://developer.apple.com/account)
2. Navigate to Certificates, Identifiers & Profiles
3. Create a Developer ID Application certificate
4. Download and install in Keychain Access

**Create App-Specific Password**:

1. Go to [appleid.apple.com](https://appleid.apple.com)
2. Navigate to Security → App-Specific Passwords
3. Generate new password (label: "Honeymelon Notarization")
4. Save securely

### Environment Variables

Set before building:

```bash
# Required for code signing
export APPLE_SIGNING_IDENTITY="Developer ID Application: Your Name (TEAM_ID)"

# Required for notarization
export APPLE_ID="your-apple-id@example.com"
export APPLE_PASSWORD="your-app-specific-password"
export APPLE_TEAM_ID="YOUR_TEAM_ID"

# Optional: Verbose output
export TAURI_DEBUG=1
```

**Alternative**: Create `.env` file (never commit):

```bash
APPLE_SIGNING_IDENTITY="Developer ID Application: Your Name (TEAM_ID)"
APPLE_ID="your-apple-id@example.com"
APPLE_PASSWORD="your-app-specific-password"
APPLE_TEAM_ID="YOUR_TEAM_ID"
```

**Find Your Team ID**:

```bash
security find-identity -v -p codesigning
# Your Team ID is the 10-character string in parentheses
```

### Building the Release

**Step 1: Pre-Build Checks**

```bash
npm run lint
npm test
cd src-tauri && cargo test && cd ..
npm run type-check

# Verify FFmpeg binaries are arm64
file src-tauri/bin/ffmpeg
file src-tauri/bin/ffprobe
```

**Step 2: Build Frontend Assets**

```bash
npm run build
```

This:

- Type-checks with `vue-tsc`
- Builds optimized production assets to `dist/`
- Minifies JavaScript and CSS

**Step 3: Build Tauri Application**

```bash
npm run tauri:build
```

This:

- Compiles Rust backend in release mode (optimized)
- Packages frontend assets
- Code signs the application
- Creates DMG installer
- Notarizes the DMG (if credentials provided)

**Build Duration**: 5-15 minutes (depends on machine: M1/M2/M3/M4)

**Notarization Wait**: 5-15 minutes (Apple servers)

### Build Artifacts

After successful build:

```
src-tauri/target/aarch64-apple-darwin/release/
├── honeymelon                    # Raw executable
├── bundle/
│   ├── macos/
│   │   └── Honeymelon.app       # Application bundle
│   └── dmg/
│       └── Honeymelon_0.0.1_aarch64.dmg  # Signed and notarized DMG
```

**Generate SHA256 Checksum**:

```bash
cd src-tauri/target/aarch64-apple-darwin/release/bundle/dmg
shasum -a 256 Honeymelon_*.dmg > SHA256SUMS
cat SHA256SUMS
```

## Verification

### Verify Code Signature

```bash
codesign -vvv --deep --strict src-tauri/target/aarch64-apple-darwin/release/bundle/macos/Honeymelon.app
# Expected: "valid on disk" and "satisfies its Designated Requirement"
```

### Verify Notarization

```bash
spctl -a -vvv -t install src-tauri/target/aarch64-apple-darwin/release/bundle/macos/Honeymelon.app
# Expected: "accepted" and "source=Notarized Developer ID"
```

### Test Installation

1. **Mount DMG**:

   ```bash
   open src-tauri/target/aarch64-apple-darwin/release/bundle/dmg/Honeymelon_*.dmg
   ```

2. **Copy to Applications**:
   Drag `Honeymelon.app` to `/Applications`

3. **Launch**:

   ```bash
   open /Applications/Honeymelon.app
   ```

4. **Verify First Launch**:
   - Gatekeeper should allow opening without warnings
   - App launches normally
   - "About Honeymelon" shows correct version

5. **Smoke Test**:
   - Drop a test video file
   - Select a preset
   - Start conversion
   - Verify output file

## Troubleshooting

### Common Issues

| Issue               | Cause                | Solution                                    |
| ------------------- | -------------------- | ------------------------------------------- |
| `npm install` fails | Node version too old | Update to Node 20+                          |
| `cargo build` fails | Rust not installed   | Install via [rustup.rs](https://rustup.rs/) |
| `tauri build` fails | Target not added     | `rustup target add aarch64-apple-darwin`    |
| "FFmpeg not found"  | Binaries not bundled | Run `npm run download-ffmpeg`               |
| DMG not created     | Code signing failed  | Check `APPLE_SIGNING_IDENTITY`              |
| App won't open      | Wrong architecture   | Verify `file <app>` shows `arm64`           |

### FFmpeg Issues

**Problem**: FFmpeg binaries missing or wrong architecture

**Solution**:

```bash
rm -rf src-tauri/bin/
npm run download-ffmpeg

# Verify
file src-tauri/bin/ffmpeg
# Expected: Mach-O 64-bit executable arm64
```

**Manual Download**:

1. Download FFmpeg arm64 static builds from [evermeet.cx](https://evermeet.cx/ffmpeg/) or [ffmpeg.org](https://ffmpeg.org/download.html)
2. Extract `ffmpeg` and `ffprobe`
3. Place in `src-tauri/bin/`
4. Make executable: `chmod +x src-tauri/bin/ff*`

### Code Signing Issues

**"no identity found" error**:

```bash
security find-identity -v -p codesigning
```

Look for "Developer ID Application: Your Name (TEAM_ID)" and set `APPLE_SIGNING_IDENTITY` exactly.

**"errSecInternalComponent" error**:

```bash
security unlock-keychain ~/Library/Keychains/login.keychain-db
```

### Notarization Issues

**Check Status**:

```bash
xcrun notarytool log <notarization-uuid> --apple-id "$APPLE_ID" --password "$APPLE_PASSWORD" --team-id "$APPLE_TEAM_ID"
```

**Common Causes**:

1. App-specific password expired → Generate new one at appleid.apple.com
2. Wrong Team ID → Verify with `security find-identity -v -p codesigning`
3. Bundle validation errors → Check notarytool log
4. Hardened runtime issues → Verify `entitlements.plist` present

## Advanced Topics

For advanced topics like custom FFmpeg builds, debug builds, clean builds, and CI/CD integration, see:

[View Full BUILD.md](https://github.com/honeymelon-app/honeymelon/blob/main/BUILD.md)

## Additional Resources

- [Tauri Documentation](https://tauri.app/v2/guides/)
- [Vue 3 Documentation](https://vuejs.org/)
- [Rust Documentation](https://doc.rust-lang.org/)
- [Apple Developer Portal](https://developer.apple.com/)
- [Code Signing Guide](https://developer.apple.com/support/code-signing/)
- [Notarization Guide](https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution)
- [FFmpeg Documentation](https://ffmpeg.org/documentation.html)

## Related Documentation

- [README.md](../README.md) - User-facing documentation
- [CLAUDE.md](./claude.md) - Codebase architecture guide
- [CONTRIBUTING.md](./contributing.md) - Contribution guidelines
- [AGENTS.md](./agents.md) - Commit conventions

## Support

- [GitHub Issues](https://github.com/honeymelon-app/honeymelon/issues)
- [GitHub Discussions](https://github.com/honeymelon-app/honeymelon/discussions)
- Email: tjthavarshan@gmail.com

---

**Last Updated**: November 2024
