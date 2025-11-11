# Commercial Licensing for Honeymelon

This document explains the commercial licensing terms for Honeymelon.

---

## Proprietary Software

**Honeymelon is proprietary software** owned by Jerome Thayananthajothy. All rights are reserved.

---

## Commercial Distribution

### License Required

Commercial distribution, sale, or use of Honeymelon requires explicit written permission from the copyright holder.

**To obtain a commercial license:**

- Contact: Jerome Thayananthajothy
- Email: tjthavarshan@gmail.com
- Subject: "Honeymelon Commercial License Inquiry"

### What Requires a License

The following activities require explicit written permission:

1. Selling Honeymelon as a paid application
2. Distributing Honeymelon (free or paid)
3. Including Honeymelon in a commercial product or service
4. Using Honeymelon in a business environment beyond evaluation
5. Modifying Honeymelon for commercial purposes
6. Creating derivative works based on Honeymelon

---

## FFmpeg Licensing Compliance

### Independent Licensing

While Honeymelon is proprietary, it uses FFmpeg which is licensed under LGPL v2.1. The LGPL license does NOT affect Honeymelon's proprietary status because:

1. **Process Separation**: FFmpeg runs as a completely separate process
2. **No Linking**: Honeymelon does not statically or dynamically link to FFmpeg libraries
3. **No Modifications**: Honeymelon does not modify FFmpeg source code

### LGPL Compliance Method

```
Honeymelon App (Proprietary)
    ↓ (spawns separate process)
FFmpeg Binary (LGPL v2.1)

```

Communication occurs exclusively through:

- Process execution (command-line)
- Standard input/output/error streams
- File system (input/output files)

This is identical to how any application can run system commands without licensing implications.

### What This Means

- Honeymelon source code remains proprietary
- No obligation to provide Honeymelon source code to users
- FFmpeg's LGPL license does not "infect" Honeymelon's proprietary license
- Users must still be informed about FFmpeg's LGPL license

---

## Distribution Requirements

When authorized to distribute Honeymelon, you must include:

### Required Files

1. **LICENSE** - Honeymelon's proprietary license
2. **LICENSES/FFMPEG-LGPL.txt** - FFmpeg's LGPL license
3. **docs/legal/THIRD_PARTY_NOTICES.md** - All dependency attributions
4. **Link to FFmpeg source**: https://ffmpeg.org/download.html

### Recommended App Bundle Structure

```

Honeymelon.app/
└── Contents/
    ├── MacOS/
    │   └── Honeymelon (executable)
    ├── Resources/
    │   ├── LICENSE.txt (Honeymelon Proprietary License)
    │   ├── FFMPEG-LICENSE.txt (FFmpeg LGPL)
    │   ├── THIRD_PARTY_NOTICES.txt
    │   └── bin/
    │       ├── ffmpeg (bundled binary)
    │       └── ffprobe (bundled binary)
    └── Info.plist
```

### In-App Accessibility

Provide users access to licenses through:

- "About" dialog (showing FFmpeg license)
- Help menu ("Licenses" or "Legal Notices" menu item)
- Bundled documentation in app package

---

## Patent Considerations

Certain codecs used by FFmpeg may be subject to patent claims:

### H.264/HEVC Codecs

- Patent pools: MPEG LA, HEVC Advance
- Using Apple's VideoToolbox hardware encoders may be covered by Apple's licensing
- Software encoders (libx264, libx265) may require separate licensing

### AAC Codec

- Patent pool: Via Licensing
- System-provided encoders covered by Apple's licensing

### Royalty-Free Codecs

- VP9, AV1, Opus: No patent licensing required
- Open-source and royalty-free

**Note**: Patent licensing is the responsibility of the commercial licensee.

---

## Third-Party Dependencies

Honeymelon uses open-source dependencies that permit commercial use:

- **Tauri**: MIT/Apache-2.0 dual license
- **Vue.js**: MIT license
- **Rust ecosystem**: Primarily MIT/Apache-2.0 dual licensed
- **shadcn-vue**: MIT license
- **Tailwind CSS**: MIT license

All dependencies are properly attributed in `docs/legal/THIRD_PARTY_NOTICES.md`.

---

## Evaluation and Testing

### Permitted Use Without License

The following uses are permitted without a commercial license:

1. Personal, non-commercial evaluation
2. Academic research (non-commercial)
3. Internal testing (not for production use)
4. Development and compilation for personal use

### Production Use Requires License

Any use beyond evaluation in a business or commercial context requires a commercial license.

---

## Frequently Asked Questions

### Q: Can I use Honeymelon for free?

**A:** Personal, non-commercial use for evaluation purposes is permitted. Commercial use requires a license.

### Q: Can I modify Honeymelon?

**A:** Modifications require explicit written permission from the copyright holder.

### Q: Does FFmpeg's LGPL license affect Honeymelon?

**A:** No. Process separation ensures FFmpeg's LGPL does not affect Honeymelon's proprietary license.

### Q: Can I redistribute Honeymelon?

**A:** Only with explicit written permission from Jerome Thayananthajothy.

### Q: What if I'm a reseller or want to bundle Honeymelon?

**A:** Contact tjthavarshan@gmail.com to discuss commercial licensing terms.

### Q: Can I create a competing product based on Honeymelon?

**A:** No. Creating derivative works or competing products requires explicit permission.

---

## Enforcement

Unauthorized use, copying, modification, or distribution of Honeymelon may result in:

1. Civil legal action
2. Statutory and actual damages
3. Injunctive relief
4. Attorney fees and costs

---

## Contact Information

For commercial licensing inquiries:

**Jerome Thayananthajothy**

- Email: tjthavarshan@gmail.com
- Subject: "Honeymelon Commercial License Inquiry"

Please include:

- Your intended use case
- Distribution method (if applicable)
- Expected volume/scale
- Company/organization name (if applicable)

---

## Legal Notice

This document does not constitute legal advice. Consult with a qualified attorney regarding your specific licensing needs.

Copyright (c) 2025 Jerome Thayananthajothy. All rights reserved.
