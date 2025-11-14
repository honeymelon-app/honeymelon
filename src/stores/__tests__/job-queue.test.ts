import { beforeEach, describe, expect, it, vi } from 'vitest';

import { jobService } from '@/services/job-service';
import { useJobQueue } from '@/stores/job-queue';
import { MAX_TERMINAL_JOBS } from '@/stores/job-types';

describe('useJobQueue', () => {
  beforeEach(() => {
    jobService.reset();
  });

  it('enqueues jobs and prevents duplicate paths', () => {
    const queue = useJobQueue();
    const presetId = 'video-to-mp4';

    const firstId = queue.enqueue('/clips/a.mp4', presetId);
    const secondId = queue.enqueue('/clips/a.mp4', presetId);

    expect(firstId).toBeTruthy();
    expect(secondId).toBeNull();
    expect(queue.jobs.value).toHaveLength(1);
  });

  it('deduplicates batch enqueue requests and logs duplicates once', () => {
    const queue = useJobQueue();
    const presetId = 'video-to-mp4';
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    queue.enqueue('/clips/existing.mp4', presetId);
    const jobIds = queue.enqueueMany(
      ['/clips/existing.mp4', '/clips/new.mp4', '/clips/new.mp4'],
      presetId,
    );

    expect(jobIds).toHaveLength(1);
    expect(queue.jobs.value.length).toBe(2);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('prunes terminal jobs to the configured ceiling', () => {
    const queue = useJobQueue();
    const presetId = 'video-to-mp4';
    const ids: string[] = [];

    for (let i = 0; i < MAX_TERMINAL_JOBS + 5; i += 1) {
      const id = queue.enqueue(`/clips/${i}.mp4`, presetId);
      if (id) {
        ids.push(id);
      }
    }

    const nowSpy = vi.spyOn(Date, 'now');
    let timestamp = 1_700_000_000_000;
    nowSpy.mockImplementation(() => timestamp++);

    ids.forEach((id, index) => {
      jobService.update(id, (job) => ({
        ...job,
        state: {
          status: 'completed',
          enqueuedAt: job.state.enqueuedAt,
          startedAt: job.state.enqueuedAt + 5,
          finishedAt: job.state.enqueuedAt + 15,
          outputPath: `/outputs/${index}.mp4`,
        },
      }));
    });

    nowSpy.mockRestore();

    queue.pruneTerminalJobs();
    expect(jobService.getByStatuses(['completed']).length).toBe(MAX_TERMINAL_JOBS);
  });

  it('respects concurrency limits when starting jobs', () => {
    const queue = useJobQueue();
    const presetId = 'video-to-mp4';

    const firstId = queue.enqueue('/clips/run-a.mp4', presetId);
    const secondId = queue.enqueue('/clips/run-b.mp4', presetId);
    expect(firstId).toBeTruthy();
    expect(secondId).toBeTruthy();

    queue.setConcurrency(1);
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(1_700_000_100_000);

    if (firstId) {
      jobService.update(firstId, (job) => ({
        ...job,
        state: {
          status: 'running',
          enqueuedAt: job.state.enqueuedAt,
          startedAt: job.state.enqueuedAt + 5,
          progress: { ratio: 0.1 },
        },
      }));
    }

    nowSpy.mockRestore();

    expect(queue.startNext()).toBeUndefined();

    queue.setConcurrency(2);
    const nextJob = queue.startNext();
    expect(nextJob?.id).toBe(secondId);
  });
});
