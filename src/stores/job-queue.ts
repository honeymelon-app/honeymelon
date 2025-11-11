import { computed, ref, type Ref, type ComputedRef } from 'vue';

import {
  isActiveState,
  isTerminalState,
  MAX_TERMINAL_JOBS,
  now,
  type JobId,
  type JobRecord,
} from './job-types';

import { JobFactory } from '@/factories/job-factory';
import { PRESETS } from '@/lib/presets';
import type { Tier } from '@/lib/types';
import { jobRepository, type JobRepository } from '@/repositories/job-repository';

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
  repository: JobRepository;
}

export function useJobQueue(): JobQueueComposable {
  // Get a direct reference to the repository's map for reactivity
  // This ensures all store instances share the same reactive map
  const jobsMap = ref(jobRepository.getInternalMap()) as Ref<Map<string, JobRecord>>;
  const maxConcurrency = ref(2);

  // Helper to trigger reactivity after repository mutations
  const triggerReactivity = () => {
    jobsMap.value = new Map(jobRepository.getInternalMap());
  };

  const jobs = computed(() => Array.from(jobsMap.value.values()));
  const queuedJobs = computed(() => jobs.value.filter((job) => job.state.status === 'queued'));
  const activeJobs = computed(() => jobs.value.filter((job) => isActiveState(job.state)));
  const terminalJobs = computed(() => jobs.value.filter((job) => isTerminalState(job.state)));
  const hasExclusiveActive = computed(() => activeJobs.value.some((job) => job.exclusive));

  function setConcurrency(count: number) {
    maxConcurrency.value = Math.max(1, Math.floor(count));
  }

  function enqueue(path: string, presetId: string, tier: Tier = 'balanced'): JobId | null {
    // Check for duplicates using repository
    const existingJobs = jobRepository.getByPath(path);
    if (existingJobs.length > 0) {
      return null;
    }

    // Find preset
    const preset = PRESETS.find((p) => p.id === presetId);
    if (!preset) {
      console.warn(`[job-queue] Preset ${presetId} not found`);
      return null;
    }

    // Use factory to create job with proper initialization
    const record = JobFactory.create(path, preset, tier);
    record.logs = [];

    // Save via repository
    jobRepository.save(record);
    triggerReactivity();
    return record.id;
  }

  function enqueueMany(paths: string[], presetId: string, tier: Tier = 'balanced'): JobId[] {
    // Find preset once for all jobs
    const preset = PRESETS.find((p) => p.id === presetId);
    if (!preset) {
      console.warn(`[job-queue] Preset ${presetId} not found`);
      return [];
    }

    // Use factory to create multiple jobs efficiently
    const records = JobFactory.createMany(paths, preset, tier);

    // Filter duplicates and save via repository
    const ids: JobId[] = [];
    for (const record of records) {
      // Check for duplicate path using repository
      const isDuplicate = jobRepository.getByPath(record.path).length > 0;
      if (!isDuplicate) {
        record.logs = [];
        jobRepository.save(record);
        ids.push(record.id);
      }
    }

    if (ids.length > 0) {
      triggerReactivity();
    }

    return ids;
  }

  function getJob(id: JobId): JobRecord | undefined {
    return jobRepository.getById(id);
  }

  function updateJob(id: JobId, updater: (job: JobRecord) => JobRecord) {
    const record = jobRepository.getById(id);
    if (!record) {
      return;
    }
    const updated = updater({ ...record });
    updated.updatedAt = now();
    jobRepository.save(updated);
    triggerReactivity();
  }

  function removeJob(id: JobId) {
    jobRepository.delete(id);
    triggerReactivity();
  }

  function clearCompleted() {
    const terminalJobs = jobRepository.getByStatuses(['completed', 'failed', 'cancelled']);
    for (const job of terminalJobs) {
      jobRepository.delete(job.id);
    }
    triggerReactivity();
  }

  function pruneTerminalJobs() {
    const terminal = terminalJobs.value;
    if (terminal.length > MAX_TERMINAL_JOBS) {
      const sorted = [...terminal].sort((a, b) => b.updatedAt - a.updatedAt);
      const toRemove = sorted.slice(MAX_TERMINAL_JOBS);
      toRemove.forEach((job) => jobRepository.delete(job.id));
      triggerReactivity();
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
    repository: jobRepository,
  };
}
