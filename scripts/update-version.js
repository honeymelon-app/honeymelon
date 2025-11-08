#!/usr/bin/env node
/**
 * Synchronises the Honeymelon release version across all relevant manifests.
 *
 * Usage:
 *   node scripts/update-version.js 1.2.3
 *   node scripts/update-version.js 1.2.3 --dry-run
 *
 * The package.json version is treated as the source of truth. The script
 * rewrites package.json, package-lock.json, src/components/AboutDialog.vue,
 * src-tauri/Cargo.toml, and src-tauri/tauri.conf.json so they all share the
 * same version string.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const versionArg = args.find((arg) => !arg.startsWith('-'));

if (!versionArg) {
  console.error('Usage: node scripts/update-version.js <version> [--dry-run]');
  process.exit(1);
}

const SEMVER_RE = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;
if (!SEMVER_RE.test(versionArg)) {
  console.error(`Invalid version "${versionArg}". Expected a semantic version (e.g. 1.2.3).`);
  process.exit(1);
}

const targetVersion = versionArg;
const touchedFiles = [];

function updateJsonFile(relPath, mutator) {
  const filePath = path.join(ROOT, relPath);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing required file: ${relPath}`);
  }
  const raw = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(raw);
  const before = JSON.stringify(data);
  const result = mutator(data);
  const after = JSON.stringify(data);

  const didChange = result === true || before !== after;
  if (!didChange) {
    return false;
  }

  if (!dryRun) {
    const nextRaw = JSON.stringify(data, null, 2) + '\n';
    fs.writeFileSync(filePath, nextRaw, 'utf8');
  }
  touchedFiles.push(relPath);
  return true;
}

function replaceInFile(relPath, replacer) {
  const filePath = path.join(ROOT, relPath);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing required file: ${relPath}`);
  }
  const raw = fs.readFileSync(filePath, 'utf8');
  const next = replacer(raw);
  if (next === raw) {
    return false;
  }
  if (!dryRun) {
    fs.writeFileSync(filePath, next, 'utf8');
  }
  touchedFiles.push(relPath);
  return true;
}

function syncPackageJson() {
  return updateJsonFile('package.json', (pkg) => {
    if (pkg.version === targetVersion) return false;
    pkg.version = targetVersion;
    return true;
  });
}

function syncPackageLock() {
  if (!fs.existsSync(path.join(ROOT, 'package-lock.json'))) {
    return false;
  }
  return updateJsonFile('package-lock.json', (lock) => {
    let mutated = false;
    if (lock.version !== targetVersion) {
      lock.version = targetVersion;
      mutated = true;
    }
    if (lock.packages && lock.packages['']) {
      if (lock.packages[''].version !== targetVersion) {
        lock.packages[''].version = targetVersion;
        mutated = true;
      }
    }
    return mutated;
  });
}

function syncAboutDialog() {
  const fallbackRe = /(import\.meta\.env(?:(?:\?\.)|\.)PACKAGE_VERSION\s*\?\?\s*)(['"])([^'"]+)\2/;
  return replaceInFile('src/components/AboutDialog.vue', (contents) => {
    if (!fallbackRe.test(contents)) {
      throw new Error('Could not locate fallback version inside AboutDialog.vue');
    }
    return contents.replace(
      fallbackRe,
      (_, prefix, quote) => `${prefix}${quote}${targetVersion}${quote}`,
    );
  });
}

function syncCargoToml() {
  const versionRe = /(version\s*=\s*")([^"]+)(")/;
  return replaceInFile('src-tauri/Cargo.toml', (contents) => {
    if (!versionRe.test(contents)) {
      throw new Error('Could not locate version field in Cargo.toml');
    }
    return contents.replace(versionRe, `$1${targetVersion}$3`);
  });
}

function syncTauriConfig() {
  const tauriRe = /("version"\s*:\s*")([^"]+)(")/;
  return replaceInFile('src-tauri/tauri.conf.json', (contents) => {
    if (!tauriRe.test(contents)) {
      throw new Error('Could not locate version key in tauri.conf.json');
    }
    return contents.replace(tauriRe, `$1${targetVersion}$3`);
  });
}

try {
  syncPackageJson();
  syncPackageLock();
  syncAboutDialog();
  syncCargoToml();
  syncTauriConfig();

  if (touchedFiles.length === 0) {
    console.log(`No files changed. All versions already set to ${targetVersion}.`);
  } else if (dryRun) {
    console.log('[dry-run] The following files would be updated:');
    touchedFiles.forEach((file) => console.log(` - ${file}`));
  } else {
    console.log(`Updated version to ${targetVersion} in:`);
    touchedFiles.forEach((file) => console.log(` - ${file}`));
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
