# Technical Roadmap for Honeymelon

**Date:** December 1, 2024  
**Purpose:** Actionable technical recommendations to increase product value and justify pricing

---

## Overview

This document outlines **specific technical improvements** to transform Honeymelon from a solid v0.0.1 into a **premium product** worth $29.99-$49.99. These recommendations are prioritized by **impact vs. effort** and organized into implementation phases.

---

## Current Technical State

### Strengths ✅

- Clean, well-architected codebase
- Comprehensive test coverage (639 tests)
- Modern tech stack (Vue 3, Tauri 2, Rust, TypeScript)
- Good documentation
- Solid CI/CD pipeline
- Type-safe state management

### Gaps 🔴

- No video preview capability
- No visual editing features
- Limited automation
- No AI-powered enhancements
- No advanced batch operations
- Basic preset system (not user-customizable)

---

## Impact vs. Effort Matrix

```
High Impact
    │
    │  AI Upscaling          Watch Folders
    │       ⚡                    ⚡
    │
    │  Video Preview        Batch Templates
    │       💡                    💡
    │
    │─────────────────────────────────────► Low Effort
    │
    │  Cloud Sync           Advanced Editing
    │       ⚠️                    ⚠️
    │
Low Impact

Legend:
⚡ Priority 1 (High Impact, Lower Effort)
💡 Priority 2 (High Impact, Higher Effort)
⚠️ Priority 3 (Lower Impact or Higher Effort)
```

---

## Phase 1: Quick Wins (1-2 Months)

### 1.1 Video Preview & Thumbnails ⚡

**Why:** Users want to see what they're converting  
**Impact:** HIGH — Reduces conversion errors, builds confidence  
**Effort:** MEDIUM — FFmpeg already generates thumbnails

**Implementation:**

```typescript
// Add to src/lib/ffmpeg-thumbnail.ts
interface ThumbnailOptions {
  inputPath: string;
  timestamp?: number; // seconds, default: 1
  width?: number; // default: 320
}

async function generateThumbnail(options: ThumbnailOptions): Promise<string> {
  // Use FFmpeg: ffmpeg -i input.mp4 -ss 1 -vframes 1 -vf scale=320:-1 thumb.jpg
  // Return base64 data URL or temp file path
}
```

**UI Changes:**

- Add thumbnail to job queue items
- Show source/target file info (codec, resolution, bitrate)
- Preview modal with larger thumbnail

**Estimated Time:** 1-2 weeks  
**Value Add:** $5-10 perceived value increase

---

### 1.2 Before/After Comparison ⚡

**Why:** Users want to know file size savings  
**Impact:** HIGH — Shows tangible value of remux-first  
**Effort:** LOW — Just file size calculations

**Implementation:**

```typescript
// Add to job state
interface ConversionResult {
  inputSize: number;
  outputSize: number;
  savings: number; // percentage
  duration: number; // conversion time
  speed: string; // "3.2x realtime"
}

// Display in completed jobs
function formatSavings(result: ConversionResult): string {
  if (result.savings > 0) {
    return `Reduced by ${result.savings}% (${formatBytes(result.inputSize - result.outputSize)})`;
  } else {
    return `Quality preserved (remuxed)`;
  }
}
```

**UI Changes:**

- Add savings badge to completed jobs
- Show speed (e.g., "3.2x realtime")
- Summary stats: total time saved, total space saved

**Estimated Time:** 3-5 days  
**Value Add:** $3-5 perceived value increase

---

### 1.3 Custom Preset Editor 💡

**Why:** Power users want control  
**Impact:** HIGH — Differentiates from simple tools  
**Effort:** MEDIUM — UI + validation logic

**Implementation:**

```typescript
// Add to src/lib/types.ts
interface CustomPreset extends Preset {
  isCustom: true;
  author: 'user';
  createdAt: number;
  lastUsed: number;
}

// Add to src/stores/prefs.ts
interface PresetEditorState {
  presets: CustomPreset[];
}

// Methods
function createCustomPreset(base: Preset, overrides: Partial<Preset>): CustomPreset;
function saveCustomPreset(preset: CustomPreset): void;
function deleteCustomPreset(id: string): void;
function exportPresets(): string; // JSON
function importPresets(json: string): CustomPreset[];
```

**UI Changes:**

