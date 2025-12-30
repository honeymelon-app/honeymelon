---
title: Supported Formats
description: Reference for Honeymelon's supported containers, codecs, and subtitle capabilities.
---

# Supported Formats

Honeymelon supports a wide variety of media formats through FFmpeg. This reference guide lists all supported inputs and outputs.

## Video Formats

### Input Containers

Honeymelon can read the following video containers by default:

| Container      | Extension                 | Common Use                          |
| -------------- | ------------------------- | ----------------------------------- |
| MP4            | `.mp4`                    | Universal compatibility             |
| M4V            | `.m4v`                    | Apple ecosystem                     |
| QuickTime      | `.mov`                    | Apple ecosystem, professional video |
| Matroska       | `.mkv`                    | Flexible, open format               |
| AVI            | `.avi`                    | Legacy Windows format               |
| WebM           | `.webm`                   | Web streaming                       |
| MPEG           | `.mpg`, `.mpeg`           | Legacy broadcast format             |
| Transport      | `.ts`, `.m2ts`            | Broadcast streams                   |
| MXF            | `.mxf`                    | Professional broadcast              |
| FLV            | `.flv`                    | Legacy Flash video                  |
| OGG Video      | `.ogv`                    | Open source format                  |
| WMV            | `.wmv`                    | Windows Media Video                 |
| GIF (animated) | `.gif`                    | Short animations                    |
| Raw H.264/HEVC | `.h264`, `.h265`, `.hevc` | Elementary video streams            |

### Output Containers

Honeymelon provides presets for these output containers:

| Container | Extension | Video Codec | Audio Codec |
| --------- | --------- | ----------- | ----------- |
| **MP4**   | `.mp4`    | H.264       | AAC         |
| **MOV**   | `.mov`    | H.264       | AAC         |
| **MKV**   | `.mkv`    | Copy        | Copy        |
| **WebM**  | `.webm`   | VP9         | Opus        |
| **AVI**   | `.avi`    | MPEG-4      | MP3         |
| **FLV**   | `.flv`    | H.264       | AAC         |
| **M4V**   | `.m4v`    | H.264       | AAC         |
| **TS**    | `.ts`     | H.264       | AAC         |
| **OGV**   | `.ogv`    | Theora      | Vorbis      |
| **MPEG**  | `.mpeg`   | MPEG-2      | MP2         |
| **GIF**   | `.gif`    | GIF         | None        |

## Video Codecs

### Input Codecs

Honeymelon can decode (depending on your FFmpeg build):

| Codec             | Description                | Common Containers |
| ----------------- | -------------------------- | ----------------- |
| **H.264 (AVC)**   | Universal codec            | MP4, MOV, MKV     |
| **H.265 (HEVC)**  | Efficient 4K codec         | MP4, MOV, MKV     |
| **VP8**           | Open web codec             | WebM              |
| **VP9**           | Improved web codec         | WebM, MKV         |
| **AV1**           | Next-gen codec             | WebM, MKV         |
| **ProRes**        | Professional editing codec | MOV               |
| **DNxHD/DNxHR**   | Professional editing codec | MOV, MXF          |
| **MPEG-2**        | Legacy broadcast codec     | MPG, VOB          |
| **MPEG-4 Part 2** | Legacy codec               | AVI, MP4          |
| **DivX/Xvid**     | Legacy compression         | AVI               |
| **WMV**           | Windows Media Video        | WMV, ASF          |

### Output Codecs

Honeymelon can encode (or copy) to:

| Codec      | Quality    | Speed    | Use Case                |
| ---------- | ---------- | -------- | ----------------------- |
| **H.264**  | Good       | Fast     | Universal compatibility |
| **VP9**    | Excellent  | Slow     | Web streaming           |
| **Theora** | Good       | Moderate | Open source video       |
| **MPEG-4** | Acceptable | Fast     | Legacy compatibility    |
| **MPEG-2** | Acceptable | Fast     | Broadcast/DVD           |
| **GIF**    | Low        | Fast     | Animations, memes       |
| **Copy**   | Preserved  | Fastest  | Remux without re-encode |

## Image Formats

### Input Containers

| Container | Extension       | Common Use        |
| --------- | --------------- | ----------------- |
| PNG       | `.png`          | Lossless graphics |
| JPEG      | `.jpg`, `.jpeg` | Photos            |
| WebP      | `.webp`         | Modern web images |

### Output Containers

