# Honeymelon 🍈

A tiny, Mac-only media converter that “just works.”
Tauri + Vue 3 + TypeScript + shadcn-vue • FFmpeg out-of-process • Apple Silicon (arm64) only

Drag files in → pick a preset → convert. Honeymelon prioritizes remux-first (no quality loss) and only re-encodes when necessary.

---

## Highlights

* Many-to-many conversions (broad inputs → curated, safe outputs)
* Remux-first engine: copy streams when valid; transcode only when needed
* LGPL-clean distribution: FFmpeg runs out-of-process; no GPL/non-free codecs
* Small and fast desktop app (Tauri) with a polished shadcn-vue UI
* macOS Apple Silicon (arm64) only; signed/notarized distribution ready
* Job queue with progress, ETA, cancel, and logs
* Capability detection: presets auto-disable if an encoder isn’t available

---

## Supported Outputs (V1)

### Video

* MP4 | H.264 + AAC (compatible default)
* MP4 | HEVC + AAC (smaller files; Apple hardware encode)
* WebM | VP9 + Opus (requires libvpx/libopus in FFmpeg)
* WebM | AV1 + Opus (experimental; requires libaom/libopus)
* MOV | ProRes 422 HQ + PCM (editing/archival)
* MKV | Passthrough (copy where allowed)
* GIF (guarded for short clips)

### Audio-only

* M4A (AAC), MP3, FLAC, WAV

Honeymelon prefers remux when input streams already meet the target container’s constraints.

---

## Preset Behavior

Each preset ships with Fast / Balanced / High tiers:

* Fast: remux-first; minimal transcode (audio only if needed)
* Balanced: sane bitrates (example 1080p: H.264 ~5–7 Mbps; HEVC ~3–5 Mbps)
* High: higher bitrates / ProRes profile for editing

Subtitles:

* Text (SRT/ASS) → MP4 converts to `mov_text`; MKV keeps; WebM/MOV initially drop or burn-in
* Image (PGS) → optional Burn-in (rasterized onto video)

---

## System Requirements

* macOS 13 or newer on Apple Silicon (arm64)
* Approximately 200 MB free disk (app plus bundled FFmpeg)
* Internet not required at runtime (updates optional)

---

## Quick Start

1. Download the latest DMG/ZIP (Apple Silicon) or build from source (below).
2. Launch Honeymelon and drop files into the window.
3. Choose a Preset (for example, MP4 | H.264/AAC · Balanced).
4. Click Convert.
5. Reveal in Finder when complete.

---

## How It Works

Probe → Plan → Execute

1. Probe with ffprobe to gather codecs, duration, subtitles, and more.
2. Plan using a rules engine that checks container constraints plus local encoder capabilities to choose:

   * remux (copy all),
   * copy-video + transcode-audio, or
   * re-encode video (VideoToolbox for H.264/HEVC; libvpx/libaom for VP9/AV1 when available).
3. Execute by spawning ffmpeg out-of-process, streaming progress (time/fps/speed) to the UI, supporting cancel, and writing logs.

---

## Project Structure

```
apps/desktop/
  src/
    lib/
      ffmpeg-probe.ts         # ffprobe wrapper
      ffmpeg-plan.ts          # rules: container constraints → args
      ffmpeg-progress.ts      # parse stderr → {seconds,fps,speed,eta}
      capability.ts           # reads capabilities.json
      container-rules.ts      # MP4/WebM/MOV/MKV constraints
    stores/
      jobs.ts                 # Pinia: queue, concurrency, persistence
      prefs.ts                # ffmpeg path, output dir, default preset
    components/
      Dropzone.vue | JobCard.vue | PresetPicker.vue | ProgressBar.vue
      SubtitleOptions.vue | OutputOptions.vue
    pages/
      Home.vue | Settings.vue | Licenses.vue
  src-tauri/
    src/
      main.rs                 # Tauri bootstrap
      probe.rs                # ffprobe command
      ffmpeg.rs               # spawn/kill ffmpeg, emit progress
    tauri.conf.json
    resources/bin/ffmpeg      # bundled arm64 binary (optional)
    resources/bin/ffprobe
scripts/
  check-ffmpeg-capabilities.ts # generates capabilities.json
.github/workflows/release.yml
LICENSES/FFMPEG-LGPL.txt
THIRD_PARTY_NOTICES.md
```

---

## Build From Source (Apple Silicon)

### Prerequisites

* Xcode and Command Line Tools
* Rust and Tauri tooling:

  ```bash
  curl https://sh.rustup.rs -sSf | sh
  cargo install tauri-cli
  ```

* Node 18+ and pnpm (or npm/yarn)

  ```bash
  corepack enable && corepack prepare pnpm@latest --activate
  ```

### Install and Run

```bash
pnpm i
pnpm tauri dev
```

### Production Build

```bash
pnpm tauri build --target aarch64-apple-darwin
# Output: src-tauri/target/release/bundle/dmg/Honeymelon_*.dmg
```

