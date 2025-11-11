import { CONTAINER_RULES } from './container-rules';
import type { ContainerRule } from './container-rules';
import { DEFAULT_PRESET_ID, PRESETS } from './presets';
import type { CapabilitySnapshot, Container, Preset, ProbeSummary, Tier } from './types';
import { VideoPlanner } from './planners/video-planner';
import { AudioPlanner } from './planners/audio-planner';
import { SubtitlePlanner } from './planners/subtitle-planner';
import { FFmpegArgsBuilder } from './builders/ffmpeg-args-builder';

const CONTAINER_TO_MUXER: Partial<Record<Container, string>> = {
  mp4: 'mp4',
  mov: 'mp4',
  m4a: 'mp4',
  mkv: 'matroska',
  webm: 'webm',
  gif: 'gif',
  mp3: 'mp3',
  flac: 'flac',
  wav: 'wav',
};

function muxerForContainer(container: Container): string | undefined {
  return CONTAINER_TO_MUXER[container];
}

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

  if (preset.mediaKind === 'image') {
    return planImageJob(context, preset);
  }

  const desiredTier: Tier = context.requestedTier ?? 'balanced';
  const notes: string[] = [];
  const warnings: string[] = [];

  const containerRule = CONTAINER_RULES[preset.container];

  validatePresetAvailability(preset, containerRule, warnings);

  // Use composed planners
  const videoPlanner = new VideoPlanner(context.capabilities);
  const audioPlanner = new AudioPlanner(context.capabilities);
  const subtitlePlanner = new SubtitlePlanner();
  const argsBuilder = new FFmpegArgsBuilder();

  const { action: videoAction, tierResult: videoTier } = videoPlanner.plan(
    context.summary,
    preset,
    desiredTier,
    warnings,
  );

  const { action: audioAction, tierResult: audioTier } = audioPlanner.plan(
    context.summary,
    preset,
    desiredTier,
    warnings,
  );

  const subtitlePlan = subtitlePlanner.plan(preset, containerRule, context.summary, warnings);

  if (videoTier.usedFallback) {
    notes.push(`Video tier fallback applied: using ${videoTier.tier}.`);
  }
  if (audioTier.usedFallback) {
    notes.push(`Audio tier fallback applied: using ${audioTier.tier}.`);
  }

  const { ffmpegArgs, notes: builderNotes } = argsBuilder
    .withVideo(videoAction, videoTier, preset, context.summary)
    .withAudio(audioAction, audioTier, preset)
    .withSubtitles(subtitlePlan.mode, subtitlePlan.note)
    .withContainer(preset.container, containerRule?.requiresFaststart ?? false)
    .withProgress()
    .build();

  notes.push(...builderNotes);

  const remuxOnly =
    videoAction.action === 'copy' && audioAction.action === 'copy' && subtitlePlan.mode === 'copy';

  return {
    preset,
    ffmpegArgs,
    remuxOnly,
    notes,
    warnings,
  };
}

function planImageJob(context: PlannerContext, preset: Preset): PlannerDecision {
  const warnings: string[] = [];
  const videoPlanner = new VideoPlanner(context.capabilities);
  const { args, notes } = videoPlanner.planImage(preset, warnings);

  const argsBuilder = new FFmpegArgsBuilder();
  const { ffmpegArgs } = argsBuilder.withCustomArgs(args).build();

  return {
    preset,
    ffmpegArgs,
    remuxOnly: false,
    notes,
    warnings,
  };
}

function planGifJob(context: PlannerContext, preset: Preset): PlannerDecision {
  const warnings: string[] = [];
  const videoPlanner = new VideoPlanner(context.capabilities);
  const { args, notes } = videoPlanner.planGif(context.summary, preset, warnings);

  notes.push('Audio: dropped for GIF export.');
  notes.push('Subtitles: drop for GIF export.');

  const argsBuilder = new FFmpegArgsBuilder();
  argsBuilder.withCustomArgs(['-progress', 'pipe:2', '-nostats', ...args]);

  const muxer = muxerForContainer(preset.container);
  if (muxer) {
    argsBuilder.withCustomArgs(['-f', muxer]);
  }

  const { ffmpegArgs } = argsBuilder.build();

  return {
    preset,
    ffmpegArgs,
    remuxOnly: false,
    notes,
    warnings,
  };
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
