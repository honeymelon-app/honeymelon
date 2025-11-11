# Building from Source

This guide explains how to build Honeymelon from source code for development or distribution.

## Prerequisites

### System Requirements

- **macOS 13.0+** (Ventura or later)
- **Apple Silicon** (M1, M2, M3, M4)
- **Xcode Command Line Tools**

Install Xcode Command Line Tools:

```bash
xcode-select --install

```

### Required Tools

#### Node.js and npm

Install via Homebrew:

```bash
brew install node

```

Or download from [nodejs.org](https://nodejs.org)

Verify installation:

```bash
node --version  # Should be 18+
npm --version

```

#### Rust

Install Rust toolchain:

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env

```

Verify installation:

```bash
rustc --version
cargo --version

```

Ensure you have the Apple Silicon target:

```bash
rustup target add aarch64-apple-darwin

```

## Clone the Repository

```bash
git clone https://github.com/honeymelon-app/honeymelon.git
cd honeymelon

```

## Install Dependencies

```bash
npm install

```

This will:

- Install Node.js dependencies
- Download FFmpeg binaries (optional)
- Set up Husky git hooks

### Skip FFmpeg Download

If you want to skip automatic FFmpeg download:

```bash
SKIP_FFMPEG_DOWNLOAD=1 npm install

```

## Development Build

### Start Development Server

```bash
npm run tauri:dev

```

This launches the app in development mode with:

- Hot Module Replacement (HMR) for Vue
- Rust debug build
- Developer tools enabled

### Development Features

- **Live Reload**: Changes to Vue files reload instantly
- **Rust Recompilation**: Rust changes trigger automatic rebuild
- **DevTools**: Browser DevTools available (`Cmd + Option + I`)
- **Vue DevTools**: Vue-specific debugging tools

## Production Build

### Build for Distribution

```bash
npm run tauri:build

```

This creates:

- Optimized Vue bundle
- Rust release build
- DMG installer
- macOS app bundle

### Build Output

Build artifacts are located at:

```

src-tauri/target/release/bundle/
├── dmg/
│   └── Honeymelon_0.1.0_aarch64.dmg
└── macos/
    └── Honeymelon.app

```

### Build for Universal Binary

To create a universal binary (Intel + Apple Silicon):

```bash
npm run tauri:build:universal

```

::: warning
Universal builds are significantly larger and may not work correctly for Apple Silicon-only features.
:::

## Build Configuration

### Tauri Configuration

**File**: [src-tauri/tauri.conf.json](https://github.com/honeymelon-app/honeymelon/blob/main/src-tauri/tauri.conf.json)

Key settings:

```json
{
  "build": {
    "distDir": "../dist",
    "devPath": "http://localhost:1420",
    "beforeBuildCommand": "npm run build",
    "beforeDevCommand": "npm run dev"
  },
  "tauri": {
    "bundle": {
      "active": true,
      "targets": ["dmg", "app"],
      "identifier": "com.honeymelon.app",
      "icon": ["icons/32x32.png", "icons/128x128.png", "icons/icon.icns", "icons/icon.ico"]
    }
  }
}
```

### Vite Configuration

**File**: [vite.config.ts](../../vite.config.ts)

```typescript
export default defineConfig({
  plugins: [vue(), tailwindcss()],
  build: {
    target: 'esnext',
    minify: 'esbuild',
  },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
  },
});
```

### Rust Build Configuration

**File**: [src-tauri/Cargo.toml](https://github.com/honeymelon-app/honeymelon/blob/main/src-tauri/Cargo.toml)

```toml
[profile.release]
codegen-units = 1
lto = true
opt-level = "z"  # Optimize for size
strip = true     # Remove debug symbols
panic = "abort"  # Smaller binary

