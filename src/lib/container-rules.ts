import type { Container } from './types';

export interface ContainerRule {
  label: string;
  video: 'any' | string[];
  audio: 'any' | string[];
  subtitles?: {
    text?: 'any' | string[];
    image?: 'any' | string[];
    notes?: string;
  };
  requiresFaststart?: boolean;
  notes?: string;
}

export const CONTAINER_RULES: Record<Container, ContainerRule> = {
  mp4: {
    label: 'MP4',
    video: ['h264', 'hevc', 'av1'],
    audio: ['aac', 'alac', 'mp3'],
    subtitles: {
      text: ['mov_text'],
      image: [],
      notes: 'Non mov_text subtitles must be burned in.',
    },
    requiresFaststart: true,
  },
  webm: {
    label: 'WebM',
    video: ['vp8', 'vp9', 'av1'],
    audio: ['opus', 'vorbis'],
    subtitles: {
      text: [],
      image: [],
      notes: 'Subtitles require burn-in in v1.',
    },
  },
  mov: {
    label: 'QuickTime MOV',
    video: ['h264', 'prores'],
    audio: ['aac', 'pcm_s16le'],
    subtitles: {
      text: [],
      image: [],
      notes: 'Subtitles must be burned in for v1.',
    },
    requiresFaststart: true,
  },
  mkv: {
    label: 'Matroska MKV',
    video: 'any',
    audio: 'any',
    subtitles: {
      text: 'any',
      image: 'any',
    },
  },
  gif: {
    label: 'GIF',
    video: ['gif'],
    audio: [],
    subtitles: {
      text: [],
      image: [],
      notes: 'GIF does not support separate audio or subtitle streams.',
    },
    notes: 'Use for short clips only.',
  },
  m4a: {
    label: 'M4A',
    video: [],
    audio: ['aac', 'alac'],
  },
  mp3: {
    label: 'MP3',
    video: [],
    audio: ['mp3'],
  },
  flac: {
    label: 'FLAC',
    video: [],
    audio: ['flac'],
  },
  wav: {
    label: 'WAV',
    video: [],
    audio: ['pcm_s16le'],
  },
  png: {
    label: 'PNG',
    video: ['png'],
    audio: [],
    notes: 'Still image output; audio and subtitles are not supported.',
  },
  jpg: {
    label: 'JPEG',
    video: ['mjpeg'],
    audio: [],
    notes: 'Still image output; audio and subtitles are not supported.',
  },
  webp: {
    label: 'WebP',
    video: ['webp'],
    audio: [],
    notes: 'Still image output; audio and subtitles are not supported.',
  },
};