By default, Honeymelon uses bundled FFmpeg/FFprobe in `src-tauri/resources/bin/`.
If not present, it can use a custom path configured in Settings.

---

## FFmpeg Binaries (LGPL-Clean)

Honeymelon runs FFmpeg out-of-process (no static linking). You can:

* Bundle arm64 binaries in `src-tauri/resources/bin/{ffmpeg,ffprobe}`, or
* Point to a system FFmpeg in Settings.

### Recommended Builds

Base (small, safe): VideoToolbox, native `aac`, `alac`, `flac`, `pcm`, `prores_ks`.
Enhanced (still LGPL-compatible): add `libvpx` (VP9), `libaom` (AV1), `libopus`, `libvorbis`, `libmp3lame`.

If a codec or encoder is missing, Honeymelon auto-disables that preset via `capabilities.json`.

Generate capabilities:

```bash
pnpm tsx scripts/check-ffmpeg-capabilities.ts
```

---

## Code Signing and Notarization (for releases)

* Create an Apple Developer ID Application certificate in your keychain.
* Configure Tauri signing in `tauri.conf.json` or via environment variables:

  * `APPLE_ID`, `APPLE_PASSWORD` or app-specific password, `APPLE_TEAM_ID`, and related settings.
* CI will sign and notarize if secrets are present (see workflow).

GitHub Actions snippet:

```yaml
name: Release (macOS arm64)
on: { push: { tags: ["v*"] } }
jobs:
  build:
    runs-on: macos-14
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with: { version: 9 }
      - run: corepack enable
      - run: pnpm i
      - name: Build (signed if secrets exist)
        run: pnpm tauri build --target aarch64-apple-darwin
        env:
          APPLE_ID: ${{ secrets.APPLE_ID }}
          APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
          APPLE_PASSWORD: ${{ secrets.APPLE_APP_PASS }}
```

---

## Auto-Updates

Tauri’s updater can be enabled in `tauri.conf.json` with a signed JSON feed you host (for example, S3/CloudFront). Honeymelon checks on launch and prompts the user. This is optional; you can ship manual DMGs if preferred.

---

## Privacy

* Honeymelon performs conversions locally.
* No media leaves the machine.
* Optional crash or telemetry hooks are off by default. If enabled, they should anonymize and exclude file content and paths.

---

## Legal Notes (Non-Legal Advice)

* Honeymelon uses FFmpeg under the LGPL. It does not enable GPL/non-free components (for example, x264/x265/fdk-aac).
* Some codecs (for example, H.264/H.265) are patent-encumbered in some jurisdictions. Honeymelon prefers Apple VideoToolbox for these, leveraging system-provided implementations.
* Include `LICENSES/FFMPEG-LGPL.txt` and `THIRD_PARTY_NOTICES.md`. If you modify FFmpeg source, you must offer your changes’ source as required by the LGPL.

---

## Troubleshooting

* Preset greyed out: Your FFmpeg lacks that encoder (for example, AV1/VP9). Use the Enhanced build or system FFmpeg.
* No progress or stuck at 0%: Some inputs don’t provide duration; progress falls back to frame-based ETA.
* PGS subtitles not in MP4: MP4 doesn’t support image subs. Use Burn-in or output MKV.
* Choppy HEVC playback: Try H.264, or lower the tier from High to Balanced.
* Large GIFs: GIFs can be very large; keep short durations and small resolutions.

---

## Roadmap

* Batch folder ingest and simple rename templates
* Trim and simple crop (when re-encoding)
* More audio formats and per-track selection
* Per-job advanced toggles (still curated)
* Signed auto-update feed with delta artifacts

---

## Contributing

Pull requests are welcome. Please keep to the goals:

* Simple UX, curated presets
* Out-of-process FFmpeg, LGPL-clean
* Small, fast macOS app

Steps:

1. Fork and create a feature branch.
2. `pnpm i && pnpm tauri dev`
3. Add tests where applicable.
4. Open a PR with a clear summary and before/after behavior.

### Code Style

* TypeScript strict; ESLint + Prettier
* Vue 3 + Composition API + Pinia
* Tauri commands: minimal, audited Rust

---

## Acknowledgements

* FFmpeg/FFprobe and contributors
* Tauri, Vue, shadcn-vue
* Open-source community

---

## Third-Party Notices (Template)

Add a `THIRD_PARTY_NOTICES.md` with at least:

```
This product includes components developed by third parties.

FFmpeg
- License: LGPL 2.1+
- Source: https://ffmpeg.org/
- Notice: This app uses FFmpeg via an out-of-process binary. We do not statically link FFmpeg nor enable GPL/non-free components.

Tauri, Vue, Pinia, shadcn-vue, and other dependencies
- Refer to their respective licenses.
```

---

## License

Copyright Honeymelon authors.
App source under your chosen license (for example, MIT or Apache-2.0).
FFmpeg remains under its own license(s) and is not part of this repository’s license.
