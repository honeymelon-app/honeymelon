import type { JobQueueComposable } from './job-queue';
import { now, readEnqueuedAt, type JobId } from './job-types';

import type { PlannerDecision } from '@/lib/ffmpeg-plan';
import { jobLifecycle } from '@/lib/job-lifecycle';
import type { ProbeSummary, JobState } from '@/lib/types';
import { globalJobObserver } from '@/observers/job-observer';

export interface JobStateComposable {
  markProbing: (id: JobId) => void;
  markPlanning: (id: JobId, summary: ProbeSummary) => void;
  markRunning: (id: JobId, decision: PlannerDecision) => void;
  setExclusive: (id: JobId, exclusive: boolean) => void;
  setOutputPath: (id: JobId, outputPath: string) => void;
  markCompleted: (id: JobId, outputPath: string) => void;
  markFailed: (id: JobId, error: string, code?: string) => void;
  cancelJob: (id: JobId) => void;
  requeue: (id: JobId) => void;
  updateJobPreset: (id: JobId, presetId: string) => void;
}

export function useJobState(queue: JobQueueComposable): JobStateComposable {
  const { updateJob, pruneTerminalJobs } = queue;

  function markProbing(id: JobId) {
    updateJob(id, (job) => {
      if (job.state.status !== 'queued') {
        return job;
      }
      const oldState = job.state;
      const startedAt = now();
      const newState: JobState = {
        status: 'probing',
        enqueuedAt: job.state.enqueuedAt,
        startedAt,
      };

      if (!jobLifecycle.ensureTransition(job.state, newState, 'markProbing')) {
        return job;
      }

      // Notify observers of state change
      globalJobObserver.onStateChange(id, oldState, newState);

      return {
        ...job,
        state: newState,
      };
    });
  }

  function markPlanning(id: JobId, summary: ProbeSummary) {
    updateJob(id, (job) => {
      const enqueuedAt = readEnqueuedAt(job.state);
      const startedAt = job.state.status === 'probing' ? job.state.startedAt : now();
      const newState: JobState = {
        status: 'planning',
        enqueuedAt,
        startedAt,
        probeSummary: summary,
      };

      if (!jobLifecycle.ensureTransition(job.state, newState, 'markPlanning')) {
        return job;
      }

      return {
        ...job,
        summary,
        state: newState,
      };
    });
  }

  function markRunning(id: JobId, decision: PlannerDecision) {
    updateJob(id, (job) => {
      const enqueuedAt = readEnqueuedAt(job.state);
      const startedAt = job.state.status === 'planning' ? job.state.startedAt : now();
      const newState: JobState = {
        status: 'running',
        enqueuedAt,
        startedAt,
        progress: {},
      };

      if (!jobLifecycle.ensureTransition(job.state, newState, 'markRunning')) {
        return job;
      }

      return {
        ...job,
        decision,
        exclusive: job.exclusive ?? false,
        logs: [],
        state: newState,
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

  function markCompleted(id: JobId, outputPath: string) {
    updateJob(id, (job) => {
      const enqueuedAt = readEnqueuedAt(job.state);
      const startedAt = job.state.status === 'running' ? job.state.startedAt : now();
      const newState: JobState = {
        status: 'completed',
        enqueuedAt,
        startedAt,
        finishedAt: now(),
        outputPath,
      };

      if (!jobLifecycle.ensureTransition(job.state, newState, 'markCompleted')) {
        return job;
      }

      return {
        ...job,
        outputPath,
        exclusive: false,
        state: newState,
      };
    });
    pruneTerminalJobs();
  }

  function markFailed(id: JobId, error: string, code?: string) {
    updateJob(id, (job) => {
      const enqueuedAt = readEnqueuedAt(job.state);
      const startedAt = 'startedAt' in job.state ? job.state.startedAt : now();
      const newState: JobState = {
        status: 'failed',
        enqueuedAt,
        startedAt,
        finishedAt: now(),
        error,
        code,
      };

      if (!jobLifecycle.ensureTransition(job.state, newState, 'markFailed')) {
        return job;
      }

      return {
        ...job,
        exclusive: false,
        state: newState,
      };
    });
    pruneTerminalJobs();
  }

  function cancelJob(id: JobId) {
    updateJob(id, (job) => {
      const enqueuedAt = readEnqueuedAt(job.state);
      const startedAt = 'startedAt' in job.state ? job.state.startedAt : now();
      const newState: JobState = {
        status: 'cancelled',
        enqueuedAt,
        startedAt,
        finishedAt: now(),
      };

      if (!jobLifecycle.ensureTransition(job.state, newState, 'cancelJob')) {
        return job;
      }

      return {
        ...job,
        exclusive: false,
        logs: [],
        state: newState,
      };
    });
  }

  function requeue(id: JobId) {
    updateJob(id, (job) => {
      const newState: JobState = {
        status: 'queued',
        enqueuedAt: now(),
      };

      if (!jobLifecycle.ensureTransition(job.state, newState, 'requeue')) {
        return job;
      }

      return {
        ...job,
        exclusive: false,
        logs: [],
        state: newState,
      };
    });
  }

  function updateJobPreset(id: JobId, presetId: string) {
    updateJob(id, (job) => ({
      ...job,
      presetId,
    }));
  }

  return {
    markProbing,
    markPlanning,
    markRunning,
    setExclusive,
    setOutputPath,
    markCompleted,
    markFailed,
    cancelJob,
    requeue,
    updateJobPreset,
  };
}
