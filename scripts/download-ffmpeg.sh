#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
FFMPEG_VERSION="7.1"
EVERMEET_BASE_URL="https://evermeet.cx/ffmpeg"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BIN_DIR="$PROJECT_ROOT/src-tauri/resources/bin"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}FFmpeg Bundling Setup for Honeymelon${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Detect architecture
ARCH=$(uname -m)
if [ "$ARCH" != "arm64" ]; then
    echo -e "${YELLOW}Warning: This script is designed for Apple Silicon (arm64).${NC}"
    echo -e "${YELLOW}Current architecture: $ARCH${NC}"
    echo -e "${YELLOW}Proceeding with arm64 binaries...${NC}"
    echo ""
fi

# Create bin directory if it doesn't exist
mkdir -p "$BIN_DIR"

# Function to download and extract FFmpeg
download_ffmpeg() {
    local BINARY_NAME=$1
    local OUTPUT_PATH="$BIN_DIR/$BINARY_NAME"
    local DOWNLOAD_URL="$EVERMEET_BASE_URL/$BINARY_NAME.7z"
    local TEMP_DIR=$(mktemp -d)

    echo -e "${GREEN}Downloading $BINARY_NAME...${NC}"

    # Check if binary already exists
    if [ -f "$OUTPUT_PATH" ]; then
        echo -e "${YELLOW}$BINARY_NAME already exists. Checking version...${NC}"
        CURRENT_VERSION=$("$OUTPUT_PATH" -version 2>/dev/null | head -n1 | grep -oE '[0-9]+\.[0-9]+' | head -n1 || echo "unknown")
        echo -e "${YELLOW}Current version: $CURRENT_VERSION${NC}"

        read -p "Do you want to re-download? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo -e "${GREEN}Skipping $BINARY_NAME download.${NC}"
            return 0
        fi
        rm -f "$OUTPUT_PATH"
    fi

    # Download the 7z archive
    if ! curl -L --fail -o "$TEMP_DIR/$BINARY_NAME.7z" "$DOWNLOAD_URL"; then
        echo -e "${RED}Error: Failed to download $BINARY_NAME from $DOWNLOAD_URL${NC}"
        rm -rf "$TEMP_DIR"
        return 1
    fi

    # Check if 7z is installed
    if ! command -v 7z &> /dev/null; then
        echo -e "${YELLOW}7z is not installed. Installing via Homebrew...${NC}"
        if ! command -v brew &> /dev/null; then
            echo -e "${RED}Error: Homebrew is not installed. Please install it first:${NC}"
            echo -e "${RED}https://brew.sh${NC}"
            rm -rf "$TEMP_DIR"
            return 1
        fi
        brew install p7zip
    fi

    # Extract the binary
    echo -e "${GREEN}Extracting $BINARY_NAME...${NC}"
    cd "$TEMP_DIR"
    7z x -y "$BINARY_NAME.7z" > /dev/null

    # Move binary to destination
    if [ ! -f "$TEMP_DIR/$BINARY_NAME" ]; then
        echo -e "${RED}Error: Expected binary not found after extraction.${NC}"
        rm -rf "$TEMP_DIR"
        return 1
    fi

    mv "$TEMP_DIR/$BINARY_NAME" "$OUTPUT_PATH"
    chmod +x "$OUTPUT_PATH"

    # Cleanup
    rm -rf "$TEMP_DIR"

    # Verify the binary
    if [ -f "$OUTPUT_PATH" ] && [ -x "$OUTPUT_PATH" ]; then
        VERSION=$("$OUTPUT_PATH" -version 2>/dev/null | head -n1 || echo "unknown")
        echo -e "${GREEN}Successfully installed $BINARY_NAME${NC}"
        echo -e "${GREEN}Version: $VERSION${NC}"
        echo ""
        return 0
    else
        echo -e "${RED}Error: Binary verification failed for $BINARY_NAME${NC}"
        return 1
    fi
}

# Download both FFmpeg and FFprobe
echo -e "${GREEN}Step 1: Downloading FFmpeg...${NC}"
if ! download_ffmpeg "ffmpeg"; then
    echo -e "${RED}Failed to download FFmpeg. Exiting.${NC}"
    exit 1
fi

echo -e "${GREEN}Step 2: Downloading FFprobe...${NC}"
if ! download_ffmpeg "ffprobe"; then
    echo -e "${RED}Failed to download FFprobe. Exiting.${NC}"
    exit 1
fi

# Verify architecture
echo -e "${GREEN}Step 3: Verifying binary architecture...${NC}"
FFMPEG_ARCH=$(lipo -info "$BIN_DIR/ffmpeg" 2>/dev/null | grep -oE "arm64|x86_64" || echo "unknown")
FFPROBE_ARCH=$(lipo -info "$BIN_DIR/ffprobe" 2>/dev/null | grep -oE "arm64|x86_64" || echo "unknown")

echo -e "${GREEN}FFmpeg architecture: $FFMPEG_ARCH${NC}"
echo -e "${GREEN}FFprobe architecture: $FFPROBE_ARCH${NC}"
echo ""

if [ "$FFMPEG_ARCH" != "arm64" ] || [ "$FFPROBE_ARCH" != "arm64" ]; then
    echo -e "${YELLOW}Warning: Binaries are not arm64. This may cause issues on Apple Silicon.${NC}"
fi

# Check code signing (optional but good for distribution)
echo -e "${GREEN}Step 4: Checking code signature...${NC}"
FFMPEG_SIGNED=$(codesign -dv "$BIN_DIR/ffmpeg" 2>&1 | grep "Signature" || echo "not signed")
FFPROBE_SIGNED=$(codesign -dv "$BIN_DIR/ffprobe" 2>&1 | grep "Signature" || echo "not signed")

if [[ "$FFMPEG_SIGNED" == *"not signed"* ]]; then
    echo -e "${YELLOW}FFmpeg is not code-signed.${NC}"
else
    echo -e "${GREEN}FFmpeg is code-signed.${NC}"
fi

if [[ "$FFPROBE_SIGNED" == *"not signed"* ]]; then
    echo -e "${YELLOW}FFprobe is not code-signed.${NC}"
else
    echo -e "${GREEN}FFprobe is code-signed.${NC}"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}FFmpeg bundling setup complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${GREEN}Binaries installed to:${NC}"
echo -e "  - $BIN_DIR/ffmpeg"
echo -e "  - $BIN_DIR/ffprobe"
echo ""
echo -e "${GREEN}Next steps:${NC}"
echo -e "  1. Build your Tauri app: ${YELLOW}npm run tauri:build${NC}"
echo -e "  2. The binaries will be automatically bundled into your app"
echo -e "  3. Test the app to ensure FFmpeg is detected properly"
echo ""
echo -e "${YELLOW}Note: These are GPL-licensed binaries from evermeet.cx${NC}"
echo -e "${YELLOW}License: https://evermeet.cx/ffmpeg/${NC}"
echo ""
