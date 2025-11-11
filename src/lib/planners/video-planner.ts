import { LIMITS, DEFAULTS } from '../constants';
import type {
  CapabilitySnapshot,
  Preset,
  ProbeSummary,
  Tier,
  TierDefaults,
  VCodec,
} from '../types';
import {
  DEFAULT_VIDEO_STRATEGY,
  type VideoEncoderSelectionStrategy,
} from '../strategies/encoder-strategy';

const TIER_PRIORITY: Tier[] = ['balanced', 'fast', 'high'];

export interface VideoAction {
  action: 'copy' | 'transcode' | 'drop';
  encoder: string | null;
  note: string;
}

export interface VideoTierResult<T = unknown> {
  tier: Tier;
  value?: T;
  usedFallback: boolean;
}

function normalizeCodec(value: string | undefined): string | undefined {
  return value?.toLowerCase();
}

function resolveTierDefaults<T>(
  tiers: Partial<Record<Tier, T>> | undefined,
  requested: Tier,
): { tier: Tier; value?: T; usedFallback: boolean } {
  if (!tiers) {
    return { tier: requested, usedFallback: false };
  }

  const direct = tiers[requested];
  if (direct) {
    return { tier: requested, value: direct, usedFallback: false };
  }

  for (const candidate of TIER_PRIORITY) {
    const fallback = tiers[candidate];
    if (fallback) {
      return {
        tier: candidate,
        value: fallback,
        usedFallback: candidate !== requested,
      };
    }
  }

  return { tier: requested, usedFallback: false };
}

function resolveVideoProfile(codec: VCodec, profile: string): string | undefined {
  if (codec !== 'prores') {
    return profile;
  }

  const normalized = profile.trim().toLowerCase();
  switch (normalized) {
    case '422':
    case 'standard':
      return 'standard';
    case '422hq':
    case 'hq':
      return 'hq';
    case '4444':
      return '4444';
    case '4444xq':
      return '4444xq';
    case 'proxy':
      return 'proxy';
    case 'lt':
    case '422lt':
      return 'lt';
    default:
      return profile;
  }
}

export class VideoPlanner {
  constructor(
    private capabilities?: CapabilitySnapshot,
    private encoderStrategy: VideoEncoderSelectionStrategy = DEFAULT_VIDEO_STRATEGY,
  ) {}

  plan(
    summary: ProbeSummary,
    preset: Preset,
    tier: Tier,
    warnings: string[],
  ): {
    action: VideoAction;
    tierResult: VideoTierResult<TierDefaults['video']>;
  } {
    const tierResult = resolveTierDefaults(preset.video.tiers, tier);
    const sourceVideoCodec = normalizeCodec(summary.vcodec);

    let action: 'copy' | 'transcode' | 'drop';
    let encoder = this.encoderStrategy.selectEncoder(preset.video.codec, this.capabilities);
    let note: string;

    if (preset.video.codec === 'none') {
      action = 'drop';
      note = 'Video: disabled by preset.';
    } else if (!sourceVideoCodec) {
      action = 'drop';
      note = 'Video: input provides no video stream.';
      warnings.push('Input contains no video stream; output will omit video.');
    } else if (preset.video.codec === 'copy') {
      action = 'copy';
      encoder = 'copy';
      note = `Video: copy source codec ${sourceVideoCodec}.`;
    } else if (sourceVideoCodec === preset.video.codec) {
      action = 'copy';
      encoder = 'copy';
      note = `Video: copy matching codec ${sourceVideoCodec}.`;
    } else {
      action = 'transcode';
      const selectedEncoder = encoder ?? preset.video.codec;
      encoder = selectedEncoder;

      const isHardwareAccelerated =
        selectedEncoder.includes('videotoolbox') ||
        selectedEncoder.includes('_qsv') ||
        selectedEncoder.includes('_nvenc');

      // Check if encoder is available in capabilities
      if (this.capabilities && encoder && !this.capabilities.videoEncoders.has(encoder)) {
        warnings.push(
          `Encoder ${encoder} for ${preset.video.codec} is not available; transcode may fail.`,
        );
      }

      const accelerationNote = isHardwareAccelerated ? ' (hardware accelerated)' : '';
      note = `Video: transcode ${sourceVideoCodec ?? 'unknown'} → ${preset.video.codec} with ${encoder}${accelerationNote}.`;
    }

    if (action === 'drop' && preset.video.codec !== 'none') {
      warnings.push('Preset expects video output but planner is dropping the stream.');
    }

    return {
      action: { action, encoder, note },
      tierResult,
    };
  }

