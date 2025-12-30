---
title: What is Honeymelon?
description: Overview of Honeymelon's remux-first media conversion philosophy, key capabilities, and system requirements.
---

# What is Honeymelon?

Honeymelon is a professional media converter application designed exclusively for macOS Apple Silicon devices. It provides an intuitive drag-and-drop interface for converting media files using FFmpeg, with a remux-first philosophy that prioritizes lossless stream copying over re-encoding to preserve quality and maximize performance.

## Overview

Built with modern technologies like Tauri 2, Vue 3, TypeScript, and Rust, Honeymelon delivers a native macOS experience with the power and flexibility of web technologies. The application is designed for professionals who need reliable, high-quality media conversion without complex configuration.

## Core Philosophy

### Remux-First Approach

Honeymelon's defining characteristic is its **remux-first strategy**. When converting between container formats (like MKV to MP4), the app first checks if the video and audio streams can be copied directly without re-encoding. This approach:

- **Preserves Original Quality**: No generation loss from re-encoding
- **Maximizes Speed**: Copying streams is dramatically faster than transcoding
- **Reduces Resource Usage**: Minimal CPU/GPU usage during remux operations
- **Maintains Metadata**: Original color space, HDR information, and other metadata preserved

Only when necessary (incompatible codecs, quality requirements, or user preference) does Honeymelon transcode streams.

## Key Features

### Intelligent Conversion Engine

- **Automatic Detection**: Analyzes source files and determines the optimal conversion path
- **Dynamic Presets**: All valid source-to-target container combinations automatically available
- **Hardware Acceleration**: Leverages Apple VideoToolbox for H.264 encoding when available
- **Modern Codec Support**: H.264, VP9, Theora, MPEG-4, MPEG-2, and more
- **Quality Tiers**: Fast (copy-prioritized), Balanced (optimized bitrates), High (maximum quality)

### User Experience

- **Drag-and-Drop Interface**: Simply drop files or folders into the app
- **Batch Processing**: Convert multiple files simultaneously with configurable concurrency
- **Real-Time Progress**: Percent complete with ETA updates
- **Per-Job Management**: Cancel or change presets for individual jobs
- **Native macOS Integration**: Menu bar, keyboard shortcuts, and native file dialogs

### Technical Excellence

- **FFmpeg Process Isolation**: Ensures LGPL compliance for commercial distribution
- **Type-Safe Architecture**: TypeScript and Rust provide compile-time safety
- **Reactive State Management**: Pinia stores with discriminated union types
- **Comprehensive Testing**: Unit tests, Rust tests, and pipeline coverage
- **Clean Codebase**: Modern best practices throughout

## System Requirements

- **Operating System**: macOS 13.0 (Ventura) or later
- **Processor**: Apple Silicon (M1, M2, M3, M4, or later)
- **Memory**: 4 GB RAM minimum (8 GB recommended for 4K content)
- **Disk Space**: ~50 MB for application + storage for optional FFmpeg binaries

## Supported Formats

### Video Containers

MP4, MOV, MKV, WebM, GIF, AVI, FLV, M4V, TS, OGV, MPEG

### Audio Containers

M4A, MP3, FLAC, WAV, OGG, AAC, AIFF, Opus

### Image Containers

PNG, JPEG, WebP, BMP, TIFF

### Video Codecs

H.264, VP8, VP9, Theora, MPEG-4, FLV1, MPEG-2, and more

### Audio Codecs

AAC, MP3, Opus, Vorbis, FLAC, PCM, MP2, AC3, and more

## Use Cases

### Content Creators

- Convert screen recordings to optimized formats for YouTube/Vimeo
- Transcode high-bitrate camera footage to more manageable sizes
- Create web-optimized versions of video content

### Video Editors

- Convert between delivery formats for sharing and publishing
- Prepare deliverables in specific codec/container combinations
- Generate preview copies with reduced file sizes

### Developers

- Process video assets for applications
- Batch convert media libraries
- Integrate with automated workflows via command-line FFmpeg

### Archivists

- Convert legacy formats to modern containers
- Remux files to preferred containers without quality loss
- Maintain media libraries with consistent formats

## Privacy & Security

Honeymelon is designed with privacy as a core principle:

- **Fully Local Processing**: All conversions happen on your Mac
- **Offline After Activation**: One-time online activation, then the app works fully offline
- **No Data Collection**: Your media and usage data never leave your device
- **Process Isolation**: FFmpeg runs in separate processes for security and stability

## Next Steps

Ready to get started? Head over to the [Getting Started](/guide/getting-started) guide to install and configure Honeymelon.

Want to understand how it works under the hood? Check out the [Architecture Overview](/architecture/overview).
