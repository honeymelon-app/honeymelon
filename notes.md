<!-- codex resume 019a2c31-b4b1-7801-ad9f-92ddbd2b1565 -->

Here’s a precise, copy-paste **UI build prompt** for Codex. It describes the screens in your mockups and constrains implementation to **Vue 3 + shadcn-vue** with **utility classes only** (no custom CSS).

---

# ROLE

You are a front-end engineer building the **Honeymelon** desktop UI using **Vue 3 + TypeScript + Vite + shadcn-vue**. Styling must use **only** shadcn-vue components and Tailwind utility classes. **No custom CSS files or arbitrary classnames** beyond utilities. Icons from **lucide-vue-next** only.

# GOALS

Recreate the attached “Comet/Honeymelon” UI exactly:

* Tabs for **Video | Audio | Image**
* Large **dropzone** area
* Per-workspace breadcrumb path
* Global **“Converts to:”** select (target container/format)
* **Job list** with progress, per-job controls (pause/resume, open/reveal, delete)
* Footer actions: **Cancel** (disabled when idle), **Convert/Converting…**
* Language menu (top-right), theme toggle (light/dark)
* Dark mode parity
* Strictly shadcn-vue + utilities, no custom CSS

# TECH

* Vue 3 SFCs with `<script setup lang="ts">`, Composition API, strict TS
* shadcn-vue components: `Tabs, TabsList, TabsTrigger, TabsContent, Card, CardHeader, CardTitle, CardContent, Button, DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, Select, SelectTrigger, SelectValue, SelectContent, SelectGroup, SelectItem, Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbSeparator, Progress, Badge, Separator, Tooltip, TooltipTrigger, TooltipContent, Switch, ScrollArea, Dialog` (use as needed)
* Icons: `lucide-vue-next` (e.g., `Upload, Folder, Play, Pause, X, Trash2, Globe, Sun, Moon, Ban, RefreshCw, FileVideo, FileAudio, ImageIcon, CheckCircle2, Circle`)

# FILE STRUCTURE (create these)

```
src/
  pages/HoneymelonHome.vue
  components/DropzoneCard.vue
  components/TopBar.vue
  components/FormatSelect.vue
  components/JobList.vue
  components/JobItem.vue
  components/LanguageMenu.vue
  components/ThemeToggle.vue
  components/PathBreadcrumb.vue
  stores/jobs.ts           # Pinia store (fake in-memory for now)
  lib/types.ts
```

# DATA MODEL (types)

```ts
export type MediaKind = "video" | "audio" | "image";
export type JobState = "queued" | "running" | "paused" | "completed" | "failed" | "canceled";

export interface Job {
  id: string;
  kind: MediaKind;
  name: string;       // "sample-video-avi"
  sizeLabel: string;  // "2.28 MB"
  fromExt: string;    // "avi"
  toExt: string;      // "mp4" | "mkv" | "flac" | "tiff" etc.
  progress: number;   // 0..100
  state: JobState;
  canPause: boolean;
  canResume: boolean;
  canReveal: boolean;
}
```

# INTERACTIONS (stubbed)

* “Select file(s)” opens file picker (stub with fake jobs)
* Drag & drop onto dropzone appends jobs
* Global **FormatSelect** changes `toExt` for all jobs in current tab
* Per-job controls:

  * Pause/Resume toggle
  * Reveal (disabled icon as in mock)
  * Delete (X)
* Footer:

  * **Cancel**: sets all running to `canceled` (disabled if none running)
  * **Convert**: moves queued → running and animates progress
  * **Converting…**: when any `running`
* Clear link under list removes completed/failed
* Language menu: DropdownMenu with list [English, Spanish, French, German, Russian]
* Theme toggle: Button toggles dark via `class="dark"` on `html` (no custom CSS)

# LAYOUT REQUIREMENTS (match screenshots)

* App shell is a centered column max-w similar to 720–820 px; use utilities like `max-w-[820px] mx-auto p-6`
* Top bar: left tabs; right side has `LanguageMenu` then `ThemeToggle` in a compact row
* Under top bar, a **DropzoneCard** with dashed look made from shadcn `Card` + utilities (e.g., `border-dashed`)
* Below dropzone:

  * `PathBreadcrumb` (Users → jerome → Desktop or Test)
  * Right-aligned `FormatSelect` with label “Converts to:”