- "Edit Preset" button in preset selector
- Modal with codec, bitrate, quality, filter options
- Import/export preset library
- Preset management screen

**Estimated Time:** 2-3 weeks  
**Value Add:** $10-15 perceived value increase

---

### 1.4 Conversion History & Stats 💡

**Why:** Users want to track their usage  
**Impact:** MEDIUM — Nice to have, shows value over time  
**Effort:** LOW — Just persistence + UI

**Implementation:**

```typescript
// Add to src/stores/history.ts
interface ConversionHistory {
  id: string;
  date: number;
  inputPath: string;
  outputPath: string;
  preset: string;
  duration: number;
  inputSize: number;
  outputSize: number;
  success: boolean;
}

// Aggregate stats
interface HistoryStats {
  totalConversions: number;
  totalTimeSaved: string; // "3.5 hours"
  totalSpaceSaved: string; // "12.3 GB"
  averageSpeed: string; // "2.8x realtime"
  mostUsedPreset: string;
}
```

**UI Changes:**

- History tab/modal
- Statistics dashboard
- Re-convert from history
- Search/filter history

**Estimated Time:** 1 week  
**Value Add:** $3-5 perceived value increase

---

## Phase 2: Premium Features (2-4 Months)

### 2.1 Video Trimming & Cutting ⚡

**Why:** Essential for workflow, competitors have it  
**Impact:** VERY HIGH — Often requested feature  
**Effort:** MEDIUM — Timeline UI + FFmpeg args

**Implementation:**

```typescript
// Add to src/lib/types.ts
interface TrimOptions {
  start?: number; // seconds
  end?: number; // seconds
  duration?: number; // alternative to end
}

// Update preset to include trim
interface PresetWithTrim extends Preset {
  trim?: TrimOptions;
}

// FFmpeg args: -ss START -to END or -t DURATION
function buildTrimArgs(trim: TrimOptions): string[] {
  const args: string[] = [];
  if (trim.start) args.push('-ss', trim.start.toString());
  if (trim.end) args.push('-to', trim.end.toString());
  else if (trim.duration) args.push('-t', trim.duration.toString());
  return args;
}
```

**UI Changes:**

- Timeline scrubber with in/out points
- Preview at trim points
- Quick presets (first 10s, last 10s, etc.)
- Multiple segments (future enhancement)

**Estimated Time:** 3-4 weeks  
**Value Add:** $15-20 perceived value increase

---

### 2.2 Basic Video Filters 💡

**Why:** Common workflow needs  
**Impact:** HIGH — Matches HandBrake feature parity  
**Effort:** MEDIUM — FFmpeg filter strings + UI

**Implementation:**

```typescript
// Add to src/lib/types.ts
interface VideoFilters {
  rotate?: 90 | 180 | 270;
  flip?: 'horizontal' | 'vertical';
  crop?: { x: number; y: number; width: number; height: number };
  scale?: { width: number; height: number };
  deinterlace?: boolean;
  denoise?: 'light' | 'medium' | 'strong';
}

// FFmpeg filter chain
function buildFilterString(filters: VideoFilters): string {
  const filterParts: string[] = [];

  if (filters.rotate) {
    filterParts.push(`rotate=${(filters.rotate * Math.PI) / 180}`);
  }
  if (filters.flip === 'horizontal') {
    filterParts.push('hflip');
  }
  if (filters.flip === 'vertical') {
    filterParts.push('vflip');
  }
  if (filters.crop) {
    const { x, y, width, height } = filters.crop;
    filterParts.push(`crop=${width}:${height}:${x}:${y}`);
  }
  if (filters.scale) {
    filterParts.push(`scale=${filters.scale.width}:${filters.scale.height}`);
  }
  if (filters.deinterlace) {
    filterParts.push('yadif');
  }
  if (filters.denoise) {
    const levels = { light: 1, medium: 3, strong: 5 };
    filterParts.push(`hqdn3d=${levels[filters.denoise]}`);
  }

  return filterParts.join(',');
}
```

**UI Changes:**

- Filters panel in job editor
- Visual crop tool (overlay on thumbnail)
- Rotation buttons (90°, 180°, 270°)
- Denoise slider
- Before/after preview

**Estimated Time:** 3-4 weeks  
**Value Add:** $15-20 perceived value increase

---

### 2.3 Batch Templates & Automation 💡

