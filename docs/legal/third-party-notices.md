---
title: Third-Party Notices
description: Attribution requirements and license summaries for third-party components bundled with Honeymelon.
---

# Third-Party Notices

This file contains the licenses and notices for third-party software included with or used by Honeymelon.

---

## FFmpeg

**License**: GNU Lesser General Public License (LGPL) v2.1 or later
**Website**: <https://ffmpeg.org/>
**Source Code**: <https://github.com/FFmpeg/FFmpeg>

FFmpeg is a complete, cross-platform solution to record, convert and stream audio and video.

**Usage in Honeymelon**: Honeymelon executes FFmpeg as a separate, external process (out-of-process). There is no static or dynamic linking to FFmpeg libraries. This approach ensures LGPL compliance while allowing Honeymelon to be distributed under its own license.

**License Notice**: See [LICENSES/FFMPEG-LGPL.txt](LICENSES/FFMPEG-LGPL.txt) for the complete LGPL license text.

**Patent Notice**: Some codecs may be subject to patent claims in certain jurisdictions. Honeymelon primarily uses hardware encoders provided by macOS (VideoToolbox) which are covered by Apple's licensing arrangements.

---

## Tauri

**License**: Apache License 2.0 or MIT License
**Website**: <https://tauri.app/>
**Source Code**: <https://github.com/tauri-apps/tauri>

Tauri is a framework for building tiny, blazingly fast binaries for all major desktop platforms.

Copyright (c) 2019-2025 Tauri Programme within The Commons Conservancy

Licensed under the Apache License, Version 2.0 or MIT License.

---

## Vue.js

**License**: MIT License
**Website**: <https://vuejs.org/>
**Source Code**: <https://github.com/vuejs/core>

Copyright (c) 2013-present Evan You

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

---

## Pinia

**License**: MIT License
**Website**: <https://pinia.vuejs.org/>
**Source Code**: <https://github.com/vuejs/pinia>

Copyright (c) 2019-present Eduardo San Martin Morote

---

## Tailwind CSS

**License**: MIT License
**Website**: <https://tailwindcss.com/>
**Source Code**: <https://github.com/tailwindlabs/tailwindcss>

Copyright (c) Tailwind Labs, Inc.

---

## shadcn-vue (Radix Vue / Reka UI)

**License**: MIT License
**Website**: <https://www.shadcn-vue.com/>
**Source Code**: <https://github.com/radix-vue/shadcn-vue>

Based on Radix UI and ported to Vue.

---

## Lucide Icons

**License**: ISC License
**Website**: <https://lucide.dev/>
**Source Code**: <https://github.com/lucide-icons/lucide>

Copyright (c) for portions of Lucide are held by Cole Bemis 2013-2022 as part of Feather (MIT). All other copyright for Lucide are held by Lucide Contributors 2022.

---

## TypeScript

**License**: Apache License 2.0
**Website**: <https://www.typescriptlang.org/>
**Source Code**: <https://github.com/microsoft/TypeScript>

Copyright (c) Microsoft Corporation

---

## Rust Language and Cargo Dependencies

**License**: Apache License 2.0 or MIT License (dual licensed)
**Website**: <https://www.rust-lang.org/>

Various Rust crates used in the Tauri backend are licensed under Apache 2.0 and/or MIT licenses. See `src-tauri/Cargo.lock` for a complete list of dependencies.

---

## Other JavaScript/TypeScript Dependencies

The following dependencies are used in this project and are licensed under MIT or similar permissive licenses:

- **@tauri-apps/api** - MIT License
- **@tauri-apps/plugin-opener** - MIT License
- **@vueuse/core** - MIT License
- **class-variance-authority** - Apache License 2.0
- **clsx** - MIT License
- **tailwind-merge** - MIT License
- **vee-validate** - MIT License
- **zod** - MIT License
- **embla-carousel-vue** - MIT License
- **vue-sonner** - MIT License
- **vaul-vue** - MIT License

For a complete list of dependencies and their licenses, see:

- `package.json` for frontend dependencies
- `src-tauri/Cargo.toml` for Rust dependencies

---

## Fonts and Assets

Any fonts or graphical assets included with Honeymelon are either:

1. Created originally for this project
2. Licensed under permissive licenses (OFL, Apache, MIT)
3. System fonts provided by macOS

---

## Patent and Codec Licensing

**IMPORTANT NOTICE**: Some audio and video codecs may be subject to patent claims:

- **H.264 (AVC)**: May require MPEG LA licensing in some jurisdictions
- **H.265 (HEVC)**: May require MPEG LA and HEVC Advance licensing in some jurisdictions
- **AAC**: May require Via Licensing or other patent licensing in some jurisdictions

**Honeymelon's Approach**:

- Primarily uses **Apple VideoToolbox** hardware encoders for H.264/HEVC on macOS
- Hardware encoders are provided by Apple as part of macOS
- Apple handles patent licensing for these system-provided codecs
- Users bringing their own FFmpeg builds are responsible for ensuring proper codec licensing

**User Responsibility**: If you compile or provide your own FFmpeg binary with additional codecs, you are responsible for ensuring compliance with applicable patent licenses in your jurisdiction.

---

## Disclaimer

This software is provided "as is", without warranty of any kind, express or implied. The authors and copyright holders are not liable for any claim, damages, or other liability arising from the use of this software.

---

## License Compliance

Honeymelon is designed to comply with all applicable open-source licenses:

1. **Separation of Concerns**: FFmpeg runs as a separate process (no linking)
2. **License Attribution**: All third-party licenses are documented
3. **Source Code Availability**: Links to all third-party source code are provided
4. **Patent Awareness**: Clear notice about potential patent requirements

For questions about licensing, please contact the project maintainers.

---

**Last Updated**: 2024-10-30
