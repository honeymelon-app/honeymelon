import type { Container, MediaKind } from './types';

export const VIDEO_CONTAINERS: Container[] = ['mp4', 'mov', 'mkv', 'webm', 'gif'];
export const AUDIO_CONTAINERS: Container[] = ['m4a', 'mp3', 'flac', 'wav'];

const EXTENSION_TO_CONTAINER: Record<string, Container> = {
  mp4: 'mp4',
  m4v: 'mp4',
  mov: 'mov',
  mkv: 'mkv',
  webm: 'webm',
  gif: 'gif',
  m4a: 'm4a',
  mp3: 'mp3',
  flac: 'flac',
  wav: 'wav',
  wave: 'wav',
  aif: 'wav',
  aiff: 'wav',
};

export function inferContainerFromPath(path: string): Container | undefined {
  const lastDot = path.lastIndexOf('.');
  if (lastDot === -1 || lastDot === path.length - 1) {
    return undefined;
  }
  const ext = path.slice(lastDot + 1).toLowerCase();
  return EXTENSION_TO_CONTAINER[ext];
}

export function mediaKindForContainer(container: Container): MediaKind {
  if (VIDEO_CONTAINERS.includes(container)) {
    return 'video';
  }
  if (AUDIO_CONTAINERS.includes(container)) {
    return 'audio';
  }
  // Treat anything else as video by default to avoid hard failures.
  return 'video';
}

export function listTargetContainers(kind: MediaKind): Container[] {
  if (kind === 'audio') {
    return AUDIO_CONTAINERS;
  }
  if (kind === 'video') {
    return VIDEO_CONTAINERS;
  }
  return [];
}
