import { invoke } from '@tauri-apps/api/core';

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

export async function probeMedia(rawInput: string): Promise<ProbeResponse> {
  // The user's code returns the parsed JSON directly, but the existing function signature
  // and consumers expect a ProbeResponse object. I will adapt the user's code to fit
  // the existing structure.

  // console.log('ffprobe input =', rawInput, JSON.stringify(rawInput));
  const input = normalizePath(rawInput);
  if (!input) {
    throw new Error('Path to probe is missing or empty');
  }
  return await invoke<ProbeResponse>('probe_media', { path: input });
}