* `JobList` shows items with slight card feel using `Card` or simple flex rows + `Separator` between rows
* Footer sticky to bottom of view: left “Clear” ghost button; right group `[Cancel] [Convert/Converting…]`
* Provide **light and dark** screenshots parity: ensure `dark:` utilities for backgrounds/borders

# COMPONENT SPECS

## TopBar.vue

* Left: `Tabs` with triggers: Video, Audio, Image
* Right: `LanguageMenu` (globe icon + code “En”), `ThemeToggle` (sun/moon)
* Emits `update:activeTab`

## DropzoneCard.vue

* `Card` with `CardContent` containing:

  * Large upload icon and text “Drag and drop your {kind} files here or click here to select files for upload”
  * Primary `Button` “Select file(s)”
* Style using utilities only: center stack, `border-dashed`, padded
* Emits `selectFiles` and `dropped(files)`

## FormatSelect.vue

* Label: “Converts to:”
* `Select` with values depending on active tab:

  * Video: `["mp4","webm","mkv","mov","avi","wmv","flv","3gp"]`
  * Audio: `["flac","mp3","m4a","wav","ogg","opus"]`
  * Image: `["tiff","png","jpg","webp","bmp"]`

## PathBreadcrumb.vue

* Use shadcn `Breadcrumb` components to render `Users → jerome → Desktop` (accepts an array of segments)

## JobItem.vue

* Layout: left file-type icon, middle info, right controls
* Middle block:

  * Title (filename)
  * Secondary line: size dot separator “2.28 MB · Converting from avi to mkv”
  * `Progress` below with numeric percent on the right (use utilities to align)
* Right controls:

  * Circular icon button: Pause/Play depending on state
  * Disabled “reveal” icon button (as in mock, can be Tooltip “Reveal in Finder”)
  * Delete `X` icon button
* Use shadcn `Button` with `variant="ghost" size="icon"`
* Completed jobs show `CheckCircle2` icon; disabled Pause
* Failed jobs show `Badge` “Failed”

## JobList.vue

* `ScrollArea` wrapping the list
* Row separators using `Separator`
* “Clear” text button below list, left-aligned

## LanguageMenu.vue

* `DropdownMenu` triggered by a compact ghost button with `Globe` icon and “En”
* Items: English, Spanish, French, German, Russian
* Selecting changes current locale (store value only; no translations required)

## ThemeToggle.vue

* A single ghost icon button:

  * Sun when in light, Moon when in dark
* Toggles `document.documentElement.classList.toggle('dark')`

# PAGE: HoneymelonHome.vue (wire everything)

* Holds activeTab state: `"video" | "audio" | "image"`
* Holds global format state per tab
* Integrate `jobs` Pinia store with a few stub jobs to visualize all states:

  * Completed 100% (avi→mkv)
  * Running 64% (mov→mkv)
  * Queued 0% (wmv→mkv)
  * Audio tab: three completed to flac
  * Image tab: converting jpg→tiff items
* Footer button states:

  * **Cancel**: `variant="outline"`; `disabled` when no `running`
  * **Convert**: `variant="default"`; label switches to “Converting…” when any `running`

# ACCESSIBILITY

* Every icon button must have `aria-label`
* Use `Tooltip` for icon buttons (Pause/Resume/Delete/Reveal)

# DARK MODE

* Implement with Tailwind dark classes only (no extra CSS). Example:

  * container backgrounds: `bg-background`
  * borders: `border-border`
  * text colors: `text-foreground/80` where secondary
* Ensure dropzone, list rows, and footer have correct contrast in dark

# DELIVERABLES

* All SFCs compiled and runnable
* No custom CSS files or arbitrary CSS, only shadcn-vue + utilities
* Include minimal Pinia store `stores/jobs.ts` that simulates progress on “Convert”
* Provide a `HoneymelonHome.vue` page that renders the exact layout shown

# STARTING POINT (example skeleton)

Create `HoneymelonHome.vue` with:

* `TopBar` (tabs, language, theme)
* `DropzoneCard`
* Flex row with `PathBreadcrumb` (left) and `FormatSelect` (right)
* `JobList`
* Footer action bar with `Separator` above and right-aligned buttons

