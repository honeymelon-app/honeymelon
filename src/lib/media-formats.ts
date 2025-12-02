import type { Container, MediaKind } from './types';

/**
 * Video container formats supported for output.
 * Order determines UI display order (most common first).
 */
export const VIDEO_CONTAINERS = [
  'mp4',
  'mov',
  'mkv',
  'webm',
  'gif',
  'avi',
  'flv',
  'm4v',
  'ts',
  'ogv',
  'mpeg',
] as const;

/**
 * Audio container formats supported for output.
 * Order determines UI display order (most common first).
 */
export const AUDIO_CONTAINERS = [
  'm4a',
  'mp3',
  'flac',
  'wav',
  'ogg',
  'aac',
  'aiff',
  'opus',
] as const;

/**
 * Image container formats supported for output.
 * Order determines UI display order (most common first).
 */
export const IMAGE_CONTAINERS = ['png', 'jpg', 'webp', 'bmp', 'tiff'] as const;

/**
 * Maps file extensions to their canonical container format.
 * Handles common aliases (e.g., 'jpeg' -> 'jpg', 'wave' -> 'wav').
 */
const EXTENSION_TO_CONTAINER: Record<string, Container> = {
  // Video
  mp4: 'mp4',
  m4v: 'm4v',
  mov: 'mov',
  mkv: 'mkv',
  webm: 'webm',
  gif: 'gif',
  avi: 'avi',
  flv: 'flv',
  ts: 'ts',
  mts: 'ts',
  m2ts: 'ts',
  ogv: 'ogv',
  mpeg: 'mpeg',
  mpg: 'mpeg',
  // Audio
  m4a: 'm4a',
  mp3: 'mp3',
  flac: 'flac',
  wav: 'wav',
  wave: 'wav',
  aif: 'aiff',
  aiff: 'aiff',
  ogg: 'ogg',
  oga: 'ogg',
  aac: 'aac',
  opus: 'opus',
  // Image
  png: 'png',
  jpg: 'jpg',
  jpeg: 'jpg',
  webp: 'webp',
  bmp: 'bmp',
  tiff: 'tiff',
  tif: 'tiff',
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
 * Returns the HTML accept attribute value for file input based on media kind.
 * Includes MIME types and extensions for broader browser compatibility.
 */
export function getAcceptString(kind: MediaKind): string {
  if (kind === 'video') {
    return [
      'video/mp4',
      'video/quicktime',
      'video/x-matroska',
      'video/webm',
      'video/x-msvideo',
      'video/x-flv',
      'video/mp2t',
      'video/ogg',
      'video/mpeg',
      'image/gif',
      '.mp4',
      '.mov',
      '.mkv',
      '.webm',
      '.gif',
      '.m4v',
      '.avi',
      '.flv',
      '.ts',
      '.mts',
      '.m2ts',
      '.ogv',
      '.mpeg',
      '.mpg',
    ].join(',');
  }
  if (kind === 'audio') {
    return [
      'audio/mp4',
      'audio/mpeg',
      'audio/flac',
      'audio/wav',
      'audio/x-wav',
      'audio/ogg',
      'audio/aac',
      'audio/aiff',
      'audio/x-aiff',
      '.m4a',
      '.mp3',
      '.flac',
      '.wav',
      '.wave',
      '.ogg',
      '.oga',
      '.aac',
      '.aiff',
      '.aif',
      '.opus',
    ].join(',');
  }
  if (kind === 'image') {
    return [
      'image/png',
      'image/jpeg',
      'image/gif',
      'image/webp',
      'image/bmp',
      'image/tiff',
      '.png',
      '.jpg',
      '.jpeg',
      '.gif',
      '.webp',
      '.bmp',
      '.tiff',
      '.tif',
    ].join(',');
  }
  return '*/*';
}
