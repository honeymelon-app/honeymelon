import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import type * as NotificationPlugin from '@tauri-apps/plugin-notification';
import { storeToRefs } from 'pinia';
import { ref, watch, onUnmounted } from 'vue';

import { availablePresets, loadCapabilities } from '@/lib/capability';
import { LIMITS } from '@/lib/constants';
import { ErrorHandler } from '@/lib/error-handler';
import { planJob } from '@/lib/ffmpeg-plan';
import type { PlannerDecision } from '@/lib/ffmpeg-plan';
import { probeMedia } from '@/lib/ffmpeg-probe';
import { inferContainerFromPath, mediaKindForContainer } from '@/lib/media-formats';
import { JobError, type CapabilitySnapshot, type ProbeSummary, type Tier } from '@/lib/types';
import { joinPath, pathBasename, pathDirname, stripExtension } from '@/lib/utils';
import { executionService } from '@/services/execution-service';
import { useJobsStore } from '@/stores/jobs';
import { usePrefsStore } from '@/stores/prefs';

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
  autoStartNext?: boolean;
}

interface ProgressEventPayload {
  jobId: string;
  progress?: {
    processedSeconds?: number;
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
const STDERR_EVENT = 'ffmpeg://stderr';

type NotificationModule = typeof NotificationPlugin;

function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export function useJobOrchestrator(options: OrchestratorOptions = {}) {
  const requirePresetBeforeStart = options.requirePresetBeforeStart ?? true;
  const autoStartNext = options.autoStartNext ?? true;
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
  let notificationModulePromise: Promise<NotificationModule | null> | null = null;

  // Mutex to prevent concurrent startNextAvailable calls
  let isStartingNext = false;

  // Store unlisten functions for cleanup
  const unlistenProgress = ref<UnlistenFn | null>(null);
  const unlistenCompletion = ref<UnlistenFn | null>(null);
  const unlistenStderr = ref<UnlistenFn | null>(null);

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
      try {
        const payload = event.payload;

        if (!payload?.jobId) {
          console.warn('[orchestrator] Invalid progress event - missing jobId:', event);
          return;
        }

        // Use Rust-parsed progress metrics directly (no frontend parsing needed)
        if (payload.progress) {
          const progressUpdate: {
            processedSeconds?: number;
            fps?: number;
            speed?: number;
          } = {};

          if (payload.progress.processedSeconds != null) {
            progressUpdate.processedSeconds = payload.progress.processedSeconds;
          }
          if (payload.progress.fps != null) {
            progressUpdate.fps = payload.progress.fps;
          }
          if (payload.progress.speed != null) {
            progressUpdate.speed = payload.progress.speed;
          }

          if (Object.keys(progressUpdate).length > 0) {
            jobs.updateProgress(payload.jobId, progressUpdate);
          }
        }

        if (payload.raw) {
          jobs.appendLog(payload.jobId, payload.raw);
        }
      } catch (error) {
        console.error('[orchestrator] Error processing progress event:', error, event);
      }
    })
      .then((unlisten) => {
        unlistenProgress.value = unlisten;
      })
      .catch((error) => {
        console.error('[orchestrator] Failed to setup progress listener:', error);
      });

    listen<{ jobId: string; line: string }>(STDERR_EVENT, (event) => {
      try {
        const payload = event.payload;

        if (!payload?.jobId) {
          console.warn('[orchestrator] Invalid stderr event - missing jobId:', event);
          return;
        }

        if (typeof payload.line !== 'string') {
          console.warn('[orchestrator] Invalid stderr event - line is not a string:', event);
          return;
        }

        console.error(`[ffmpeg][${payload.jobId}] ${payload.line}`);
        jobs.appendLog(payload.jobId, payload.line);
      } catch (error) {
        console.error('[orchestrator] Error processing stderr event:', error, event);
      }
    })
      .then((unlisten) => {
        unlistenStderr.value = unlisten;
      })
      .catch((error) => {
        console.error('[orchestrator] Failed to setup stderr listener:', error);
      });

    listen<CompletionEventPayload>(COMPLETION_EVENT, (event) => {
      try {
        const payload = event.payload;

        if (!payload?.jobId) {
          console.warn('[orchestrator] Invalid completion event - missing jobId:', event);
          return;
        }

        if (typeof payload.success !== 'boolean' || typeof payload.cancelled !== 'boolean') {
          console.warn('[orchestrator] Invalid completion event - missing required flags:', event);
          return;
        }

        if (payload.logs) {
          jobs.setLogs(payload.jobId, payload.logs);
        }

        if (payload.cancelled) {
          jobs.cancelJob(payload.jobId);
          if (autoStartNext) {
            startNextAvailable().catch((error) => {
              console.error('[orchestrator] Failed to start next job after cancellation:', error);
            });
          }
          return;
        }

        if (payload.success) {
          const job = jobs.getJob(payload.jobId);
          jobs.markCompleted(payload.jobId, job?.outputPath ?? '');
          void notifyJobResult(payload);
        } else {
          const errorMessage = ErrorHandler.formatCompletionError(payload);
          jobs.markFailed(payload.jobId, errorMessage, payload.code ?? undefined);
          void notifyJobResult(payload);
        }

        if (autoStartNext) {
          startNextAvailable().catch((error) => {
            console.error('[orchestrator] Failed to start next job after completion:', error);
          });
        }
      } catch (error) {
        console.error('[orchestrator] Error processing completion event:', error, event);
      }
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
    unlistenStderr.value?.();

    // Clean up any running simulation timers - convert to array first for safe iteration
    Array.from(simulatedJobs.values()).forEach((timer) => {
      window.clearInterval(timer);
    });
    simulatedJobs.clear();
  });

