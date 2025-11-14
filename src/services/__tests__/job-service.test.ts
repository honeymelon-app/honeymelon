import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

import { InMemoryJobRepository } from '@/repositories/job-repository';
import { JobService } from '@/services/job-service';
import type { JobRecord } from '@/stores/job-types';

function buildJob(overrides: Partial<JobRecord> = {}): JobRecord {
  const timestamp = Date.now();
  return {
    id: `job-${Math.random().toString(36).slice(2)}`,
    path: overrides.path ?? '/video.mp4',
    presetId: overrides.presetId ?? 'preset-h264',
    tier: overrides.tier ?? 'balanced',
    state: overrides.state ?? {
      status: 'queued',
      enqueuedAt: timestamp,
    },
    summary: overrides.summary,
    decision: overrides.decision,
    exclusive: overrides.exclusive,
    outputPath: overrides.outputPath,
    logs: overrides.logs ?? [],
    createdAt: overrides.createdAt ?? timestamp,
    updatedAt: overrides.updatedAt ?? timestamp,
  };
}

describe('JobService', () => {
  let repository: InMemoryJobRepository;
  let service: JobService;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    repository = new InMemoryJobRepository();
    service = new JobService(repository);
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('prevents duplicate paths via canEnqueuePath', () => {
    const job = buildJob({ path: '/clips/scene.mp4' });
    service.save(job);

    expect(service.canEnqueuePath('/clips/scene.mp4')).toBe(false);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toContain('duplicate job');
  });

  it('filters unique paths and logs duplicates once per reason', () => {
    service.save(buildJob({ path: '/existing.mp4' }));

    const result = service.filterUniquePaths([
      '/existing.mp4',
      '/existing.mp4',
      '/new.mp4',
      '/new.mp4',
    ]);

    expect(result.accepted).toEqual(['/new.mp4']);
    expect(result.duplicates).toEqual(['/existing.mp4', '/existing.mp4', '/new.mp4']);
    expect(warnSpy).toHaveBeenCalledTimes(3);
  });

  it('deletes multiple jobs transactionally', () => {
    const jobs = ['/a.mp4', '/b.mp4', '/c.mp4'].map((path) => buildJob({ path }));
    service.saveMany(jobs);

    const removed = service.deleteMany([jobs[0].id, jobs[2].id]);
    expect(removed).toBe(2);
    expect(service.reactiveMap.value.size).toBe(1);
  });

  it('updates jobs while refreshing timestamps', () => {
    const nowSpy = vi.spyOn(Date, 'now');
    nowSpy.mockReturnValue(1_000);
    const job = buildJob();
    service.save(job);

    nowSpy.mockReturnValue(2_000);
    const updated = service.update(job.id, (current) => ({
      ...current,
      path: '/renamed.mp4',
    }));

    expect(updated).toBeDefined();
    expect(updated?.path).toBe('/renamed.mp4');
    expect(updated?.updatedAt).toBeGreaterThan(job.updatedAt);
    nowSpy.mockRestore();
  });
});
