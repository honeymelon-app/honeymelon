import { computed, type ComputedRef } from 'vue';

import type { JobQueueComposable } from './job-queue';
import type { JobId } from './job-types';

import type { JobProgress } from '@/lib/types';

export interface JobProgressComposable {
  runningEtaSeconds: ComputedRef<number | null>;
  updateProgress: (id: JobId, progress: JobProgress) => void;
}

export function useJobProgress(queue: JobQueueComposable): JobProgressComposable {
  const { jobs, updateJob } = queue;

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
        const ratio =
          job.summary.durationSec > 0
            ? Math.min(Math.max(nextProgress.processedSeconds / job.summary.durationSec, 0), 1)
            : 0;
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

  return {
    runningEtaSeconds,
    updateProgress,
  };
}