  async function startNextAvailable(): Promise<boolean> {
    // Mutex: prevent concurrent execution
    if (isStartingNext) {
      return false;
    }

    isStartingNext = true;
    try {
      if (hasExclusiveActive.value) {
        return false;
      }

      const nextQueued = jobs.peekNext();
      if (!nextQueued) {
        return false;
      }

      if (!canStartJob(nextQueued.presetId)) {
        return false;
      }

      const job = jobs.startNext();
      if (!job) {
        return false;
      }

      // No need for second canStartJob check - job was just validated via peekNext

      try {
        const summary = await probe(job.path);
        jobs.markPlanning(job.id, summary);

        const decision = await plan(summary, job.presetId, job.tier, job.path);
        const otherActive = activeJobs.value.filter(
          (active) => active.id !== job.id && active.state.status === 'running',
        ).length;

        if (decision.remuxOnly === false && otherActive > 0) {
          jobs.requeue(job.id);
          return false;
        }

        jobs.markRunning(job.id, decision);

        const started = await run(job.id, decision);
        if (!started) {
          jobs.requeue(job.id);
          if (autoStartNext) {
            startNextAvailable().catch((error) => {
              console.error('[orchestrator] Failed to start next job after requeue:', error);
            });
          }
        }
        return true;
      } catch (error) {
        const details = ErrorHandler.parseErrorDetails(error);
        jobs.markFailed(job.id, details.message, details.code);
        return false;
      }
    } finally {
      // Always release the mutex
      isStartingNext = false;
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

      const planningDecision = await plan(summary, presetId, tier, path);
      const decision = ensureDecisionHasInput(planningDecision, path);
      const otherActive = activeJobs.value.filter(
        (active) => active.id !== jobId && active.state.status === 'running',
      ).length;

      if (decision.remuxOnly === false && otherActive > 0) {
        jobs.requeue(jobId);
        return;
      }

      jobs.markRunning(jobId, decision);

      const started = await run(jobId, decision);
      if (!started) {
        jobs.requeue(jobId);
        if (autoStartNext) {
          startNextAvailable().catch((error) => {
            console.error('[orchestrator] Failed to start next job after requeue:', error);
          });
        }
      }
    } catch (error) {
      const details = ErrorHandler.parseErrorDetails(error);
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
        throw new Error(`Preset ${presetId} is not valid for source container ${sourceContainer}.`);
      }

      const sourceKind = mediaKindForContainer(sourceContainer);
      if (preset.mediaKind !== sourceKind) {
        throw new Error(
          `Preset ${presetId} targets ${preset.mediaKind} media but source is ${sourceKind}.`,
        );
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

  async function run(jobId: string, decision: PlannerDecision): Promise<boolean> {
    if (simulate) {
      const simulatedJob = jobs.getJob(jobId);
      const outputPath = buildOutputPath(simulatedJob, decision);
      jobs.setOutputPath(jobId, outputPath);
      simulateProgress(jobId, outputPath);
      return true;
    }

    const job = jobs.getJob(jobId);
    if (!job) {
      throw new JobError('Job not found', 'job_missing');
    }

    const outputPath = buildOutputPath(job, decision);
    jobs.setOutputPath(jobId, outputPath);

    // Validate FFmpeg arguments before invoking the backend runner
    if (!decision.ffmpegArgs || decision.ffmpegArgs.length === 0) {
      throw new JobError('FFmpeg arguments cannot be empty', 'job_invalid_args');
    }

    try {
      const startResult = await executionService.start({
        jobId,
        decision,
        outputPath,
        exclusive: job.exclusive ?? false,
      });

      if (!startResult.success) {
        const message = startResult.error ?? 'Failed to start FFmpeg job';
        jobs.markFailed(jobId, message, startResult.code);
        return false;
      }

      return true;
    } catch (error) {
      const details = ErrorHandler.parseErrorDetails(error);
      // This path might be taken if the command fails to spawn.
      jobs.markFailed(jobId, details.message, details.code);
      return false;
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
    const sanitizedBaseDirCandidate = sanitizePath(baseDirCandidate);
    const fallbackBaseDir = sourcePath ? sanitizePath(pathDirname(sourcePath)) : '';
    const baseDir =
      sanitizedBaseDirCandidate && sanitizedBaseDirCandidate.length
        ? sanitizedBaseDirCandidate
        : fallbackBaseDir;

    const rawBaseName = sourcePath ? stripExtension(pathBasename(sourcePath)) : preset.id;
    const safeBaseName = sanitizePathComponent(rawBaseName || 'output').trim() || 'output';
    const safeExtension = sanitizePathComponent(extension || preset.container).trim() || 'mp4';

    let fileName = `${safeBaseName}.${safeExtension}`;

    if (includePresetInName.value || includeTierInName.value) {
      const segments: string[] = [safeBaseName];
      const separatorRaw = filenameSeparator.value || '-';
      const separator = sanitizePathComponent(separatorRaw) || '-';

      if (includePresetInName.value) {
        segments.push(sanitizePathComponent(slugify(preset.id)));
      }
      if (includeTierInName.value && job?.tier) {
        segments.push(sanitizePathComponent(job.tier));
      }

      const compositeName = segments
        .map((segment) => segment.trim())
        .filter(Boolean)
        .join(separator);
      fileName = `${sanitizePathComponent(compositeName) || safeBaseName}.${safeExtension}`;
    }

    const sanitizedFileName = sanitizePathComponent(fileName) || `${safeBaseName}.${safeExtension}`;

    return baseDir ? joinPath(baseDir, sanitizedFileName) : sanitizedFileName;
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
        simulatedJobs.delete(jobId); // Delete first - ensures cleanup happens
        window.clearInterval(timer);
        jobs.markCompleted(jobId, outputPath);
        jobs.appendLog(jobId, 'Simulation completed');
      }
    }, interval);

    simulatedJobs.set(jobId, timer);
  }