| Container | Extension | Codec | Use Case              |
| --------- | --------- | ----- | --------------------- |
| **PNG**   | `.png`    | PNG   | Lossless screenshots  |
| **JPG**   | `.jpg`    | JPEG  | Universal photos      |
| **WebP**  | `.webp`   | WebP  | Modern web images     |
| **BMP**   | `.bmp`    | BMP   | Legacy uncompressed   |
| **TIFF**  | `.tiff`   | TIFF  | Professional archival |

## Audio Formats

### Input Containers

| Container | Extension       | Common Use          |
| --------- | --------------- | ------------------- |
| M4A       | `.m4a`          | Apple audio         |
| MP3       | `.mp3`          | Universal audio     |
| FLAC      | `.flac`         | Lossless audio      |
| WAV       | `.wav`          | Uncompressed audio  |
| AIFF      | `.aiff`, `.aif` | Uncompressed audio  |
| OGG       | `.ogg`          | Open audio format   |
| Opus      | `.opus`         | Efficient web audio |
| AAC       | `.aac`          | Raw AAC audio       |
| WMA       | `.wma`          | Windows Media Audio |
| ALAC      | `.alac`         | Apple Lossless      |

### Output Containers

| Container | Extension | Audio Codec | Quality           |
| --------- | --------- | ----------- | ----------------- |
| **M4A**   | `.m4a`    | AAC         | Lossy, good       |
| **MP3**   | `.mp3`    | MP3         | Lossy, compatible |
| **FLAC**  | `.flac`   | FLAC        | Lossless          |
| **WAV**   | `.wav`    | PCM         | Uncompressed      |
| **OGG**   | `.ogg`    | Vorbis      | Lossy, open       |
| **AAC**   | `.aac`    | AAC         | Lossy, raw        |
| **AIFF**  | `.aiff`   | PCM         | Uncompressed      |
| **Opus**  | `.opus`   | Opus        | Lossy, efficient  |

## Audio Codecs

### Input Codecs

Honeymelon can decode (depending on your FFmpeg build):

| Codec      | Type         | Description             |
| ---------- | ------------ | ----------------------- |
| **AAC**    | Lossy        | Modern efficient codec  |
| **MP3**    | Lossy        | Universal compatibility |
| **Opus**   | Lossy        | Efficient web codec     |
| **Vorbis** | Lossy        | Open codec              |
| **FLAC**   | Lossless     | Compressed lossless     |
| **ALAC**   | Lossless     | Apple Lossless          |
| **PCM**    | Uncompressed | Raw audio               |
| **AC3**    | Lossy        | Dolby Digital           |
| **EAC3**   | Lossy        | Dolby Digital Plus      |
| **DTS**    | Lossy        | Cinema audio            |
| **WMA**    | Lossy        | Windows Media Audio     |

### Output Codecs

Honeymelon can encode to:

| Codec      | Type         | Bitrate      | Use Case                |
| ---------- | ------------ | ------------ | ----------------------- |
| **AAC**    | Lossy        | 128-320 kbps | General purpose         |
| **MP3**    | Lossy        | 128-320 kbps | Universal compatibility |
| **Opus**   | Lossy        | 64-256 kbps  | Efficient web audio     |
| **FLAC**   | Lossless     | Variable     | Archival                |
| **PCM**    | Uncompressed | Fixed        | Professional audio      |
| **Vorbis** | Lossy        | 96-320 kbps  | Open source audio       |
| **MP2**    | Lossy        | 128-384 kbps | Broadcast audio         |

## Preset Compatibility Summary

Honeymelon presets target a single codec pair per container. If the source streams do not match, the app transcodes to the preset codecs.

| Container | Preset Video Codec | Preset Audio Codec | Notes                     |
| --------- | ------------------ | ------------------ | ------------------------- |
| MP4       | H.264              | AAC                | Standard compatibility    |
| MOV       | H.264              | AAC                | Apple-friendly            |
| MKV       | Copy               | Copy               | Remux without re-encoding |
| WebM      | VP9                | Opus               | Web streaming             |
| AVI       | MPEG-4             | MP3                | Legacy playback           |
| FLV       | H.264              | AAC                | Legacy Flash video        |
| M4V       | H.264              | AAC                | Apple/iTunes              |
| TS        | H.264              | AAC                | Broadcast streams         |
| OGV       | Theora             | Vorbis             | Open source video         |
| MPEG      | MPEG-2             | MP2                | DVD/Broadcast             |
| GIF       | GIF                | None               | No audio                  |

## Special Formats

### Animated GIF

**Input**: Any video format
**Output**: `.gif`
**Limitations**:

- No audio
- Limited color palette (256 colors)
- Large file sizes for long animations
- Lower quality than video codecs

**Best For**: Short clips, memes, animations

### Image Sequences