**Why:** Power users need repeatable workflows  
**Impact:** HIGH — Pro feature that free tools lack  
**Effort:** MEDIUM — Template system + scheduling

**Implementation:**

```typescript
// Add to src/lib/types.ts
interface BatchTemplate {
  id: string;
  name: string;
  description?: string;
  preset: string;
  tier: QualityTier;
  filters?: VideoFilters;
  trim?: TrimOptions;
  outputDirectory?: string;
  fileNamePattern?: string; // e.g., "{name}_converted.{ext}"
  createdAt: number;
}

// Template matching
interface TemplateRule {
  fileExtension?: string[];
  fileSize?: { min?: number; max?: number };
  resolution?: { min?: number; max?: number };
  applyTemplate: string; // template ID
}

// Auto-apply templates based on rules
function findMatchingTemplate(file: FileInfo, rules: TemplateRule[]): string | null {
  for (const rule of rules) {
    if (matchesRule(file, rule)) {
      return rule.applyTemplate;
    }
  }
  return null;
}
```

**UI Changes:**

- Template manager
- Save current settings as template
- Apply template to multiple files
- Auto-apply rules configuration
- Template marketplace (future: community templates)

**Estimated Time:** 2-3 weeks  
**Value Add:** $10-15 perceived value increase

---

### 2.4 Watch Folder Automation ⚡

**Why:** Pro users want unattended conversions  
**Impact:** VERY HIGH — Killer feature for professionals  
**Effort:** MEDIUM — File watcher + auto-processing

**Implementation:**

```typescript
// Add to src-tauri/src/watcher.rs
use notify::{Watcher, RecursiveMode, Event};

pub struct FolderWatcher {
    path: PathBuf,
    template: String,
    watcher: RecommendedWatcher,
}

impl FolderWatcher {
    pub fn new(path: PathBuf, template: String) -> Result<Self> {
        let watcher = notify::recommended_watcher(|res: Result<Event>| {
            if let Ok(event) = res {
                handle_file_event(event);
            }
        })?;

        Ok(Self { path, template, watcher })
    }

    pub fn start(&mut self) -> Result<()> {
        self.watcher.watch(&self.path, RecursiveMode::Recursive)?;
        Ok(())
    }
}

fn handle_file_event(event: Event) {
    // Check if it's a media file
    // Apply template
    // Add to queue
    // Start conversion
}
```

**Frontend Integration:**

```typescript
// Add to src/stores/watchers.ts
interface WatchFolder {
  id: string;
  path: string;
  template: string;
  enabled: boolean;
  processSubfolders: boolean;
  deleteSource?: boolean;
  outputDirectory?: string;
}

// Tauri commands
async function addWatchFolder(config: WatchFolder): Promise<void>;
async function removeWatchFolder(id: string): Promise<void>;
async function toggleWatchFolder(id: string, enabled: boolean): Promise<void>;
```

**UI Changes:**

- Watch Folders tab in preferences
- Add/edit/remove watch folders
- Status indicators (active, paused, error)
- Processing log

**Estimated Time:** 2-3 weeks  
**Value Add:** $20-30 perceived value increase

---

## Phase 3: Game-Changing Features (4-6 Months)

### 3.1 AI-Powered Video Upscaling 💡

**Why:** Unique feature that free tools can't match  
**Impact:** VERY HIGH — Premium differentiator  
**Effort:** HIGH — Integration with ML models

**Implementation Options:**

**Option A: Cloud-based (easier, recurring cost)**

```typescript
// Integration with Real-ESRGAN or similar API
async function upscaleVideo(inputPath: string, scale: 2 | 4, apiKey: string): Promise<string> {
  // Upload to service
  // Wait for processing
  // Download result
  // Note: Requires internet, usage limits
}
```

**Option B: Local ML (harder, one-time cost)**

```rust
// Using ONNX Runtime or CoreML
use ort::Session;

pub struct VideoUpscaler {
    model: Session,
}

impl VideoUpscaler {
    pub fn upscale_frame(&self, frame: &[u8]) -> Result<Vec<u8>> {
        // Run inference on frame
        // Return upscaled frame
    }
}
```

**Features:**

- 2x or 4x upscaling
- Frame-by-frame processing
- Progress tracking
- Quality comparison
- GPU acceleration

**UI Changes:**