  function slugify(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function sanitizePathComponent(value: string): string {
    if (!value) {
      return '';
    }
    return value.replace(/\.\./g, '').replace(/[<>:"|?*\\/]/g, '_');
  }

  function sanitizePath(value?: string | null): string {
    if (!value) {
      return '';
    }
    const normalized = value.replace(/\\/g, '/');
    const leadingSlash = normalized.startsWith('/');
    const segments = normalized
      .split('/')
      .map((segment) => sanitizePathComponent(segment))
      .filter((segment) => segment.length > 0);
    if (!segments.length) {
      return '';
    }
    const sanitized = segments.join('/');
    return leadingSlash ? `/${sanitized}` : sanitized;
  }

  function wait(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function prepareNotificationModule(): Promise<NotificationModule | null> {
    if (simulate || !isTauriRuntime()) {
      return null;
    }
    if (notificationModulePromise) {
      return notificationModulePromise;
    }

    notificationModulePromise = (async () => {
      try {
        const module = await import('@tauri-apps/plugin-notification');
        let granted = await module.isPermissionGranted();
        if (!granted) {
          const permission = await module.requestPermission();
          granted = permission === 'granted';
        }
        if (!granted) {
          return null;
        }
        return module;
      } catch (error) {
        console.warn('[orchestrator] Notification module unavailable:', error);
        return null;
      }
    })();

    return notificationModulePromise;
  }

  async function notifyJobResult(payload: CompletionEventPayload) {
    if (simulate || payload.cancelled) {
      return;
    }

    const module = await prepareNotificationModule();
    if (!module) {
      return;
    }

    const job = jobs.getJob(payload.jobId);
    const nameSource =
      job?.outputPath && job.outputPath.length > 0
        ? job.outputPath
        : job?.path && job.path.length > 0
          ? job.path
          : payload.jobId;
    const displayName = pathBasename(nameSource);

    const truncate = (input: string): string =>
      input.length > LIMITS.NOTIFICATION_MAX_BODY_LENGTH
        ? `${input.slice(0, LIMITS.NOTIFICATION_MAX_BODY_LENGTH - 3)}…`
        : input;

    if (payload.success) {
      try {
        await module.sendNotification({
          title: 'Conversion complete',
          body: truncate(`${displayName} finished successfully.`),
        });
      } catch (error) {
        console.warn('[orchestrator] Failed to send success notification:', error);
      }
      return;
    }

    const reason =
      payload.message ??
      (payload.exitCode !== null && payload.exitCode !== undefined
        ? `FFmpeg exited with code ${payload.exitCode}`
        : 'Conversion failed. Check logs for details.');

    try {
      await module.sendNotification({
        title: 'Conversion failed',
        body: truncate(`${displayName}: ${reason}`),
      });
    } catch (error) {
      console.warn('[orchestrator] Failed to send failure notification:', error);
    }
  }

  async function cancel(jobId: string) {
    if (simulate) {
      const timer = simulatedJobs.get(jobId);
      if (timer !== undefined) {
        window.clearInterval(timer);
        simulatedJobs.delete(jobId);
      }
      jobs.cancelJob(jobId);
      if (autoStartNext) {
        startNextAvailable().catch((error) => {
          console.error('[orchestrator] Failed to start next job after cancellation:', error);
        });
      }
      return;
    }

    const result = await executionService.cancel(jobId);
    if (!result.success && result.error) {
      console.warn('[orchestrator] Failed to cancel job:', result.error);
    }
  }

  return {
    startJob,
    startNextAvailable,
    cancel,
    capabilities,
  };
}
