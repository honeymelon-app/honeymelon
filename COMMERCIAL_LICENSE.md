# Commercial Licensing Guide for Honeymelon

This document explains how Honeymelon can be sold commercially while maintaining full compliance with all open-source licenses, particularly FFmpeg's LGPL license.

---

## ✅ Can I Sell Honeymelon?

**YES!** Honeymelon can be sold commercially as a paid application on your website, app store, or any other distribution channel.

---

## Why This Is Legal

### 1. Honeymelon's License (MIT)

Honeymelon's source code is licensed under the **MIT License**, which explicitly allows:
- ✅ Commercial use
- ✅ Modification
- ✅ Distribution
- ✅ Private use
- ✅ Selling the software

### 2. FFmpeg's License (LGPL v2.1)

FFmpeg is licensed under the **GNU Lesser General Public License (LGPL) v2.1**, which allows commercial use **when used correctly**.

**Critical Distinction**: Honeymelon uses FFmpeg as a **separate, external program** (out-of-process execution), NOT as a linked library.

#### LGPL Compliance Through Process Separation

| Method | LGPL Impact | Honeymelon's Approach |
|--------|-------------|----------------------|
| Static Linking | ❌ Your entire app becomes LGPL | ✅ NOT USED |
| Dynamic Linking | ❌ Your app may need to be LGPL | ✅ NOT USED |
| Separate Process | ✅ Your app stays independent | ✅ USED - This is how Honeymelon works |

**How Honeymelon Uses FFmpeg**:
```
Honeymelon App (MIT License)
    ↓ (spawns process)
FFmpeg Binary (LGPL License)
```

The two programs communicate through:
- Process execution (like running a command in Terminal)
- Standard input/output streams
- File system (reading/writing files)

This is **identical** to how any macOS app can run system commands without licensing implications.

### 3. No FFmpeg Modifications

Honeymelon does **not modify FFmpeg's source code**. This means:
- ✅ No obligation to distribute FFmpeg source code
- ✅ No obligation to offer source code to users
- ✅ LGPL requirements are minimal

---

## What You Must Include When Distributing

When selling Honeymelon (as a DMG, app bundle, or download), you must include these files:

### Required Files

1. **LICENSE** (MIT License for Honeymelon)
   - ✅ Already created in repository root