- AI Upscale preset option
- Scale factor selector (2x, 4x)
- Preview comparison
- Time estimate (AI is slow)

**Estimated Time:** 6-8 weeks  
**Value Add:** $30-50 perceived value increase  
**Note:** This alone could justify $49.99+ pricing

---

### 3.2 Scene Detection & Auto-Splitting 💡

**Why:** Useful for content creators  
**Impact:** HIGH — Unique workflow feature  
**Effort:** MEDIUM — FFmpeg scene detection

**Implementation:**

```typescript
// Use FFmpeg scene detection filter
async function detectScenes(inputPath: string): Promise<number[]> {
  // ffmpeg -i input.mp4 -filter:v "select='gt(scene,0.3)',showinfo" -f null -
  // Parse timestamps from output
  // Return array of scene change timestamps
}

interface SceneSplit {
  scenes: number[]; // timestamps
  outputPattern: string; // e.g., "scene_{n}.mp4"
  minDuration?: number; // ignore scenes shorter than this
}

async function splitByScenes(inputPath: string, config: SceneSplit): Promise<string[]> {
  // Split video at scene boundaries
  // Return array of output file paths
}
```

**UI Changes:**

- "Detect Scenes" button
- Scene list with thumbnails
- Select which scenes to export
- Auto-naming pattern

**Estimated Time:** 2-3 weeks  
**Value Add:** $10-15 perceived value increase

---

### 3.3 Watermarking & Branding ⚡

**Why:** Content creators need this  
**Impact:** HIGH — Common workflow need  
**Effort:** MEDIUM — FFmpeg overlay filter

**Implementation:**

```typescript
interface WatermarkOptions {
  type: 'image' | 'text';
  image?: string; // path to watermark image
  text?: string; // text to overlay
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  opacity?: number; // 0-100
  scale?: number; // for images
  fontFamily?: string; // for text
  fontSize?: number; // for text
  color?: string; // for text
}

function buildWatermarkFilter(options: WatermarkOptions): string {
  if (options.type === 'image') {
    // overlay=x=W-w-10:y=H-h-10:alpha=0.5
    const positions = {
      'top-left': '10:10',
      'top-right': 'W-w-10:10',
      'bottom-left': '10:H-h-10',
      'bottom-right': 'W-w-10:H-h-10',
      center: '(W-w)/2:(H-h)/2',
    };
    return `[0:v][1:v]overlay=${positions[options.position]}:alpha=${options.opacity / 100}[out]`;
  } else {
    // drawtext filter
    return `drawtext=text='${options.text}':x=10:y=10:fontsize=${options.fontSize}:fontcolor=${options.color}`;
  }
}
```

**UI Changes:**

- Watermark editor
- Upload logo
- Position selector (drag on preview)
- Opacity slider
- Text editor for text watermarks
- Preview with watermark

**Estimated Time:** 2-3 weeks  
**Value Add:** $10-15 perceived value increase

---

## Phase 4: Ecosystem Features (6-12 Months)

### 4.1 Cloud Storage Integration 💡

**Why:** Modern workflow expects cloud  
**Impact:** MEDIUM — Nice to have  
**Effort:** HIGH — OAuth + multiple APIs

**Implementation:**

```typescript
interface CloudProvider {
  id: 'dropbox' | 'gdrive' | 's3' | 'onedrive';
  name: string;
  authenticate: () => Promise<CloudAuth>;
  upload: (file: string, path: string) => Promise<string>;
  download: (path: string) => Promise<string>;
}

interface CloudSettings {
  provider: CloudProvider;
  autoUpload: boolean;
  uploadDirectory: string;
  deleteLocal: boolean;
}

async function uploadAfterConversion(outputPath: string, settings: CloudSettings): Promise<void> {
  await settings.provider.upload(outputPath, settings.uploadDirectory);
  if (settings.deleteLocal) {
    await fs.remove(outputPath);
  }
}
```

**Supported Services:**

- Dropbox
- Google Drive
- Amazon S3
- OneDrive
- iCloud Drive (native macOS)

**UI Changes:**

- Cloud settings in preferences
- OAuth login flows
- Upload progress
- Cloud status in job queue

**Estimated Time:** 4-6 weeks  
**Value Add:** $5-10 perceived value increase

---

### 4.2 Command-Line Interface 💡

**Why:** Power users and automation  
**Impact:** MEDIUM — Different audience  
**Effort:** LOW — Just expose Tauri commands

