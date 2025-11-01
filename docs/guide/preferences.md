# Preferences

Customize Honeymelon's behavior through the Preferences dialog. This guide explains each setting and its impact.

## Accessing Preferences

Open the Preferences dialog:

- **Keyboard**: Press `Cmd + ,`
- **Menu Bar**: Honeymelon → Preferences
- **First Launch**: Preferences open automatically

## Settings Overview

### General Settings

#### Output Directory

**Description**: Where converted files are saved.

**Options**:

- **Same as source** (default): Output files saved next to source files
- **Custom directory**: Choose a specific folder for all outputs

**Example**:

```
Same as source:
  Input:  ~/Videos/movie.mkv
  Output: ~/Videos/movie-converted.mp4

Custom directory (~/Converted):
  Input:  ~/Videos/movie.mkv
  Output: ~/Converted/movie-converted.mp4
```

**Recommendation**: Use "Same as source" for mixed workflows, custom directory for organized batch processing.

---

#### Filename Suffix

**Description**: Suffix added to output filenames to prevent overwriting source files.

**Options**:

- **Add "-converted"** (default): Appends `-converted` to filename
- **Custom suffix**: Enter your own suffix (e.g., `-h264`, `-optimized`)
- **No suffix**: Uses original filename (⚠️ risky)

**Examples**:

```
-converted:     movie-converted.mp4
-h264:          movie-h264.mp4
-optimized:     movie-optimized.mp4
No suffix:      movie.mp4 (may overwrite!)
```

**Recommendation**: Always use a suffix to avoid accidental overwrites.

---

#### Concurrent Jobs

**Description**: Maximum number of simultaneous conversions.

**Range**: 1-8 jobs

**Default**: 2 jobs

**Impact**:

| Setting | CPU Usage | Memory    | Speed     | Best For                        |
| ------- | --------- | --------- | --------- | ------------------------------- |
| 1       | Low       | Low       | Slow      | 4K/8K, limited resources        |
| 2       | Medium    | Medium    | Balanced  | Default, recommended            |
| 3-4     | High      | High      | Fast      | Powerful Macs, remux operations |
| 5+      | Very High | Very High | Very Fast | Batch remuxing only             |

**Recommendation**:

- **M1/M2 Base**: 2 jobs
- **M1/M2 Pro/Max**: 3-4 jobs
- **M3/M4 Pro/Max**: 4-6 jobs
- **Remux-only batches**: 6-8 jobs

---

### Quality Settings

#### Default Quality Tier

**Description**: Default quality tier for new jobs.

**Options**:

- **Fast**: Copy-prioritized, fastest
- **Balanced**: Optimized quality/size (default)
- **High**: Maximum quality

See [Presets & Quality](/guide/presets) for detailed explanations.

**Recommendation**: Keep at "Balanced" for general use.

---

### FFmpeg Settings

#### FFmpeg Binary Path

**Description**: Location of the FFmpeg executable.

**Default**: Auto-detect (bundled → system → error)

**Detection Order**:

1. Bundled binaries in `public/bin/ffmpeg`
2. Environment variable `FFMPEG_PATH`
3. System FFmpeg (`/usr/local/bin/ffmpeg`, `/opt/homebrew/bin/ffmpeg`)

**Custom Path**: Enter a full path to a specific FFmpeg binary.

**Example**:

```
/usr/local/bin/ffmpeg
/opt/homebrew/bin/ffmpeg
~/custom-ffmpeg/bin/ffmpeg
```

::: tip
Most users don't need to change this. Auto-detection works for standard installations.
:::

---

#### FFprobe Binary Path

**Description**: Location of the FFprobe executable.

**Default**: Auto-detect (same logic as FFmpeg)

**Recommendation**: Keep synchronized with FFmpeg (same installation).

---

### Advanced Settings

#### Enable Hardware Acceleration

**Description**: Use Apple VideoToolbox for H.264/H.265 encoding.

**Default**: Enabled

**Benefits**:

- 2-5x faster encoding
- Lower CPU usage
- Reduced power consumption

**Drawbacks**:

- Slightly lower quality vs. software encoding
- Limited advanced features

**Recommendation**: Keep enabled unless you need maximum quality or specific encoding features.

---

#### Preserve Metadata

**Description**: Copy metadata from source to output files.

**Default**: Enabled

**Metadata Types**:

- **Container**: Title, creation date, comments
- **Video**: Color space, primaries, transfer function, HDR metadata
- **Audio**: Language, track titles

**Recommendation**: Keep enabled to preserve important file information.

---

#### Log Level

**Description**: Verbosity of FFmpeg logs.

**Options**:

- **Error**: Only errors
- **Warning**: Errors and warnings
- **Info**: General information (default)
- **Debug**: Detailed debugging output

**Recommendation**: Use "Info" for normal use, "Debug" for troubleshooting.

---

## Preset Management (Future Feature)

Future versions will support:

- Custom preset creation
- Import/export preset collections
- Preset templates
- Per-preset advanced settings

## Keyboard Shortcuts

Configure global shortcuts (future feature):

- Start all queued jobs
- Cancel all running jobs
- Open file picker
- Toggle Preferences

## Appearance Settings (Future Feature)

Customize the UI:

- Light/Dark/Auto theme
- Accent color
- Compact/Regular layout
- Font size

## Notifications (Future Feature)

Control notifications:

- Job completion alerts
- Error notifications
- Sound effects
- macOS notification center integration

## Storage Management

Monitor disk usage:

- Total input file sizes
- Total output file sizes
- Disk space saved (remux operations)
- Temporary file cleanup

## Backup & Sync (Future Feature)

Backup settings:

- Export preferences to JSON
- Import preferences from file
- Sync across devices via iCloud

## Resetting Preferences

To reset all settings to defaults:

1. Open Preferences
2. Scroll to bottom
3. Click "Reset to Defaults"
4. Confirm the action

::: warning
This will erase all custom settings. Consider exporting preferences first (when feature is available).
:::

## Configuration File Location

Preferences are stored at:

```
~/Library/Application Support/com.honeymelon.app/settings.json
```

Advanced users can manually edit this file (⚠️ use caution).

## Preference Best Practices

### For Content Creators

```
Output Directory: Custom (e.g., ~/Exports)
Filename Suffix: -youtube or -export
Concurrent Jobs: 2-3
Default Quality: Balanced
Hardware Acceleration: Enabled
```

### For Archivists

```
Output Directory: Custom (e.g., ~/Archive)
Filename Suffix: -archived
Concurrent Jobs: 1-2
Default Quality: High
Hardware Acceleration: Disabled (for max quality)
Preserve Metadata: Enabled
```

### For Quick Conversions

```
Output Directory: Same as source
Filename Suffix: -converted
Concurrent Jobs: 4-6
Default Quality: Fast
Hardware Acceleration: Enabled
```

### For Batch Processing

```
Output Directory: Custom (organized folder)
Filename Suffix: Custom (descriptive)
Concurrent Jobs: 3-4
Default Quality: Balanced
Log Level: Warning (reduce log noise)
```

## Troubleshooting Preferences

### Preferences Not Saving

1. Check file permissions for `~/Library/Application Support/com.honeymelon.app/`
2. Close and reopen the app
3. Reset to defaults and reconfigure

### FFmpeg Not Detected

1. Verify FFmpeg is installed: `which ffmpeg`
2. Check the FFmpeg path in Preferences
3. Download bundled binaries: `npm run download-ffmpeg`

### Performance Issues

1. Reduce concurrent jobs
2. Close other resource-intensive apps
3. Disable hardware acceleration (test if it's causing issues)
4. Check Activity Monitor for resource usage

## Next Steps

- Apply your preferences to [Converting Files](/guide/converting-files)
- Optimize settings for [Batch Processing](/guide/batch-processing)
- Understand [Presets & Quality](/guide/presets) impact on output