If anything is unspecified, choose the simplest approach that matches the mockups while strictly using shadcn-vue components and Tailwind utility classes—no custom CSS.

---

I want to build a MacOS Appl;ie Silicon only compatible Desktop app using Tauri 2.0, Vue.js, Vite, and, Shadcn-vue. I want to use FFMPEG for video and audio processing and build a Media converter app which will support conversion from and to multiple media formats video and audio while also shrinking the size as well as maintaining quality. I want a very clean, minimal design just simple as can be for users to easily convert their media files. Multiple file selection and drag-and-drop support would be great too. List of all ongoing conversions with progress bars and eta as well as media information would be ideal. And also parallel processing as well as making use of MacOS Applie Silicon GPU capabilities for faster conversions. Can you come up with a plan to build this app. Lets leave the UI out for now and focus on the architecture and functionality as well as the TypeScript bits as well. Break it down into steps with explanations for each step.

---

• Architecture Plan

* Establish Project Skeleton
  * Use Tauri 2 + Vite scaffolding, configure Vue 3 with <script setup> and shadcn-vue component registry (even if UI
        is placeholder).
  * Set up @ alias in vite.config.ts, enable Tailwind or basic CSS tokens. Keep src-tauri and src cleanly separated for
        Rust and frontend code.
* Define Core Domain Types (TypeScript)
  * Create src/lib/types.ts for shared models: containers, codecs, quality tiers, preset definition, probe summary, job
        state, progress snapshots, capability snapshot.
  * Export enums/union types for codecs and containers to drive both planner logic and UI without string literals spread
        around. Include discriminated unions for job state (queued | probing | planning | running | completed | failed
        | cancelled).
* Preset Catalog & Container Rules
  * Author src/lib/presets.ts with curated presets (MP4/H264, HEVC, WebM VP9/AV1, ProRes, audio-only, remux). Store tier
        defaults (bitrate, bufsize, profiles) and flags (remux-only, experimental).
  * Document container validation in src/lib/container-rules.ts: allowed video/audio/subtitle codecs, faststart
        requirements, special notes. These tables power validation and planner decisions.
* Capability Detection Layer
  * Rust (src-tauri/src/ffmpeg_capabilities.rs): run bundled/system ffmpeg -encoders/-formats/-hwaccels, parse into
        structured sets, cache to disk.
  * Expose Tauri command load_capabilities returning encoder/format/filter lists.
  * Frontend module src/lib/capability.ts: load once on startup, memoize, and expose helpers
        availablePresets(capabilities) and presetIsAvailable.
* Probe Pipeline
  * Rust probe_media command: spawn ffprobe with JSON output, normalize into ProbeSummary. Include stream selection,
        duration, resolution, fps, codecs, channels, color info, subtitle types.
  * Frontend src/lib/ffmpeg-probe.ts: invoke command, return { raw, summary }, with dev fallback when not in Tauri.
* Planner Engine (TypeScript)
  * Implement planJob(context: PlannerContext): PlannerDecision in src/lib/ffmpeg-plan.ts. Steps:
          1. Validate preset availability against capabilities + container rules.
          2. Determine stream strategy (full remux, copy video + transcode audio, re-encode video) based on probe summary and
             preset requirements.
          3. Construct ffmpeg argument array (maps, codec flags, bitrate/profile, -movflags +faststart, color metadata
             passthrough).
          4. Decide subtitle handling (convert/burn/drop) per preset.
          5. Emit warnings/notes (e.g., tier adjustments, missing HDR metadata).
  * Keep planner deterministic for unit tests.
* Job Queue & State Management (TypeScript)
  * Create Pinia store src/stores/jobs.ts:
    * Queue items holding file path, probe summary, preset ID, target tier, planner decision, progress metrics.
    * Actions: enqueue (files/folders), start next jobs respecting concurrency, cancel, clear completed.
    * Track aggregated stats for UI (active count, ETA).
  * Persist queue between runs if needed (optional using tauri-plugin-store or filesystem JSON later).
    1. Wire this store into a Pinia instance in your app entry and drive it via a job orchestrator composable.
    2. Connect planner/probe execution to the new actions so the queue advances automatically.
    3. Add persistence (tauri-plugin-store or file cache) for queue recovery between launches.