**Implementation:**

```bash
# CLI wrapper using Tauri CLI
honeymelon convert \
  --input video.mp4 \
  --preset mp4-h264 \
  --tier balanced \
  --output converted.mp4

# Batch mode
honeymelon convert --batch *.mov --preset mov-h264

# With template
honeymelon convert --template "youtube-1080p" --input video.mp4

# Watch folder
honeymelon watch --folder ~/Videos/incoming --template "compress-h264"
```

**Implementation:**

```typescript
// Add to src-tauri/src/cli.rs
use clap::{Parser, Subcommand};

#[derive(Parser)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    Convert {
        #[arg(short, long)]
        input: PathBuf,
        #[arg(short, long)]
        preset: String,
        #[arg(short, long)]
        output: Option<PathBuf>,
    },
    Watch {
        #[arg(short, long)]
        folder: PathBuf,
        #[arg(short, long)]
        template: String,
    },
}
```

**Estimated Time:** 1-2 weeks  
**Value Add:** $5-10 perceived value increase

---

### 4.3 API for Developers 💡

**Why:** Enable third-party integrations  
**Impact:** LOW-MEDIUM — Niche use case  
**Effort:** MEDIUM — REST API + documentation

**Implementation:**

```typescript
// Local REST API server
import express from 'express';

const app = express();

// POST /api/jobs
app.post('/api/jobs', async (req, res) => {
  const { input, preset, tier } = req.body;
  const jobId = await createJob(input, preset, tier);
  res.json({ jobId });
});

// GET /api/jobs/:id
app.get('/api/jobs/:id', async (req, res) => {
  const job = await getJob(req.params.id);
  res.json(job);
});

// GET /api/jobs/:id/status
app.get('/api/jobs/:id/status', async (req, res) => {
  const status = await getJobStatus(req.params.id);
  res.json(status);
});

// Start server on localhost:3000
app.listen(3000);
```

**Use Cases:**

- Workflow automation (Shortcuts, Automator)
- Third-party app integration
- Custom scripting

**Estimated Time:** 2-3 weeks  
**Value Add:** $3-5 perceived value increase

---

## Feature Value Summary

| Feature                     | Effort | Impact     | Time         | Value Add  |
| --------------------------- | ------ | ---------- | ------------ | ---------- |
| **Phase 1 (Quick Wins)**    |        |            | **2 months** | **$30-40** |
| Video Preview               | Medium | High       | 1-2 weeks    | $5-10      |
| Before/After Stats          | Low    | High       | 3-5 days     | $3-5       |
| Custom Presets              | Medium | High       | 2-3 weeks    | $10-15     |
| History & Stats             | Low    | Medium     | 1 week       | $3-5       |
| **Phase 2 (Premium)**       |        |            | **3 months** | **$60-85** |
| Video Trimming              | Medium | Very High  | 3-4 weeks    | $15-20     |
| Video Filters               | Medium | High       | 3-4 weeks    | $15-20     |
| Batch Templates             | Medium | High       | 2-3 weeks    | $10-15     |
| Watch Folders               | Medium | Very High  | 2-3 weeks    | $20-30     |
| **Phase 3 (Game-Changers)** |        |            | **4 months** | **$50-80** |
| AI Upscaling                | High   | Very High  | 6-8 weeks    | $30-50     |
| Scene Detection             | Medium | High       | 2-3 weeks    | $10-15     |
| Watermarking                | Medium | High       | 2-3 weeks    | $10-15     |
| **Phase 4 (Ecosystem)**     |        |            | **3 months** | **$15-25** |
| Cloud Integration           | High   | Medium     | 4-6 weeks    | $5-10      |
| CLI                         | Low    | Medium     | 1-2 weeks    | $5-10      |
| API                         | Medium | Low-Medium | 2-3 weeks    | $3-5       |

**Total Value Add:** $155-230  
**Total Implementation Time:** 12 months  
**Current Value:** $19.99  
**Target Value:** $49.99-$69.99 (after all phases)

---

## Recommended Implementation Order

### Months 1-2 (Pre-Launch Polish)

1. ✅ Video Preview & Thumbnails
2. ✅ Before/After Comparison
3. ✅ Conversion History
4. ✅ Marketing materials (screenshots, videos)

**Result:** Launch-ready product with better UX

