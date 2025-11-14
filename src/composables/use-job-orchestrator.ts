import type * as NotificationPlugin from '@tauri-apps/plugin-notification';
import { storeToRefs } from 'pinia';
import { getCurrentInstance, onUnmounted, ref, watch } from 'vue';

import {
  createRunnerEventSubscriber,
  type CompletionEventPayload,
  type ProgressEventPayload,
} from '@/composables/orchestrator/event-subscriber';
import { createPlannerClient } from '@/composables/orchestrator/planner-client';
import { createRunnerClient } from '@/composables/orchestrator/runner-client';
import { loadCapabilities } from '@/lib/capability';
import { LIMITS } from '@/lib/constants';
import { ErrorHandler } from '@/lib/error-handler';
import type { CapabilitySnapshot, Tier } from '@/lib/types';
import { pathBasename } from '@/lib/utils';
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
  requirePresetBeforeStart?: boolean;
  autoStartNext?: boolean;
}

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
  const e2eSimulation = import.meta.env.VITE_E2E_SIMULATION === 'true';
  const simulate = options.simulate ?? (!isTauriRuntime() || e2eSimulation);
  let notificationModulePromise: Promise<NotificationModule | null> | null = null;
  let isStartingNext = false;

  const planner = createPlannerClient({
    simulate,
    capabilities,
    requirePresetBeforeStart,
  });

  const runner = createRunnerClient({
    jobs,
    outputDirectory,
    includePresetInName,
    includeTierInName,
    filenameSeparator,
    simulate,
    execution: executionService,
  });

  if (typeof options.concurrency === 'number') {
    prefs.setPreferredConcurrency(options.concurrency);
  }

  watch(
    maxConcurrency,
    (value) => {
      jobs.setConcurrency(value);
      if (!simulate) {
        void executionService.setConcurrency(value);
      }
    },
    { immediate: true },
  );

  loadCapabilities()
    .then((snapshot) => {
      capabilities.value = snapshot;
    })
    .catch((error) => {
      console.warn('[orchestrator] Failed to load capabilities:', error);
    });

  const runnerEvents = createRunnerEventSubscriber({
    enabled: !simulate,
    onProgress: handleProgressEvent,
    onStderr: handleStderrEvent,
    onCompletion: handleCompletionEvent,
  });

  if (!simulate) {
    void runnerEvents.start();
  }

  function handleProgressEvent(payload?: ProgressEventPayload) {
    try {
      if (!payload?.jobId) {
        console.warn('[orchestrator] Invalid progress event - missing jobId:', payload);
        return;
      }

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
      console.error('[orchestrator] Error processing progress event:', error, payload);
    }
  }

  function handleStderrEvent(payload?: { jobId?: string; line?: string }) {
    try {
      if (!payload?.jobId) {
        console.warn('[orchestrator] Invalid stderr event - missing jobId:', payload);
        return;
      }

      if (typeof payload.line !== 'string') {
        console.warn('[orchestrator] Invalid stderr event - line is not a string:', payload);
        return;
      }

      console.error(`[ffmpeg][${payload.jobId}] ${payload.line}`);
      jobs.appendLog(payload.jobId, payload.line);
    } catch (error) {
      console.error('[orchestrator] Error processing stderr event:', error, payload);
    }
  }

  function handleCompletionEvent(payload?: CompletionEventPayload) {
    try {
      if (!payload?.jobId) {
        console.warn('[orchestrator] Invalid completion event - missing jobId:', payload);
        return;
      }

      if (typeof payload.success !== 'boolean' || typeof payload.cancelled !== 'boolean') {
        console.warn('[orchestrator] Invalid completion event - missing required flags:', payload);
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
      console.error('[orchestrator] Error processing completion event:', error, payload);
    }
  }

  const teardown = () => {
    runnerEvents.stop();
    runner.shutdown();
  };

  if (getCurrentInstance()) {
    onUnmounted(() => {
      teardown();
    });
  }

  async function startNextAvailable(): Promise<boolean> {
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

      if (!planner.canStartJob(nextQueued.presetId)) {
        return false;
      }

      const job = jobs.startNext();
      if (!job) {
        return false;
      }

      try {
        const summary = await planner.probe(job.path);
        jobs.markPlanning(job.id, summary);

        const planningDecision = await planner.plan(summary, job.presetId, job.tier, job.path);
        const decision = planner.ensureDecisionHasInput(planningDecision, job.path);
        const otherActive = activeJobs.value.filter(
          (active) => active.id !== job.id && active.state.status === 'running',
        ).length;

        if (decision.remuxOnly === false && otherActive > 0) {
          jobs.requeue(job.id);
          return false;
        }

        jobs.markRunning(job.id, decision);

        const started = await runner.run(job.id, decision);
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
      isStartingNext = false;
    }
  }

  async function startJob(input: StartJobOptions) {
    const { jobId, path, presetId, tier } = input;

    if (!planner.canStartJob(presetId)) {
      return;
    }

    jobs.markProbing(jobId);

    try {
      const summary = await planner.probe(path);
      jobs.markPlanning(jobId, summary);

      const planningDecision = await planner.plan(summary, presetId, tier, path);
      const decision = planner.ensureDecisionHasInput(planningDecision, path);
      const otherActive = activeJobs.value.filter(
        (active) => active.id !== jobId && active.state.status === 'running',
      ).length;

      if (decision.remuxOnly === false && otherActive > 0) {
        jobs.requeue(jobId);
        return;
      }

      jobs.markRunning(jobId, decision);

      const started = await runner.run(jobId, decision);
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
    await runner.cancel(jobId);
    if (simulate && autoStartNext) {
      startNextAvailable().catch((error) => {
        console.error('[orchestrator] Failed to start next job after cancellation:', error);
      });
    }
  }

  return {
    startJob,
    startNextAvailable,
    cancel,
    capabilities,
    teardown,
  };
}
