import { beforeEach, describe, expect, it } from 'vitest';

import { InMemoryJobRepository } from '@/repositories/job-repository';
import type { JobRecord } from '@/stores/job-types';

describe('InMemoryJobRepository', () => {
  let repository: InMemoryJobRepository;
  let jobCounter = 0;

  beforeEach(() => {
    repository = new InMemoryJobRepository();
    jobCounter = 0;
  });

  function makeJob(overrides: Partial<JobRecord> = {}): JobRecord {
    const timestamp = overrides.createdAt ?? Date.now();
    return {
      id: overrides.id ?? `job-${jobCounter++}`,
      path: overrides.path ?? `/tmp/file-${jobCounter}.mp4`,
      presetId: overrides.presetId ?? 'preset-h264',
      tier: overrides.tier ?? 'balanced',
      state: overrides.state ?? {
        status: 'queued',
        enqueuedAt: timestamp,
      },
      exclusive: overrides.exclusive,
      createdAt: timestamp,
      updatedAt: overrides.updatedAt ?? timestamp,
      ...overrides,
    };
  }

  it('saves and retrieves jobs by id', () => {
    const job = makeJob();

    repository.save(job);

    expect(repository.count()).toBe(1);
    expect(repository.exists(job.id)).toBe(true);
    expect(repository.getById(job.id)).toEqual(job);
  });

  it('filters jobs by status, path, and batch status helpers', () => {
    const queued = makeJob({ path: '/tmp/a.mov', state: { status: 'queued', enqueuedAt: 1 } });
    const running = makeJob({
      path: '/tmp/b.mov',
      state: {
        status: 'running',
        enqueuedAt: 2,
        startedAt: 3,
        progress: { processedSeconds: 12 },
      },
    });
    const completed = makeJob({
      path: '/tmp/c.mov',
      state: {
        status: 'completed',
        enqueuedAt: 3,
        startedAt: 4,
        finishedAt: 5,
        outputPath: '/tmp/out.mov',
      },
    });

    repository.save(queued);
    repository.save(running);
    repository.save(completed);

    expect(repository.getByStatus('queued')).toEqual([queued]);
    expect(repository.getByStatuses(['running', 'completed']).map((job) => job.id)).toEqual([
      running.id,
      completed.id,
    ]);
    expect(repository.getByPath('/tmp/b.mov')).toEqual([running]);
  });

  it('updates and deletes jobs safely', () => {
    const job = makeJob();
    repository.save(job);

    const updatedState = {
      status: 'failed',
      enqueuedAt: job.state.enqueuedAt,
      startedAt: job.state.enqueuedAt + 1,
      finishedAt: 9,
      error: 'ffmpeg crashed',
    } as const;
    const updated = repository.update(job.id, (current) => ({
      ...current,
      state: updatedState,
      updatedAt: 999,
    }));

    expect(updated).toBe(true);
    expect(repository.getById(job.id)?.state).toEqual(updatedState);
    expect(repository.getById(job.id)?.updatedAt).toBe(999);

    expect(repository.delete(job.id)).toBe(true);
    expect(repository.count()).toBe(0);
    expect(repository.exists(job.id)).toBe(false);
  });

  it('clears all jobs at once', () => {
    repository.save(makeJob());
    repository.save(makeJob());

    repository.clear();

    expect(repository.count()).toBe(0);
    expect(repository.getAll()).toEqual([]);
  });
});
