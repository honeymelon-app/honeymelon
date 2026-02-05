# Third-Party Notices

Honeymelon uses third-party software and libraries. This document provides required notices and license information for all dependencies.

## FFmpeg

Honeymelon uses FFmpeg for media processing. FFmpeg is executed as a separate process and is not statically linked.

- **License**: LGPL v2.1 or later
- **Website**: <https://ffmpeg.org>
- **License Text**: See `LICENSES/FFMPEG-LGPL.txt`
- **Source Code**: <https://github.com/FFmpeg/FFmpeg>

FFmpeg is distributed under the LGPL v2.1 or later. Honeymelon complies with LGPL requirements by:

1. Using FFmpeg as a separate executable process (no static linking)
2. Not modifying FFmpeg source code
3. Providing this notice and the LGPL license text
4. Directing users to FFmpeg's source code repository

## JavaScript/TypeScript Dependencies

All npm dependencies are compatible with GPLv3. Key dependencies include:

### Core Framework

- **Vue 3** - MIT License - <https://github.com/vuejs/core>
- **Vite** - MIT License - <https://github.com/vitejs/vite>
- **Pinia** - MIT License - <https://github.com/vuejs/pinia>
- **TypeScript** - Apache-2.0 License - <https://github.com/microsoft/TypeScript>

### UI Components & Styling

- **Tailwind CSS** - MIT License - <https://github.com/tailwindlabs/tailwindcss>
- **Reka UI** - MIT License - <https://github.com/unovue/reka-ui>
- **Lucide Vue Next** - ISC License - <https://github.com/lucide-icons/lucide>
- **class-variance-authority** - Apache-2.0 License - <https://github.com/joe-bell/cva>
- **clsx** - MIT License - <https://github.com/lukeed/clsx>
- **tailwind-merge** - MIT License - <https://github.com/dcastil/tailwind-merge>

### Data Visualization

- **Unovis** - Apache-2.0 License - <https://github.com/f5/unovis>

### Form Validation

- **vee-validate** - MIT License - <https://github.com/logaretm/vee-validate>
- **Zod** - MIT License - <https://github.com/colinhacks/zod>

### Internationalization

- **Vue I18n** - MIT License - <https://github.com/intlify/vue-i18n-next>

### Utilities

- **@vueuse/core** - MIT License - <https://github.com/vueuse/vueuse>
- **@tanstack/vue-table** - MIT License - <https://github.com/TanStack/table>

### Fonts

- **Inter Font** - SIL Open Font License 1.1 - <https://github.com/rsms/inter>

## Rust Dependencies

All Rust crates are compatible with GPLv3. Key dependencies include:

### Tauri Framework

- **tauri** - Apache-2.0 OR MIT - <https://github.com/tauri-apps/tauri>
- **tauri-build** - Apache-2.0 OR MIT
- **tauri-plugin-opener** - Apache-2.0 OR MIT
- **tauri-plugin-notification** - Apache-2.0 OR MIT
- **tauri-plugin-process** - Apache-2.0 OR MIT
- **tauri-plugin-window-state** - Apache-2.0 OR MIT
- **tauri-plugin-store** - Apache-2.0 OR MIT
- **tauri-plugin-fs** - Apache-2.0 OR MIT

### Core Utilities

- **serde** - Apache-2.0 OR MIT - <https://github.com/serde-rs/serde>
- **serde_json** - Apache-2.0 OR MIT - <https://github.com/serde-rs/json>
- **tokio** - MIT - <https://github.com/tokio-rs/tokio>
- **once_cell** - Apache-2.0 OR MIT - <https://github.com/matklad/once_cell>
- **thiserror** - Apache-2.0 OR MIT - <https://github.com/dtolnay/thiserror>

### Cryptography & Security

- **base64** - Apache-2.0 OR MIT - <https://github.com/marshallpierce/rust-base64>

### HTTP & Networking

- **reqwest** - Apache-2.0 OR MIT - <https://github.com/seanmonstar/reqwest>

### File Dialogs

- **rfd** - MIT - <https://github.com/PolyMeilex/rfd>

### Other Utilities

- **uuid** - Apache-2.0 OR MIT - <https://github.com/uuid-rs/uuid>
- **rand** - Apache-2.0 OR MIT - <https://github.com/rust-random/rand>
- **dotenvy** - MIT - <https://github.com/allan2/dotenvy>

## License Compatibility

All third-party dependencies listed above use licenses that are compatible with GNU GPLv3:

- **MIT License**: Compatible with GPLv3
- **Apache-2.0 License**: Compatible with GPLv3
- **ISC License**: Compatible with GPLv3
- **BSD-3-Clause License**: Compatible with GPLv3
- **LGPL v2.1 or later**: Compatible with GPLv3 (via separate process execution)
- **SIL Open Font License 1.1**: Compatible with GPLv3 for font embedding

## Complete Dependency List

For a complete list of all dependencies with exact versions:

- JavaScript/TypeScript: See `package-lock.json`
- Rust: See `src-tauri/Cargo.lock`

## Obtaining Source Code

The source code for Honeymelon is available at: <https://github.com/honeymelon-app/honeymelon>

Third-party dependency source code can be obtained from the repository links provided above or via standard package managers:

- npm packages: `npm view <package-name> repository.url`
- Rust crates: <https://crates.io/crates/{crate-name}>

## Reporting Issues

If you believe any dependency information is incorrect or incomplete, please file an issue at:
<https://github.com/honeymelon-app/honeymelon/issues>

---

**Last Updated**: February 2026