* Execution Worker (Rust)
  * Module src-tauri/src/ffmpeg_runner.rs:
    * Spawn ffmpeg with planned args, stream stderr lines.
    * Parse progress (time, fps, speed) and send via Tauri event channel (AppHandle::emit_to).
    * Handle cancellation via child kill signal.
    * Use Apple Silicon accelerators (VideoToolbox) through preset args; ensure binary built with required encoders.
  * Command start_job(job_id, args, output_path) returning immediately; progress events push updates, and completion
        event signals success/failure.
* Frontend Job Controller
  * Composable useJobOrchestrator:
    * Subscribe to Tauri events for job progress/completion.
    * Update Pinia store state.
    * Trigger planner + runner sequential steps (probe → plan → execute).
  * Provide dev-mode stubs to test without Rust backend (simulate progress).
* Parallelism & Resource Management
  * Configurable concurrency (default 2) stored in preferences store src/stores/prefs.ts.
  * Ensure runner respects limit to avoid overloading GPU/CPU; consider gating certain presets (ProRes, AV1) to 1
        concurrent job when hardware lacks acceleration.
  * On Rust side, maintain a job registry to reject additional starts past limit.
* File Discovery & Drag/Drop
  * Frontend utility to expand dropped folders via Tauri FS API (readDir) to gather media files before enqueue.
  * Implement duplicate detection and optional queue deduping by absolute path.
* Output Management
  * Define preferences for output directory, file naming (preset suffix, tier).
  * Rust runner resolves output path, ensures directories exist, handles temporary files before atomic rename.
* Error Handling & Logging
  * Standardize error codes (probe failure, unsupported streams, ffmpeg exit code) and surface them through Tauri
        responses.
  * Store per-job logs for later inspection (either tail ffmpeg stderr to disk or keep ring buffer).
  * Emit structured errors so frontend can display actionable messages.
* Testing Strategy
  * TypeScript: add Vitest unit tests for planner decisions with mocked probe summaries and capabilities.
  * Rust: use #[cfg(test)] for capability parser and ffprobe summary logic; integration tests gated behind feature flag.
  * Manual QA matrix: remux flows, transcoding hybrids, GPU-accelerated encodes, subtitle conversions, parallel jobs.
* Packaging & Distribution Prep
  * Configure Tauri bundle for arm64-only target, set hardened runtime, and placeholder updater config.
  * Document bundling of ffmpeg/ffprobe binaries under src-tauri/resources/bin/ with LGPL notices.
  * Provide script to regenerate capabilities after bundling.

---

# ROLE

You are a senior desktop engineer building **Honeymelon**, a macOS-only (Apple Silicon) media converter. Stack: **Tauri (Rust) + Vue 3 + Vite + TypeScript + shadcn-vue**. Engine: **FFmpeg/FFprobe** invoked **out-of-process**. UX is dead simple: drop files → pick preset → go. No power-user pages.

# OBJECTIVES

1. **Many-to-many conversions** (broad inputs → curated output presets).
2. **Remux-first**: copy streams when legal for the target container; transcode only when needed.
3. **LGPL-clean** shipping: bundled FFmpeg binary (arm64), no GPL/non-free, license notices included.
4. Tiny, fast, notarized macOS app with auto-updates.

# NON-NEGOTIABLES

* Platform: **macOS arm64 only**.
* FFmpeg/FFprobe run as child processes (no static linking).
* Prefer **VideoToolbox** for H.264/HEVC re-encode.
* No `--enable-gpl` or `--enable-nonfree`. Avoid x264/x265/fdk-aac.
* Presets over free-form flags; “just works” defaults.

# OUTPUT PRESET CATALOG (V1)

Implement as data (TS array). Each preset = container + codecs + quality tier defaults.

**Video**

* **MP4 | H.264 + AAC** (default “Compatible MP4”)
* **MP4 | HEVC + AAC** (smaller; Apple Silicon)
* **WebM | VP9 + Opus**
* **WebM | AV1 + Opus** *(Experimental; slow; hide if encoder missing)*
* **MOV | ProRes 422 HQ + PCM** (editing/archival)
* **MKV | Passthrough** (copy streams when allowed)
* **GIF** *(guard length/size; warn >20s)*

**Audio-only**

* **M4A (AAC)**, **MP3**, **FLAC**, **WAV**

**Remux utilities**

* **Remux → MP4**, **Remux → MKV**

**Quality tiers** per preset:

