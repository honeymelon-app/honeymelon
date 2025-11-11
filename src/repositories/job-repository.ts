/**
 * Job Repository Pattern
 *
 * Provides an abstraction over job storage with a clean interface that allows
 * future persistence implementations (IndexedDB, SQLite, etc.) without changing
 * consumer code.
 */

import type { JobState } from '@/lib/types';
import type { JobRecord, JobId } from '@/stores/job-types';

/**
 * Job status type extracted from JobState
 */
export type JobStatus = JobState['status'];

/**
 * Repository interface for job storage operations
 *
 * This interface defines the contract for job storage, allowing different
 * implementations (in-memory, IndexedDB, SQLite, etc.) to be swapped without
 * affecting application code.
 */
export interface JobRepository {
  /**
   * Retrieves a job by its ID
   *
   * @param id - Unique job identifier
   * @returns Job record or undefined if not found
   */
  getById(id: JobId): JobRecord | undefined;

  /**
   * Retrieves all jobs
   *
   * @returns Array of all job records
   */
  getAll(): JobRecord[];

  /**
   * Retrieves jobs by status
   *
   * @param status - Job status to filter by
   * @returns Array of job records with matching status
   */
  getByStatus(status: JobStatus): JobRecord[];

  /**
   * Saves a job (insert or update)
   *
   * @param job - Job record to save
   */
  save(job: JobRecord): void;

  /**
   * Deletes a job by ID
   *
   * @param id - ID of job to delete
   * @returns True if job was deleted, false if not found
   */
  delete(id: JobId): boolean;

  /**
   * Deletes all jobs
   */
  clear(): void;

  /**
   * Gets the total number of jobs
   *
   * @returns Job count
   */
  count(): number;

  /**
   * Checks if a job exists
   *
   * @param id - Job ID to check
   * @returns True if job exists
   */
  exists(id: JobId): boolean;
}

/**
 * In-memory implementation of JobRepository
 *
 * This implementation stores jobs in a Map for fast access. It's the default
 * implementation and suitable for the current use case where persistence
 * across sessions isn't required.
 */
export class InMemoryJobRepository implements JobRepository {
  private jobs: Map<JobId, JobRecord>;

  constructor() {
    this.jobs = new Map();
  }

  getById(id: JobId): JobRecord | undefined {
    return this.jobs.get(id);
  }

  getAll(): JobRecord[] {
    return Array.from(this.jobs.values());
  }

  getByStatus(status: JobStatus): JobRecord[] {
    return this.getAll().filter((job) => job.state.status === status);
  }

  save(job: JobRecord): void {
    this.jobs.set(job.id, job);
  }

  delete(id: JobId): boolean {
    return this.jobs.delete(id);
  }

  clear(): void {
    this.jobs.clear();
  }

  count(): number {
    return this.jobs.size;
  }

  exists(id: JobId): boolean {
    return this.jobs.has(id);
  }

  /**
   * Gets jobs by multiple statuses
   *
   * @param statuses - Array of statuses to match
   * @returns Jobs matching any of the provided statuses
   */
  getByStatuses(statuses: JobStatus[]): JobRecord[] {
    const statusSet = new Set(statuses);
    return this.getAll().filter((job) => statusSet.has(job.state.status));
  }

  /**
   * Gets jobs by path (useful for detecting duplicates)
   *
   * @param path - File path to search for
   * @returns Job records with matching path
   */
  getByPath(path: string): JobRecord[] {
    return this.getAll().filter((job) => job.path === path);
  }

  /**
   * Gets jobs by preset ID
   *
   * @param presetId - Preset ID to filter by
   * @returns Jobs using the specified preset
   */
  getByPreset(presetId: string): JobRecord[] {
    return this.getAll().filter((job) => job.presetId === presetId);
  }

  /**
   * Finds jobs matching a predicate
   *
   * @param predicate - Function to test each job
   * @returns Jobs matching the predicate
   */
  find(predicate: (job: JobRecord) => boolean): JobRecord[] {
    return this.getAll().filter(predicate);
  }

  /**
   * Updates a job using an updater function
   *
   * @param id - Job ID to update
   * @param updater - Function that receives current job and returns updated job
   * @returns True if job was updated, false if not found
   */
  update(id: JobId, updater: (job: JobRecord) => JobRecord): boolean {
    const existing = this.jobs.get(id);
    if (!existing) {
      return false;
    }

    const updated = updater(existing);
    this.jobs.set(id, updated);
    return true;
  }

  /**
   * Gets the underlying Map (for migration/debugging purposes)
   *
   * @returns Internal Map instance
   */
  getInternalMap(): Map<JobId, JobRecord> {
    return this.jobs;
  }
}

/**
 * Default repository instance
 */
export const jobRepository = new InMemoryJobRepository();

/**
 * Factory function to create a repository instance
 *
 * This allows for future expansion to support different storage backends
 * based on configuration or environment.
 *
 * @param type - Repository type ('memory' | 'indexeddb' | 'sqlite')
 * @returns Repository instance
 */
export function createJobRepository(type: 'memory' = 'memory'): JobRepository {
  switch (type) {
    case 'memory':
      return new InMemoryJobRepository();
    // Future implementations:
    // case 'indexeddb':
    //   return new IndexedDBJobRepository();
    // case 'sqlite':
    //   return new SQLiteJobRepository();
    default:
      return new InMemoryJobRepository();
  }
}
