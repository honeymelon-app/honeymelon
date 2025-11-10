import { computed, ref, type Ref, type ComputedRef } from 'vue';
import type { Tier } from '@/lib/types';
import {
  createJobId,
  isActiveState,
  isTerminalState,
  MAX_TERMINAL_JOBS,
  now,
  type JobId,
  type JobRecord,
} from './job-types';

export interface JobQueueComposable {
  jobsMap: Ref<Map<string, JobRecord>>;
  jobs: ComputedRef<JobRecord[]>;
  queuedJobs: ComputedRef<JobRecord[]>;
  activeJobs: ComputedRef<JobRecord[]>;
  terminalJobs: ComputedRef<JobRecord[]>;
  hasExclusiveActive: ComputedRef<boolean>;
  maxConcurrency: Ref<number>;
  setConcurrency: (count: number) => void;
  enqueue: (path: string, presetId: string, tier?: Tier) => JobId | null;
  enqueueMany: (paths: string[], presetId: string, tier?: Tier) => JobId[];
  getJob: (id: JobId) => JobRecord | undefined;
  updateJob: (id: JobId, updater: (job: JobRecord) => JobRecord) => void;
  removeJob: (id: JobId) => void;
  clearCompleted: () => void;
  pruneTerminalJobs: () => void;
  startNext: () => JobRecord | undefined;
  peekNext: () => JobRecord | undefined;
}

export function useJobQueue(): JobQueueComposable {
  const jobsMap = ref<Map<string, JobRecord>>(new Map());
  const maxConcurrency = ref(2);

  const jobs = computed(() => Array.from(jobsMap.value.values()));
  const queuedJobs = computed(() => jobs.value.filter((job) => job.state.status === 'queued'));
  const activeJobs = computed(() => jobs.value.filter((job) => isActiveState(job.state)));
  const terminalJobs = computed(() => jobs.value.filter((job) => isTerminalState(job.state)));
  const hasExclusiveActive = computed(() => activeJobs.value.some((job) => job.exclusive));

  function setConcurrency(count: number) {
    maxConcurrency.value = Math.max(1, Math.floor(count));
  }

  function enqueue(path: string, presetId: string, tier: Tier = 'balanced'): JobId | null {
    for (const job of jobsMap.value.values()) {
      if (job.path === path) {
        return null;
      }
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

    jobsMap.value.set(id, record);
    return id;
  }

  function enqueueMany(paths: string[], presetId: string, tier: Tier = 'balanced'): JobId[] {
    return paths
      .map((path) => enqueue(path, presetId, tier))
      .filter((id): id is JobId => id !== null);
  }

  function getJob(id: JobId): JobRecord | undefined {
    return jobsMap.value.get(id);
  }

  function updateJob(id: JobId, updater: (job: JobRecord) => JobRecord) {
    const record = jobsMap.value.get(id);
    if (!record) {
      return;
    }
    const updated = updater({ ...record });
    updated.updatedAt = now();
    jobsMap.value.set(id, updated);
  }

  function removeJob(id: JobId) {
    jobsMap.value.delete(id);
  }

  function clearCompleted() {
    for (const [id, job] of jobsMap.value.entries()) {
      if (isTerminalState(job.state)) {
        jobsMap.value.delete(id);
      }
    }
  }

  function pruneTerminalJobs() {
    const terminal = terminalJobs.value;
    if (terminal.length > MAX_TERMINAL_JOBS) {
      const sorted = [...terminal].sort((a, b) => b.updatedAt - a.updatedAt);
      const toRemove = sorted.slice(MAX_TERMINAL_JOBS);
      toRemove.forEach((job) => removeJob(job.id));
    }
  }

  function startNext(): JobRecord | undefined {
    if (activeJobs.value.length >= maxConcurrency.value) {
      return undefined;
    }
    const next = jobs.value.find((job) => job.state.status === 'queued');
    if (!next) {
      return undefined;
    }
    // Note: markProbing is from job-state module, will be injected
    return getJob(next.id);
  }

  function peekNext(): JobRecord | undefined {
    return jobs.value.find((job) => job.state.status === 'queued');
  }

  return {
    jobsMap,
    jobs,
    queuedJobs,
    activeJobs,
    terminalJobs,
    hasExclusiveActive,
    maxConcurrency,
    setConcurrency,
    enqueue,
    enqueueMany,
    getJob,
    updateJob,
    removeJob,
    clearCompleted,
    pruneTerminalJobs,
    startNext,
    peekNext,
  };
}