* **Fast** (remux-first; minimal transcode)
* **Balanced** (e.g., 1080p: H.264 5–7 Mbps, HEVC 3–5 Mbps, VP9 3–5 Mbps)
* **High** (higher bitrates / ProRes profile)

# RUNTIME DECISION ENGINE (Planner)

**Probe → Summarize → Validate → Plan → Args**

1. **Probe** with ffprobe (`-print_format json -show_streams -show_format`).
2. **Summarize**: duration, vcodec/acodec, width/height/fps, channels, text vs image subs, color info.
3. **Container rules** (table):

   * **MP4**: video {`h264`,`hevc`,`av1*`}, audio {`aac`,`alac`,`mp3`}, subs {`mov_text`} only.
   * **WebM**: video {`vp8`,`vp9`,`av1`}, audio {`opus`,`vorbis`}.
   * **MOV**: video {`h264`,`prores`}, audio {`aac`,`pcm_s16le`}.
   * **MKV**: “any”.
4. **Decision**:

   * If input streams conform → **remux** (`-c copy`), convert text subs when needed.
   * If video OK but audio not → **copy video**, **transcode audio** to preset codec.
   * Else → **re-encode video** using:

     * `h264_videotoolbox` / `hevc_videotoolbox` (MP4/MOV),
     * `libvpx-vp9` (WebM VP9) / `libaom-av1` (WebM AV1) **only if encoders exist**.
5. **Subtitles**:

   * Text (srt/ass) → `mov_text` for MP4; keep in MKV; drop/burn for WebM/MOV (v1).
   * Image (pgs) → “Burn-in” toggle (`-vf subtitles=input`).
6. Always add `-movflags +faststart` for MP4/MOV.
7. Forward color/HDR metadata if re-encoding HEVC (`-color_primaries`/`-color_trc`/`-colorspace`).

# CAPABILITY DETECTION (Runtime)

On first run, execute `ffmpeg -codecs -encoders -formats -filters` → parse to `capabilities.json`.

* Grey-out presets whose encoders aren’t present (e.g., AV1/VP9).
* Planner checks both **container rules** and **capabilities** before choosing args.

# BUNDLED FFmpeg BUILDS (LGPL-safe)

Place binaries in `src-tauri/resources/bin/` (arm64). Provide **two build options**; app works with either:

* **Base**: `videotoolbox`, native `aac`, `alac`, `flac`, `pcm`, `prores_ks`.
* **Enhanced** (still LGPL-compatible): add `libvpx`(VP9), `libaom`(AV1), `libopus`, `libvorbis`, `libmp3lame`.
  If an encoder is missing, preset is disabled automatically.

# PROJECT STRUCTURE

```
apps/desktop/
  src/
    lib/
      ffmpeg-probe.ts         // shell out to ffprobe
      ffmpeg-plan.ts          // container rules, planner, arg builder
      ffmpeg-progress.ts      // parse stderr → {seconds,fps,speed,eta}
      capability.ts           // read capabilities.json
      container-rules.ts      // hard-coded constraints
    stores/
      jobs.ts                 // Pinia queue (2 concurrent), cancel, persist
      prefs.ts                // output dir, default preset, ffmpeg path
    components/
      Dropzone.vue | JobCard.vue | PresetPicker.vue | ProgressBar.vue
      SubtitleOptions.vue | OutputOptions.vue
    pages/ Home.vue | Settings.vue | Licenses.vue
  src-tauri/
    src/ main.rs | ffmpeg.rs (spawn/kill) | probe.rs (ffprobe wrapper)
    tauri.conf.json
    resources/bin/{ffmpeg,ffprobe}
scripts/
  check-ffmpeg-capabilities.ts
.github/workflows/release.yml
LICENSES/FFMPEG-LGPL.txt
THIRD_PARTY_NOTICES.md
```

# CORE TS TYPES (essentials)

