# Test Media Files

This directory contains test media files for Honeymelon's FFmpeg pipeline tests.

## Structure

- `normal/` - Standard media files that should convert successfully
- `edge-cases/` - Unusual but valid files (vertical video, no audio, etc.)
- `known-bad/` - Invalid files that should fail gracefully

## Regenerating Files

If files need to be regenerated (e.g., they've been corrupted or lost):

```bash
# From repository root
npm run download-ffmpeg  # Ensure FFmpeg is available

# Normal files
src-tauri/bin/ffmpeg -y -f lavfi -i "testsrc=duration=1:size=1920x1080:rate=30" \
  -f lavfi -i "sine=frequency=440:duration=1" \
  -c:v libx264 -preset ultrafast -crf 28 -c:a aac -b:a 64k \
  test-media/normal/h264_aac_1080p.mp4

# See full generation commands in docs/FFMPEG_PIPELINE_TESTS.md
```

## Running Tests

```bash
cd src-tauri
cargo test --test ffmpeg_pipeline -- --nocapture
```

## Size Considerations

All files are kept small (1-2 seconds, low bitrate) to minimize repository size
and CI run times. Total corpus size should stay under 5MB.
