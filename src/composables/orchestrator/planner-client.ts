import type { Ref } from 'vue';

import { availablePresets } from '@/lib/capability';
import { planJob } from '@/lib/ffmpeg-plan';
import type { PlannerDecision } from '@/lib/ffmpeg-plan';
import { probeMedia } from '@/lib/ffmpeg-probe';
import { inferContainerFromPath, mediaKindForContainer } from '@/lib/media-formats';
import { JobError, type CapabilitySnapshot, type ProbeSummary, type Tier } from '@/lib/types';

interface PlannerClientOptions {
  simulate: boolean;
  capabilities: Ref<CapabilitySnapshot | undefined>;
  requirePresetBeforeStart: boolean;
}

export interface PlannerClient {
  canStartJob(presetId: string | undefined | null): boolean;
  probe(path: string): Promise<ProbeSummary>;
  plan(
    summary: ProbeSummary,
    presetId: string,
    tier: Tier,
    sourcePath: string,
  ): Promise<PlannerDecision>;
  ensureDecisionHasInput(decision: PlannerDecision, sourcePath: string): PlannerDecision;
}

export function createPlannerClient(options: PlannerClientOptions): PlannerClient {
  const { simulate, capabilities, requirePresetBeforeStart } = options;

  function canStartJob(presetId: string | undefined | null): boolean {
    if (!presetId || !presetId.trim()) {
      return !requirePresetBeforeStart;
    }
    return true;
  }

  async function probe(path: string): Promise<ProbeSummary> {
    if (simulate) {
      const durationOverride = import.meta.env.VITE_E2E_SIMULATION === 'true' ? 6 : 120;
      await wait(200);
      return {
        durationSec: durationOverride,
        vcodec: 'h264',
        acodec: 'aac',
      };
    }

    const response = await probeMedia(path);
    if (!response.summary) {
      throw new Error('Probe summary missing from response.');
    }
    return response.summary;
  }

  async function plan(
    summary: ProbeSummary,
    presetId: string,
    tier: Tier,
    sourcePath: string,
  ): Promise<PlannerDecision> {
    const snapshot = capabilities.value;
    const allowedPresets = availablePresets(snapshot);
    const preset = allowedPresets.find((candidate) => candidate.id === presetId);
    if (!preset) {
      throw new Error(`Preset ${presetId} is not available with current capabilities.`);
    }

    const sourceContainer = inferContainerFromPath(sourcePath);
    if (sourceContainer) {
      if (
        preset.sourceContainers.length > 0 &&
        !preset.sourceContainers.includes(sourceContainer)
      ) {
        const containerError = `Preset ${presetId} is not valid for source container ${sourceContainer}.`;
        throw new Error(containerError);
      }

      const sourceKind = mediaKindForContainer(sourceContainer);
      if (preset.mediaKind !== sourceKind) {
        const mediaKindError = `Preset ${presetId} targets ${preset.mediaKind} media but source is ${sourceKind}.`;
        throw new Error(mediaKindError);
      }
    }

    return planJob({
      presetId: preset.id,
      summary,
      capabilities: snapshot,
      requestedTier: tier,
    });
  }

  function ensureDecisionHasInput(decision: PlannerDecision, sourcePath: string): PlannerDecision {
    if (!sourcePath || sourcePath.trim().length === 0) {
      throw new JobError('Source path missing for job execution.', 'job_missing_source');
    }

    const baseArgs = Array.isArray(decision.ffmpegArgs) ? [...decision.ffmpegArgs] : [];
    const hasInputArg = baseArgs.some(
      (value, index) => value === '-i' && index + 1 < baseArgs.length,
    );

    if (hasInputArg) {
      return {
        ...decision,
        ffmpegArgs: baseArgs,
      };
    }

    return {
      ...decision,
      ffmpegArgs: ['-i', sourcePath, ...baseArgs],
    };
  }

  function wait(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  return {
    canStartJob,
    probe,
    plan,
    ensureDecisionHasInput,
  };
}