  planGif(
    summary: ProbeSummary,
    _preset: Preset,
    warnings: string[],
  ): {
    args: string[];
    notes: string[];
  } {
    const notes: string[] = [];

    if (summary.durationSec > LIMITS.GIF_MAX_DURATION_SEC) {
      warnings.push(
        `GIF preset performs best on clips under ~${LIMITS.GIF_MAX_DURATION_SEC} seconds; consider trimming the source.`,
      );
    }

    const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

    const sourceFps = summary.fps ?? 0;
    const targetFps = clamp(
      Math.round(sourceFps) || DEFAULTS.GIF_DEFAULT_FPS,
      LIMITS.GIF_MIN_FPS,
      LIMITS.GIF_MAX_FPS,
    );
    if (!summary.fps) {
      notes.push(`Video: using default ${DEFAULTS.GIF_DEFAULT_FPS} fps for GIF output.`);
    } else if (Math.abs(targetFps - sourceFps) >= 1) {
      notes.push(`Video: fps clamped from ${Math.round(sourceFps)} → ${targetFps} for GIF output.`);
    }

    const measuredWidth =
      summary.width && summary.width > 0 ? summary.width : DEFAULTS.GIF_FALLBACK_WIDTH;
    const limitedWidth = clamp(measuredWidth, LIMITS.GIF_MIN_WIDTH, LIMITS.GIF_MAX_WIDTH);
    const evenWidth = limitedWidth % 2 === 0 ? limitedWidth : limitedWidth - 1;
    const finalWidth = evenWidth >= LIMITS.GIF_MIN_WIDTH ? evenWidth : DEFAULTS.GIF_FALLBACK_WIDTH;
    if (summary.width && summary.width > LIMITS.GIF_MAX_WIDTH) {
      notes.push(`Video: width limited to ${finalWidth}px to keep GIF size manageable.`);
    }

    const filter =
      `[0:v]fps=${targetFps},scale=${finalWidth}:-2:flags=lanczos,split[s0][s1];` +
      '[s0]palettegen=stats_mode=single[p];[s1][p]paletteuse=dither=bayer:bayer_scale=3[out]';

    const args = [
      '-filter_complex',
      filter,
      '-map',
      '[out]',
      '-gifflags',
      '-transdiff',
      '-loop',
      '0',
      '-c:v',
      'gif',
      '-an',
      '-sn',
    ];

    notes.push(`Video: transcode to GIF at ${targetFps} fps with palette optimisation.`);

    return { args, notes };
  }

  planImage(
    preset: Preset,
    warnings: string[],
  ): {
    args: string[];
    notes: string[];
  } {
    const notes: string[] = [];
    const args: string[] = [];

    const encoder = this.encoderStrategy.selectEncoder(preset.video.codec, this.capabilities);

    if (!encoder) {
      warnings.push(`Unknown image codec: ${preset.video.codec}`);
    } else if (this.capabilities && !this.capabilities.videoEncoders.has(encoder)) {
      warnings.push(`Encoder ${encoder} not reported by FFmpeg; conversion may fail.`);
    }

    const formatMap: Record<string, string> = {
      png: 'image2',
      jpg: 'image2',
      jpeg: 'image2',
      webp: 'image2',
      gif: 'image2',
    };

    const outputFormat = formatMap[preset.container];
    if (outputFormat) {
      args.push('-f', outputFormat);
    }

    args.push('-c:v', encoder || preset.video.codec);

    if (preset.video.codec === 'mjpeg') {
      args.push('-q:v', '2');
    } else if (preset.video.codec === 'webp') {
      args.push('-quality', '90');
    }

    args.push('-frames:v', '1');

    notes.push(
      `Image: converting to ${preset.container.toUpperCase()} format with ${preset.video.codec} codec.`,
    );

    return { args, notes };
  }
}

export { resolveVideoProfile, resolveTierDefaults };
