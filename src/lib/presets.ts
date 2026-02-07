/**
 * Copyright (C) 2025-2026 Jerome Thayananthajothy
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

/**
 * Media conversion presets configuration.
 *
 * This module defines all the available conversion presets for Honeymelon, organizing
 * them by media type (video, audio, image) and target format. Each preset specifies
 * the codecs, containers, and processing options needed to convert media files.
 *
 * The presets are built dynamically from target profiles that define the conversion
 * parameters for each supported output format. This approach ensures consistency
 * and makes it easy to add new formats or modify existing ones.
 *
 * Key concepts:
 * - Target profiles define the codec and container settings for each output format
 * - Presets are generated from these profiles with appropriate source filtering
 * - Remux-only presets copy streams without re-encoding for faster processing
 * - Subtitle handling varies by format (keep, convert, burn, or drop)
 *
 * Supported formats (ported from Comet + original Honeymelon):
 * - Video: MP4, MOV, MKV, WebM, GIF, AVI, FLV, M4V, TS, OGV, MPEG
 * - Audio: M4A, MP3, FLAC, WAV, OGG, AAC, AIFF, Opus
 * - Image: PNG, JPEG, WebP, BMP, TIFF
 */

import { AUDIO_CONTAINERS, IMAGE_CONTAINERS, VIDEO_CONTAINERS } from './media-formats';
import type { ACodec, Container, Preset, SubMode, VCodec } from './types';

/**
 * Video target profile interface.
 *
 * Defines the conversion parameters for video output formats,
 * including codecs, subtitle handling, and supported source formats.
 */
interface VideoTargetProfile {
  /** Display label for the format (e.g., "MP4") */
  label: string;
  /** Codec description for UI display (e.g., "H.264 + AAC") */
  codecLabel: string;
  /** Video codec to use for encoding */
  videoCodec: VCodec;
  /** Audio codec to use for encoding */
  audioCodec: ACodec;
  /** How to handle subtitle streams */
  subtitleMode: SubMode;
  /** Optional notes about subtitle handling */
  subtitleNotes?: string;
  /** Source formats that can be converted to this target */
  supportedSources?: readonly Container[];
}

/**
 * Audio target profile interface.
 *
 * Defines the conversion parameters for audio output formats.
 */
interface AudioTargetProfile {
  /** Display label for the format (e.g., "MP3") */
  label: string;
  /** Codec description for UI display (e.g., "AAC") */
  codecLabel: string;
  /** Audio codec to use for encoding */
  audioCodec: ACodec;
  /** Source formats that can be converted to this target */
  supportedSources?: readonly Container[];
}

/**
 * Image target profile interface.
 *
 * Defines the conversion parameters for image output formats.
 */
interface ImageTargetProfile {
  /** Display label for the format (e.g., "PNG") */
  label: string;
  /** Codec description for UI display (e.g., "PNG") */
  codecLabel: string;
  /** Video codec to use (images use video codecs in FFmpeg) */
  videoCodec: VCodec;
  /** Source formats that can be converted to this target */
  supportedSources?: readonly Container[];
}

/**
 * Video target profiles configuration.
 *
 * Defines the conversion settings for each supported video output format.
 * Each profile specifies the codecs, subtitle handling, and compatible sources.
 */
