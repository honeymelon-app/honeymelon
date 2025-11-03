import { computed, ref } from 'vue';
import { defineStore } from 'pinia';

import { LIMITS } from '@/lib/constants';
import type { PlannerDecision } from '@/lib/ffmpeg-plan';
import type { JobProgress, JobState, ProbeSummary, Tier } from '@/lib/types';

interface JobRecord {
  id: string;
  path: string;
  presetId: string;
  tier: Tier;
  state: JobState;
  summary?: ProbeSummary;
  decision?: PlannerDecision;
  exclusive?: boolean;
  outputPath?: string;
  logs?: string[];
  createdAt: number;
  updatedAt: number;
}

type JobId = string;

function isActiveState(state: JobState): boolean {
  return state.status === 'probing' || state.status === 'planning' || state.status === 'running';
}

function isTerminalState(state: JobState): boolean {
  return state.status === 'completed' || state.status === 'failed' || state.status === 'cancelled';
}

function now(): number {
  return Date.now();
}

function createJobId(): JobId {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `job-${Math.random().toString(36).slice(2, 10)}`;
}

function readEnqueuedAt(state: JobState): number {
  return state.enqueuedAt;
}

export const useJobsStore = defineStore('jobs', () => {
  const jobs = ref<JobRecord[]>([]);
  const maxConcurrency = ref(2);

  const queuedJobs = computed(() => jobs.value.filter((job) => job.state.status === 'queued'));
  const activeJobs = computed(() => jobs.value.filter((job) => isActiveState(job.state)));
  const terminalJobs = computed(() => jobs.value.filter((job) => isTerminalState(job.state)));

  const hasExclusiveActive = computed(() => activeJobs.value.some((job) => job.exclusive));

  const runningEtaSeconds = computed<number | null>(() => {
    let total = 0;
    let haveEstimate = false;

    for (const job of jobs.value) {
      if (job.state.status !== 'running') {
        continue;
      }

      const processed = job.state.progress.processedSeconds ?? 0;
      const duration = job.summary?.durationSec ?? 0;
      if (duration <= 0) {
        continue;
      }
      const remaining = Math.max(duration - processed, 0);
      total += remaining;
      haveEstimate = true;
    }

    return haveEstimate ? Math.ceil(total) : null;
  });

  function setConcurrency(count: number) {
    maxConcurrency.value = Math.max(1, Math.floor(count));
  }

  function enqueue(path: string, presetId: string, tier: Tier = 'balanced'): JobId | null {
    if (jobs.value.some((job) => job.path === path)) {
      return null;
    }
    const createdAt = now();
    const id = createJobId();
    const record: JobRecord = {
      id,
      path,
      presetId,
      tier,
      state: {
        status: 'queued',
        enqueuedAt: createdAt,
      },
      logs: [],
      createdAt,
      updatedAt: createdAt,
    };

    jobs.value = [...jobs.value, record];
    return id;
  }

  function enqueueMany(paths: string[], presetId: string, tier: Tier = 'balanced'): JobId[] {
    return paths
      .map((path) => enqueue(path, presetId, tier))
      .filter((id): id is JobId => id !== null);
  }

  function getJob(id: JobId): JobRecord | undefined {
    return jobs.value.find((job) => job.id === id);
  }

  function updateJob(id: JobId, updater: (job: JobRecord) => JobRecord) {
    const index = jobs.value.findIndex((j) => j.id === id);
    if (index === -1) {
      return;
    }
    const record = jobs.value[index];
    const updated = updater({ ...record });
    updated.updatedAt = now();
    jobs.value = [...jobs.value.slice(0, index), updated, ...jobs.value.slice(index + 1)];
  }

  function markProbing(id: JobId) {
    updateJob(id, (job) => {
      if (job.state.status !== 'queued') {
        return job;
      }
      const startedAt = now();
      return {
        ...job,
        state: {
          status: 'probing',
          enqueuedAt: job.state.enqueuedAt,
          startedAt,
        },
      };
    });
  }

  function markPlanning(id: JobId, summary: ProbeSummary) {
    updateJob(id, (job) => {
      const enqueuedAt = readEnqueuedAt(job.state);
      const startedAt = job.state.status === 'probing' ? job.state.startedAt : now();
      return {
        ...job,
        summary,
        state: {
          status: 'planning',
          enqueuedAt,
          startedAt,
          probeSummary: summary,
        },
      };
    });
  }

  function markRunning(id: JobId, decision: PlannerDecision) {
    updateJob(id, (job) => {
      const enqueuedAt = readEnqueuedAt(job.state);
      const startedAt = job.state.status === 'planning' ? job.state.startedAt : now();
      return {
        ...job,
        decision,
        exclusive: job.exclusive ?? false,
        logs: [],
        state: {
          status: 'running',
          enqueuedAt,
          startedAt,
          progress: {},
        },
      };
    });
  }

  function setExclusive(id: JobId, exclusive: boolean) {
    updateJob(id, (job) => ({
      ...job,
      exclusive,
    }));
  }

  function setOutputPath(id: JobId, outputPath: string) {
    updateJob(id, (job) => ({
      ...job,
      outputPath,
    }));
  }

  function clearLogs(id: JobId) {
    updateJob(id, (job) => ({
      ...job,
      logs: [],
    }));
  }

  function appendLog(id: JobId, line: string) {
    updateJob(id, (job) => {
      const logs = job.logs ?? [];
      const newLogs = [...logs, line];
      if (newLogs.length > LIMITS.JOB_LOG_MAX_LINES) {
        newLogs.splice(0, newLogs.length - LIMITS.JOB_LOG_MAX_LINES);
      }
      return {
        ...job,
        logs: newLogs,
      };
    });
  }

  function setLogs(id: JobId, lines: string[]) {
    updateJob(id, (job) => ({
      ...job,
      logs: [...lines],
    }));
  }

  function updateProgress(id: JobId, progress: JobProgress) {
    updateJob(id, (job) => {
      if (job.state.status !== 'running') {
        return job;
      }
      let nextProgress = {
        ...job.state.progress,
        ...progress,
      };

      if (
        nextProgress.processedSeconds !== undefined &&
        job.summary?.durationSec &&
        job.summary.durationSec > 0
      ) {
        const ratio = Math.min(
          Math.max(nextProgress.processedSeconds / job.summary.durationSec, 0),
          1,
        );
        nextProgress = {
          ...nextProgress,
          ratio,
        };

        if (progress.speed === undefined && ratio > 0) {
          const elapsed = performance.now() - job.state.startedAt;
          if (elapsed > 0) {
            const processedSeconds = nextProgress.processedSeconds;
            const speed = (processedSeconds ?? 0) / (elapsed / 1000);
            nextProgress = {
              ...nextProgress,
              speed,
            };
          }
        }
      }

      return {
        ...job,
        state: {
          ...job.state,
          progress: nextProgress,
        },
      };
    });
  }

  function markCompleted(id: JobId, outputPath: string) {
    updateJob(id, (job) => {
      const enqueuedAt = readEnqueuedAt(job.state);
      const startedAt = job.state.status === 'running' ? job.state.startedAt : now();
      return {
        ...job,
        outputPath,
        exclusive: false,
        state: {
          status: 'completed',
          enqueuedAt,
          startedAt,
          finishedAt: now(),
          outputPath,
        },
      };
    });
  }

  function markFailed(id: JobId, error: string, code?: string) {
    updateJob(id, (job) => {
      const enqueuedAt = readEnqueuedAt(job.state);
      const startedAt = 'startedAt' in job.state ? job.state.startedAt : now();
      return {
        ...job,
        exclusive: false,
        state: {
          status: 'failed',
          enqueuedAt,
          startedAt,
          finishedAt: now(),
          error,
          code,
        },
      };
    });
  }

  function cancelJob(id: JobId) {
    updateJob(id, (job) => {
      const enqueuedAt = readEnqueuedAt(job.state);
      const startedAt = 'startedAt' in job.state ? job.state.startedAt : now();
      return {
        ...job,
        exclusive: false,
        logs: [],
        state: {
          status: 'cancelled',
          enqueuedAt,
          startedAt,
          finishedAt: now(),
        },
      };
    });
  }

  function requeue(id: JobId) {
    updateJob(id, (job) => ({
      ...job,
      exclusive: false,
      logs: [],
      state: {
        status: 'queued',
        enqueuedAt: now(),
      },
    }));
  }

  function removeJob(id: JobId) {
    jobs.value = jobs.value.filter((job) => job.id !== id);
  }

  function updateJobPreset(id: JobId, presetId: string) {
    updateJob(id, (job) => ({
      ...job,
      presetId,
    }));
  }

  function clearCompleted() {
    jobs.value = jobs.value.filter((job) => !isTerminalState(job.state));
  }

  function startNext(): JobRecord | undefined {
    if (activeJobs.value.length >= maxConcurrency.value) {
      return undefined;
    }
    const next = jobs.value.find((job) => job.state.status === 'queued');
    if (!next) {
      return undefined;
    }
    markProbing(next.id);
    return getJob(next.id);
  }

  function peekNext(): JobRecord | undefined {
    return jobs.value.find((job) => job.state.status === 'queued');
  }

  return {
    jobs,
    maxConcurrency,
    queuedJobs,
    activeJobs,
    terminalJobs,
    hasExclusiveActive,
    runningEtaSeconds,
    setConcurrency,
    enqueue,
    enqueueMany,
    getJob,
    markProbing,
    markPlanning,
    markRunning,
    setExclusive,
    setOutputPath,
    clearLogs,
    appendLog,
    setLogs,
    updateProgress,
    markCompleted,
    markFailed,
    cancelJob,
    requeue,
    removeJob,
    updateJobPreset,
    clearCompleted,
    startNext,
    peekNext,
  };
});
