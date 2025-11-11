---
title: Privacy Policy
description: Honeymelon's privacy commitments, data handling practices, and user guarantees.
---

# Privacy Policy

**Last Updated**: November 2025

Honeymelon is designed with privacy as a core principle. This page explains our commitment to protecting your privacy and how your data is handled.

## TL;DR - Privacy First

- **No data collection** – We don't collect any personal information
- **100% local processing** – All conversions happen on your device
- **No network required** – Core functionality works completely offline
- **No telemetry** – We don't track usage or send analytics
- **No third-party services** – No external analytics, crash reporting, or cloud services

## What We Don't Collect

Honeymelon does **NOT** collect, store, or transmit:

- ❌ Personal information (name, email, etc.)
- ❌ Usage data or analytics
- ❌ File names or media metadata
- ❌ Conversion history
- ❌ Error reports or crash logs
- ❌ Device identifiers
- ❌ IP addresses
- ❌ Location data

## How Your Data is Handled

### Local Processing Only

All media conversion happens entirely on your Mac:

- **FFmpeg runs locally** – No cloud processing
- **Files stay on your device** – Never uploaded or transmitted
- **No network access** – Core features work without internet
- **Complete control** – You decide what files to convert and where to save them

### Data Storage

The only data Honeymelon stores locally is:

#### Application Settings

- **Location**: `~/Library/Application Support/com.honeymelon.desktop/`
- **Contents**: User preferences (output directory, FFmpeg path, UI settings)
- **Persistence**: Saved between app launches
- **Control**: Can be deleted by removing the app or clearing application data

#### Job History (In-Memory Only)

- **Stored**: Only while the app is running
- **Cleared**: Automatically when you quit the app
- **Contents**: List of conversion jobs and their status
- **No persistence**: Not saved to disk

#### Temporary Files

- **Location**: System temporary directory (typically `/tmp/`)
- **Purpose**: Intermediate files during conversion
- **Cleanup**: Automatically deleted after conversion completes
- **Duration**: Temporary only, not retained

### No Network Access

Honeymelon's core functionality requires **no network access**:

- Conversions work completely offline
- No data is sent to external servers
- No communication with third-party services
- Optional network features (like update checks) can be disabled

## FFmpeg Processing

Honeymelon uses FFmpeg for media conversion:

- **Out-of-process execution** – FFmpeg runs as a separate process
- **No network access** – FFmpeg doesn't connect to the internet
- **File access only** – FFmpeg only accesses files you explicitly select
- **LGPL compliance** – FFmpeg remains legally separate from Honeymelon

## macOS Permissions

Honeymelon may request the following macOS permissions:

### File System Access (Required)

- **Purpose**: Read input files and write output files
- **Scope**: Only files you explicitly select or specify
- **Control**: Managed by macOS file picker and permission system

### Full Disk Access (Optional)

- **Purpose**: Access protected directories if needed
- **Default**: Not required for normal operation
- **Control**: You can grant/revoke in System Settings → Privacy & Security

### Notifications (Optional)

- **Purpose**: Notify you when conversions complete
- **Default**: Disabled, requires explicit opt-in
- **Control**: Configure in Preferences or System Settings

## Data Security

While we don't collect data, we still protect your local data:

### Security Measures

- **Command injection prevention** – Input sanitization for all FFmpeg arguments
- **Path sanitization** – Prevents directory traversal attacks
- **Process isolation** – FFmpeg runs in a separate, sandboxed process
- **Atomic operations** – File writes are atomic to prevent corruption
- **Safe temporary files** – Unique temporary filenames to prevent conflicts

### Your Responsibility

To protect your data:

- Keep macOS updated with the latest security patches
- Use appropriate file permissions on sensitive media
- Verify the integrity of downloaded Honeymelon releases
- Only grant necessary permissions to the app

## Children's Privacy

Honeymelon does not collect data from anyone, including children under 13. Since all processing is local and no data is transmitted, there are no special considerations for children's privacy.

## Updates to This Privacy Policy

We may update this privacy policy to reflect changes in the app or legal requirements. Changes will be posted on this page with an updated "Last Updated" date.

::: tip Check for Updates
Review this page periodically to stay informed about how we protect your privacy.
:::

## Your Rights

Since we don't collect any personal data, there is no personal data to:

- Access
- Correct
- Delete
- Export
- Object to processing

However, you have complete control over:

- **Your files** – You choose what to convert
- **Application settings** – Stored locally, can be reset or deleted
- **App usage** – Uninstall anytime to remove all local data

### Clearing Your Data

To remove all Honeymelon data from your Mac:

1. Quit Honeymelon
2. Delete the application
3. Remove settings directory:
   ```bash
   rm -rf ~/Library/Application\ Support/com.honeymelon.desktop/
   ```

## Contact Us

If you have questions about this privacy policy:

- **Email**: [tjthavarshan@gmail.com](mailto:tjthavarshan@gmail.com)
- **GitHub**: [honeymelon-app/honeymelon](https://github.com/honeymelon-app/honeymelon)

## Legal Compliance

- **No GDPR obligations** – We don't process personal data
- **No CCPA obligations** – We don't sell or share personal data
- **No cookies** – Honeymelon is a desktop app, not a website
- **No tracking** – No analytics or telemetry services

## Third-Party Software

Honeymelon uses third-party open-source software:

- **FFmpeg** (LGPL) – Media processing, runs locally
- **Tauri** (MIT/Apache 2.0) – Application framework
- **Vue.js** (MIT) – User interface framework
- See [Third-Party Notices](/legal/third-party-notices) for complete list

None of these third-party components collect or transmit user data.

## Comparison with Other Tools

Unlike many media converters, Honeymelon:

| Feature           | Honeymelon | Many Competitors   |
| ----------------- | ---------- | ------------------ |
| Cloud Processing  | ❌ Never   | ✅ Often Required  |
| Telemetry         | ❌ None    | ✅ Usually Present |
| Account Required  | ❌ No      | ✅ Sometimes       |
| Internet Required | ❌ No      | ✅ Often           |
| Data Collection   | ❌ None    | ✅ Common          |

## Open Source

Honeymelon's privacy-first approach is verifiable:

- Source code is available for inspection
- No hidden network calls
- No obfuscated telemetry
- Community can audit privacy claims

::: tip Verify Our Claims
Review the source code at [github.com/honeymelon-app/honeymelon](https://github.com/honeymelon-app/honeymelon) to verify our privacy practices.
:::

---

**Summary**: Honeymelon is designed to respect your privacy completely. All processing is local, no data is collected, and you maintain full control over your files and settings.

For the complete privacy policy, see [PRIVACY.md](https://github.com/honeymelon-app/honeymelon/blob/main/PRIVACY.md) in the repository.
