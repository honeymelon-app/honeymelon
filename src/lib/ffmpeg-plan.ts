import { CONTAINER_RULES } from './container-rules';
import type { ContainerRule } from './container-rules';
import { DEFAULT_PRESET_ID, PRESETS } from './presets';
import type {
  CapabilitySnapshot,
  ACodec,
  Container,
  Preset,
  ProbeSummary,
  Tier,
  VCodec,
} from './types';

const VIDEO_ENCODERS: Record<VCodec, string | null> = {
  copy: 'copy',
  none: null,
  h264: 'libx264',
  hevc: 'libx265',
  vp9: 'libvpx-vp9',
  av1: 'libaom-av1',
  gif: 'gif',
  prores: 'prores_ks',
};

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

const SUBTITLE_CONVERT_CODEC = 'mov_text';

const TIER_PRIORITY: Tier[] = ['balanced', 'fast', 'high'];

export interface PlannerContext {
  presetId: string;
  summary: ProbeSummary;
  capabilities?: CapabilitySnapshot;
  requestedTier?: Tier;
}

export interface PlannerDecision {
  preset: Preset;
  ffmpegArgs: string[];
  remuxOnly: boolean;
  notes: string[];
  warnings: string[];
}

export function resolvePreset(id: string): Preset | undefined {
  return PRESETS.find((preset) => preset.id === id);
}

export function listSupportedPresets(_capabilities?: CapabilitySnapshot): Preset[] {
  return PRESETS;
}

