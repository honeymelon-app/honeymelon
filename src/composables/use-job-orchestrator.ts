import { ref, watch, onUnmounted } from 'vue';

import { listen, type UnlistenFn } from '@tauri-apps/api/event';

import { availablePresets, loadCapabilities } from '@/lib/capability';
import { planJob, resolvePreset } from '@/lib/ffmpeg-plan';
import { probeMedia } from '@/lib/ffmpeg-probe';
import type { PlannerDecision } from '@/lib/ffmpeg-plan';
import { JobError, type CapabilitySnapshot, type ProbeSummary, type Tier } from '@/lib/types';
import { joinPath, pathBasename, pathDirname, stripExtension } from '@/lib/utils';
import { useJobsStore } from '@/stores/jobs';
import { usePrefsStore } from '@/stores/prefs';
import { storeToRefs } from 'pinia';

interface StartJobOptions {
  jobId: string;
  path: string;
  presetId: string;
  tier: Tier;
}

interface OrchestratorOptions {
  concurrency?: number;
  simulate?: boolean;
  requirePresetBeforeStart?: boolean; // NEW
}

interface ProgressEventPayload {
  jobId: string;
  progress?: {
    processed_seconds?: number;
    fps?: number;
    speed?: number;
  };
  raw: string;
}

interface CompletionEventPayload {
  jobId: string;
  success: boolean;
  cancelled: boolean;
  exitCode?: number | null;
  signal?: number | null;
  code?: string | null;
  message?: string | null;
  logs?: string[];
}

const PROGRESS_EVENT = 'ffmpeg://progress';
const COMPLETION_EVENT = 'ffmpeg://completion';

function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

const EXCLUSIVE_VIDEO_CODECS = new Set(['av1', 'prores']);

