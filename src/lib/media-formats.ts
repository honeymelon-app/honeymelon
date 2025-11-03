import type { Container, MediaKind } from './types';

export const VIDEO_CONTAINERS = ['mp4', 'mov', 'mkv', 'webm', 'gif'] as const;
export const AUDIO_CONTAINERS = ['m4a', 'mp3', 'flac', 'wav'] as const;
export const IMAGE_CONTAINERS = ['png', 'jpg', 'webp'] as const;

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
  png: 'png',
  jpg: 'jpg',
  jpeg: 'jpg',
  webp: 'webp',
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
  if ((VIDEO_CONTAINERS as readonly Container[]).includes(container)) {
    return 'video';
  }
  if ((AUDIO_CONTAINERS as readonly Container[]).includes(container)) {
    return 'audio';
  }
  if ((IMAGE_CONTAINERS as readonly Container[]).includes(container)) {
    return 'image';
  }
  // Treat anything else as video by default to avoid hard failures.
  return 'video';
}

export function listTargetContainers(kind: MediaKind): readonly Container[] {
  if (kind === 'audio') {
    return AUDIO_CONTAINERS;
  }
  if (kind === 'video') {
    return VIDEO_CONTAINERS;
  }
  if (kind === 'image') {
    return IMAGE_CONTAINERS;
  }
  return [];
}

/**
 * Returns the HTML accept attribute value for file input based on media kind
 */
export function getAcceptString(kind: MediaKind): string {
  if (kind === 'video') {
    return 'video/mp4,video/quicktime,video/x-matroska,video/webm,image/gif,.mp4,.mov,.mkv,.webm,.gif,.m4v';
  }
  if (kind === 'audio') {
    return 'audio/mp4,audio/mpeg,audio/flac,audio/wav,audio/x-wav,.m4a,.mp3,.flac,.wav,.wave,.aif,.aiff';
  }
  if (kind === 'image') {
    return 'image/png,image/jpeg,image/gif,image/webp,.png,.jpg,.jpeg,.gif,.webp';
  }
  return '*/*';
}
