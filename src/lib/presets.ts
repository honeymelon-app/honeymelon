import { AUDIO_CONTAINERS, IMAGE_CONTAINERS, VIDEO_CONTAINERS } from './media-formats';
import type { ACodec, Container, Preset, SubMode, VCodec } from './types';

interface VideoTargetProfile {
  label: string;
  codecLabel: string;
  videoCodec: VCodec;
  audioCodec: ACodec;
  subtitleMode: SubMode;
  subtitleNotes?: string;
  supportedSources?: readonly Container[];
}

interface AudioTargetProfile {
  label: string;
  codecLabel: string;
  audioCodec: ACodec;
  supportedSources?: readonly Container[];
}

interface ImageTargetProfile {
  label: string;
  codecLabel: string;
  videoCodec: VCodec;
  supportedSources?: readonly Container[];
}

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

export const PRESETS: Preset[] = [
  ...buildVideoPresets(),
  ...buildAudioPresets(),
  ...buildImagePresets(),
];

export const DEFAULT_PRESET_ID = PRESETS[0]?.id ?? '';
