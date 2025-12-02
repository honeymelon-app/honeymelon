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
  // ─────────────────────────────────────────────────────────────────────────────
  // VIDEO CONTAINERS
  // ─────────────────────────────────────────────────────────────────────────────
  mp4: {
    label: 'MP4',
    video: ['h264', 'hevc', 'av1'],
    audio: ['aac', 'alac', 'mp3', 'ac3'],
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
      notes: 'Subtitles require burn-in.',
    },
  },
  mov: {
    label: 'QuickTime MOV',
    video: ['h264', 'hevc', 'prores'],
    audio: ['aac', 'pcm_s16le', 'pcm_s24le', 'alac'],
    subtitles: {
      text: [],
      image: [],
      notes: 'Subtitles must be burned in.',
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
  avi: {
    label: 'AVI',
    video: ['mpeg4', 'h264', 'mjpeg'],
    audio: ['mp3', 'pcm_s16le', 'ac3'],
    subtitles: {
      text: [],
      image: [],
      notes: 'AVI has limited subtitle support; burn-in recommended.',
    },
    notes: 'Legacy format; consider MP4 or MKV for modern use.',
  },
  flv: {
    label: 'Flash Video FLV',
    video: ['flv1', 'h264'],
    audio: ['mp3', 'aac'],
    subtitles: {
      text: [],
      image: [],
    },
    notes: 'Legacy format; consider WebM or MP4 instead.',
  },
  m4v: {
    label: 'M4V (iTunes Video)',
    video: ['h264', 'hevc'],
    audio: ['aac', 'alac', 'ac3'],
    subtitles: {
      text: ['mov_text'],
      image: [],
    },
    requiresFaststart: true,
    notes: 'Apple-compatible MP4 variant.',
  },
  ts: {
    label: 'MPEG Transport Stream',
    video: ['h264', 'hevc', 'mpeg2video'],
    audio: ['aac', 'mp3', 'ac3', 'mp2'],
    subtitles: {
      text: [],
      image: [],
      notes: 'TS supports DVB subtitles but burn-in is recommended for compatibility.',
    },
    notes: 'Used for broadcast and streaming.',
  },
  ogv: {
    label: 'Ogg Video',
    video: ['theora', 'vp8'],
    audio: ['vorbis', 'opus'],
    subtitles: {
      text: [],
      image: [],
    },
    notes: 'Open format; consider WebM for wider support.',
  },
  mpeg: {
    label: 'MPEG Video',
    video: ['mpeg2video', 'mpeg4'],
    audio: ['mp2', 'mp3', 'ac3'],
    subtitles: {
      text: [],
      image: [],
    },
    notes: 'Legacy format; consider MP4 for modern use.',
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // AUDIO CONTAINERS
  // ─────────────────────────────────────────────────────────────────────────────
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
    audio: ['pcm_s16le', 'pcm_s24le'],
  },
  ogg: {
    label: 'Ogg Audio',
    video: [],
    audio: ['vorbis', 'opus', 'flac'],
    notes: 'Versatile open container supporting multiple codecs.',
  },
  aac: {
    label: 'AAC (Raw)',
    video: [],
    audio: ['aac'],
    notes: 'Raw AAC stream; consider M4A for better compatibility.',
  },
  aiff: {
    label: 'AIFF',
    video: [],
    audio: ['pcm_s16le', 'pcm_s24le'],
    notes: 'Uncompressed audio format, common on macOS.',
  },
  opus: {
    label: 'Opus',
    video: [],
    audio: ['opus'],
    notes: 'Modern, efficient audio codec. Ogg container recommended for broader support.',
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // IMAGE CONTAINERS
  // ─────────────────────────────────────────────────────────────────────────────
  png: {
    label: 'PNG',
    video: ['png'],
    audio: [],
    notes: 'Lossless image format with transparency support.',
  },
  jpg: {
    label: 'JPEG',
    video: ['mjpeg'],
    audio: [],
    notes: 'Lossy image format optimized for photographs.',
  },
  webp: {
    label: 'WebP',
    video: ['webp'],
    audio: [],
    notes: 'Modern image format with lossy and lossless modes.',
  },
  bmp: {
    label: 'BMP',
    video: ['bmp'],
    audio: [],
    notes: 'Uncompressed bitmap format; large file sizes.',
  },
  tiff: {
    label: 'TIFF',
    video: ['tiff'],
    audio: [],
    notes: 'Flexible format supporting lossless compression.',
  },
};
