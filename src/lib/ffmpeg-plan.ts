import { CONTAINER_RULES } from "./container-rules";
import { PRESETS } from "./presets";
import type {
  CapabilitySnapshot,
  Preset,
  ProbeSummary,
  Tier,
} from "./types";

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

export function listSupportedPresets(
  capabilities?: CapabilitySnapshot,
): Preset[] {
  if (!capabilities) {
    return PRESETS;
  }

  return PRESETS.filter((preset) => {
    if (preset.remuxOnly) {
      return true;
    }

    const containerRule = CONTAINER_RULES[preset.container];

    if (!containerRule) {
      return false;
    }

    if (
      preset.video.codec !== "copy" &&
      preset.video.codec !== "none" &&
      !capabilities.videoEncoders.has(preset.video.codec)
    ) {
      return false;
    }

    if (
      preset.audio.codec !== "copy" &&
      preset.audio.codec !== "none" &&
      !capabilities.audioEncoders.has(preset.audio.codec)
    ) {
      return false;
    }

    return true;
  });
}

export function planJob(context: PlannerContext): PlannerDecision {
  const preset =
    resolvePreset(context.presetId) ??
    PRESETS.find((candidate) => candidate.id === "mp4-h264-aac-balanced")!;

  const args: string[] = [];
  const notes: string[] = [];
  const warnings: string[] = [];

  notes.push(
    "Planner stub: integrate remux/encode decision tree before shipping.",
  );

  if (preset.remuxOnly) {
    warnings.push(
      "Preset configured for remux-only flows; ensure stream validation upstream.",
    );
  }

  return {
    preset,
    ffmpegArgs: args,
    remuxOnly: Boolean(preset.remuxOnly),
    notes,
    warnings,
  };
}