const VIDEO_TARGET_PROFILES: Record<(typeof VIDEO_CONTAINERS)[number], VideoTargetProfile> = {
  mp4: {
    label: 'MP4',
    codecLabel: 'H.264 + AAC',
    videoCodec: 'h264',
    audioCodec: 'aac',
    subtitleMode: 'convert',
    subtitleNotes: 'Text subtitles convert to mov_text.',
    supportedSources: VIDEO_CONTAINERS.filter((c) => c !== 'mp4'),
  },
  mov: {
    label: 'MOV',
    codecLabel: 'H.264 + AAC',
    videoCodec: 'h264',
    audioCodec: 'aac',
    subtitleMode: 'drop',
    subtitleNotes: 'Subtitles must be burned in for MOV.',
    supportedSources: VIDEO_CONTAINERS.filter((c) => c !== 'mov'),
  },
  mkv: {
    label: 'MKV',
    codecLabel: 'Copy streams',
    videoCodec: 'copy',
    audioCodec: 'copy',
    subtitleMode: 'keep',
    supportedSources: VIDEO_CONTAINERS.filter((c) => c !== 'mkv'),
  },
  webm: {
    label: 'WebM',
    codecLabel: 'VP9 + Opus',
    videoCodec: 'vp9',
    audioCodec: 'opus',
    subtitleMode: 'burn',
    subtitleNotes: 'Subtitles require burn-in for WebM.',
    supportedSources: VIDEO_CONTAINERS.filter((c) => c !== 'webm'),
  },
  gif: {
    label: 'GIF',
    codecLabel: 'Animated GIF',
    videoCodec: 'gif',
    audioCodec: 'none',
    subtitleMode: 'drop',
    subtitleNotes: 'GIF output drops audio and subtitle streams.',
    supportedSources: VIDEO_CONTAINERS.filter((c) => c !== 'gif'),
  },
  avi: {
    label: 'AVI',
    codecLabel: 'MPEG-4 + MP3',
    videoCodec: 'mpeg4',
    audioCodec: 'mp3',
    subtitleMode: 'drop',
    subtitleNotes: 'AVI has limited subtitle support; burn-in recommended.',
    supportedSources: VIDEO_CONTAINERS.filter((c) => c !== 'avi'),
  },
  flv: {
    label: 'FLV',
    codecLabel: 'H.264 + AAC',
    videoCodec: 'h264',
    audioCodec: 'aac',
    subtitleMode: 'drop',
    subtitleNotes: 'FLV does not support embedded subtitles.',
    supportedSources: VIDEO_CONTAINERS.filter((c) => c !== 'flv'),
  },
  m4v: {
    label: 'M4V',
    codecLabel: 'H.264 + AAC',
    videoCodec: 'h264',
    audioCodec: 'aac',
    subtitleMode: 'convert',
    subtitleNotes: 'Text subtitles convert to mov_text (Apple compatible).',
    supportedSources: VIDEO_CONTAINERS.filter((c) => c !== 'm4v'),
  },
  ts: {
    label: 'TS',
    codecLabel: 'H.264 + AAC',
    videoCodec: 'h264',
    audioCodec: 'aac',
    subtitleMode: 'drop',
    subtitleNotes: 'Transport stream; subtitles typically burned in.',
    supportedSources: VIDEO_CONTAINERS.filter((c) => c !== 'ts'),
  },
  ogv: {
    label: 'OGV',
    codecLabel: 'Theora + Vorbis',
    videoCodec: 'theora',
    audioCodec: 'vorbis',
    subtitleMode: 'drop',
    subtitleNotes: 'Ogg Video has limited subtitle support.',
    supportedSources: VIDEO_CONTAINERS.filter((c) => c !== 'ogv'),
  },
  mpeg: {
    label: 'MPEG',
    codecLabel: 'MPEG-2 + MP2',
    videoCodec: 'mpeg2video',
    audioCodec: 'mp2',
    subtitleMode: 'drop',
    subtitleNotes: 'Legacy format; subtitles not supported in output.',
    supportedSources: VIDEO_CONTAINERS.filter((c) => c !== 'mpeg'),
  },
};

/**
 * Audio target profiles configuration.
 *
 * Defines the conversion settings for each supported audio output format.
 */
