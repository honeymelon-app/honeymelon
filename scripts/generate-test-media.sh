#!/bin/bash
# Generate test media files for FFmpeg pipeline tests
# This script creates minimal test files using FFmpeg

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TEST_MEDIA_DIR="$REPO_ROOT/test-media"
FFMPEG="$REPO_ROOT/src-tauri/bin/ffmpeg"

# Check for FFmpeg binary
if [ ! -x "$FFMPEG" ]; then
  echo "Error: FFmpeg binary not found at $FFMPEG"
  echo "Run 'npm run download-ffmpeg' first"
  exit 1
fi

echo "Generating test media files..."
echo "  FFmpeg: $FFMPEG"
echo "  Output: $TEST_MEDIA_DIR"

# Create directories
mkdir -p "$TEST_MEDIA_DIR/normal"
mkdir -p "$TEST_MEDIA_DIR/edge-cases"
mkdir -p "$TEST_MEDIA_DIR/known-bad"

# ============================================================================
# NORMAL FILES - Standard media that should convert successfully
# ============================================================================

echo ""
echo "Creating normal test files..."

# H.264 + AAC 1080p (1 second)
echo "  [1/18] h264_aac_1080p.mp4"
"$FFMPEG" -y -f lavfi -i "testsrc=duration=1:size=1920x1080:rate=30" \
  -f lavfi -i "sine=frequency=440:duration=1" \
  -c:v libx264 -preset ultrafast -crf 28 -c:a aac -b:a 64k \
  "$TEST_MEDIA_DIR/normal/h264_aac_1080p.mp4" 2>/dev/null

# H.264 + AAC 4K (0.5 seconds to keep size down)
echo "  [2/18] h264_aac_4k.mp4"
"$FFMPEG" -y -f lavfi -i "testsrc=duration=0.5:size=3840x2160:rate=30" \
  -f lavfi -i "sine=frequency=440:duration=0.5" \
  -c:v libx264 -preset ultrafast -crf 32 -c:a aac -b:a 64k \
  "$TEST_MEDIA_DIR/normal/h264_aac_4k.mp4" 2>/dev/null

# HEVC 720p (1 second)
echo "  [3/18] hevc_720p.mp4"
"$FFMPEG" -y -f lavfi -i "testsrc=duration=1:size=1280x720:rate=30" \
  -f lavfi -i "sine=frequency=440:duration=1" \
  -c:v libx265 -preset ultrafast -crf 32 -tag:v hvc1 -c:a aac -b:a 64k \
  "$TEST_MEDIA_DIR/normal/hevc_720p.mp4" 2>/dev/null

# VP9 + Opus WebM (1 second)
echo "  [4/18] vp9_opus.webm"
"$FFMPEG" -y -f lavfi -i "testsrc=duration=1:size=1280x720:rate=30" \
  -f lavfi -i "sine=frequency=440:duration=1" \
  -c:v libvpx-vp9 -crf 40 -b:v 0 -c:a libopus -b:a 64k \
  "$TEST_MEDIA_DIR/normal/vp9_opus.webm" 2>/dev/null

# H.264 + AAC Matroska (1 second)
echo "  [5/18] h264_aac_mkv.mkv"
"$FFMPEG" -y -f lavfi -i "testsrc=duration=1:size=1280x720:rate=30" \
  -f lavfi -i "sine=frequency=440:duration=1" \
  -c:v libx264 -preset ultrafast -crf 28 -c:a aac -b:a 64k \
  "$TEST_MEDIA_DIR/normal/h264_aac_mkv.mkv" 2>/dev/null

# H.264 + AAC MOV (1 second)
echo "  [6/18] h264_aac_mov.mov"
"$FFMPEG" -y -f lavfi -i "testsrc=duration=1:size=1280x720:rate=30" \
  -f lavfi -i "sine=frequency=440:duration=1" \
  -c:v libx264 -preset ultrafast -crf 28 -c:a aac -b:a 64k \
  "$TEST_MEDIA_DIR/normal/h264_aac_mov.mov" 2>/dev/null

# Audio files
echo "  [7/18] audio_stereo.mp3"
"$FFMPEG" -y -f lavfi -i "sine=frequency=440:duration=1" \
  -c:a libmp3lame -b:a 128k \
  "$TEST_MEDIA_DIR/normal/audio_stereo.mp3" 2>/dev/null

echo "  [8/18] audio_lossless.flac"
"$FFMPEG" -y -f lavfi -i "sine=frequency=440:duration=1" \
  -c:a flac \
  "$TEST_MEDIA_DIR/normal/audio_lossless.flac" 2>/dev/null

echo "  [9/18] audio_pcm.wav"
"$FFMPEG" -y -f lavfi -i "sine=frequency=440:duration=1" \
  -c:a pcm_s16le \
  "$TEST_MEDIA_DIR/normal/audio_pcm.wav" 2>/dev/null

# Vorbis Ogg (1 second)
echo "  [10/18] audio_vorbis.ogg"
"$FFMPEG" -y -f lavfi -i "sine=frequency=440:duration=1" \
  -c:a libvorbis -b:a 96k \
  "$TEST_MEDIA_DIR/normal/audio_vorbis.ogg" 2>/dev/null

# Opus Ogg (1 second)
echo "  [11/18] audio_opus.opus"
"$FFMPEG" -y -f lavfi -i "sine=frequency=440:duration=1" \
  -c:a libopus -b:a 96k \
  "$TEST_MEDIA_DIR/normal/audio_opus.opus" 2>/dev/null

# AAC ADTS (1 second)
echo "  [12/18] audio_aac.aac"
"$FFMPEG" -y -f lavfi -i "sine=frequency=440:duration=1" \
  -c:a aac -b:a 96k -f adts \
  "$TEST_MEDIA_DIR/normal/audio_aac.aac" 2>/dev/null

