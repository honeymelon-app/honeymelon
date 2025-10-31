# License Compliance Guide for Honeymelon

This document provides technical guidance for ensuring Honeymelon remains compliant with all open-source licenses when distributed commercially.

---

## Architecture Overview

Honeymelon's licensing compliance is built on a fundamental architectural principle:

```
┌─────────────────────────────────────┐
│   Honeymelon Application            │
│   (MIT License)                     │
│                                     │
│   - Vue.js UI                       │
│   - Tauri (MIT/Apache-2.0)          │
│   - TypeScript/Rust code            │
│   - Job orchestration               │
└──────────────┬──────────────────────┘
               │
               │ Process spawn
               │ (No linking)
               ↓
┌─────────────────────────────────────┐
│   FFmpeg Binary                     │
│   (LGPL v2.1)                       │
│                                     │
│   - Runs as separate process        │
│   - No shared memory                │
│   - No library linking              │
└─────────────────────────────────────┘
```

---

## LGPL Compliance: Technical Implementation

### How Honeymelon Executes FFmpeg

**File**: `src-tauri/src/ffmpeg_runner.rs`

```rust
// FFmpeg is spawned as a separate process
let child = Command::new(ffmpeg_path)
    .args(&args)
    .stdout(Stdio::piped())
    .stderr(Stdio::piped())
    .spawn()?;
```

This is **process execution**, identical to running a command in Terminal:

```bash
$ ffmpeg -i input.mp4 output.mp4
```

### What This Means Legally

