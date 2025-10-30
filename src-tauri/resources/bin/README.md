# FFmpeg Binaries Directory

This directory contains the bundled FFmpeg and FFprobe binaries for Honeymelon.

## Setup

The binaries are **not** included in the git repository. Download them using:

```bash
npm run download-ffmpeg
```

This will download pre-built FFmpeg and FFprobe binaries for macOS Apple Silicon (arm64) from [evermeet.cx](https://evermeet.cx/ffmpeg/).

## Manual Installation

If you prefer to manually download or build FFmpeg:

1. Obtain `ffmpeg` and `ffprobe` binaries for macOS arm64
2. Place them in this directory
3. Make them executable: `chmod +x ffmpeg ffprobe`
4. Verify architecture: `lipo -info ffmpeg` (should show arm64)

## Expected Files

After running the download script, this directory should contain:

- `ffmpeg` - FFmpeg binary (executable)
- `ffprobe` - FFprobe binary (executable)
- `README.md` - This file
- `.gitkeep` - Keeps directory in git

## Bundling

These binaries will be automatically included in the Tauri app bundle at:
`Honeymelon.app/Contents/Resources/bin/{ffmpeg,ffprobe}`

The app's runtime detection logic checks for bundled binaries first before falling back to system FFmpeg.

## License

The FFmpeg binaries are licensed under LGPL 2.1+ (or GPL depending on configuration). Honeymelon runs FFmpeg out-of-process, maintaining LGPL compliance.

Source: https://evermeet.cx/ffmpeg/