const AUDIO_TARGET_PROFILES: Record<(typeof AUDIO_CONTAINERS)[number], AudioTargetProfile> = {
  m4a: {
    label: 'M4A',
    codecLabel: 'AAC',
    audioCodec: 'aac',
    supportedSources: AUDIO_CONTAINERS.filter((c) => c !== 'm4a'),
  },
  mp3: {
    label: 'MP3',
    codecLabel: 'MP3',
    audioCodec: 'mp3',
    supportedSources: AUDIO_CONTAINERS.filter((c) => c !== 'mp3'),
  },
  flac: {
    label: 'FLAC',
    codecLabel: 'FLAC',
    audioCodec: 'flac',
    supportedSources: AUDIO_CONTAINERS.filter((c) => c !== 'flac'),
  },
  wav: {
    label: 'WAV',
    codecLabel: 'PCM',
    audioCodec: 'pcm_s16le',
    supportedSources: AUDIO_CONTAINERS.filter((c) => c !== 'wav'),
  },
  ogg: {
    label: 'Ogg',
    codecLabel: 'Vorbis',
    audioCodec: 'vorbis',
    supportedSources: AUDIO_CONTAINERS.filter((c) => c !== 'ogg'),
  },
  aac: {
    label: 'AAC',
    codecLabel: 'AAC',
    audioCodec: 'aac',
    supportedSources: AUDIO_CONTAINERS.filter((c) => c !== 'aac'),
  },
  aiff: {
    label: 'AIFF',
    codecLabel: 'PCM',
    audioCodec: 'pcm_s16le',
    supportedSources: AUDIO_CONTAINERS.filter((c) => c !== 'aiff'),
  },
  opus: {
    label: 'Opus',
    codecLabel: 'Opus',
    audioCodec: 'opus',
    supportedSources: AUDIO_CONTAINERS.filter((c) => c !== 'opus'),
  },
};

/**
 * Image target profiles configuration.
 *
 * Defines the conversion settings for each supported image output format.
 */
const IMAGE_TARGET_PROFILES: Record<(typeof IMAGE_CONTAINERS)[number], ImageTargetProfile> = {
  png: {
    label: 'PNG',
    codecLabel: 'PNG',
    videoCodec: 'png',
    supportedSources: IMAGE_CONTAINERS.filter((c) => c !== 'png'),
  },
  jpg: {
    label: 'JPEG',
    codecLabel: 'JPEG',
    videoCodec: 'mjpeg',
    supportedSources: IMAGE_CONTAINERS.filter((c) => c !== 'jpg'),
  },
  webp: {
    label: 'WebP',
    codecLabel: 'WebP',
    videoCodec: 'webp',
    supportedSources: IMAGE_CONTAINERS.filter((c) => c !== 'webp'),
  },
  bmp: {
    label: 'BMP',
    codecLabel: 'BMP',
    videoCodec: 'bmp',
    supportedSources: IMAGE_CONTAINERS.filter((c) => c !== 'bmp'),
  },
  tiff: {
    label: 'TIFF',
    codecLabel: 'TIFF',
    videoCodec: 'tiff',
    supportedSources: IMAGE_CONTAINERS.filter((c) => c !== 'tiff'),
  },
};

/**
 * Builds video conversion presets.
 *
 * Generates preset objects for all video target formats based on the
 * target profiles configuration. Each preset includes codec settings,
 * subtitle handling, and source compatibility information.
 */
