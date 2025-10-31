#!/usr/bin/env node
/**
 * remove-emojis.mjs
 *
 * Recursively removes all emoji sequences from text files in a project.
 * - Uses 'emoji-regex' to correctly match complex emoji clusters.
 * - Skips common vendor/build/binary paths.
 * - Git-aware (uses `git ls-files`) when inside a repo; falls back to walking the FS.
 * - Supports --dry-run and path filters (--include / --exclude).
 *
 * Usage:
 *   node scripts/remove-emojis.mjs
 *   node scripts/remove-emojis.mjs --dry-run
 *   node scripts/remove-emojis.mjs --include "src|app" --exclude "dist|build"
 *
 * Exit codes:
 *   0 success
 *   1 generic error
 */

import fs from 'node:fs/promises';
import { createReadStream, constants as FS_CONSTANTS } from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

// ---------------------------- CLI PARSING (no deps) ---------------------------
const args = process.argv.slice(2);
const flags = new Set();
const kv = {};
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a.startsWith('--')) {
    const [k, v] = a.split('=');
    if (typeof v === 'string') kv[k.replace(/^--/, '')] = v;
    else if (i + 1 < args.length && !args[i + 1].startsWith('--'))
      kv[k.replace(/^--/, '')] = args[++i];
    else flags.add(k.replace(/^--/, ''));
  }
}
const DRY_RUN = flags.has('dry-run') || kv['dry-run'] === '1';
const includeRe = kv.include ? new RegExp(kv.include) : null; // e.g. "src|app"
const excludeRe = kv.exclude ? new RegExp(kv.exclude) : null; // e.g. "dist|build"

// ---------------------------- SETTINGS ----------------------------------------
const ROOT = process.cwd();

const DEFAULT_IGNORES = [
  '/.git/',
  '/.hg/',
  '/.svn/',
  '/node_modules/',
  '/.next/',
  '/.nuxt/',
  '/dist/',
  '/build/',
  '/coverage/',
  '/.cache/',
  '/.turbo/',
  '/.vitepress/cache/',
  '/.yarn/',
  '/.pnpm/',
  '/vendor/',
];

const BINARY_EXTS = new Set([
  'png',
  'jpg',
  'jpeg',
  'gif',
  'webp',
  'avif',
  'ico',
  'icns',
  'pdf',
  'zip',
  'gz',
  'bz2',
  'xz',
  '7z',
  'rar',
  'woff',
  'woff2',
  'ttf',
  'otf',
  'mp3',
  'wav',
  'mp4',
  'mov',
  'webm',
  'aif',
  'aiff',
  'mkv',
]);

// ---------------------------- UTILITIES ---------------------------------------
function norm(p) {
  return p.replace(/\\/g, '/'); // win compat
}

function shouldIgnore(absPath) {
  const rel = '/' + norm(path.relative(ROOT, absPath)) + (absPath.endsWith(path.sep) ? '/' : '');
  for (const ig of DEFAULT_IGNORES) {
    if (rel.includes(ig)) return true;
  }
  if (excludeRe && excludeRe.test(rel)) return true;
  if (includeRe && !includeRe.test(rel)) return true;
  return false;
}

function hasBinaryExt(fp) {
  const ext = path.extname(fp).toLowerCase().replace(/^\./, '');
  return BINARY_EXTS.has(ext);
}

async function isProbablyText(fp) {
  if (hasBinaryExt(fp)) return false;

  // quick sniff: read first 8KB and check for NUL bytes
  try {
    await fs.access(fp, FS_CONSTANTS.R_OK);
    const chunkSize = 8192;
    const buf = await new Promise((resolve, reject) => {
      const stream = createReadStream(fp, { start: 0, end: chunkSize - 1 });
      const chunks = [];
      stream.on('data', (c) => chunks.push(c));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
    if (buf.includes(0)) return false; // NUL byte → likely binary
    // Heuristic: if too many non-UTF8-looking bytes, treat as binary
    // (very permissive to avoid false negatives)
    let suspicious = 0;
    for (const b of buf) {
      if (b === 9 || b === 10 || b === 13) continue; // tab/lf/cr
      if (b >= 32 && b <= 126) continue; // ascii printable
      if (b >= 194) continue; // likely utf-8 lead bytes
      suspicious++;
    }
    return suspicious / Math.max(1, buf.length) < 0.1;
  } catch {
    return false;
  }
}

async function listFilesGitAware() {
  try {
    await execFileAsync('git', ['rev-parse', '--is-inside-work-tree'], { cwd: ROOT });
    const { stdout } = await execFileAsync('git', ['ls-files', '-z'], {
      cwd: ROOT,
      maxBuffer: 1024 * 1024 * 32,
    });
    return stdout
      .split('\0')
      .filter(Boolean)
      .map((rel) => path.join(ROOT, rel));
  } catch {
    // Fallback: walk filesystem
    const out = [];
    async function walk(dir) {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const ent of entries) {
        const p = path.join(dir, ent.name);
        if (shouldIgnore(p)) continue;
        if (ent.isDirectory()) {
          await walk(p);
        } else if (ent.isFile()) {
          out.push(p);
        }
      }
    }
    await walk(ROOT);
    return out;
  }
}

// ---------------------------- CORE LOGIC --------------------------------------
async function loadEmojiRegex() {
  // dynamic import works in ESM and keeps script lightweight
  const mod = await import('emoji-regex');
  // library exports a function that returns a RegExp
  return mod.default();
}

function stripEmojisFromString(str, emojiRe) {
  // Remove emoji clusters, then strip ZWJ and Variation Selectors that may linger
  return str.replace(emojiRe, '').replace(/[\u200D\uFE0F\uFE0E]/g, '');
}

async function processFile(fp, emojiRe) {
  if (shouldIgnore(fp)) return { changed: false, reason: 'ignored' };
  if (!(await isProbablyText(fp))) return { changed: false, reason: 'binary' };

  let original;
  try {
    original = await fs.readFile(fp, 'utf8');
  } catch {
    return { changed: false, reason: 'unreadable' };
  }

  const stripped = stripEmojisFromString(original, emojiRe);
  if (stripped === original) return { changed: false };

  if (DRY_RUN) {
    console.log(norm(path.relative(ROOT, fp)));
    return { changed: true, dryRun: true };
  } else {
    await fs.writeFile(fp, stripped, 'utf8');
    console.log(norm(path.relative(ROOT, fp)));
    return { changed: true };
  }
}

async function main() {
  const emojiRe = await loadEmojiRegex();
  const files = await listFilesGitAware();

  let changed = 0;
  for (const fp of files) {
    const res = await processFile(fp, emojiRe);
    if (res.changed) changed++;
  }

  if (DRY_RUN) {
    console.error(`DRY RUN: ${changed} files would be modified.`);
  } else {
    console.error(`Done: ${changed} files modified.`);
  }
}

main().catch((err) => {
  console.error('Error:', err?.stack || String(err));
  process.exit(1);
});
