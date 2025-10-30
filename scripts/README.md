# Build Scripts

This directory contains build and setup scripts for Honeymelon.

## Available Scripts

### `download-ffmpeg.sh`

Downloads and sets up FFmpeg and FFprobe binaries for bundling into the Honeymelon app.

**Usage:**

```bash
# Via npm (recommended)
npm run download-ffmpeg

# Direct execution
./scripts/download-ffmpeg.sh
```

**What it does:**

- Downloads FFmpeg and FFprobe for Apple Silicon (arm64) from evermeet.cx
- Extracts binaries using 7z (auto-installs via Homebrew if needed)
- Places them in `src-tauri/resources/bin/`
- Verifies architecture and code signature
- Checks for existing binaries and prompts before overwriting

**Requirements:**

- macOS with Homebrew
- 7z (auto-installed if not present)
- Internet connection

**Source:**
The binaries are downloaded from [evermeet.cx](https://evermeet.cx/ffmpeg/), which provides pre-built FFmpeg binaries for macOS.

**Note:** This script is automatically run during `npm install` via the postinstall hook. Manual execution is only needed if you want to re-download or update the binaries.

## Adding New Scripts

When adding new build scripts:

1. Make them executable: `chmod +x scripts/your-script.sh`
2. Add appropriate error handling (`set -e`)
3. Add color-coded output for clarity
4. Document in this README
5. Add to package.json scripts if appropriate