| Technical Approach                              | Legal Effect             |
| ----------------------------------------------- | ------------------------ |
| Static linking to libavcodec, libavformat, etc. | Your app becomes LGPL    |
| Dynamic linking to .dylib files                 | Complex LGPL obligations |
| **Process execution (Honeymelon's approach)**   | **Your app stays MIT**   |

### LGPL Section 6 Exemption

From LGPL v2.1, Section 6:

> "As an exception to the Sections above, you may also combine or link a 'work that uses the Library' with the Library to produce a work containing portions of the Library, and distribute that work under terms of your choice..."

**But Honeymelon doesn't need this exception** because we're not combining or linking at all. We're using FFmpeg as a completely separate tool.

---

## File Distribution Requirements

### Required Files in App Bundle

```
Honeymelon.app/
└── Contents/
    ├── MacOS/
    │   └── Honeymelon              # Your app (MIT)
    ├── Resources/
    │   ├── LICENSE.txt             #  REQUIRED: Honeymelon MIT License
    │   ├── FFMPEG-LICENSE.txt      #  REQUIRED: FFmpeg LGPL License
    │   ├── THIRD-PARTY-NOTICES.txt #  REQUIRED: All dependencies
    │   └── bin/                     # Optional: Bundled FFmpeg
    │       ├── ffmpeg              # LGPL binary
    │       └── ffprobe             # LGPL binary
    └── Info.plist
```

### Automated Bundle Script

Add this script to ensure licenses are always included:

**File**: `scripts/bundle-licenses.sh`

```bash
#!/bin/bash
# Copy license files into macOS app bundle

APP_BUNDLE="$1"
RESOURCES="$APP_BUNDLE/Contents/Resources"

# Create Resources directory if it doesn't exist
mkdir -p "$RESOURCES"

# Copy license files
cp LICENSE "$RESOURCES/LICENSE.txt"
cp LICENSES/FFMPEG-LGPL.txt "$RESOURCES/FFMPEG-LICENSE.txt"
cp THIRD_PARTY_NOTICES.md "$RESOURCES/THIRD-PARTY-NOTICES.txt"

echo " License files bundled successfully"
```

**Usage**:

```bash
chmod +x scripts/bundle-licenses.sh
./scripts/bundle-licenses.sh "src-tauri/target/release/bundle/macos/Honeymelon.app"
```

---

## Tauri Configuration for License Files

Update `src-tauri/tauri.conf.json` to include licenses in the bundle:

```json
{
  "bundle": {
    "resources": ["../LICENSE", "../LICENSES/FFMPEG-LGPL.txt", "../THIRD_PARTY_NOTICES.md"]
  }
}
```

This ensures license files are automatically included when running `npm run tauri:build`.

---

## In-App License Display

### Implementation Checklist

- [ ] Add "Licenses" menu item to "About" window
- [ ] Display LICENSE (MIT) for Honeymelon
- [ ] Display FFMPEG-LICENSE.txt (LGPL)
- [ ] Display THIRD_PARTY_NOTICES.md
- [ ] Make it accessible via keyboard shortcut

### Example Implementation

**File**: `src/components/LicensesDialog.vue`

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { readTextFile } from '@tauri-apps/plugin-fs';
import { resolveResource } from '@tauri-apps/api/path';

const licenses = ref({
  honeymelon: '',
  ffmpeg: '',
  thirdParty: '',
});

onMounted(async () => {
  const licPath = await resolveResource('LICENSE.txt');
  const ffmpegPath = await resolveResource('FFMPEG-LICENSE.txt');
  const thirdPartyPath = await resolveResource('THIRD-PARTY-NOTICES.txt');

  licenses.value.honeymelon = await readTextFile(licPath);
  licenses.value.ffmpeg = await readTextFile(ffmpegPath);
  licenses.value.thirdParty = await readTextFile(thirdPartyPath);
});
</script>

<template>
  <div class="licenses-dialog">
    <h2>Honeymelon License (MIT)</h2>
    <pre>{{ licenses.honeymelon }}</pre>

    <h2>FFmpeg License (LGPL v2.1)</h2>
    <pre>{{ licenses.ffmpeg }}</pre>

    <h2>Third-Party Notices</h2>
    <pre>{{ licenses.thirdParty }}</pre>
  </div>
</template>
```

---

## DMG Distribution

### What to Include in the DMG

```
Honeymelon_0.1.0_aarch64.dmg
├── Honeymelon.app              # Main application
├── LICENSE.txt                 # Honeymelon MIT License
├── FFMPEG-LICENSE.txt          # FFmpeg LGPL License
└── THIRD_PARTY_NOTICES.txt     # All dependencies
```

### DMG Build Script

**File**: `scripts/create-dmg-with-licenses.sh`

```bash
#!/bin/bash
# Create DMG with license files

VERSION="0.1.0"
DMG_DIR="dmg-staging"

# Clean and create staging directory
rm -rf "$DMG_DIR"
mkdir -p "$DMG_DIR"

# Copy app bundle
cp -r "src-tauri/target/release/bundle/macos/Honeymelon.app" "$DMG_DIR/"

# Copy license files to DMG root
cp LICENSE "$DMG_DIR/LICENSE.txt"
cp LICENSES/FFMPEG-LGPL.txt "$DMG_DIR/FFMPEG-LICENSE.txt"
cp THIRD_PARTY_NOTICES.md "$DMG_DIR/THIRD_PARTY_NOTICES.txt"

# Create DMG
hdiutil create -volname "Honeymelon" \
  -srcfolder "$DMG_DIR" \
  -ov -format UDZO \
  "Honeymelon_${VERSION}_aarch64.dmg"

echo " DMG created with all license files"
```

---

## FFmpeg Build Considerations

### Recommended Configuration

To minimize patent and licensing concerns, build FFmpeg with:

```bash
./configure \
  --enable-videotoolbox \      # Hardware H.264/HEVC (Apple licensed)
  --enable-libopus \            # Patent-free audio
  --enable-libvpx \             # VP9 (open source)
  --disable-gpl \               # No GPL code
  --enable-version3 \           # LGPL v2.1+
  --arch=arm64 \                # Apple Silicon
  --prefix=/usr/local
```

### Codecs to Avoid (GPL/Patent Issues)

**DO NOT ENABLE**:

- `--enable-gpl` - Would make FFmpeg GPL, not LGPL
- `--enable-libx264` - GPL licensed
- `--enable-libx265` - GPL licensed
- `--enable-nonfree` - Proprietary codecs
- `--enable-libfdk-aac` - Non-free license

  **SAFE TO USE**:

- VideoToolbox (hardware, Apple licensed)
- Native AAC encoder (built-in)
- libvpx (VP9, open source)
- libopus (Opus, patent-free)
- libaom (AV1, open source)

---

## Compliance Verification

### Pre-Release Checklist

Before each release, verify:

```bash
# 1. Check that FFmpeg is not linked
otool -L Honeymelon.app/Contents/MacOS/Honeymelon
# Should NOT show any libavcodec, libavformat, etc.

# 2. Verify license files are in bundle
ls -la Honeymelon.app/Contents/Resources/
# Should show LICENSE.txt, FFMPEG-LICENSE.txt, etc.

# 3. Check DMG contents
hdiutil mount Honeymelon_0.1.0_aarch64.dmg
ls -la /Volumes/Honeymelon/
# Should show license files in DMG root

# 4. Verify FFmpeg runs as separate process
# Open Activity Monitor while converting
# Should see separate "ffmpeg" process
```

---

## Legal Q&A for Developers

### Q: Can I statically link FFmpeg to make distribution easier?

**A**: **NO**. This would make your entire app LGPL and require you to provide source code or object files to users. Stick with process execution.

### Q: What if I use FFmpeg libraries via FFI (Foreign Function Interface)?

**A**: This is effectively dynamic linking and has complex LGPL obligations. Avoid this approach.

### Q: Can I modify FFmpeg source code?

**A**: Yes, but then you MUST:

1. Provide modified FFmpeg source code to users
2. Document your modifications
3. Still follow LGPL terms for the modified version

It's easier to NOT modify FFmpeg.

### Q: What about linking to other GPL/LGPL libraries?

**A**: Each library has its own license. If you use process separation (like with FFmpeg), you're safe. If you link, check each library's specific terms.

---

## Summary

**Honeymelon's approach is compliant because**:

1. FFmpeg runs as a separate process (no linking)
2. License files are included with distribution
3. No FFmpeg source modifications
4. Patent-risky codecs use hardware encoders

**To stay compliant**:

1. Always include LICENSE, FFMPEG-LICENSE.txt, and THIRD_PARTY_NOTICES.md
2. Never link FFmpeg libraries
3. Use bundle scripts to automate license inclusion
4. Display licenses in the app UI

**This allows commercial sale** without requiring:

- Open-sourcing your code
- Providing source to customers
- Special permissions from FFmpeg developers

---

**Questions?** Consult with a software licensing attorney for your specific situation.

**Last Updated**: 2025-10-30
