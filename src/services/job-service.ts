import { ref, type Ref } from 'vue';

import { jobRepository, type JobRepository, type JobStatus } from '@/repositories/job-repository';
import { now, type JobId, type JobRecord } from '@/stores/job-types';

interface FilterPathsResult {
  accepted: string[];
  duplicates: string[];
}

/**
 * JobService centralizes access to the job repository and ensures that
 * duplicate detection, logging, and transactional updates happen in one place.
 */
export class JobService {
  private readonly repository: JobRepository;
  private readonly jobsMap: Ref<Map<JobId, JobRecord>>;
  private batching = false;
  private dirtyDuringBatch = false;

  constructor(repository: JobRepository) {
    this.repository = repository;
    this.jobsMap = ref(new Map(repository.getInternalMap())) as Ref<Map<JobId, JobRecord>>;
  }

  get reactiveMap(): Ref<Map<JobId, JobRecord>> {
    return this.jobsMap;
  }

  get repo(): JobRepository {
    return this.repository;
  }

  getAll(): JobRecord[] {
    return this.repository.getAll();
  }

  getById(id: JobId): JobRecord | undefined {
    return this.repository.getById(id);
  }

  getByStatuses(statuses: JobStatus[]): JobRecord[] {
    return this.repository.getByStatuses(statuses);
  }

  canEnqueuePath(path: string): boolean {
    const duplicates = this.repository.getByPath(path);
    if (duplicates.length > 0) {
      this.logDuplicate(path, `${duplicates.length} already queued`);
      return false;
    }
    return true;
  }

  filterUniquePaths(paths: string[]): FilterPathsResult {
    const accepted: string[] = [];
    const duplicates: string[] = [];
    const seen = new Set<string>();

    for (const path of paths) {
      if (seen.has(path)) {
        duplicates.push(path);
        this.logDuplicate(path, 'provided twice in the same batch');
        continue;
      }
      seen.add(path);

      if (!this.canEnqueuePath(path)) {
        duplicates.push(path);
        continue;
      }

      accepted.push(path);
    }

    return { accepted, duplicates };
  }

  save(job: JobRecord): JobRecord {
    this.repository.save(this.prepareJob(job));
    this.markDirty();
    return job;
  }

  saveMany(jobs: JobRecord[]): JobRecord[] {
    if (jobs.length === 0) {
      return jobs;
    }

    this.transaction(() => {
      for (const job of jobs) {
        this.repository.save(this.prepareJob(job));
        this.markDirty();
      }
    });

    return jobs;
  }

  update(id: JobId, updater: (job: JobRecord) => JobRecord): JobRecord | undefined {
    const existing = this.repository.getById(id);
    if (!existing) {
      return undefined;
    }

    const updated = this.prepareJob(updater({ ...existing }));
    updated.updatedAt = now();
    this.repository.save(updated);
    this.markDirty();
    return updated;
  }

  delete(id: JobId): boolean {
    const removed = this.repository.delete(id);
    if (removed) {
      this.markDirty();
    }
    return removed;
  }

  deleteMany(ids: JobId[]): number {
    if (!ids.length) {
      return 0;
    }

    let removed = 0;
    this.transaction(() => {
      for (const id of ids) {
        if (this.repository.delete(id)) {
          removed += 1;
          this.markDirty();
        }
      }
    });

    return removed;
  }

  clearByStatuses(statuses: JobStatus[]): number {
    const jobs = this.repository.getByStatuses(statuses);
    this.deleteMany(jobs.map((job) => job.id));
    return jobs.length;
  }

  reset(): void {
    this.transaction(() => {
      this.repository.clear();
      this.markDirty();
    });
  }

  transaction(mutator: () => void): void {
    if (this.batching) {
      mutator();
      return;
    }

    this.batching = true;
    try {
      mutator();
    } finally {
      this.batching = false;
      if (this.dirtyDuringBatch) {
        this.dirtyDuringBatch = false;
        this.syncFromRepository();
      }
    }
  }

  private prepareJob(job: JobRecord): JobRecord {
    if (!Array.isArray(job.logs)) {
      job.logs = [];
    }
    return job;
  }

  private syncFromRepository(): void {
    this.jobsMap.value = new Map(this.repository.getInternalMap());
  }

  private markDirty(): void {
    if (this.batching) {
      this.dirtyDuringBatch = true;
      return;
    }
    this.syncFromRepository();
  }

  private logDuplicate(path: string, detail: string): void {
    console.warn(`[job-service] Skipping duplicate job for path "${path}" (${detail}).`);
  }
}

export const jobService = new JobService(jobRepository);
