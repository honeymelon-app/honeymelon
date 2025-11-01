---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
  name: 'Honeymelon'
  text: 'Professional Media Converter'
  tagline: A native macOS app for Apple Silicon that converts media files with zero hassle. Drag, drop, done.
  image:
    src: /logo.svg
    alt: Honeymelon
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/honeymelon-app/honeymelon

features:
  - icon: 🚀
    title: Remux-First Strategy
    details: Preserves original quality by copying streams when possible. No unnecessary re-encoding means faster conversions and perfect quality.

  - icon: 🎯
    title: Smart & Automatic
    details: Automatically detects the optimal conversion path. Dynamic preset generation handles all source-to-target container combinations.

  - icon: ⚡
    title: Hardware Accelerated
    details: Native Apple Silicon optimization with VideoToolbox hardware acceleration for H.264/HEVC encoding.

  - icon: 🎨
    title: Modern Codecs
    details: Full support for VP9, AV1, ProRes, H.264, and HEVC. Convert to MP4, MOV, MKV, WebM, and more.

  - icon: 📦
    title: Batch Processing
    details: Process multiple files simultaneously with configurable concurrency limits. Drag entire folders for recursive discovery.

  - icon: 🔒
    title: Privacy Focused
    details: Fully local processing with no internet required. Your media never leaves your Mac. FFmpeg runs in isolated processes.

  - icon: 🎛️
    title: Quality Control
    details: Choose from Fast (copy-prioritized), Balanced (optimized bitrates), or High (maximum quality) presets.

  - icon: 🛠️
    title: Built for macOS
    details: Native Tauri app optimized for Apple Silicon. Clean UI with shadcn-vue components. Feels right at home on your Mac.

  - icon: 📊
    title: Real-Time Progress
    details: Live encoding speed and ETA calculations. View detailed logs for each conversion job.

  - icon: ⚖️
    title: LGPL Compliant
    details: FFmpeg process isolation ensures LGPL compliance for commercial distribution. Professional-grade architecture.

  - icon: 🎓
    title: Open Architecture
    details: Built with modern web technologies - Vue 3, TypeScript, Rust, and Tauri 2. Clean, maintainable codebase.

  - icon: 💻
    title: Developer Friendly
    details: Comprehensive documentation, type-safe code throughout, and extensive test coverage. Easy to extend and customize.
---

## Why Honeymelon?

Honeymelon is designed for professionals who need reliable media conversion without the complexity. Whether you're a content creator, video editor, or developer, Honeymelon handles the technical details so you can focus on your work.

### Key Highlights

- **macOS Native**: Built exclusively for Apple Silicon Macs running macOS 13.0+
- **Intelligent Conversion**: Automatically chooses between lossless remuxing and transcoding
- **Zero Configuration**: Preset-based workflow eliminates complex settings
- **Professional Quality**: Maintains the highest possible quality while optimizing file sizes
- **Small Footprint**: ~50MB app bundle with optional FFmpeg binaries

## Quick Start

```bash
# Install dependencies
npm install

# Run in development mode
npm run tauri:dev

# Build for production
npm run tauri:build
```

[Get started →](/guide/getting-started)

## Tech Stack

- **Frontend**: Vue 3 + TypeScript + Vite
- **Backend**: Rust + Tauri 2
- **UI Components**: shadcn-vue + Tailwind CSS
- **Media Processing**: FFmpeg (out-of-process)
- **State Management**: Pinia

[Learn more about the architecture →](/architecture/overview)
