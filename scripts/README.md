# Build Scripts

This directory contains build and setup scripts for Honeymelon.

## Available Scripts

### `download-ffmpeg.js`

Downloads and sets up FFmpeg and FFprobe binaries for bundling into the Honeymelon app.

**Usage:**

```bash
# Via npm (recommended)
npm run download-ffmpeg

# Direct execution
node scripts/download-ffmpeg.js
```

**What it does:**

- Downloads FFmpeg and FFprobe for Apple Silicon (arm64) from evermeet.cx
- Extracts binaries using 7z (auto-installs via Homebrew if needed)
- Places them in `src-tauri/bin/`
- Verifies architecture and code signature
- Checks for existing binaries and prompts before overwriting

**Requirements:**

- macOS with Homebrew
- 7z (auto-installed if not present)
- Internet connection

**Source:**
The binaries are downloaded from [evermeet.cx](https://evermeet.cx/ffmpeg/), which provides pre-built FFmpeg binaries for macOS.

**Note:** This script is automatically run during `npm install` via the postinstall hook. Manual execution is only needed if you want to re-download or update the binaries.

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