export function planJob(context: PlannerContext): PlannerDecision {
  const preset =
    resolvePreset(context.presetId) ??
    PRESETS.find((candidate) => candidate.id === DEFAULT_PRESET_ID)!;

  if (preset.container === 'gif') {
    return planGifJob(context, preset);
  }

  const desiredTier: Tier = context.requestedTier ?? 'balanced';
  const notes: string[] = [];
  const warnings: string[] = [];
  const args: string[] = [];

  const containerRule = CONTAINER_RULES[preset.container];

  validatePresetAvailability(preset, containerRule, warnings);

  const videoTier = resolveTierDefaults(preset.video.tiers, desiredTier);
  const audioTier = resolveTierDefaults(preset.audio.tiers, desiredTier);

  if (videoTier.usedFallback) {
    notes.push(`Video tier fallback applied: using ${videoTier.tier}.`);
  }
  if (audioTier.usedFallback) {
    notes.push(`Audio tier fallback applied: using ${audioTier.tier}.`);
  }

  const sourceVideoCodec = normalizeCodec(context.summary.vcodec);
  const sourceAudioCodec = normalizeCodec(context.summary.acodec);

  let videoAction: 'copy' | 'transcode' | 'drop';
  let videoEncoder = VIDEO_ENCODERS[preset.video.codec] ?? undefined;
  let videoNote: string;

  if (preset.video.codec === 'none') {
    videoAction = 'drop';
    videoNote = 'Video: disabled by preset.';
  } else if (!sourceVideoCodec) {
    videoAction = 'drop';
    videoNote = 'Video: input provides no video stream.';
    warnings.push('Input contains no video stream; output will omit video.');
  } else if (preset.video.codec === 'copy') {
    videoAction = 'copy';
    videoEncoder = 'copy';
    videoNote = `Video: copy source codec ${sourceVideoCodec}.`;
    if (containerRule && !codecAllowed(containerRule.video, sourceVideoCodec)) {
      warnings.push(
        `Source video codec ${sourceVideoCodec} is not listed for ${preset.container}; verify container compatibility.`,
      );
    }
  } else if (sourceVideoCodec === preset.video.codec) {
    videoAction = 'copy';
    videoEncoder = 'copy';
    videoNote = `Video: copy matching codec ${sourceVideoCodec}.`;
  } else {
    videoAction = 'transcode';
    videoEncoder = videoEncoder ?? preset.video.codec;
    const requiredEncoder = VIDEO_ENCODERS[preset.video.codec];
    if (
      requiredEncoder &&
      context.capabilities &&
      !context.capabilities.videoEncoders.has(requiredEncoder)
    ) {
      warnings.push(`Encoder ${requiredEncoder} not reported by FFmpeg; transcode may fail.`);
    }
    videoNote = `Video: transcode ${sourceVideoCodec ?? 'unknown'} → ${preset.video.codec} with ${videoEncoder}.`;
  }

  if (videoAction === 'drop' && preset.video.codec !== 'none') {
    warnings.push('Preset expects video output but planner is dropping the stream.');
  }

  let audioAction: 'copy' | 'transcode' | 'drop';
  let audioEncoder = AUDIO_ENCODERS[preset.audio.codec] ?? undefined;
  let audioNote: string;

  if (preset.audio.codec === 'none') {
    audioAction = 'drop';
    audioNote = 'Audio: disabled by preset.';
  } else if (!sourceAudioCodec) {
    audioAction = 'drop';
    audioNote = 'Audio: input provides no audio stream.';
    warnings.push('Input contains no audio stream; output will omit audio.');
  } else if (preset.audio.codec === 'copy') {
    audioAction = 'copy';
    audioEncoder = 'copy';
    audioNote = `Audio: copy source codec ${sourceAudioCodec}.`;
    if (containerRule && !codecAllowed(containerRule.audio, sourceAudioCodec)) {
      warnings.push(
        `Source audio codec ${sourceAudioCodec} is not listed for ${preset.container}; verify container compatibility.`,
      );
    }
  } else if (sourceAudioCodec === preset.audio.codec) {
    audioAction = 'copy';
    audioEncoder = 'copy';
    audioNote = `Audio: copy matching codec ${sourceAudioCodec}.`;
  } else {
    audioAction = 'transcode';
    audioEncoder = audioEncoder ?? preset.audio.codec;
    const requiredEncoder = AUDIO_ENCODERS[preset.audio.codec];
    if (
      requiredEncoder &&
      context.capabilities &&
      !context.capabilities.audioEncoders.has(requiredEncoder)
    ) {
      warnings.push(`Encoder ${requiredEncoder} not reported by FFmpeg; transcode may fail.`);
    }
    audioNote = `Audio: transcode ${sourceAudioCodec ?? 'unknown'} → ${preset.audio.codec} with ${audioEncoder}.`;
  }

  if (audioAction === 'drop' && preset.audio.codec !== 'none') {
    warnings.push('Preset expects audio output but planner is dropping the stream.');
  }

  const subtitlePlan = determineSubtitlePlan(preset, containerRule, context.summary, warnings);

  notes.push(videoNote);
  notes.push(audioNote);
  notes.push(subtitlePlan.note);

  if (videoAction === 'drop') {
    args.push('-vn');
  } else {
    args.push('-map', '0:v:0?');
    if (videoEncoder) {
      args.push('-c:v', videoEncoder);
    }
    if (videoAction === 'transcode' && videoTier.value) {
      const tierDefaults = videoTier.value;
      if (typeof tierDefaults.bitrateK === 'number') {
        args.push('-b:v', `${tierDefaults.bitrateK}k`);
      }
      if (typeof tierDefaults.maxrateK === 'number') {
        args.push('-maxrate', `${tierDefaults.maxrateK}k`);
      }
      if (typeof tierDefaults.bufsizeK === 'number') {
        args.push('-bufsize', `${tierDefaults.bufsizeK}k`);
      }
      if (typeof tierDefaults.crf === 'number') {
        args.push('-crf', tierDefaults.crf.toString());
      }
      if (tierDefaults.profile) {
        const profile = resolveVideoProfile(preset.video.codec, tierDefaults.profile);
        if (profile) {
          args.push('-profile:v', profile);
        }
      }
      notes.push(`Video tier ${videoTier.tier} applied.`);
    }
    if (videoAction === 'transcode' && preset.video.copyColorMetadata && context.summary.color) {
      const { primaries, trc, space } = context.summary.color;
      if (primaries) {
        args.push('-color_primaries', primaries);
      }
      if (trc) {
        args.push('-color_trc', trc);
      }
      if (space) {
        args.push('-colorspace', space);
      }
      notes.push('Video color metadata copied.');
    }
  }

  if (audioAction === 'drop') {
    args.push('-an');
  } else {
    args.push('-map', '0:a:0?');
    if (audioEncoder) {
      args.push('-c:a', audioEncoder);
    }
    if (audioAction === 'transcode') {
      const audioTierDefaults = audioTier.value;
      const bitrateK =
        (audioTierDefaults && typeof audioTierDefaults.bitrateK === 'number'
          ? audioTierDefaults.bitrateK
          : undefined) ?? preset.audio.bitrateK;
      if (typeof bitrateK === 'number') {
        args.push('-b:a', `${bitrateK}k`);
      }
      if (audioTierDefaults && typeof audioTierDefaults.quality === 'number') {
        args.push('-q:a', audioTierDefaults.quality.toString());
      }
      if (preset.audio.stereoOnly) {
        args.push('-ac', '2');
      }
      if (audioTierDefaults) {
        notes.push(`Audio tier ${audioTier.tier} applied.`);
      }
    }
  }

  if (subtitlePlan.mode === 'drop') {
    args.push('-sn');
  } else {
    args.push('-map', '0:s?');
    args.push('-c:s', subtitlePlan.mode === 'convert' ? SUBTITLE_CONVERT_CODEC : 'copy');
  }

  if (containerRule?.requiresFaststart) {
    args.push('-movflags', '+faststart');
    notes.push('Applied faststart for fragmented MP4/MOV.');
  }

  const muxer = muxerForContainer(preset.container);
  if (muxer) {
    args.push('-f', muxer);
  }

  const remuxOnly =
    videoAction === 'copy' && audioAction === 'copy' && subtitlePlan.mode === 'copy';

  return {
    preset,
    ffmpegArgs: args,
    remuxOnly,
    notes,
    warnings,
  };
}

