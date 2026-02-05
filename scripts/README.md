# Build Scripts

This directory contains build and setup scripts for Honeymelon.

## Available Scripts

### `download-ffmpeg.js`

Downloads and sets up FFmpeg and FFprobe binaries for bundling into the Honeymelon app.

**⚠️ Important:** This script is for development convenience only. For production use or end-user installations, we recommend:

1. **Homebrew** (recommended): `brew install ffmpeg`
2. **Official builds**: <https://evermeet.cx/ffmpeg/>
3. **Build from source**: <https://github.com/FFmpeg/FFmpeg>

See [FFMPEG_SOURCES.md](../docs/FFMPEG_SOURCES.md) for detailed information about FFmpeg installation, licensing, and security considerations.

**Usage:**

```bash
# Via npm (recommended)
npm run download-ffmpeg

# Direct execution
node scripts/download-ffmpeg.js

# Skip checksum verification (not recommended)
SKIP_CHECKSUM_VERIFICATION=1 npm run download-ffmpeg

# With custom checksums
export FFMPEG_SHA256=<your-hash>
export FFPROBE_SHA256=<your-hash>
npm run download-ffmpeg
```

**What it does:**

- Downloads FFmpeg and FFprobe for Apple Silicon (arm64)
- Verifies SHA256 checksums for integrity (when configured)
- Extracts binaries and places them in `src-tauri/bin/`
- Verifies architecture and applies ad-hoc code signing
- Checks for existing binaries and replaces them

**Requirements:**

- macOS Apple Silicon (arm64)
- curl (built-in)
- unzip (built-in or auto-installed via Homebrew)
- Internet connection

**Security & Licensing:**

- FFmpeg is licensed under LGPL v2.1 or later
- Used as a separate process (not linked)
- Source code: <https://github.com/FFmpeg/FFmpeg>
- Downloads use HTTPS with checksum verification
- See [LICENSES/FFMPEG-LGPL.txt](../LICENSES/FFMPEG-LGPL.txt) for full license text

**Note:** This script is automatically run during `npm install` via the postinstall hook (with graceful failure). Manual execution is only needed if you want to re-download or update the binaries.

### `update-version.js`

Keeps the project version in sync across `package.json`, `package-lock.json`, `src/components/AboutDialog.vue`, `src-tauri/Cargo.toml`, and `src-tauri/tauri.conf.json`. The `package.json` value remains the single source of truth.

**Usage:**

```bash
# Preferred (adds npm lifecycle logging)
npm run version:update -- 1.2.3

# Direct execution
node scripts/update-version.js 1.2.3

# Preview changes without touching files
node scripts/update-version.js 1.2.3 --dry-run
```

**What it does:**

- Validates the provided semantic version (e.g. `1.2.3` or `2.0.0-beta.1`)
- Writes the new version to `package.json` and `package-lock.json`
- Updates the Vue About dialog fallback, Rust `Cargo.toml`, and `tauri.conf.json`
- Supports a `--dry-run` flag to inspect the files that would change
- Refreshes the `**Version**` line at the bottom of `README.md` so docs match the release.

## Adding New Scripts

When adding new build scripts:

1. Make them executable: `chmod +x scripts/your-script.sh`
2. Add appropriate error handling (`set -e`)
3. Add color-coded output for clarity
4. Document in this README
5. Add to package.json scripts if appropriate
