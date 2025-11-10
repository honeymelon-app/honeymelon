import { defineStore } from 'pinia';
import { useJobQueue } from './job-queue';
import { useJobState } from './job-state';
import { useJobProgress } from './job-progress';
import { useJobLogs } from './job-logs';

export const useJobsStore = defineStore('jobs', () => {
  const queue = useJobQueue();
  const state = useJobState(queue);
  const progress = useJobProgress(queue);
  const logs = useJobLogs(queue);

  // Fix startNext to call markProbing
  queue.startNext = () => {
    if (queue.activeJobs.value.length >= queue.maxConcurrency.value) {
      return undefined;
    }
    const next = queue.jobs.value.find((job) => job.state.status === 'queued');
    if (!next) {
      return undefined;
    }
    state.markProbing(next.id);
    return queue.getJob(next.id);
  };

  return {
    // Queue
    ...queue,
    // State
    ...state,
    // Progress
    ...progress,
    // Logs
    ...logs,
  };
});
