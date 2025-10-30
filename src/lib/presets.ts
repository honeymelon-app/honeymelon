import type { Preset } from './types';

export const DEFAULT_PRESET_ID = 'mp4-h264-aac-balanced';

export const PRESETS: Preset[] = [
  {
    id: 'mp4-h264-aac-balanced',
    label: 'MP4 | H.264 + AAC',
    container: 'mp4',
    description: 'Compatible MP4 for general playback on Apple platforms and beyond.',
    video: {
      codec: 'h264',
      tiers: {
        fast: { bitrateK: 4500, maxrateK: 6000, bufsizeK: 9000 },
        balanced: { bitrateK: 6000, maxrateK: 9000, bufsizeK: 12000 },
        high: { bitrateK: 9000, maxrateK: 13000, bufsizeK: 18000 },
      },
      copyColorMetadata: true,
    },
    audio: {
      codec: 'aac',
      tiers: {
        fast: { bitrateK: 128 },
        balanced: { bitrateK: 160 },
        high: { bitrateK: 192 },
      },
      stereoOnly: true,
    },
    subs: {
      mode: 'convert',
      burnInAvailable: true,
      notes: 'Text subtitles convert to mov_text; image subs require burn-in.',
    },
  },
  {
    id: 'mp4-hevc-aac',
    label: 'MP4 | HEVC + AAC',
    container: 'mp4',
    description: 'Smaller MP4 using hardware HEVC encode on Apple Silicon.',
    video: {
      codec: 'hevc',
      tiers: {
        fast: { bitrateK: 3000, maxrateK: 4500, bufsizeK: 7000 },
        balanced: { bitrateK: 3800, maxrateK: 5200, bufsizeK: 8000 },
        high: { bitrateK: 5500, maxrateK: 7500, bufsizeK: 11000 },
      },
      copyColorMetadata: true,
    },
    audio: {
      codec: 'aac',
      tiers: {
        fast: { bitrateK: 128 },
        balanced: { bitrateK: 160 },
        high: { bitrateK: 192 },
      },
      stereoOnly: true,
    },
    subs: {
      mode: 'convert',
      burnInAvailable: true,
      notes: 'Text subtitles convert to mov_text; image subs require burn-in.',
    },
  },
  {
    id: 'webm-vp9-opus',
    label: 'WebM | VP9 + Opus',
    container: 'webm',
    description: 'Web-friendly VP9 with Opus audio; requires libvpx + libopus.',
    video: {
      codec: 'vp9',
      tiers: {
        fast: { bitrateK: 2800 },
        balanced: { bitrateK: 3500 },
        high: { bitrateK: 4500 },
      },
    },
    audio: {
      codec: 'opus',
      tiers: {
        fast: { bitrateK: 112 },
        balanced: { bitrateK: 128 },
        high: { bitrateK: 160 },
      },
      stereoOnly: true,
    },
    subs: {
      mode: 'burn',
      burnInAvailable: true,
      notes: 'Subtitles require burn-in for WebM in v1.',
    },
  },
  {
    id: 'webm-av1-opus',
    label: 'WebM | AV1 + Opus (Experimental)',
    container: 'webm',
    description: 'Experimental AV1 encode; significantly slower than VP9/HEVC.',
    video: {
      codec: 'av1',
      tiers: {
        fast: { bitrateK: 2200 },
        balanced: { bitrateK: 3000 },
        high: { bitrateK: 4200 },
      },
    },
    audio: {
      codec: 'opus',
      tiers: {
        fast: { bitrateK: 112 },
        balanced: { bitrateK: 128 },
        high: { bitrateK: 160 },
      },
      stereoOnly: true,
    },
    subs: {
      mode: 'burn',
      burnInAvailable: true,
      notes: 'Subtitles require burn-in for WebM in v1.',
    },
    experimental: true,
  },
  {
    id: 'mov-prores-pcm',
    label: 'MOV | ProRes 422 HQ + PCM',
    container: 'mov',
    description: 'Editing/archival preset targeting ProRes 422 HQ and uncompressed audio.',
    video: {
      codec: 'prores',
      tiers: {
        fast: { profile: '422', bitrateK: 100000 },
        balanced: { profile: '422hq', bitrateK: 147000 },
        high: { profile: '422hq', bitrateK: 220000 },
      },
    },
    audio: {
      codec: 'pcm_s16le',
    },
    subs: {
      mode: 'burn',
      burnInAvailable: true,
      notes: 'Subtitles must be burned in for MOV in v1.',
    },
  },
  {
    id: 'mkv-passthrough',
    label: 'MKV | Passthrough',
    container: 'mkv',
    description: 'Copy existing streams into Matroska without re-encode when possible.',
    video: {
      codec: 'copy',
    },
    audio: {
      codec: 'copy',
    },
    subs: {
      mode: 'keep',
      burnInAvailable: true,
    },
    remuxOnly: true,
  },
  {
    id: 'gif-export',
    label: 'GIF | Animated GIF',
    container: 'gif',
    description: 'Short social-friendly GIF export; best for clips under 20 seconds.',
    video: {
      codec: 'none',
    },
    audio: {
      codec: 'none',
    },
    subs: {
      mode: 'drop',
      notes: 'GIF output drops audio and subtitle streams.',
    },
    tags: ['length-guard'],
  },
  {
    id: 'audio-m4a',
    label: 'Audio | M4A (AAC)',
    container: 'm4a',
    description: 'Stereo AAC in M4A container.',
    video: {
      codec: 'none',
    },
    audio: {
      codec: 'aac',
      tiers: {
        fast: { bitrateK: 128 },
        balanced: { bitrateK: 160 },
        high: { bitrateK: 192 },
      },
      stereoOnly: true,
    },
  },
  {
    id: 'audio-mp3',
    label: 'Audio | MP3',
    container: 'mp3',
    description: 'Legacy MP3 output when AAC is not preferred.',
    video: {
      codec: 'none',
    },
    audio: {
      codec: 'mp3',
      tiers: {
        fast: { bitrateK: 128 },
        balanced: { bitrateK: 160 },
        high: { bitrateK: 192 },
      },
      stereoOnly: true,
    },
  },
  {
    id: 'audio-flac',
    label: 'Audio | FLAC',
    container: 'flac',
    description: 'Lossless FLAC audio archive.',
    video: {
      codec: 'none',
    },
    audio: {
      codec: 'flac',
    },
  },
  {
    id: 'audio-wav',
    label: 'Audio | WAV (PCM)',
    container: 'wav',
    description: 'Uncompressed PCM WAV output.',
    video: {
      codec: 'none',
    },
    audio: {
      codec: 'pcm_s16le',
    },
  },
  {
    id: 'remux-mp4',
    label: 'Remux → MP4',
    container: 'mp4',
    description: 'Copy compatible streams into MP4 without re-encoding.',
    video: {
      codec: 'copy',
    },
    audio: {
      codec: 'copy',
    },
    subs: {
      mode: 'convert',
      burnInAvailable: true,
      notes: 'Non mov_text subs convert when possible; otherwise require burn-in.',
    },
    remuxOnly: true,
  },
  {
    id: 'remux-mkv',
    label: 'Remux → MKV',
    container: 'mkv',
    description: 'Copy streams into MKV for maximum compatibility.',
    video: {
      codec: 'copy',
    },
    audio: {
      codec: 'copy',
    },
    subs: {
      mode: 'keep',
      burnInAvailable: true,
    },
    remuxOnly: true,
  },
];