```ts
export type Container = "mp4"|"webm"|"mov"|"mkv"|"gif"|"m4a"|"mp3"|"flac"|"wav";
export type VCodec = "copy"|"h264"|"hevc"|"vp9"|"av1"|"prores"|"none";
export type ACodec = "copy"|"aac"|"alac"|"mp3"|"opus"|"vorbis"|"flac"|"pcm_s16le"|"none";
export type Tier = "fast"|"balanced"|"high";
export type SubMode = "keep"|"convert"|"burn"|"drop";

export interface Preset {
  id: string; label: string; container: Container;
  video: { codec: VCodec; tier?: Tier };
  audio: { codec: ACodec; bitrateK?: number; stereoOnly?: boolean };
  subs?: { mode: SubMode };
  experimental?: boolean;
}

export interface ProbeSummary {
  durationSec: number; width?: number; height?: number; fps?: number;
  vcodec?: string; acodec?: string;
  hasTextSubs?: boolean; hasImageSubs?: boolean;
  channels?: number;
  color?: { primaries?: string; trc?: string; space?: string };
}
```

# ARG BUILDER (sketch)

* Map preset → base args (`-map 0:v:0? -map 0:a:0? -map 0:s?`).
* Subs: `mov_text` (MP4), burn-in if requested, else drop for WebM/MOV by default.
* **Video args**:

  * `h264` → `-c:v h264_videotoolbox -b:v <tier> -maxrate ... -bufsize ...`
  * `hevc` → `-c:v hevc_videotoolbox ...`
  * `vp9`  → `-c:v libvpx-vp9 -b:v <tier> --cpu-used 4` (only if available)
  * `av1`  → `-c:v libaom-av1 -b:v <tier>` (only if available)
  * `prores` → `-c:v prores_ks -profile:v 3`
  * `copy` → `-c:v copy`
* **Audio args**:

  * `aac` → `-c:a aac -b:a 160k -ac 2`
  * `mp3` → `-c:a libmp3lame -b:a 160k -ac 2` (if available)
  * `opus` → `-c:a libopus -b:a 128k -ac 2` (if available)
  * `vorbis` → `-c:a libvorbis -q:a 4` (if available)
  * `flac` → `-c:a flac`
  * `pcm_s16le` → `-c:a pcm_s16le`
  * `copy` → `-c:a copy`
* Append `-movflags +faststart` for MP4/MOV; write `outputPath`.

# UX REQUIREMENTS

* Drop files/folders; auto-expand into jobs.
* Preset picker per job (defaults to **MP4 | H.264/AAC (Balanced)**).
* Optional toggles: **Burn-in image subs**, **Open folder after convert**.
* Job cards: progress (%/ETA/fps/speed), cancel, reveal-in-Finder, log.
* Settings: output dir, ffmpeg/ffprobe path (auto vs custom), concurrency (default 2), enable experimental presets.

# LEGAL / DISTRIBUTION

* Bundle FFmpeg **out-of-process** binary; include **LGPL license** & **THIRD_PARTY_NOTICES.md**.
* Exclude GPL/non-free codecs (x264/x265/fdk-aac).
* Prefer Apple **VideoToolbox** for H.264/HEVC.
* Provide “Use system FFmpeg” option; still show capabilities-based preset gating.

# PIPELINE

* `tauri.conf.json`: arm64 target, hardened runtime, updater config placeholder.
* GitHub Actions (`macos-14`): build arm64, sign/notarize if secrets exist; else unsigned DMG/ZIP.
* Post-build: write `capabilities.json`.

# TEST MATRIX

1. Remux: `mkv(h264+aac)` → `mp4` (copy all).
2. Copy-video, transcode-audio: `mkv(h264+ac3)` → `mp4(aac)`.
3. Re-encode video: `webm(vp9+opus)` → `mp4(h264+aac)` using VideoToolbox.
4. WebM: `mp4(h264+aac)` → `webm(vp9+opus)` (disable if no libvpx).
5. ProRes: `mp4(h264)` → `mov(prores+pcm)`.
6. Audio-only: `mp4` → `m4a/mp3/flac/wav`.
7. Subtitles: `srt/ass` → `mov_text`; `pgs` burn-in ON/OFF.
8. Large files, unicode paths, cancel mid-job, queue >5 items, capability-gating works.

# FIRST TASKS FOR YOU

1. Scaffold the repo and pages/components.
2. Implement **probe → summarize → plan → args** and Tauri spawn/kill + progress events.
3. Implement **capability detection** and preset gating.
4. Ship the preset catalog and tiers; wire UI.
5. Build release workflow and notices; write README with supported conversions.

If anything is unspecified, choose the simplest **LGPL-safe** option and move forward—don’t stall.
