#!/bin/bash
set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Config (Apple Silicon builds from OSXExperts.NET)
FFMPEG_VERSION="7.1.1"
FFMPEG_URL="https://www.osxexperts.net/ffmpeg711arm.zip"
FFPROBE_URL="https://www.osxexperts.net/ffprobe711arm.zip"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BIN_DIR="$PROJECT_ROOT/src-tauri/resources/bin"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}FFmpeg Bundling Setup for Honeymelon (Apple Silicon only)${NC}"
echo -e "${GREEN}========================================${NC}\n"

# Enforce macOS + Apple Silicon only
if [[ "$(uname)" != "Darwin" ]]; then
  echo -e "${RED}This script supports macOS only.${NC}"
  exit 1
fi
if [[ "$(uname -m)" != "arm64" ]]; then
  echo -e "${RED}Apple Silicon (arm64) required. Current arch: $(uname -m).${NC}"
  exit 1
fi

mkdir -p "$BIN_DIR"

need_cmd() { command -v "$1" &>/dev/null || {
  echo -e "${RED}Missing required command: $1${NC}"
  exit 1
}; }
need_cmd curl
if ! command -v unzip &>/dev/null; then
  echo -e "${YELLOW}unzip not found. Installing via Homebrew...${NC}"
  if ! command -v brew &>/dev/null; then
    echo -e "${RED}Homebrew is required to install unzip. See https://brew.sh${NC}"
    exit 1
  fi
  brew install unzip
fi

cleanup() { [[ -n "${TEMP_DIR:-}" && -d "$TEMP_DIR" ]] && rm -rf "$TEMP_DIR"; }
trap cleanup EXIT

binary_arch() {
  local path="$1"
  if command -v lipo &>/dev/null; then
    lipo -info "$path" 2>/dev/null | grep -Eo "arm64|x86_64" || echo "unknown"
  else
    file -b "$path" | grep -Eo "arm64|x86_64" || echo "unknown"
  fi
}

fetch_zip_extract_one() {
  local url="$1"  # zip url
  local want="$2" # expected binary name inside zip: ffmpeg|ffprobe
  local out="$3"  # destination path

  TEMP_DIR="$(mktemp -d)"
  local zip="$TEMP_DIR/pkg.zip"

  echo -e "${GREEN}Fetching ${want} ${FFMPEG_VERSION} (Apple Silicon)...${NC}"
  curl -fL --progress-bar -o "$zip" "$url"

  echo -e "${GREEN}Extracting ${want}...${NC}"
  unzip -q -d "$TEMP_DIR" "$zip"

  # Find the binary (some archives contain additional files)
  local found
  found="$(find "$TEMP_DIR" -type f -name "${want}" -perm +111 -maxdepth 3 2>/dev/null | head -n1 || true)"
  if [[ -z "${found}" ]]; then
    # fallback: exact name in root
    [[ -f "$TEMP_DIR/${want}" ]] && found="$TEMP_DIR/${want}"
  fi
  if [[ -z "${found}" ]]; then
    echo -e "${RED}Error: could not locate '${want}' in downloaded archive.${NC}"
    return 1
  fi

  # Verify architecture BEFORE installing
  local arch
  arch="$(binary_arch "$found")"
  echo -e "${GREEN}${want} detected arch:${NC} ${arch}"
  if [[ "$arch" != "arm64" ]]; then
    echo -e "${RED}${want} is not arm64 (got ${arch}). Aborting.${NC}"
    return 1
  fi

  # Install
  mv "$found" "$out"
  chmod +x "$out"

  # Version banner
  local v
  v="$("$out" -version 2>/dev/null | head -n1 || echo "unknown")"
  echo -e "${GREEN}Installed ${want}:${NC} ${v}\n"
}

# Optional: overwrite without prompt
rm -f "$BIN_DIR/ffmpeg" "$BIN_DIR/ffprobe" 2>/dev/null || true

echo -e "${GREEN}Step 1: Downloading FFmpeg (arm64)...${NC}"
fetch_zip_extract_one "$FFMPEG_URL" "ffmpeg" "$BIN_DIR/ffmpeg"

echo -e "${GREEN}Step 2: Downloading FFprobe (arm64)...${NC}"
fetch_zip_extract_one "$FFPROBE_URL" "ffprobe" "$BIN_DIR/ffprobe"

echo -e "${GREEN}Step 3: Final architecture check...${NC}"
FFMPEG_ARCH="$(binary_arch "$BIN_DIR/ffmpeg")"
FFPROBE_ARCH="$(binary_arch "$BIN_DIR/ffprobe")"
[[ "$FFMPEG_ARCH" == "arm64" && "$FFPROBE_ARCH" == "arm64" ]] || {
  echo -e "${RED}Non-arm64 binaries detected. Aborting.${NC}"
  exit 1
}
echo -e "${GREEN}FFmpeg arch:${NC}   ${FFMPEG_ARCH}"
echo -e "${GREEN}FFprobe arch:${NC}  ${FFPROBE_ARCH}\n"

echo -e "${GREEN}Step 4: Code-sign status (informational)...${NC}"
if codesign -dv "$BIN_DIR/ffmpeg" &>/dev/null; then
  echo -e "${GREEN}FFmpeg is code-signed.${NC}"
else
  echo -e "${YELLOW}FFmpeg is not code-signed (ad-hoc signing is acceptable for local use).${NC}"
fi
if codesign -dv "$BIN_DIR/ffprobe" &>/dev/null; then
  echo -e "${GREEN}FFprobe is code-signed.${NC}"
else
  echo -e "${YELLOW}FFprobe is not code-signed (ad-hoc signing is acceptable for local use).${NC}"
fi

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}FFmpeg bundling setup complete (arm64 only)!${NC}"
echo -e "${GREEN}========================================${NC}\n"
echo -e "${GREEN}Binaries installed to:${NC}"
echo -e "  - $BIN_DIR/ffmpeg"
echo -e "  - $BIN_DIR/ffprobe\n"
echo -e "${GREEN}Next steps:${NC}"
echo -e "  1. Build: ${YELLOW}npm run tauri:build${NC}"
echo -e "  2. The binaries will be bundled into your app"
echo -e "  3. Test the app to ensure detection works\n"
echo -e "${YELLOW}Note: These are GPL-licensed binaries from osxexperts.net${NC}"
