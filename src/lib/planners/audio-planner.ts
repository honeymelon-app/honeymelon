import type { CapabilitySnapshot, Preset, ProbeSummary, Tier, TierDefaults } from '../types';
import type { VideoTierResult } from './video-planner';
import { resolveTierDefaults } from './video-planner';
import {
  DEFAULT_AUDIO_STRATEGY,
  type AudioEncoderSelectionStrategy,
} from '../strategies/encoder-strategy';

export interface AudioAction {
  action: 'copy' | 'transcode' | 'drop';
  encoder: string | null | undefined;
  note: string;
}

function normalizeCodec(value: string | undefined): string | undefined {
  return value?.toLowerCase();
}

export class AudioPlanner {
  constructor(
    private capabilities?: CapabilitySnapshot,
    private encoderStrategy: AudioEncoderSelectionStrategy = DEFAULT_AUDIO_STRATEGY,
  ) {}

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
    let encoder = this.encoderStrategy.selectEncoder(preset.audio.codec, this.capabilities);
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

      // Check if encoder is available in capabilities
      if (this.capabilities && encoder && !this.capabilities.audioEncoders.has(encoder)) {
        warnings.push(`Encoder ${encoder} not reported by FFmpeg; transcode may fail.`);
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