Currently not supported. Future feature.

### Subtitle Formats

Subtitle support (future feature):

- **SRT**: SubRip text
- **ASS/SSA**: Advanced SubStation Alpha
- **VTT**: WebVTT
- **Embedded**: Picture-based subtitles (PGS, VobSub)

## Hardware Acceleration Support

Honeymelon prefers hardware-accelerated encoders when they are available for the target codec.

### Apple VideoToolbox (macOS)

**When used**:

- H.264 targets (for example, MP4/MOV/M4V/TS/FLV presets)

**Requirements**:

- macOS with VideoToolbox-enabled FFmpeg
- Compatible GPU/SoC (Apple Silicon or supported Intel hardware)

**Notes**:

- If a hardware encoder is unavailable, Honeymelon falls back to software encoders.
- Actual availability depends on your bundled FFmpeg build.

::: tip
Hardware acceleration is detected automatically. No configuration required!
:::

## Resolution Support

### Input Resolutions

Virtually unlimited through FFmpeg:

| Resolution | Common Name   | Aspect Ratio |
| ---------- | ------------- | ------------ |
| 1920×1080  | 1080p/Full HD | 16:9         |
| 2560×1440  | 1440p/2K      | 16:9         |
| 3840×2160  | 4K/UHD        | 16:9         |
| 7680×4320  | 8K            | 16:9         |
| 4096×2160  | DCI 4K        | ~17:9        |
| 1280×720   | 720p/HD       | 16:9         |

### Output Resolutions

Video outputs preserve the source resolution. GIF output may clamp width to keep file sizes manageable. General-purpose scaling/resizing is a planned future feature.

## Frame Rate Support

### Common Frame Rates

| FPS    | Use Case                 |
| ------ | ------------------------ |
| 23.976 | Film, cinema             |
| 24     | Film, cinema             |
| 25     | PAL video                |
| 29.97  | NTSC video               |
| 30     | Web video                |
| 50     | PAL high frame rate      |
| 59.94  | NTSC high frame rate     |
| 60     | Smooth web video, gaming |
| 120+   | High frame rate cinema   |

Frame rate is preserved for standard video outputs. GIF output may clamp FPS to keep file sizes manageable. Frame rate conversion is a planned future feature.

## Color Space & HDR

### Color Spaces

Supported and preserved:

- **BT.601**: Standard definition
- **BT.709**: HD (1080p)
- **BT.2020**: UHD (4K/8K)

### HDR Formats

- **HDR10**: Static HDR metadata
- **HDR10+**: Dynamic HDR metadata (limited support)
- **Dolby Vision**: Proprietary HDR (limited support)
- **HLG**: Hybrid Log-Gamma

::: warning HDR Support
HDR metadata preservation depends on codec support. Some conversions may result in SDR output.
:::

## Checking Format Support

### Verify FFmpeg Capabilities

Check what your FFmpeg installation supports:

```bash
# List all supported decoders
ffmpeg -decoders

# List all supported encoders
ffmpeg -encoders

# List all supported formats
ffmpeg -formats

# List hardware acceleration methods
ffmpeg -hwaccels
```

### Capability Detection

Honeymelon automatically detects available encoders on startup. Presets are filtered based on:

- Available video encoders
- Available audio encoders
- Hardware acceleration support

Unavailable presets are hidden from the UI.

## Future Format Support

Planned additions:

- **AVIF**: Next-gen image format
- **JPEG XL**: Advanced image codec
- **More ProRes variants**: 422 HQ, 4444
- **DNxHD/DNxHR**: Avid editing codecs
- **Image sequences**: PNG, JPEG sequences
- **SVG**: Vector graphics export

## Format Recommendations

### For Maximum Compatibility

**Container**: MP4
**Video**: H.264
**Audio**: AAC

Works everywhere: web, mobile, TVs, players.

### For Maximum Quality

**Container**: MKV
**Video**: Copy
**Audio**: Copy

Remux to MKV to preserve the original streams without re-encoding.

### For Web Streaming

**Container**: WebM
**Video**: VP9
**Audio**: Opus

Modern, efficient web codecs.

### For Professional Editing

**Container**: MOV
**Video**: H.264
**Audio**: AAC

Editing-friendly for general workflows that accept H.264/AAC.

### For Archival

**Container**: MKV
**Video**: Copy
**Audio**: Copy

Keeps the original streams intact while moving to a flexible container.

## Next Steps

- Choose the right [Presets & Quality](/guide/presets) for your formats
- Learn about [Converting Files](/guide/converting-files) workflows
- Understand the [Conversion Pipeline](/architecture/pipeline) architecture
