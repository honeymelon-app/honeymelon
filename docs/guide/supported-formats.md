---
title: Supported Formats
description: Reference for Honeymelon's supported containers, codecs, and subtitle capabilities.
---

# Supported Formats

Honeymelon supports a wide variety of media formats through FFmpeg. This reference guide lists all supported inputs and outputs.

## Video Formats

### Input Containers

Honeymelon can read virtually any video container that FFmpeg supports:

| Container | Extension       | Common Use                          |
| --------- | --------------- | ----------------------------------- |
| MP4       | `.mp4`          | Universal compatibility             |
| QuickTime | `.mov`          | Apple ecosystem, professional video |
| Matroska  | `.mkv`          | Flexible, open format               |
| AVI       | `.avi`          | Legacy Windows format               |
| WebM      | `.webm`         | Web streaming                       |
| MPEG      | `.mpg`, `.mpeg` | Legacy broadcast format             |
| FLV       | `.flv`          | Legacy Flash video                  |
| MXF       | `.mxf`          | Professional broadcast              |
| OGG       | `.ogv`, `.ogg`  | Open source format                  |

### Output Containers

Honeymelon currently provides presets for these output containers:

| Container | Extension | Video Codecs           | Audio Codecs    |
| --------- | --------- | ---------------------- | --------------- |
| **MP4**   | `.mp4`    | H.264, H.265           | AAC, MP3        |
| **MOV**   | `.mov`    | H.264, H.265, ProRes   | AAC, PCM        |
| **MKV**   | `.mkv`    | H.264, H.265, VP9, AV1 | AAC, Opus, FLAC |
| **WebM**  | `.webm`   | VP8, VP9, AV1          | Opus, Vorbis    |
| **GIF**   | `.gif`    | GIF                    | None            |

## Video Codecs

### Input Codecs

Honeymelon can decode:

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

Honeymelon can encode to:

| Codec      | Quality     | Speed     | Use Case                |
| ---------- | ----------- | --------- | ----------------------- |
| **H.264**  | Good        | Fast      | Universal compatibility |
| **H.265**  | Excellent   | Moderate  | 4K, efficient storage   |
| **VP9**    | Excellent   | Slow      | Web streaming           |
| **AV1**    | Outstanding | Very Slow | Next-gen web            |
| **ProRes** | Lossless    | Fast      | Professional editing    |
| **GIF**    | Low         | Fast      | Animations, memes       |

## Audio Formats

### Input Containers

| Container | Extension | Common Use          |
| --------- | --------- | ------------------- |
| M4A       | `.m4a`    | Apple audio         |
| MP3       | `.mp3`    | Universal audio     |
| FLAC      | `.flac`   | Lossless audio      |
| WAV       | `.wav`    | Uncompressed audio  |
| OGG       | `.ogg`    | Open audio format   |
| WMA       | `.wma`    | Windows Media Audio |
| AAC       | `.aac`    | Raw AAC audio       |

### Output Containers

| Container | Extension | Audio Codec | Quality           |
| --------- | --------- | ----------- | ----------------- |
| **M4A**   | `.m4a`    | AAC         | Lossy, good       |
| **MP3**   | `.mp3`    | MP3         | Lossy, compatible |
| **FLAC**  | `.flac`   | FLAC        | Lossless          |
| **WAV**   | `.wav`    | PCM         | Uncompressed      |

## Audio Codecs

### Input Codecs

Honeymelon can decode:

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

| Codec    | Type         | Bitrate      | Use Case                |
| -------- | ------------ | ------------ | ----------------------- |
| **AAC**  | Lossy        | 128-320 kbps | General purpose         |
| **MP3**  | Lossy        | 128-320 kbps | Universal compatibility |
| **Opus** | Lossy        | 64-256 kbps  | Efficient web audio     |
| **FLAC** | Lossless     | Variable     | Archival                |
| **PCM**  | Uncompressed | Fixed        | Professional audio      |

## Codec Compatibility Matrix

### MP4 Container

| Codec  | Compatible | Notes                |
| ------ | ---------- | -------------------- |
| H.264  | ✅         | Fully supported      |
| H.265  | ✅         | Fully supported      |
| VP9    | ❌         | Not supported in MP4 |
| AV1    | ⚠️         | Limited support      |
| ProRes | ❌         | Use MOV instead      |
| AAC    | ✅         | Recommended audio    |
| MP3    | ✅         | Widely supported     |
| Opus   | ❌         | Use WebM instead     |

### MKV Container

| Codec  | Compatible | Notes           |
| ------ | ---------- | --------------- |
| H.264  | ✅         | Fully supported |
| H.265  | ✅         | Fully supported |
| VP9    | ✅         | Fully supported |
| AV1    | ✅         | Fully supported |
| ProRes | ✅         | Supported       |
| AAC    | ✅         | Supported       |
| Opus   | ✅         | Recommended     |
| FLAC   | ✅         | Lossless audio  |

### WebM Container

| Codec  | Compatible | Notes             |
| ------ | ---------- | ----------------- |
| VP8    | ✅         | Older web codec   |
| VP9    | ✅         | Recommended       |
| AV1    | ✅         | Next-gen web      |
| H.264  | ❌         | Not supported     |
| Opus   | ✅         | Recommended audio |
| Vorbis | ✅         | Older audio codec |
| AAC    | ❌         | Not supported     |

### MOV Container

| Codec  | Compatible | Notes              |
| ------ | ---------- | ------------------ |
| H.264  | ✅         | Widely supported   |
| H.265  | ✅         | Fully supported    |
| ProRes | ✅         | Professional codec |
| VP9    | ❌         | Use MKV/WebM       |
| AAC    | ✅         | Recommended        |
| PCM    | ✅         | Uncompressed       |

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

### Apple VideoToolbox

**Encoders**:

- H.264 (`h264_videotoolbox`)
- H.265 (`hevc_videotoolbox`)

**Decoders**:

- H.264
- H.265
- ProRes

**Requirements**:

- Apple Silicon Mac (M1+)
- macOS 13.0+

**Limitations**:

- Slightly lower quality vs. software encoding
- Limited advanced features (no custom tune settings)

::: tip
Hardware acceleration is automatically enabled for compatible codecs. No configuration required!
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

Currently, Honeymelon preserves the source resolution. Scaling/resizing is a planned future feature.

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

Frame rate is preserved from source. Frame rate conversion is a planned future feature.

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

## Format Recommendations

### For Maximum Compatibility

**Container**: MP4
**Video**: H.264
**Audio**: AAC

Works everywhere: web, mobile, TVs, players.

### For Maximum Quality

**Container**: MKV
**Video**: H.265 (CRF 18)
**Audio**: FLAC

Efficient compression with lossless audio.

### For Web Streaming

**Container**: WebM
**Video**: VP9 or AV1
**Audio**: Opus

Modern, efficient web codecs.

### For Professional Editing

**Container**: MOV
**Video**: ProRes
**Audio**: PCM

Editing-friendly formats.

### For Archival

**Container**: MKV
**Video**: H.265 (CRF 18)
**Audio**: FLAC

Long-term storage with excellent compression.

## Next Steps

- Choose the right [Presets & Quality](/guide/presets) for your formats
- Learn about [Converting Files](/guide/converting-files) workflows
- Understand the [Conversion Pipeline](/architecture/pipeline) architecture
