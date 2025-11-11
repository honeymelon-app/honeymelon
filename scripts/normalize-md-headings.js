#!/usr/bin/env node
// Normalizes standalone bold-only lines like "**Heading**" into "## Heading"
// Targets: docs/**/*.md, README.md, notes.md, e2e/README.md, scripts/README.md

const fs = require('fs').promises;
const path = require('path');

const root = process.cwd();
const targets = ['docs', 'README.md', 'notes.md', 'e2e/README.md', 'scripts/README.md'];

async function walkDir(dir) {
  let results = [];
  const list = await fs.readdir(dir, { withFileTypes: true });
  for (const ent of list) {
    const res = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      results = results.concat(await walkDir(res));
    } else if (ent.isFile() && res.endsWith('.md')) {
      results.push(res);
    }
  }
  return results;
}

async function gatherFiles() {
  const files = new Set();
  for (const t of targets) {
    const abs = path.join(root, t);
    try {
      const stat = await fs.stat(abs);
      if (stat.isDirectory()) {
        const mdFiles = await walkDir(abs);
        mdFiles.forEach((f) => files.add(f));
      } else if (stat.isFile()) {
        files.add(abs);
      }
    } catch (e) {
      // ignore missing paths
    }
  }
  return Array.from(files);
}

async function processFile(file) {
  let txt = await fs.readFile(file, 'utf8');
  const orig = txt;
  // Replace lines that are exactly bold text: optional leading/trailing space, **text**
  // Use multiline flag
  const regex = /^(\s*)\*\*([^\n*][^\n]*?)\*\*\s*$/gm;
  txt = txt.replace(regex, (_, leading, content) => {
    // avoid converting when content contains markup that looks like a paragraph (e.g., contains ':' at end?)
    // Conservative: if content contains only inline punctuation and words, convert.
    // We'll convert for most cases.
    const trimmed = content.trim();
    // Do not convert if trimmed starts with '[' (link-like) or contains '`' (code) or '```' (unlikely)
    if (/^[\[]/.test(trimmed) || /`/.test(trimmed)) return _;
    return `${leading}## ${trimmed}`;
  });
  if (txt !== orig) {
    await fs.writeFile(file, txt, 'utf8');
    return true;
  }
  return false;
}

(async function main() {
  const files = await gatherFiles();
  const changed = [];
  for (const f of files) {
    try {
      const did = await processFile(f);
      if (did) changed.push(path.relative(root, f));
    } catch (e) {
      console.error('Failed processing', f, e.message);
    }
  }
  console.log('Processed files:', files.length);
  console.log('Changed files:', changed.length);
  changed.forEach((f) => console.log('  ', f));
})();
