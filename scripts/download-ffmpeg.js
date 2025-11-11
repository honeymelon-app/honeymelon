#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * FFmpeg Bundling Setup for Honeymelon (Apple Silicon only)
 * - Downloads arm64 ffmpeg/ffprobe zips from OSXExperts.NET
 * - Extracts and installs into src-tauri/bin
 * - Verifies architecture
 * - Ad-hoc codesigns the binaries (best-effort)
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Colors
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const NC = '\x1b[0m';

// Config (Apple Silicon builds from OSXExperts.NET)
const FFMPEG_VERSION = '7.1.1';
const FFMPEG_URL = 'https://www.osxexperts.net/ffmpeg711arm.zip';
const FFPROBE_URL = 'https://www.osxexperts.net/ffprobe711arm.zip';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(SCRIPT_DIR, '..');
const BIN_DIR = path.join(PROJECT_ROOT, 'src-tauri', 'bin');

// -----------------------------------------------

function banner() {
  console.log(`${GREEN}========================================${NC}`);
  console.log(`${GREEN}FFmpeg Bundling Setup for Honeymelon (Apple Silicon only)${NC}`);
  console.log(`${GREEN}========================================${NC}\n`);
}

function fail(msg, code = 1) {
  console.error(`${RED}${msg}${NC}`);
  process.exit(code);
}

function needCmd(cmd) {
  const which = spawnSync('bash', ['-lc', `command -v ${cmd}`], { stdio: 'pipe' });
  if (which.status !== 0) {
    if (cmd === 'unzip') {
      console.log(`${YELLOW}unzip not found. Installing via Homebrew...${NC}`);
      const hasBrew = spawnSync('bash', ['-lc', 'command -v brew'], { stdio: 'pipe' });
      if (hasBrew.status !== 0) {
        fail('Homebrew is required to install unzip. See https://brew.sh');
      }
      const install = spawnSync('bash', ['-lc', 'brew install unzip'], { stdio: 'inherit' });
      if (install.status !== 0) fail('Failed to install unzip via Homebrew.');
      return;
    }
    fail(`Missing required command: ${cmd}`);
  }
}

function ensureMacArm64() {
  if (os.platform() !== 'darwin') fail('This script supports macOS only.');
  if (os.arch() !== 'arm64') fail(`Apple Silicon (arm64) required. Current arch: ${os.arch()}.`);
}

function mkdirp(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, { stdio: 'pipe', ...opts });
  if (res.status !== 0) {
    const out = (res.stdout || '').toString();
    const err = (res.stderr || '').toString();
    throw new Error(`Command failed: ${cmd} ${args.join(' ')}\n${out}\n${err}`);
  }
  return (res.stdout || '').toString();
}

function binaryArch(filePath) {
  // Prefer lipo if available, else fall back to file(1)
  const hasLipo = spawnSync('bash', ['-lc', 'command -v lipo'], { stdio: 'pipe' }).status === 0;
  try {
    if (hasLipo) {
      const out = run('lipo', ['-info', filePath]);
      const m = out.match(/(arm64|x86_64)/g);
      return m ? m[0] : 'unknown';
    } else {
      const out = run('file', ['-b', filePath]);
      const m = out.match(/(arm64|x86_64)/g);
      return m ? m[0] : 'unknown';
    }
  } catch {
    return 'unknown';
  }
}

function findExecutable(rootDir, want) {
  // Breadth-first search up to depth ~3
  const q = [rootDir];
  let depth = 0;
  while (q.length && depth <= 3) {
    const levelCount = q.length;
    for (let i = 0; i < levelCount; i++) {
      const dir = q.shift();
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) {
          q.push(p);
        } else if (e.isFile() && e.name === want) {
          try {
            const st = fs.statSync(p);
            if ((st.mode & 0o111) !== 0) return p; // executable bit set
          } catch {}
        }
      }
    }
    depth++;
  }
  // Fallback: direct path
  const direct = path.join(rootDir, want);
  if (fs.existsSync(direct)) return direct;
  return null;
}

