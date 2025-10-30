# Building Honeymelon for macOS Apple Silicon

Honeymelon is configured to build **exclusively for macOS Apple Silicon (ARM64/aarch64)**.

## Prerequisites

- macOS 13.0 or newer
- Apple Silicon Mac (M1, M2, M3, etc.)
- Xcode Command Line Tools
- Rust toolchain with `aarch64-apple-darwin` target
- Node.js 18+ and npm

## Setup

### 1. Install Rust and Add Apple Silicon Target

```bash
# Install Rust (if not already installed)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Add Apple Silicon target (should already be default on Apple Silicon Macs)
rustup target add aarch64-apple-darwin
```

### 2. Install Dependencies

```bash
npm install
```

## Development

### Run in Development Mode

```bash
npm run tauri:dev
# or
npm run tauri dev
```

This will:
- Start Vite dev server
- Compile Rust code for `aarch64-apple-darwin`
- Launch the app with hot reload

## Building for Production

### Build Apple Silicon Binary (Recommended)

```bash
npm run tauri:build
```

This builds **only for Apple Silicon (aarch64-apple-darwin)** and creates:
- DMG installer
- .app bundle

Output location: `src-tauri/target/aarch64-apple-darwin/release/bundle/`

### Build Universal Binary (Optional)

If you need to support both Apple Silicon and Intel Macs:

```bash
npm run tauri:build:universal
```

This creates a universal binary supporting both architectures.

## Build Configuration

### Default Target

The app is configured to target Apple Silicon by default via:

**[src-tauri/.cargo/config.toml](src-tauri/.cargo/config.toml)**
```toml
[build]
target = "aarch64-apple-darwin"
```

### Bundle Targets

**[src-tauri/tauri.conf.json](src-tauri/tauri.conf.json)**
```json
{
  "bundle": {
    "targets": ["dmg", "app"],
    "macOS": {
      "minimumSystemVersion": "13.0"
    }
  }
}
```

Only builds:
- ✅ DMG installer (`.dmg`)
- ✅ App bundle (`.app`)

Does NOT build:
- ❌ AppImage (Linux)
- ❌ MSI/NSIS (Windows)
- ❌ Deb/RPM (Linux)

## Build Outputs

After running `npm run tauri:build`, you'll find:

```
src-tauri/target/aarch64-apple-darwin/release/
├── bundle/
│   ├── dmg/
│   │   └── Honeymelon_0.1.0_aarch64.dmg  ← Distributable installer
│   └── macos/
│       └── Honeymelon.app  ← Standalone app bundle
└── honeymelon  ← Raw binary
```

## Signing & Notarization (Optional)

For distribution outside the App Store, you'll need to sign and notarize:

### 1. Configure Signing Identity

In `tauri.conf.json`:
```json
{
  "bundle": {
    "macOS": {
      "signingIdentity": "Developer ID Application: Your Name (TEAM_ID)"
    }
  }
}
```

### 2. Set Environment Variables

```bash
export APPLE_ID="your@email.com"
export APPLE_PASSWORD="app-specific-password"
export APPLE_TEAM_ID="YOUR_TEAM_ID"
```

### 3. Build with Signing

```bash
npm run tauri:build
```

Tauri will automatically sign and notarize if credentials are configured.

## Architecture Verification

To verify the built binary is Apple Silicon only:

```bash
file src-tauri/target/aarch64-apple-darwin/release/honeymelon
# Output: Mach-O 64-bit executable arm64

lipo -info src-tauri/target/aarch64-apple-darwin/release/honeymelon
# Output: Non-fat file: ... is architecture: arm64
```

## Distribution

The `.dmg` file in `src-tauri/target/aarch64-apple-darwin/release/bundle/dmg/` is ready for distribution to macOS Apple Silicon users.

**Note**: Users on Intel Macs will need Rosetta 2 if you build universal binaries, but the default ARM64-only build will NOT run on Intel Macs.

## Troubleshooting

### Build Fails with "target not found"

```bash
rustup target add aarch64-apple-darwin
```

### Build Succeeds but App Won't Open

Check macOS version requirement (13.0+) and architecture compatibility.

### Want to Build for Intel Macs Too?

Use the universal build command:
```bash
npm run tauri:build:universal
```

This creates a fat binary supporting both `x86_64` and `aarch64`.
