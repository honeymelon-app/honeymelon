#!/usr/bin/env node
// Fix blank lines around fenced code blocks and remove leading '$ ' from code block lines

const fs = require('fs').promises;
const path = require('path');

const root = process.cwd();
const targets = ['docs', 'README.md', 'notes.md', 'e2e/README.md', 'scripts/README.md'];

async function walk(dir) {
  const res = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const ent of entries) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) res.push(...(await walk(p)));
    else if (ent.isFile() && p.endsWith('.md')) res.push(p);
  }
  return res;
}

async function gatherFiles() {
  const files = new Set();
  for (const t of targets) {
    const p = path.join(root, t);
    try {
      const st = await fs.stat(p);
      if (st.isDirectory()) {
        (await walk(p)).forEach((f) => files.add(f));
      } else if (st.isFile()) files.add(p);
    } catch (e) {
      // ignore missing
    }
  }
  return Array.from(files);
}

async function fixFile(file) {
  let txt = await fs.readFile(file, 'utf8');
  let orig = txt;

  // Ensure blank line before opening fence
  txt = txt.replace(/([^\n])\n(```[\s\S]*?```)/g, (m, before, rest) => {
    return before + '\n\n' + rest;
  });

  // Ensure blank line after closing fence
  txt = txt.replace(/(```[\s\S]*?```)\n([^\n])/g, (m, fence, after) => {
    return fence + '\n\n' + after;
  });

  // Remove leading '$ ' inside code fences
  txt = txt.replace(/```[\s\S]*?```/g, (m) => {
    return m.replace(/^\$\s+/gm, '');
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
      const did = await fixFile(f);
      if (did) changed.push(path.relative(root, f));
    } catch (e) {
      console.error('error', f, e.message);
    }
  }
  console.log('processed', files.length, 'files');
  console.log('changed', changed.length);
  changed.forEach((c) => console.log('  ', c));
})();
