import { invoke } from '@tauri-apps/api/core';

import type { ProbeSummary } from './types';

export interface ProbeResponse {
  raw: unknown;
  summary: ProbeSummary;
}

export async function probeMedia(path: string): Promise<ProbeResponse> {
  const isTauri =
    typeof window !== 'undefined' &&
    '__TAURI_INTERNALS__' in window &&
    typeof invoke === 'function';

  if (!isTauri) {
    console.warn('[probeMedia] Falling back to stub response; Tauri runtime not detected.');
    return {
      raw: null,
      summary: {
        durationSec: 0,
      },
    };
  }

  return invoke<ProbeResponse>('probe_media', { path });
}