function buildVideoPresets(): Preset[] {
  const presets: Preset[] = [];

  for (const target of VIDEO_CONTAINERS) {
    const targetProfile = VIDEO_TARGET_PROFILES[target];
    const id = `video-to-${target}`;

    const preset: Preset = {
      id,
      label: `${targetProfile.label} (${targetProfile.codecLabel})`,
      mediaKind: 'video',
      sourceContainers: [...(targetProfile.supportedSources ?? [])],
      container: target,
      description: `Convert video to ${targetProfile.label} with ${targetProfile.codecLabel}.`,
      video: {
        codec: targetProfile.videoCodec,
      },
      audio: {
        codec: targetProfile.audioCodec,
      },
      subs: {
        mode: targetProfile.subtitleMode,
        notes: targetProfile.subtitleNotes,
      },
      outputExtension: target,
      remuxOnly: targetProfile.videoCodec === 'copy' && targetProfile.audioCodec === 'copy',
    };

    presets.push(preset);
  }

  // Add HEVC (H.265) preset for MP4
  presets.push({
    id: 'video-to-mp4-hevc',
    label: 'MP4 (HEVC/H.265 + AAC)',
    mediaKind: 'video',
    sourceContainers: [...VIDEO_CONTAINERS.filter((c) => c !== 'mp4')],
    container: 'mp4',
    description: 'Convert video to MP4 with HEVC/H.265 codec for better compression.',
    video: {
      codec: 'hevc',
    },
    audio: {
      codec: 'aac',
    },
    subs: {
      mode: 'convert',
      notes: 'Text subtitles convert to mov_text.',
    },
    outputExtension: 'mp4',
  });

  // Add HEVC (H.265) preset for MOV
  presets.push({
    id: 'video-to-mov-hevc',
    label: 'MOV (HEVC/H.265 + AAC)',
    mediaKind: 'video',
    sourceContainers: [...VIDEO_CONTAINERS.filter((c) => c !== 'mov')],
    container: 'mov',
    description: 'Convert video to MOV with HEVC/H.265 codec for better compression.',
    video: {
      codec: 'hevc',
    },
    audio: {
      codec: 'aac',
    },
    subs: {
      mode: 'drop',
      notes: 'Subtitles must be burned in for MOV.',
    },
    outputExtension: 'mov',
  });

  // Add ProRes preset for MOV
  presets.push({
    id: 'video-to-mov-prores',
    label: 'MOV (ProRes + PCM)',
    mediaKind: 'video',
    sourceContainers: [...VIDEO_CONTAINERS.filter((c) => c !== 'mov')],
    container: 'mov',
    description: 'Convert video to MOV with ProRes codec for professional editing workflows.',
    video: {
      codec: 'prores',
    },
    audio: {
      codec: 'pcm_s16le',
    },
    subs: {
      mode: 'drop',
      notes: 'Subtitles must be burned in for MOV.',
    },
    outputExtension: 'mov',
  });

  return presets;
}

/**
 * Builds audio conversion presets.
 *
 * Generates preset objects for all audio target formats. Audio presets
 * typically don't include video or subtitle streams.
 */
function buildAudioPresets(): Preset[] {
  const presets: Preset[] = [];

  for (const target of AUDIO_CONTAINERS) {
    const targetProfile = AUDIO_TARGET_PROFILES[target];
    const id = `audio-to-${target}`;

    const preset: Preset = {
      id,
      label: `${targetProfile.label} (${targetProfile.codecLabel})`,
      mediaKind: 'audio',
      sourceContainers: [...(targetProfile.supportedSources ?? [])],
      container: target,
      description: `Convert audio to ${targetProfile.label} with ${targetProfile.codecLabel}.`,
      video: {
        codec: 'none',
      },
      audio: {
        codec: targetProfile.audioCodec,
      },
      subs: {
        mode: 'drop',
      },
      outputExtension: target,
    };

    presets.push(preset);
  }

  return presets;
}

/**
 * Builds image conversion presets.
 *
 * Generates preset objects for all image target formats. Image presets
 * use video codecs (since FFmpeg treats images as single-frame videos)
 * and drop audio/subtitle streams.
 */
function buildImagePresets(): Preset[] {
  const presets: Preset[] = [];

  for (const target of IMAGE_CONTAINERS) {
    const targetProfile = IMAGE_TARGET_PROFILES[target];
    const id = `image-to-${target}`;

    const preset: Preset = {
      id,
      label: `${targetProfile.label} (${targetProfile.codecLabel})`,
      mediaKind: 'image',
      sourceContainers: [...(targetProfile.supportedSources ?? [])],
      container: target,
      description: `Convert image to ${targetProfile.label} format.`,
      video: {
        codec: targetProfile.videoCodec,
      },
      audio: {
        codec: 'none',
      },
      subs: {
        mode: 'drop',
      },
      outputExtension: target,
    };

    presets.push(preset);
  }

  return presets;
}

/**
 * Complete list of all available presets.
 *
 * Combines video, audio, and image presets into a single array
 * that can be used throughout the application.
 */
export const PRESETS: Preset[] = [
  ...buildVideoPresets(),
  ...buildAudioPresets(),
  ...buildImagePresets(),
];

/**
 * Default preset identifier.
 *
 * The ID of the first available preset, used as a fallback
 * when no specific preset is selected.
 */
export const DEFAULT_PRESET_ID = PRESETS[0]?.id ?? '';
