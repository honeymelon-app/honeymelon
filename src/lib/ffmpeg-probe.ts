/**
 * Copyright (C) 2025 Jerome Thayananthajothy
 *
 * This file is part of Honeymelon.
 *
 * Honeymelon is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

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
