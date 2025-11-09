import { Command } from '@tauri-apps/plugin-shell';
import { exists } from '@tauri-apps/plugin-fs';
import { join, resourceDir } from '@tauri-apps/api/path';

import type { ProbeSummary } from './types';

export interface ProbeResponse {
  raw: unknown;
  summary: ProbeSummary;
}

/** Normalize anything (file:// URL, NFC, stray whitespace) to a real POSIX path */
function normalizePath(input: string): string {
  if (!input) {
    return '';
  }
  let p = input.trim();
  if (p.startsWith('file://')) {
    try {
      p = decodeURI(new URL(p).pathname);
    } catch {
      // ignore errors
    }
  }
  // macOS can produce decomposed unicode; normalize to NFC
  return p.normalize('NFC');
}

async function ffprobePath() {
  const res = await resourceDir(); // .../Contents/Resources
  return await join(res, 'bin', 'ffprobe'); // absolute path
}

export async function probeMedia(rawInput: string): Promise<ProbeResponse> {
  // The user's code returns the parsed JSON directly, but the existing function signature
  // and consumers expect a ProbeResponse object. I will adapt the user's code to fit
  // the existing structure.

  // console.log('ffprobe input =', rawInput, JSON.stringify(rawInput));
  const input = normalizePath(rawInput);
  if (!input || !(await exists(input))) {
    throw new Error(`Input file missing or unreadable: ${rawInput}`);
  }

  const cmdPath = await ffprobePath();
  // args array (no shell quoting), add `--` before the path
  const args = [
    '-v',
    'error',
    '-show_entries',
    'format=duration:stream=index,codec_name,codec_type,avg_frame_rate',
    '-select_streams',
    'v:0',
    '-of',
    'json',
    '--',
    input,
  ];

  const cmd = Command.create(cmdPath, args);
  let stderr = '';
  cmd.stderr.on('data', (d) => {
    stderr += d;
  });

  const out = await cmd.execute();
  if (out.code !== 0) {
    throw new Error(`ffprobe exited ${out.code}: ${stderr || out.stdout}`);
  }

  // parse JSON safely
  try {
    const raw = JSON.parse(out.stdout);
    const summary: ProbeSummary = {
      durationSec: parseFloat(raw.format?.duration || '0'),
      // Further summary details would be extracted here in a real implementation
    };
    return { raw, summary };
  } catch {
    throw new Error(`ffprobe returned non-JSON output:\n${out.stdout}`);
  }
}
