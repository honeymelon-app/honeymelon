import { LIMITS, DEFAULTS } from '../constants';
import type {
  CapabilitySnapshot,
  Preset,
  ProbeSummary,
  Tier,
  TierDefaults,
  VCodec,
} from '../types';

const VIDEO_ENCODERS: Record<VCodec, string[] | string | null> = {
  copy: 'copy',
  none: null,
  h264: ['h264_videotoolbox', 'libx264'],
  hevc: ['hevc_videotoolbox', 'libx265'],
  vp9: ['libvpx-vp9'],
  av1: ['libaom-av1', 'libsvtav1'],
  gif: 'gif',
  prores: ['prores_videotoolbox', 'prores_ks'],
  png: 'png',
  mjpeg: 'mjpeg',
  webp: 'libwebp',
};

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

function selectBestEncoder(
  encoders: string[] | string | null,
  capabilities?: CapabilitySnapshot,
): string | null {
  if (encoders === null || encoders === 'copy') {
    return encoders;
  }

  if (typeof encoders === 'string') {
    return encoders;
  }

  if (!capabilities) {
    return encoders[encoders.length - 1] ?? null;
  }

  for (const encoder of encoders) {
    if (capabilities.videoEncoders.has(encoder)) {
      return encoder;
    }
  }

  return encoders[encoders.length - 1] ?? null;
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
  constructor(private capabilities?: CapabilitySnapshot) {}

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
    let encoder = selectBestEncoder(VIDEO_ENCODERS[preset.video.codec], this.capabilities);
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

      const encoderOptions = VIDEO_ENCODERS[preset.video.codec];
      const isHardwareAccelerated =
        selectedEncoder.includes('videotoolbox') ||
        selectedEncoder.includes('_qsv') ||
        selectedEncoder.includes('_nvenc');

      if (
        encoderOptions &&
        this.capabilities &&
        typeof encoderOptions !== 'string' &&
        Array.isArray(encoderOptions)
      ) {
        const hasAnyEncoder = encoderOptions.some((enc) =>
          this.capabilities!.videoEncoders.has(enc),
        );
        if (!hasAnyEncoder) {
          warnings.push(
            `None of the encoders for ${preset.video.codec} are available; transcode may fail.`,
          );
        }
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

    const encoder = selectBestEncoder(VIDEO_ENCODERS[preset.video.codec], this.capabilities);

    if (!encoder) {
      warnings.push(`Unknown image codec: ${preset.video.codec}`);
    } else if (
      typeof encoder === 'string' &&
      this.capabilities &&
      !this.capabilities.videoEncoders.has(encoder)
    ) {
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