---

### Months 3-5 (Pro Feature Push)

1. ✅ Custom Preset Editor
2. ✅ Video Trimming
3. ✅ Watch Folder Automation
4. ✅ Batch Templates

**Result:** Pro tier becomes compelling

---

### Months 6-9 (Premium Differentiation)

1. ✅ AI Upscaling (biggest feature)
2. ✅ Video Filters (crop, rotate, etc.)
3. ✅ Watermarking
4. ✅ Scene Detection

**Result:** Clear leader in Mac media conversion

---

### Months 10-12 (Ecosystem Expansion)

1. ✅ Cloud Storage Integration
2. ✅ Command-Line Interface
3. ✅ API for Developers
4. ✅ Plugin system (future)

**Result:** Platform, not just a tool

---

## Pricing Evolution

| Version              | Features                           | Price  | Justification        |
| -------------------- | ---------------------------------- | ------ | -------------------- |
| **v0.0.1** (Current) | Basic conversion + remux-first     | $19.99 | Compete with Permute |
| **v0.1.0** (Phase 1) | + Preview, History, Stats          | $19.99 | Polish launch        |
| **v0.2.0** (Phase 2) | + Trimming, Filters, Watch Folders | $29.99 | Pro features         |
| **v0.3.0** (Phase 3) | + AI Upscaling, Watermarking       | $39.99 | Game-changer         |
| **v1.0.0** (Phase 4) | + Cloud, CLI, API                  | $49.99 | Full platform        |

**Freemium Limits by Version:**

| Version | Free Tier                       | Pro Tier                 |
| ------- | ------------------------------- | ------------------------ |
| v0.0.1  | 5 conversions/day, basic codecs | Unlimited, all codecs    |
| v0.1.0  | + No history, no preview        | + History, preview       |
| v0.2.0  | + No trimming, no filters       | + All editing features   |
| v0.3.0  | + No AI upscaling               | + AI features            |
| v1.0.0  | + No cloud, no automation       | + Cloud, automation, API |

---

## Technical Debt to Address

### Critical 🔴

1. **Add comprehensive E2E tests** — Current testing is mostly unit tests
2. **Improve error handling** — Better user-facing error messages
3. **Add telemetry (opt-in)** — Understand how users actually use the app
4. **Performance profiling** — Optimize slow operations

### Important 🟡

1. **Localization** — Support more languages beyond English
2. **Accessibility** — Keyboard navigation, screen reader support
3. **Dark mode polish** — Some components need refinement
4. **Reduce bundle size** — Current build is ~50MB, could be smaller

### Nice to Have 🟢

1. **Plugin system architecture** — Allow third-party extensions
2. **Preset marketplace** — Share presets between users
3. **Analytics dashboard** — Show usage patterns (local only)
4. **Crash reporting** — Better debugging for production issues

---

## Success Metrics

### Technical KPIs

- **Test Coverage:** >80% (currently ~75%)
- **Build Time:** <2 minutes (currently ~3 minutes)
- **Bundle Size:** <40MB (currently ~50MB)
- **Startup Time:** <2 seconds
- **Memory Usage:** <200MB idle
- **Crash Rate:** <0.1%

### Product KPIs

- **Conversion Success Rate:** >95%
- **Average Conversion Speed:** >1.5x realtime
- **Remux Success Rate:** >60% (depends on input)
- **User Retention:** >40% at 30 days
- **Free to Pro Conversion:** >10%

---

## Conclusion

Honeymelon has **excellent technical foundations** but needs **premium features** to justify higher pricing. The roadmap above provides a clear path from $19.99 to $49.99+ over 12 months.

### Key Takeaways:

1. **Phase 1 (Months 1-2):** Polish for launch — $19.99
2. **Phase 2 (Months 3-5):** Add pro features — $29.99
3. **Phase 3 (Months 6-9):** AI & differentiation — $39.99
4. **Phase 4 (Months 10-12):** Platform features — $49.99

**Priority Features:**

1. ⚡ AI Upscaling (game-changer)
2. ⚡ Watch Folder Automation (pro feature)
3. ⚡ Video Trimming (table stakes)
4. 💡 Custom Presets (power users)
5. 💡 Video Preview (UX polish)

**Start here, iterate based on user feedback, and grow the value over time.**

---

**End of Technical Roadmap**
