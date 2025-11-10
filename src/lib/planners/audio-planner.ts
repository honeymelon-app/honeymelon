import type {
  ACodec,
  CapabilitySnapshot,
  Preset,
  ProbeSummary,
  Tier,
  TierDefaults,
} from '../types';
import type { VideoTierResult } from './video-planner';
import { resolveTierDefaults } from './video-planner';

const AUDIO_ENCODERS: Record<ACodec, string | null> = {
  copy: 'copy',
  none: null,
  aac: 'aac',
  alac: 'alac',
  mp3: 'libmp3lame',
  opus: 'libopus',
  vorbis: 'libvorbis',
  flac: 'flac',
  pcm_s16le: 'pcm_s16le',
};

export interface AudioAction {
  action: 'copy' | 'transcode' | 'drop';
  encoder: string | null | undefined;
  note: string;
}

function normalizeCodec(value: string | undefined): string | undefined {
  return value?.toLowerCase();
}

export class AudioPlanner {
  constructor(private capabilities?: CapabilitySnapshot) {}

  plan(
    summary: ProbeSummary,
    preset: Preset,
    tier: Tier,
    warnings: string[],
  ): {
    action: AudioAction;
    tierResult: VideoTierResult<TierDefaults['audio']>;
  } {
    const tierResult = resolveTierDefaults(preset.audio.tiers, tier);
    const sourceAudioCodec = normalizeCodec(summary.acodec);

    let action: 'copy' | 'transcode' | 'drop';
    let encoder = AUDIO_ENCODERS[preset.audio.codec] ?? undefined;
    let note: string;

    if (preset.audio.codec === 'none') {
      action = 'drop';
      note = 'Audio: disabled by preset.';
    } else if (!sourceAudioCodec) {
      action = 'drop';
      note = 'Audio: input provides no audio stream.';
      warnings.push('Input contains no audio stream; output will omit audio.');
    } else if (preset.audio.codec === 'copy') {
      action = 'copy';
      encoder = 'copy';
      note = `Audio: copy source codec ${sourceAudioCodec}.`;
    } else if (sourceAudioCodec === preset.audio.codec) {
      action = 'copy';
      encoder = 'copy';
      note = `Audio: copy matching codec ${sourceAudioCodec}.`;
    } else {
      action = 'transcode';
      encoder = encoder ?? preset.audio.codec;
      const requiredEncoder = AUDIO_ENCODERS[preset.audio.codec];
      if (
        requiredEncoder &&
        this.capabilities &&
        !this.capabilities.audioEncoders.has(requiredEncoder)
      ) {
        warnings.push(`Encoder ${requiredEncoder} not reported by FFmpeg; transcode may fail.`);
      }
      note = `Audio: transcode ${sourceAudioCodec ?? 'unknown'} → ${preset.audio.codec} with ${encoder}.`;
    }

    if (action === 'drop' && preset.audio.codec !== 'none') {
      warnings.push('Preset expects audio output but planner is dropping the stream.');
    }

    return {
      action: { action, encoder, note },
      tierResult,
    };
  }
}
