import { AUDIO_CONTAINERS, VIDEO_CONTAINERS } from './media-formats';
import type { ACodec, Preset, SubMode, VCodec } from './types';

interface VideoTargetProfile {
  label: string;
  videoCodec: VCodec;
  audioCodec: ACodec;
  subtitleMode: SubMode;
  subtitleNotes?: string;
}

interface AudioTargetProfile {
  label: string;
  audioCodec: ACodec;
}

const VIDEO_TARGET_PROFILES: Record<(typeof VIDEO_CONTAINERS)[number], VideoTargetProfile> = {
  mp4: {
    label: 'MP4',
    videoCodec: 'h264',
    audioCodec: 'aac',
    subtitleMode: 'convert',
    subtitleNotes: 'Text subtitles convert to mov_text.',
  },
  mov: {
    label: 'MOV',
    videoCodec: 'h264',
    audioCodec: 'aac',
    subtitleMode: 'drop',
    subtitleNotes: 'Subtitles must be burned in for MOV.',
  },
  mkv: {
    label: 'MKV',
    videoCodec: 'copy',
    audioCodec: 'copy',
    subtitleMode: 'keep',
  },
  webm: {
    label: 'WebM',
    videoCodec: 'vp9',
    audioCodec: 'opus',
    subtitleMode: 'burn',
    subtitleNotes: 'Subtitles require burn-in for WebM.',
  },
  gif: {
    label: 'GIF',
    videoCodec: 'gif',
    audioCodec: 'none',
    subtitleMode: 'drop',
    subtitleNotes: 'GIF output drops audio and subtitle streams.',
  },
};

const AUDIO_TARGET_PROFILES: Record<(typeof AUDIO_CONTAINERS)[number], AudioTargetProfile> = {
  m4a: {
    label: 'M4A',
    audioCodec: 'aac',
  },
  mp3: {
    label: 'MP3',
    audioCodec: 'mp3',
  },
  flac: {
    label: 'FLAC',
    audioCodec: 'flac',
  },
  wav: {
    label: 'WAV',
    audioCodec: 'pcm_s16le',
  },
};

function buildVideoPresets(): Preset[] {
  const presets: Preset[] = [];

  for (const source of VIDEO_CONTAINERS) {
    for (const target of VIDEO_CONTAINERS) {
      if (source === target) {
        continue;
      }

      const sourceProfile = VIDEO_TARGET_PROFILES[source];
      const targetProfile = VIDEO_TARGET_PROFILES[target];
      const id = `video-${source}-to-${target}`;

      const preset: Preset = {
        id,
        label: `${sourceProfile.label} → ${targetProfile.label}`,
        mediaKind: 'video',
        sourceContainers: [source],
        container: target,
        description: `Convert ${sourceProfile.label} video to ${targetProfile.label}.`,
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
  }

  return presets;
}

function buildAudioPresets(): Preset[] {
  const presets: Preset[] = [];

  for (const source of AUDIO_CONTAINERS) {
    for (const target of AUDIO_CONTAINERS) {
      if (source === target) {
        continue;
      }

      const sourceProfile = AUDIO_TARGET_PROFILES[source];
      const targetProfile = AUDIO_TARGET_PROFILES[target];
      const id = `audio-${source}-to-${target}`;

      const preset: Preset = {
        id,
        label: `${sourceProfile.label} → ${targetProfile.label}`,
        mediaKind: 'audio',
        sourceContainers: [source],
        container: target,
        description: `Convert ${sourceProfile.label} audio to ${targetProfile.label}.`,
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
  }

  return presets;
}

export const PRESETS: Preset[] = [...buildVideoPresets(), ...buildAudioPresets()];

export const DEFAULT_PRESET_ID = PRESETS[0]?.id ?? '';
