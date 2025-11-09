import { Command } from '@tauri-apps/plugin-shell';
import { resourceDir, join } from '@tauri-apps/api/path';

let ffmpegPath: string | null = null;
let ffprobePath: string | null = null;
let error: string | null = null;

export async function resolvePaths() {
  if (ffmpegPath && ffprobePath) {
    return;
  }
  try {
    const resDir = await resourceDir();
    ffmpegPath = await join(resDir, 'bin', 'ffmpeg');
    ffprobePath = await join(resDir, 'bin', 'ffprobe');
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
    console.error('Failed to resolve ffmpeg paths', error);
  }
}

export async function runFfmpeg(args: string[]) {
  await resolvePaths();
  if (!ffmpegPath) {
    throw new Error('ffmpeg path not resolved');
  }
  const cmd = Command.create('ffmpeg', args);
  cmd.stderr.on('data', (d) => console.error('[ffmpeg]', d));
  return cmd.execute();
}

export async function runFfprobe(args: string[]) {
  await resolvePaths();
  if (!ffprobePath) {
    throw new Error('ffprobe path not resolved');
  }
  const cmd = Command.create('ffprobe', args);
  cmd.stderr.on('data', (d) => console.error('[ffprobe]', d));
  return cmd.execute();
}

export function getFfmpegError() {
  return error;
}