```

## Build Optimizations

### Frontend Optimizations

1. **Tree Shaking**: Remove unused code
2. **Minification**: Compress JavaScript and CSS
3. **Code Splitting**: Split large chunks
4. **Asset Optimization**: Compress images and fonts

### Backend Optimizations

1. **LTO (Link Time Optimization)**: Enabled in release
2. **Strip Symbols**: Remove debug information
3. **Size Optimization**: Optimize for binary size
4. **Panic Abort**: Smaller panic handling

### Bundle Size

| Component     | Debug  | Release |
| ------------- | ------ | ------- |
| Rust Binary   | ~20 MB | ~2 MB   |
| Vue Bundle    | ~2 MB  | ~500 KB |
| Assets        | ~1 MB  | ~500 KB |
| **Total App** | ~25 MB | ~8 MB   |

## Troubleshooting

### Build Fails

**Missing Rust**:

```bash
error: linker `cc` not found

```

Solution: Install Xcode Command Line Tools

**Missing Node Modules**:

```bash
Error: Cannot find module 'vite'

```

Solution:

```bash
rm -rf node_modules package-lock.json
npm install

```

**Rust Compilation Errors**:

```bash
error: could not compile `honeymelon`

```

Solution:

```bash
cd src-tauri
cargo clean
cargo build

```

### TypeScript Errors

```bash
npm run type-check

```

Fix type errors before building.

### Slow Builds

**Speed up Rust compilation**:

```bash
# Use faster linker (macOS)
brew install michaeleisel/zld/zld

# Add to ~/.cargo/config.toml
[target.aarch64-apple-darwin]
rustflags = ["-C", "link-arg=-fuse-ld=/opt/homebrew/bin/zld"]

```

**Speed up Node builds**:

```bash
# Use faster package manager
npm install -g pnpm
pnpm install
pnpm run build

```

## Advanced Builds

### Debug Build with Optimizations

```bash
cd src-tauri
cargo build --profile release-with-debug

```

Add to `Cargo.toml`:

```toml
[profile.release-with-debug]
inherits = "release"
debug = true
strip = false

```

### Custom Build Targets

**ARM64 only**:

```bash
npm run tauri:build --target aarch64-apple-darwin

```

**Universal Binary**:

```bash
npm run tauri:build --target universal-apple-darwin

```

### Cross-Compilation

Honeymelon currently only supports building on macOS for macOS. Cross-compilation from Linux/Windows is not supported.

## CI/CD Builds

### GitHub Actions

**File**: `.github/workflows/build.yml`

```yaml
name: Build

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: macos-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Setup Rust
        uses: actions-rs/toolchain@v1
        with:
          toolchain: stable
          target: aarch64-apple-darwin

      - name: Install dependencies
        run: npm install

      - name: Build
        run: npm run tauri:build

      - name: Upload artifacts
        uses: actions/upload-artifact@v3
        with:
          name: macos-build
          path: src-tauri/target/release/bundle/dmg/*.dmg
```

### Build Caching

Cache dependencies to speed up CI:

```yaml
- name: Cache cargo registry
  uses: actions/cache@v3
  with:
    path: ~/.cargo/registry
    key: ${{ runner.os }}-cargo-registry-${{ hashFiles('**/Cargo.lock') }}

- name: Cache node modules
  uses: actions/cache@v3
  with:
    path: node_modules
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
```

## Code Signing (Future)

### Apple Developer Setup

1. **Enroll** in Apple Developer Program
2. **Create certificates** in Xcode
3. **Configure** Tauri for signing

**tauri.conf.json**:

```json
{
  "tauri": {
    "bundle": {
      "macOS": {
        "signingIdentity": "Developer ID Application: Your Name (TEAM_ID)"
      }
    }
  }
}
```

### Notarization

Submit app for notarization:

```bash
xcrun notarytool submit \
  "Honeymelon.dmg" \
  --apple-id "your@email.com" \
  --team-id "TEAM_ID" \
  --password "app-specific-password" \
  --wait
```

## Next Steps

- Set up your [Development Environment](/development/contributing)
- Run [Tests](/development/testing) before building
- Learn about [Working with AI Agents](/development/agents)
- Understand the [Architecture](/architecture/overview)
