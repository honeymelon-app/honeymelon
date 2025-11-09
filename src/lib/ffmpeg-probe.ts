import { runFfprobe } from '@/composables/use-ffmpeg';

import type { ProbeSummary } from './types';

export interface ProbeResponse {
  raw: unknown;
  summary: ProbeSummary;
}

export async function probeMedia(path: string): Promise<ProbeResponse> {
  const args = [
    '-hide_banner',
    '-loglevel',
    'error',
    '-print_format',
    'json',
    '-show_format',
    '-show_streams',
    path,
  ];

  const result = await runFfprobe(args);
  if (result.code !== 0) {
    throw new Error(`ffprobe exited with code ${result.code}: ${result.stderr}`);
  }

  const raw = JSON.parse(result.stdout);

  // Basic summarization, can be expanded later
  const summary: ProbeSummary = {
    durationSec: parseFloat(raw.format.duration || '0'),
    // In a real scenario, you'd parse streams and fill out the rest of the summary.
    // This is a simplified version for demonstration.
  };

  return { raw, summary };
}
