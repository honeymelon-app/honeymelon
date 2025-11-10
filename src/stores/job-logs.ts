import { LIMITS } from '@/lib/constants';
import type { JobId } from './job-types';
import type { JobQueueComposable } from './job-queue';

export interface JobLogsComposable {
  clearLogs: (id: JobId) => void;
  appendLog: (id: JobId, line: string) => void;
  setLogs: (id: JobId, lines: string[]) => void;
}

export function useJobLogs(queue: JobQueueComposable): JobLogsComposable {
  const { updateJob } = queue;

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

  return {
    clearLogs,
    appendLog,
    setLogs,
  };
}
