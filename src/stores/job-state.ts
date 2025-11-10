import type { PlannerDecision } from '@/lib/ffmpeg-plan';
import type { ProbeSummary } from '@/lib/types';
import { now, readEnqueuedAt, type JobId } from './job-types';
import type { JobQueueComposable } from './job-queue';

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
    pruneTerminalJobs();
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
    pruneTerminalJobs();
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