export function useJobOrchestrator(options: OrchestratorOptions = {}) {
  const requirePresetBeforeStart = options.requirePresetBeforeStart ?? true;
  const jobs = useJobsStore();
  const prefs = usePrefsStore();
  const { hasExclusiveActive, activeJobs } = storeToRefs(jobs);
  const {
    maxConcurrency,
    outputDirectory,
    includePresetInName,
    includeTierInName,
    filenameSeparator,
  } = storeToRefs(prefs);
  const capabilities = ref<CapabilitySnapshot>();
  const simulatedJobs = new Map<string, number>();
  const simulate = options.simulate ?? !isTauriRuntime();

  // Store unlisten functions for cleanup
  const unlistenProgress = ref<UnlistenFn | null>(null);
  const unlistenCompletion = ref<UnlistenFn | null>(null);

  if (typeof options.concurrency === 'number') {
    prefs.setPreferredConcurrency(options.concurrency);
  }

  watch(
    maxConcurrency,
    (value) => {
      jobs.setConcurrency(value);
      if (!simulate) {
        void syncRunnerConcurrency(value);
      }
    },
    { immediate: true },
  );

  async function syncRunnerConcurrency(limit: number) {
    if (simulate) {
      return;
    }

    const normalized = Math.max(1, Math.floor(limit || 1));
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('set_max_concurrency', { limit: normalized });
  }

  loadCapabilities()
    .then((snapshot) => {
      capabilities.value = snapshot;
    })
    .catch((error) => {
      console.warn('[orchestrator] Failed to load capabilities:', error);
    });

  if (!simulate) {
    listen<ProgressEventPayload>(PROGRESS_EVENT, (event) => {
      const payload = event.payload;
      if (!payload?.jobId) {
        return;
      }
      jobs.updateProgress(payload.jobId, {
        processedSeconds: payload.progress?.processed_seconds,
        fps: payload.progress?.fps,
        speed: payload.progress?.speed,
      });
      if (payload.raw) {
        jobs.appendLog(payload.jobId, payload.raw);
      }
    })
      .then((unlisten) => {
        unlistenProgress.value = unlisten;
      })
      .catch((error) => {
        console.error('[orchestrator] Failed to setup progress listener:', error);
      });

    listen<CompletionEventPayload>(COMPLETION_EVENT, (event) => {
      const payload = event.payload;
      if (!payload?.jobId) {
        return;
      }

      if (payload.logs) {
        jobs.setLogs(payload.jobId, payload.logs);
      }

      if (payload.cancelled) {
        jobs.cancelJob(payload.jobId);
        startNextAvailable().catch((error) => {
          console.error('[orchestrator] Failed to start next job after cancellation:', error);
        });
        return;
      }

      if (payload.success) {
        const job = jobs.getJob(payload.jobId);
        jobs.markCompleted(payload.jobId, job?.outputPath ?? '');
      } else {
        const errorMessage =
          payload.message ??
          (payload.exitCode !== undefined && payload.exitCode !== null
            ? `FFmpeg exited with code ${payload.exitCode}`
            : 'FFmpeg process terminated unexpectedly.');
        jobs.markFailed(payload.jobId, errorMessage, payload.code ?? undefined);
      }

      startNextAvailable().catch((error) => {
        console.error('[orchestrator] Failed to start next job after completion:', error);
      });
    })
      .then((unlisten) => {
        unlistenCompletion.value = unlisten;
      })
      .catch((error) => {
        console.error('[orchestrator] Failed to setup completion listener:', error);
      });
  }

  // Clean up event listeners and timers on unmount
  onUnmounted(() => {
    // Clean up Tauri event listeners
    unlistenProgress.value?.();
    unlistenCompletion.value?.();

    // Clean up any running simulation timers
    simulatedJobs.forEach((timer) => {
      window.clearInterval(timer);
    });
    simulatedJobs.clear();
  });

  async function startNextAvailable() {
    if (hasExclusiveActive.value) {
      return;
    }

    const nextQueued = jobs.peekNext();
    if (!nextQueued) {
      return;
    }

    if (!canStartJob(nextQueued.presetId)) {
      return;
    }

    if (shouldDeferQueuedExclusive(nextQueued.presetId)) {
      return;
    }

    const job = jobs.startNext();
    if (!job) {
      return;
    }

    if (!canStartJob(job.presetId)) {
      jobs.requeue(job.id);
      return;
    }

    try {
      const summary = await probe(job.path);
      jobs.markPlanning(job.id, summary);

      const decision = await plan(summary, job.presetId, job.tier);
      const exclusive = requiresExclusive(decision);
      const otherActive = activeJobs.value.filter(
        (active) => active.id !== job.id && active.state.status === 'running',
      ).length;

      if (exclusive && otherActive > 0) {
        jobs.requeue(job.id);
        return;
      }

      jobs.setExclusive(job.id, exclusive);
      jobs.markRunning(job.id, decision);

      const started = await run(job.id, decision, exclusive);
      if (!started) {
        jobs.requeue(job.id);
        startNextAvailable().catch((error) => {
          console.error('[orchestrator] Failed to start next job after requeue:', error);
        });
      }
    } catch (error) {
      const details = parseErrorDetails(error);
      jobs.markFailed(job.id, details.message, details.code);
    }
  }

  function canStartJob(presetId: string | undefined | null): boolean {
    if (!presetId || !presetId.trim()) return false;
    if (!requirePresetBeforeStart) return true;
    return true; // presetId exists when the flag is on
  }

  async function startJob(input: StartJobOptions) {
    const { jobId, path, presetId, tier } = input;

    if (!canStartJob(presetId)) {
      return;
    }

    jobs.markProbing(jobId);

    try {
      const summary = await probe(path);
      jobs.markPlanning(jobId, summary);

      const decision = await plan(summary, presetId, tier);
      const exclusive = requiresExclusive(decision);
      const otherActive = activeJobs.value.filter(
        (active) => active.id !== jobId && active.state.status === 'running',
      ).length;

      if (exclusive && otherActive > 0) {
        jobs.requeue(jobId);
        return;
      }

      jobs.setExclusive(jobId, exclusive);
      jobs.markRunning(jobId, decision);

      const started = await run(jobId, decision, exclusive);
      if (!started) {
        jobs.requeue(jobId);
        startNextAvailable().catch((error) => {
          console.error('[orchestrator] Failed to start next job after requeue:', error);
        });
      }
    } catch (error) {
      const details = parseErrorDetails(error);
      jobs.markFailed(jobId, details.message, details.code);
    }
  }

  async function probe(path: string): Promise<ProbeSummary> {
    if (simulate) {
      await wait(200);
      return {
        durationSec: 120,
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
  ): Promise<PlannerDecision> {
    const snapshot = capabilities.value;
    const allowedPresets = availablePresets(snapshot);
    const preset = allowedPresets.find((candidate) => candidate.id === presetId);
    if (!preset) {
      throw new Error(`Preset ${presetId} is not available with current capabilities.`);
    }

    return planJob({
      presetId: preset.id,
      summary,
      capabilities: snapshot,
      requestedTier: tier,
    });
  }

  async function run(
    jobId: string,
    decision: PlannerDecision,
    exclusive: boolean,
  ): Promise<boolean> {
    if (simulate) {
      const simulatedJob = jobs.getJob(jobId);
      const outputPath = buildOutputPath(simulatedJob, decision);
      jobs.setOutputPath(jobId, outputPath);
      simulateProgress(jobId, outputPath);
      return true;
    }

    const job = jobs.getJob(jobId);
    const outputPath = buildOutputPath(job, decision);
    jobs.setOutputPath(jobId, outputPath);

    const args = ['-y', '-i', job?.path ?? '', ...decision.ffmpegArgs];

    try {
      await invokeStartJob({
        jobId: jobId,
        args,
        outputPath: outputPath,
        exclusive,
      });
      return true;
    } catch (error) {
      const details = parseErrorDetails(error);
      if (details.code === 'job_concurrency_limit' || details.code === 'job_exclusive_blocked') {
        return false;
      }

      throw new JobError(details.message, details.code);
    }
  }

  function buildOutputPath(
    job: { path?: string; tier?: Tier } | undefined,
    decision: PlannerDecision,
  ) {
    const sourcePath = job?.path ?? '';
    const preset = decision.preset;
    const extension = preset.outputExtension ?? preset.container;

    const baseDirCandidate = outputDirectory.value;
    const baseDir =
      baseDirCandidate && baseDirCandidate.length
        ? baseDirCandidate
        : sourcePath
          ? pathDirname(sourcePath)
          : '';

    const rawBaseName = sourcePath ? stripExtension(pathBasename(sourcePath)) : preset.id;

    const segments: string[] = [rawBaseName || 'output'];
    const separator = filenameSeparator.value || '-';

    if (includePresetInName.value) {
      segments.push(slugify(preset.id));
    }
    if (includeTierInName.value && job?.tier) {
      segments.push(job.tier);
    }

    const fileName = `${segments.filter(Boolean).join(separator)}.${extension}`;
    return baseDir ? joinPath(baseDir, fileName) : fileName;
  }

  async function invokeStartJob(payload: {
    jobId: string;
    args: string[];
    outputPath: string;
    exclusive: boolean;
  }) {
    if (simulate) {
      return;
    }

    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('start_job', payload);
  }

  function simulateProgress(jobId: string, outputPath: string) {
    const job = jobs.getJob(jobId);
    const duration = job?.summary?.durationSec ?? 120;
    const interval = 500;
    const totalDuration = Math.max(duration, 1);
    const increments = Math.max(Math.ceil((totalDuration * 1000) / interval), 1);
    const step = totalDuration / increments;
    let elapsed = 0;

    jobs.updateProgress(jobId, {
      processedSeconds: 0,
      fps: 30,
      speed: 1,
    });
    jobs.appendLog(jobId, 'Simulation started');

    const timer = window.setInterval(() => {
      elapsed += step;
      jobs.updateProgress(jobId, {
        processedSeconds: elapsed,
        fps: 30,
        speed: 1,
      });

      if (elapsed >= totalDuration) {
        window.clearInterval(timer);
        jobs.markCompleted(jobId, outputPath);
        jobs.appendLog(jobId, 'Simulation completed');
        simulatedJobs.delete(jobId);
      }
    }, interval);

    simulatedJobs.set(jobId, timer);
  }

  function requiresExclusive(decision: PlannerDecision): boolean {
    if (decision.remuxOnly) {
      return false;
    }

    return EXCLUSIVE_VIDEO_CODECS.has(decision.preset.video.codec);
  }

  function shouldDeferQueuedExclusive(presetId: string): boolean {
    const preset = resolvePreset(presetId);
    if (!preset || preset.remuxOnly) {
      return false;
    }

    if (!EXCLUSIVE_VIDEO_CODECS.has(preset.video.codec)) {
      return false;
    }

    return activeJobs.value.length > 0;
  }

  function slugify(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function parseErrorDetails(error: unknown): { message: string; code?: string } {
    if (typeof error === 'object' && error !== null) {
      const maybe = error as Record<string, unknown>;
      const message = typeof maybe.message === 'string' ? maybe.message : String(error);
      const code = typeof maybe.code === 'string' ? maybe.code : undefined;
      return { message, code };
    }

    return { message: String(error) };
  }

  function wait(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function cancel(jobId: string) {
    if (simulate) {
      const timer = simulatedJobs.get(jobId);
      if (timer !== undefined) {
        window.clearInterval(timer);
        simulatedJobs.delete(jobId);
      }
      jobs.cancelJob(jobId);
      startNextAvailable().catch((error) => {
        console.error('[orchestrator] Failed to start next job after cancellation:', error);
      });
      return;
    }

    const { invoke } = await import('@tauri-apps/api/core');
    await invoke<boolean>('cancel_job', { jobId: jobId });
  }

  return {
    startJob,
    startNextAvailable,
    cancel,
    capabilities,
  };
}
