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
 * Supported formats:
 * - Video: MP4, MOV, MKV, WebM, GIF
 * - Audio: M4A, MP3, FLAC, WAV
 * - Image: PNG, JPEG, WebP
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
