---
title: Preferences
description: Configure Honeymelon's output location, naming behavior, and advanced defaults.
---

# Preferences

Honeymelon keeps settings lightweight. A few controls live in the top-right toolbar, and advanced defaults are stored in a local settings file.

## Settings You Can Change in the UI

### Output Location

Use the folder button in the top-right toolbar to choose where files are saved:

- **Same as source** (default)
- **Custom directory**

**Example**:

```
Same as source:
  Input:  ~/Videos/movie.mkv
  Output: ~/Videos/movie-video-to-mp4.mp4

Custom directory (~/Converted):
  Input:  ~/Videos/movie.mkv
  Output: ~/Converted/movie-video-to-mp4.mp4
```

### Theme and Language

Use the theme and language buttons in the top-right toolbar to adjust appearance and UI language.

## Advanced Settings (settings.json)

Honeymelon stores advanced defaults in:

```
~/Library/Application Support/com.honeymelon.desktop/settings.json
```

You can edit this file while the app is closed to change:

- **preferredConcurrency**: number of simultaneous conversions (default 2, minimum 1)
- **includePresetInName**: include preset ID in output filenames (default true)
- **includeTierInName**: include quality tier in output filenames (default false)
- **filenameSeparator**: separator used between name segments (default `-`)

**Example**:

```json
{
  "prefs": {
    "preferredConcurrency": 3,
    "includePresetInName": true,
    "includeTierInName": true,
    "filenameSeparator": "-"
  }
}
```

::: warning
Edits are not validated. Keep a backup before changing advanced settings.
:::

## Resetting Preferences

To reset all settings to defaults:

1. Quit Honeymelon
2. Delete `~/Library/Application Support/com.honeymelon.desktop/settings.json`
3. Relaunch the app

## Troubleshooting Preferences

If settings are not saving:

1. Check permissions on `~/Library/Application Support/com.honeymelon.desktop/`
2. Relaunch the app
3. Remove the settings file to reset defaults

## Next Steps

- Configure [Converting Files](/guide/converting-files) workflows
- Optimize [Batch Processing](/guide/batch-processing) for larger queues