function fetchZipExtractOne(url, want, outPath) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hm-'));
  const zip = path.join(tmp, 'pkg.zip');

  console.log(`${GREEN}Fetching ${want} ${FFMPEG_VERSION} (Apple Silicon)...${NC}`);
  // Use curl for robust retries/timeouts
  needCmd('curl');
  run(
    'curl',
    [
      '-fL',
      '--retry',
      '3',
      '--retry-delay',
      '2',
      '--connect-timeout',
      '10',
      '--max-time',
      '120',
      '--progress-bar',
      '-o',
      zip,
      url,
    ],
    { cwd: tmp },
  );

  console.log(`${GREEN}Extracting ${want}...${NC}`);
  needCmd('unzip');
  run('unzip', ['-q', '-d', tmp, zip]);

  const found = findExecutable(tmp, want);
  if (!found) {
    fs.rmSync(tmp, { recursive: true, force: true });
    fail(`Error: could not locate '${want}' in downloaded archive.`);
  }

  const arch = binaryArch(found);
  console.log(`${GREEN}${want} detected arch:${NC} ${arch}`);
  if (arch !== 'arm64') {
    fs.rmSync(tmp, { recursive: true, force: true });
    fail(`${want} is not arm64 (got ${arch}). Aborting.`);
  }

  // Install atomically
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.renameSync(found, outPath);
  fs.chmodSync(outPath, 0o755);

  // Version banner
  try {
    const version = run(outPath, ['-version']);
    console.log(`${GREEN}Installed ${want}:${NC} ${version.split('\n')[0]}\n`);
  } catch {
    console.log(`${YELLOW}Installed ${want}, but could not read version banner.${NC}\n`);
  }

  // Cleanup temp
  fs.rmSync(tmp, { recursive: true, force: true });
}

function codesignIfPossible(p) {
  // Best-effort ad-hoc signing
  const hasCodesign =
    spawnSync('bash', ['-lc', 'command -v codesign'], { stdio: 'pipe' }).status === 0;
  if (!hasCodesign) return;
  try {
    run('codesign', ['--force', '-s', '-', p], { stdio: 'ignore' });
  } catch {
    // ignore signing errors
  }
}

function listAndVerify(binDir) {
  console.log(`\n${GREEN}Verification:${NC}`);
  try {
    const ls = run('ls', ['-lh', path.join(binDir, '/')]);
    process.stdout.write(ls);
  } catch {}

  try {
    console.log(run('file', [path.join(binDir, 'ffmpeg')]));
  } catch {}
  try {
    console.log(run('file', [path.join(binDir, 'ffprobe')]));
  } catch {}
  try {
    console.log(run(path.join(binDir, 'ffmpeg'), ['-version']).split('\n')[0]);
  } catch {}
}

// -----------------------------------------------

function main() {
  banner();
  ensureMacArm64();
  mkdirp(BIN_DIR);

  // Ensure tools
  needCmd('curl');
  // unzip is handled in needCmd with brew fallback if missing

  // Optional: overwrite without prompt
  try {
    fs.rmSync(path.join(BIN_DIR, 'ffmpeg'));
  } catch {}
  try {
    fs.rmSync(path.join(BIN_DIR, 'ffprobe'));
  } catch {}

  console.log(`${GREEN}Step 1: Downloading FFmpeg (arm64)...${NC}`);
  fetchZipExtractOne(FFMPEG_URL, 'ffmpeg', path.join(BIN_DIR, 'ffmpeg'));

  console.log(`${GREEN}Step 2: Downloading FFprobe (arm64)...${NC}`);
  fetchZipExtractOne(FFPROBE_URL, 'ffprobe', path.join(BIN_DIR, 'ffprobe'));

  console.log(`${GREEN}Step 3: Final architecture check...${NC}`);
  const FFMPEG_ARCH = binaryArch(path.join(BIN_DIR, 'ffmpeg'));
  const FFPROBE_ARCH = binaryArch(path.join(BIN_DIR, 'ffprobe'));
  if (!(FFMPEG_ARCH === 'arm64' && FFPROBE_ARCH === 'arm64')) {
    fail('Non-arm64 binaries detected. Aborting.');
  }
  console.log(`${GREEN}FFmpeg arch:${NC}   ${FFMPEG_ARCH}`);
  console.log(`${GREEN}FFprobe arch:${NC}  ${FFPROBE_ARCH}\n`);

  console.log(`${GREEN}Step 4: Ad-hoc signing (optional but recommended)...${NC}`);
  codesignIfPossible(path.join(BIN_DIR, 'ffmpeg'));
  codesignIfPossible(path.join(BIN_DIR, 'ffprobe'));

  listAndVerify(BIN_DIR);

  console.log(`\n${GREEN}========================================${NC}`);
  console.log(`${GREEN}FFmpeg bundling setup complete (arm64 only)!${NC}`);
  console.log(`${GREEN}========================================${NC}\n`);
  console.log(`${GREEN}Binaries installed to:${NC}`);
  console.log(`  - ${path.join(BIN_DIR, 'ffmpeg')}`);
  console.log(`  - ${path.join(BIN_DIR, 'ffprobe')}\n`);
  console.log(`${GREEN}Next steps:${NC}`);
  console.log(`  1. Build: ${YELLOW}npm run tauri:build${NC}`);
  console.log('  2. Binaries will be bundled to $RESOURCE/bin/*');
  console.log('  3. Test the app to ensure detection works\n');
  console.log(`${YELLOW}Note: These are GPL-licensed binaries from osxexperts.net${NC}`);
}

// -----------------------------------------------

try {
  main();
} catch (err) {
  console.error(`${RED}Unhandled error${NC}`);
  console.error(err?.message || err);
  process.exit(1);
}