2. **LICENSES/FFMPEG-LGPL.txt** (FFmpeg's LGPL license)
   - ✅ Already created
   - Must be accessible to users (e.g., in app bundle or documentation)

3. **THIRD_PARTY_NOTICES.md** (All dependency attributions)
   - ✅ Already created
   - Lists all third-party software and their licenses

### Recommended Placement

```
Honeymelon.app/
└── Contents/
    ├── MacOS/
    │   └── Honeymelon (executable)
    ├── Resources/
    │   ├── LICENSE.txt (Honeymelon MIT License)
    │   ├── FFMPEG-LICENSE.txt (FFmpeg LGPL)
    │   ├── THIRD_PARTY_NOTICES.txt
    │   └── bin/
    │       ├── ffmpeg (optional bundled binary)
    │       └── ffprobe (optional bundled binary)
    └── Info.plist
```

### In-App Accessibility

Best practice is to make licenses accessible via the app menu:
- "Honeymelon" → "About Honeymelon" → "Licenses" button
- This opens a window showing all license information

---

## Patent Considerations

### Codec Patents

Some video/audio codecs have patent claims in certain jurisdictions:

- **H.264 (AVC)**: Patent pool managed by MPEG LA
- **H.265 (HEVC)**: Patent pools managed by MPEG LA and HEVC Advance
- **AAC**: Patent pool managed by Via Licensing

### Honeymelon's Approach

**Hardware Encoders**: Honeymelon primarily uses **Apple VideoToolbox**, which provides:
- ✅ Hardware-accelerated H.264/HEVC encoding
- ✅ Patent licensing handled by Apple
- ✅ Included with macOS at no additional cost

**User Responsibility**: If users provide their own FFmpeg binary with additional software encoders (like x264, x265), they are responsible for any patent licensing in their jurisdiction.

### Your Risk Profile

**Low Risk Scenario** (Recommended):
- ✅ Bundle FFmpeg with only hardware encoders enabled
- ✅ Use Apple VideoToolbox for H.264/HEVC
- ✅ Use native AAC encoder
- ✅ Document that users bringing their own FFmpeg are responsible for codec licensing

**Higher Risk Scenario**:
- ❌ Bundle FFmpeg with software encoders (x264, x265, fdk-aac)
- ❌ May require separate patent licensing agreements

---

## Distribution Checklist

Before selling Honeymelon commercially:

### Legal Requirements

- [x] Include LICENSE file (MIT for Honeymelon)
- [x] Include LICENSES/FFMPEG-LGPL.txt
- [x] Include THIRD_PARTY_NOTICES.md
- [x] Make licenses accessible within the app
- [x] Provide link to FFmpeg source code (in notices)
- [x] Do not modify FFmpeg source code

### Optional but Recommended

- [ ] Consult with a lawyer familiar with software licensing (not required, but good practice)
- [ ] Add "About" dialog with license links
- [ ] Include license files in DMG installer
- [ ] Document codec patent situation in user documentation
- [ ] Consider liability insurance for commercial software

---

## Pricing Models

Since Honeymelon can be sold commercially, here are viable models:

### One-Time Purchase
- Sell app for fixed price on your website
- Provide updates for free or with upgrade pricing
- No licensing restrictions

### Subscription Model
- Monthly/annual subscription
- Continuous updates included
- Cloud features (if added) can justify ongoing pricing

### Freemium Model
- Free version with basic features
- Paid "Pro" version with advanced features
- Upsell within the app

### Site License
- Sell to organizations with multiple users
- Per-seat or unlimited pricing
- Custom terms possible

---

## Frequently Asked Questions

### Q: Do I need to open-source Honeymelon to sell it?
**A**: No. The MIT license allows you to sell proprietary versions. You can keep your modifications private.

### Q: Can I remove the MIT license and make it fully proprietary?
**A**: If you wrote 100% of the code, yes. But you must still include FFmpeg's LGPL license and third-party notices.

### Q: What if I modify FFmpeg?
**A**: LGPL requires you to offer the modified FFmpeg source code to users (but NOT Honeymelon's source). However, Honeymelon doesn't modify FFmpeg, so this doesn't apply.

### Q: Can I bundle FFmpeg with my commercial version?
**A**: Yes! Bundling the FFmpeg binary is allowed. Just include the LGPL license file.

### Q: What about code signing and notarization?
**A**: These are required for macOS distribution but don't affect licensing. See BUILD.md for details.

### Q: Can I sell on the Mac App Store?
**A**: Potentially, but the Mac App Store has restrictions on:
- LGPL software (sometimes accepted if clearly separated)
- Apps that execute external binaries (may require sandboxing exceptions)
- Check Apple's latest guidelines before submitting

### Q: Do I need a separate commercial license from FFmpeg developers?
**A**: No. The LGPL explicitly allows commercial use when you follow its terms (which Honeymelon does through process separation).

---

## Example Sales Page Language

When selling Honeymelon, you can use language like:

> **Honeymelon** is a professional media converter for macOS. Powered by industry-standard FFmpeg, Honeymelon provides fast, reliable conversions with a beautiful interface.
>
> **License**: Honeymelon is commercial software. FFmpeg is used under the LGPL license and runs as a separate process. All licenses are included with your purchase.

---

## Disclaimer

This document provides information about software licensing but **is not legal advice**. For specific legal questions about your commercial use case, consult with a lawyer familiar with software licensing and intellectual property law.

The information here is based on:
- LGPL v2.1 license terms
- MIT license terms
- Common practices in the software industry
- The specific architecture of Honeymelon (process separation)

---

## Summary

✅ **You CAN sell Honeymelon commercially**

✅ **You DO need to include license files** (already created)

✅ **You DON'T need to open-source your modifications**

✅ **You DON'T need special permission from FFmpeg developers**

✅ **Patent risks are LOW if using hardware encoders**

✅ **This approach is used by many commercial apps**

---

**Questions?** Contact the project maintainers or consult with a software licensing attorney.

**Last Updated**: 2025-10-30