# AIFF PCM (1 second)
echo "  [13/18] audio_aiff.aiff"
"$FFMPEG" -y -f lavfi -i "sine=frequency=440:duration=1" \
  -c:a pcm_s16le -f aiff \
  "$TEST_MEDIA_DIR/normal/audio_aiff.aiff" 2>/dev/null

# Image files
echo "  [14/18] image_test.png"
"$FFMPEG" -y -f lavfi -i "testsrc=duration=1:size=640x480:rate=1" \
  -frames:v 1 \
  "$TEST_MEDIA_DIR/normal/image_test.png" 2>/dev/null

echo "  [15/18] image_photo.jpg"
"$FFMPEG" -y -f lavfi -i "testsrc=duration=1:size=1920x1080:rate=1" \
  -frames:v 1 -q:v 2 \
  "$TEST_MEDIA_DIR/normal/image_photo.jpg" 2>/dev/null

echo "  [16/18] image_web.webp"
"$FFMPEG" -y -f lavfi -i "testsrc=duration=1:size=800x600:rate=1" \
  -frames:v 1 -quality 80 \
  "$TEST_MEDIA_DIR/normal/image_web.webp" 2>/dev/null

echo "  [17/18] image_bitmap.bmp"
"$FFMPEG" -y -f lavfi -i "testsrc=duration=1:size=640x480:rate=1" \
  -frames:v 1 -c:v bmp \
  "$TEST_MEDIA_DIR/normal/image_bitmap.bmp" 2>/dev/null

echo "  [18/18] image_scan.tiff"
"$FFMPEG" -y -f lavfi -i "testsrc=duration=1:size=1024x768:rate=1" \
  -frames:v 1 -c:v tiff \
  "$TEST_MEDIA_DIR/normal/image_scan.tiff" 2>/dev/null

# ============================================================================
# EDGE CASE FILES - Unusual but valid files
# ============================================================================

echo ""
echo "Creating edge case test files..."

# Video without audio
echo "  [1/4] video_no_audio.mp4"
"$FFMPEG" -y -f lavfi -i "testsrc=duration=1:size=1280x720:rate=30" \
  -c:v libx264 -preset ultrafast -crf 28 -an \
  "$TEST_MEDIA_DIR/edge-cases/video_no_audio.mp4" 2>/dev/null

# Vertical (portrait) video
echo "  [2/4] vertical_video.mp4"
"$FFMPEG" -y -f lavfi -i "testsrc=duration=1:size=720x1280:rate=30" \
  -f lavfi -i "sine=frequency=440:duration=1" \
  -c:v libx264 -preset ultrafast -crf 28 -c:a aac -b:a 64k \
  "$TEST_MEDIA_DIR/edge-cases/vertical_video.mp4" 2>/dev/null

# Square video (1:1 aspect ratio)
echo "  [3/4] square_video.mp4"
"$FFMPEG" -y -f lavfi -i "testsrc=duration=1:size=720x720:rate=30" \
  -f lavfi -i "sine=frequency=440:duration=1" \
  -c:v libx264 -preset ultrafast -crf 28 -c:a aac -b:a 64k \
  "$TEST_MEDIA_DIR/edge-cases/square_video.mp4" 2>/dev/null

# Audio-only M4A
echo "  [4/4] audio_only.m4a"
"$FFMPEG" -y -f lavfi -i "sine=frequency=440:duration=1" \
  -c:a aac -b:a 128k \
  "$TEST_MEDIA_DIR/edge-cases/audio_only.m4a" 2>/dev/null

# ============================================================================
# KNOWN-BAD FILES - Files that should fail gracefully
# ============================================================================

echo ""
echo "Creating known-bad test files..."

# Zero-byte file
echo "  [1/4] zero_bytes.mp4"
touch "$TEST_MEDIA_DIR/known-bad/zero_bytes.mp4"

# Random binary data (not valid media)
echo "  [2/4] random_data.mp4"
dd if=/dev/urandom of="$TEST_MEDIA_DIR/known-bad/random_data.mp4" bs=1024 count=10 2>/dev/null

# Text file disguised as MP4
echo "  [3/4] text_as_mp4.mp4"
echo "This is not a valid MP4 file. It is plain text." >"$TEST_MEDIA_DIR/known-bad/text_as_mp4.mp4"

# Truncated file (valid header but incomplete)
echo "  [4/4] truncated.mp4"
"$FFMPEG" -y -f lavfi -i "testsrc=duration=1:size=640x480:rate=30" \
  -f lavfi -i "sine=frequency=440:duration=1" \
  -c:v libx264 -preset ultrafast -crf 28 -c:a aac -b:a 64k \
  "$TEST_MEDIA_DIR/known-bad/truncated_full.mp4" 2>/dev/null
# Truncate to first 500 bytes
head -c 500 "$TEST_MEDIA_DIR/known-bad/truncated_full.mp4" >"$TEST_MEDIA_DIR/known-bad/truncated.mp4"
rm -f "$TEST_MEDIA_DIR/known-bad/truncated_full.mp4"

# ============================================================================
# SUMMARY
# ============================================================================

echo ""
echo "Test media generation complete!"
echo ""
echo "Summary:"
find "$TEST_MEDIA_DIR" -type f ! -name "README.md" | wc -l | xargs -I {} echo "  Total files: {}"
du -sh "$TEST_MEDIA_DIR" | cut -f1 | xargs -I {} echo "  Total size:  {}"
echo ""
echo "Files created:"
find "$TEST_MEDIA_DIR" -type f ! -name "README.md" -exec ls -lh {} \; | awk '{print "  " $9 " (" $5 ")"}'
