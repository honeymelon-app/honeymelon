# FFmpeg Bundling Implementation

This document describes the FFmpeg bundling implementation for Honeymelon.

## Overview

Honeymelon bundles FFmpeg and FFprobe binaries directly into the macOS app bundle, eliminating the need for users to install FFmpeg separately. The app automatically detects and uses the bundled binaries, with fallback to system FFmpeg if needed.

## Architecture

### 1. Download Script (`scripts/download-ffmpeg.sh`)

A bash script that:

- Downloads pre-built FFmpeg and FFprobe binaries for Apple Silicon from evermeet.cx
- Extracts them using 7z (auto-installs via Homebrew if needed)
- Places binaries in `src-tauri/resources/bin/`
- Verifies architecture and code signature
- Supports re-downloading and version checking

**Usage:**

```bash
npm run download-ffmpeg
```

The script is also automatically run during `npm install` via the `postinstall` hook (with graceful failure).

### 2. Resource Configuration (`src-tauri/tauri.conf.json`)

The Tauri configuration includes the binaries as bundled resources:

```json
{
  "bundle": {
    "resources": ["resources/bin/ffmpeg", "resources/bin/ffprobe"]
  }
}
```

During the build process, Tauri copies these files into the app bundle at:
`Honeymelon.app/Contents/Resources/bin/{ffmpeg,ffprobe}`

### 3. Runtime Detection (Rust)

The Rust backend automatically detects bundled binaries with priority fallback:

**FFmpeg Detection** (`src-tauri/src/ffmpeg_capabilities.rs`):

```rust
pub fn candidate_ffmpeg_paths(app: &AppHandle) -> Vec<OsString> {
    let mut candidates: Vec<OsString> = Vec::new();

    // Priority 1: Bundled binary
    if let Ok(resource_dir) = app.path().resource_dir() {
        let bundled = resource_dir.join("bin/ffmpeg");
        if bundled.exists() && bundled.is_file() {
            candidates.push(bundled.into_os_string());
        }
    }

    // Priority 2: System binary (fallback)
    candidates.push(OsString::from("ffmpeg"));
    candidates
}
```

**FFprobe Detection** (`src-tauri/src/ffmpeg_probe.rs`):

```rust
fn candidate_ffprobe_paths(app: &AppHandle) -> Vec<OsString> {
    let mut candidates: Vec<OsString> = Vec::new();

    // Priority 1: Bundled binary
    if let Ok(resource_dir) = app.path().resource_dir() {
        let bundled = resource_dir.join("bin/ffprobe");
        if bundled.exists() && bundled.is_file() {
            candidates.push(bundled.into_os_string());
        }
    }

    // Priority 2: System binary (fallback)
    candidates.push(OsString::from("ffprobe"));
    candidates
}
```

The detection logic:

1. Checks for bundled binary first (in app's Resources directory)
2. Falls back to system PATH if bundled binary not found
3. Iterates through candidates until one succeeds

## Directory Structure

```
honeymelon/
├── scripts/
│   └── download-ffmpeg.sh          # Download script
├── src-tauri/
│   ├── resources/
│   │   ├── .gitignore              # Ignore downloaded binaries
│   │   └── bin/
│   │       ├── .gitkeep            # Keep directory in git
│   │       ├── README.md           # Instructions
│   │       ├── ffmpeg              # Downloaded (not in git)
│   │       └── ffprobe             # Downloaded (not in git)
│   ├── src/
│   │   ├── ffmpeg_capabilities.rs  # FFmpeg detection
│   │   ├── ffmpeg_probe.rs         # FFprobe detection
│   │   └── ffmpeg_runner.rs        # FFmpeg execution
│   └── tauri.conf.json             # Bundle configuration
├── package.json                     # npm scripts
└── BUILD.md                         # Build instructions
```

## Workflow

### Development

1. **Initial Setup:**

   ```bash
   npm install                    # Runs postinstall -> downloads FFmpeg
   # or manually:
   npm run download-ffmpeg
   ```

2. **Development Mode:**

   ```bash
   npm run tauri:dev
   ```

   The app will use bundled FFmpeg from `src-tauri/resources/bin/` during development.

3. **Testing Bundling:**
   The binaries in development mode are read directly from `src-tauri/resources/bin/`.

### Production Build

1. **Download FFmpeg (if not already done):**

   ```bash
   npm run download-ffmpeg
   ```

2. **Build:**

   ```bash
   npm run tauri:build
   ```

3. **Verify Bundled Files:**

   ```bash
   # Check if binaries are bundled
   ls -lh "src-tauri/target/aarch64-apple-darwin/release/bundle/macos/Honeymelon.app/Contents/Resources/bin/"

   # Verify architecture
   lipo -info "src-tauri/target/aarch64-apple-darwin/release/bundle/macos/Honeymelon.app/Contents/Resources/bin/ffmpeg"

   # Test bundled FFmpeg
   "src-tauri/target/aarch64-apple-darwin/release/bundle/macos/Honeymelon.app/Contents/Resources/bin/ffmpeg" -version
   ```

## Binary Source and Licensing

### Source

- **Provider:** evermeet.cx (trusted FFmpeg builds for macOS)
- **URL:** https://evermeet.cx/ffmpeg/
- **Architecture:** Apple Silicon (arm64)
- **Version:** Latest stable from evermeet.cx
- **Format:** 7z compressed archives

### Licensing

- **FFmpeg License:** LGPL 2.1+ (or GPL depending on configuration)
- **Compliance Strategy:** Out-of-process execution (no static linking)
- **Distribution:** Bundled binaries are redistributed under LGPL terms
- **Recommended Encoders:** VideoToolbox (H.264/HEVC), libvpx-vp9, libaom-av1, libopus

### LGPL Compliance

Honeymelon maintains LGPL compliance by:

1. Running FFmpeg as a separate process (not statically linked)
2. Not modifying FFmpeg source code
3. Redistributing FFmpeg binaries as-is
4. Documenting the FFmpeg license and source

## Git Strategy

The FFmpeg binaries are **NOT** committed to the repository because:

1. Large file sizes (50MB+ each)
2. Binary files don't compress well in git
3. Can be reliably downloaded from trusted source
4. Different developers may need different versions

Instead:

- Directory structure is committed (`.gitkeep`)
- Download script is committed
- Documentation is committed
- Binaries are `.gitignore`d
- CI/CD should run `npm run download-ffmpeg` before building

## CI/CD Integration

For automated builds, ensure your CI/CD pipeline:

1. **Installs Homebrew** (for 7z extraction)
2. **Runs download script:**
   ```bash
   npm install  # Triggers postinstall
   # or explicitly:
   npm run download-ffmpeg
   ```
3. **Builds the app:**
   ```bash
   npm run tauri:build
   ```

Example GitHub Actions workflow:

```yaml
- name: Install dependencies
  run: npm install

- name: Download FFmpeg binaries
  run: npm run download-ffmpeg

- name: Build Tauri app
  run: npm run tauri:build
```

## Troubleshooting

### Binaries Not Found During Build

**Problem:** Build succeeds but FFmpeg not bundled.

**Solution:**

```bash
# Check if binaries exist
ls -la src-tauri/resources/bin/

# Re-download
npm run download-ffmpeg

# Verify they're executable
chmod +x src-tauri/resources/bin/{ffmpeg,ffprobe}
```

### App Can't Find FFmpeg at Runtime

**Problem:** App reports "FFmpeg not found" error.

**Diagnosis:**

```bash
# Check bundled binaries in built app
ls -la "src-tauri/target/aarch64-apple-darwin/release/bundle/macos/Honeymelon.app/Contents/Resources/bin/"

# Check Tauri config
cat src-tauri/tauri.conf.json | grep -A 5 "resources"
```

**Solution:** Ensure `tauri.conf.json` includes resources configuration and binaries exist before building.

### Architecture Mismatch

**Problem:** FFmpeg binary won't run on Apple Silicon.

**Diagnosis:**

```bash
lipo -info src-tauri/resources/bin/ffmpeg
# Should output: arm64
```

**Solution:** Re-download using the script, which fetches arm64 binaries.

### Permission Denied Errors

**Problem:** FFmpeg can't execute due to permissions.

**Solution:**

```bash
chmod +x src-tauri/resources/bin/{ffmpeg,ffprobe}
```

### 7z Not Found

**Problem:** Download script fails because 7z is not installed.

**Solution:**

```bash
brew install p7zip
```

The download script will attempt to do this automatically.

## Alternative Binary Sources

If you prefer not to use evermeet.cx binaries, alternatives include:

1. **Homebrew:** `brew install ffmpeg` (but need to extract binary)
2. **Official FFmpeg:** Build from source for arm64
3. **Static Builds:** https://ffmpeg.org/download.html
4. **John Van Sickle:** https://johnvansickle.com/ffmpeg/ (Linux only)

Remember to:

- Ensure arm64 architecture
- Make binaries executable
- Place in `src-tauri/resources/bin/`
- Verify with `lipo -info` and test with `-version`

## Future Improvements

Potential enhancements:

1. **Version Pinning:** Lock to specific FFmpeg version for reproducible builds
2. **Checksum Verification:** Verify downloaded binaries with SHA256
3. **Multi-Architecture:** Support universal binaries (arm64 + x86_64)
4. **Custom Builds:** Build FFmpeg from source with specific encoder configuration
5. **Auto-Updates:** Check for FFmpeg updates and prompt user
6. **Compression:** Further compress binaries in bundle (UPX, etc.)

## Related Files

- `/Users/jerome/Projects/apps/honeymelon/scripts/download-ffmpeg.sh` - Download script
- `/Users/jerome/Projects/apps/honeymelon/src-tauri/tauri.conf.json` - Bundle config
- `/Users/jerome/Projects/apps/honeymelon/src-tauri/src/ffmpeg_capabilities.rs` - FFmpeg detection
- `/Users/jerome/Projects/apps/honeymelon/src-tauri/src/ffmpeg_probe.rs` - FFprobe detection
- `/Users/jerome/Projects/apps/honeymelon/src-tauri/src/ffmpeg_runner.rs` - FFmpeg execution
- `/Users/jerome/Projects/apps/honeymelon/BUILD.md` - Build instructions
- `/Users/jerome/Projects/apps/honeymelon/CLAUDE.md` - Project documentation