function planGifJob(context: PlannerContext, preset: Preset): PlannerDecision {
  const notes: string[] = [];
  const warnings: string[] = [];
  const fallbackWidth = 480;
  const maxWidth = 640;

  if (context.summary.durationSec > 20) {
    warnings.push(
      'GIF preset performs best on clips under ~20 seconds; consider trimming the source.',
    );
  }

  const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

  const sourceFps = context.summary.fps ?? 0;
  const targetFps = clamp(Math.round(sourceFps) || 12, 2, 20);
  if (!context.summary.fps) {
    notes.push('Video: using default 12 fps for GIF output.');
  } else if (Math.abs(targetFps - sourceFps) >= 1) {
    notes.push(`Video: fps clamped from ${Math.round(sourceFps)} → ${targetFps} for GIF output.`);
  }

  const measuredWidth =
    context.summary.width && context.summary.width > 0 ? context.summary.width : fallbackWidth;
  const limitedWidth = clamp(measuredWidth, 2, maxWidth);
  const evenWidth = limitedWidth % 2 === 0 ? limitedWidth : limitedWidth - 1;
  const finalWidth = evenWidth >= 2 ? evenWidth : fallbackWidth;
  if (context.summary.width && context.summary.width > maxWidth) {
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

  const muxer = muxerForContainer(preset.container);
  if (muxer) {
    args.push('-f', muxer);
  }

  notes.push(`Video: transcode to GIF at ${targetFps} fps with palette optimisation.`);
  notes.push('Audio: dropped for GIF export.');
  notes.push('Subtitles: drop for GIF export.');

  return {
    preset,
    ffmpegArgs: args,
    remuxOnly: false,
    notes,
    warnings,
  };
}

function muxerForContainer(container: Container): string | undefined {
  switch (container) {
    case 'mp4':
    case 'mov':
    case 'm4a':
      return 'mp4';
    case 'mkv':
      return 'matroska';
    case 'webm':
      return 'webm';
    case 'gif':
      return 'gif';
    case 'mp3':
      return 'mp3';
    case 'flac':
      return 'flac';
    case 'wav':
      return 'wav';
    default:
      return undefined;
  }
}

interface SubtitlePlanDecision {
  mode: 'drop' | 'copy' | 'convert';
  note: string;
}

function determineSubtitlePlan(
  preset: Preset,
  containerRule: ContainerRule | undefined,
  summary: ProbeSummary,
  warnings: string[],
): SubtitlePlanDecision {
  const hasText = Boolean(summary.hasTextSubs);
  const hasImage = Boolean(summary.hasImageSubs);
  const hasAny = hasText || hasImage;
  const rule = containerRule?.subtitles;

  if (!preset.subs) {
    return {
      mode: 'drop',
      note: hasAny
        ? 'Subtitles: drop (preset has no subtitle policy).'
        : 'Subtitles: no streams detected.',
    };
  }

  switch (preset.subs.mode) {
    case 'keep': {
      if (!hasAny) {
        return {
          mode: 'copy',
          note: 'Subtitles: keep requested but no streams detected.',
        };
      }
      if (hasText && rule && !allowsAny(rule.text)) {
        warnings.push(
          `${preset.container} does not permit text subtitles; consider converting or burning in.`,
        );
      }
      if (hasImage && rule && !allowsAny(rule.image)) {
        warnings.push(`${preset.container} does not permit image subtitles; consider burn-in.`);
      }
      return {
        mode: 'copy',
        note: 'Subtitles: keep existing streams.',
      };
    }
    case 'convert': {
      if (!hasText) {
        warnings.push('No text subtitles available for conversion.');
      }
      if (hasImage) {
        warnings.push('Image-based subtitles detected; conversion to mov_text not supported.');
      }
      if (rule && !subtitleCodecAllowed(rule.text, SUBTITLE_CONVERT_CODEC)) {
        warnings.push(
          `${preset.container} container does not advertise ${SUBTITLE_CONVERT_CODEC}; conversion may fail.`,
        );
      }
      return {
        mode: 'convert',
        note: 'Subtitles: convert text streams to mov_text.',
      };
    }
    case 'burn': {
      warnings.push('Subtitle burn-in requested; execution layer must inject subtitle filters.');
      return {
        mode: 'drop',
        note: 'Subtitles: burn-in requested (planner defers to execution).',
      };
    }
    case 'drop':
      return {
        mode: 'drop',
        note: hasAny ? 'Subtitles: drop streams per preset.' : 'Subtitles: no streams detected.',
      };
    default:
      return {
        mode: 'drop',
        note: 'Subtitles: drop (unrecognized mode).',
      };
  }
}

function validatePresetAvailability(
  preset: Preset,
  containerRule: ContainerRule | undefined,
  warnings: string[],
): void {
  if (!containerRule) {
    warnings.push(
      `No container rules defined for ${preset.container}; planner will assume compatibility.`,
    );
    return;
  }

  if (
    preset.video.codec !== 'copy' &&
    preset.video.codec !== 'none' &&
    !codecAllowed(containerRule.video, preset.video.codec)
  ) {
    warnings.push(
      `Target container ${preset.container} does not allow video codec ${preset.video.codec}.`,
    );
  }

  if (
    preset.audio.codec !== 'copy' &&
    preset.audio.codec !== 'none' &&
    !codecAllowed(containerRule.audio, preset.audio.codec)
  ) {
    warnings.push(
      `Target container ${preset.container} does not allow audio codec ${preset.audio.codec}.`,
    );
  }
}

function normalizeCodec(value: string | undefined): string | undefined {
  return value?.toLowerCase();
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

function codecAllowed(
  allowed: ContainerRule['video'] | ContainerRule['audio'] | undefined,
  codec: string | undefined,
): boolean {
  if (!codec) {
    return false;
  }
  if (!allowed || allowed === 'any') {
    return true;
  }
  return allowed.includes(codec);
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

function allowsAny(list: 'any' | string[] | undefined): boolean {
  if (!list || list === 'any') {
    return true;
  }
  return list.length > 0;
}

function subtitleCodecAllowed(list: 'any' | string[] | undefined, codec: string): boolean {
  if (!list || list === 'any') {
    return true;
  }
  return list.includes(codec);
}
