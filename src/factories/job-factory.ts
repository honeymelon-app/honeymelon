/**
 * Job Factory Pattern
 *
 * Provides centralized job creation logic with proper initialization
 * based on media kind and preset configuration.
 */

import type { Preset, Tier } from '@/lib/types';
import type { JobRecord } from '@/stores/job-types';
import { createJobId, now } from '@/stores/job-types';

/**
 * Base job data for creation
 */
interface BaseJobData {
  path: string;
  presetId: string;
  tier: Tier;
}

/**
 * JobFactory - Creates properly initialized job records
 *
 * This factory encapsulates the logic for creating job records with correct
 * initial state based on the preset's media kind and other characteristics.
 */
export class JobFactory {
  /**
   * Creates a job record for the given file and preset
   *
   * @param path - File system path to the media file
   * @param preset - The preset to use for conversion
   * @param tier - Quality tier (fast, balanced, high)
   * @returns Initialized job record
   */
  static create(path: string, preset: Preset, tier: Tier = 'balanced'): JobRecord {
    const base: BaseJobData = {
      path,
      presetId: preset.id,
      tier,
    };

    // Determine if job requires exclusive execution
    const exclusive = this.requiresExclusiveExecution(preset);

    return this.createJobRecord(base, exclusive);
  }

  /**
   * Creates multiple job records for batch operations
   *
   * @param paths - Array of file paths
   * @param preset - The preset to use for all conversions
   * @param tier - Quality tier for all jobs
   * @returns Array of initialized job records
   */
  static createMany(paths: string[], preset: Preset, tier: Tier = 'balanced'): JobRecord[] {
    return paths.map((path) => this.create(path, preset, tier));
  }

  /**
   * Determines if a preset requires exclusive execution
   *
   * Exclusive execution prevents other jobs from running concurrently,
   * which is needed for resource-intensive codecs like AV1 or ProRes.
   *
   * @param preset - The preset to check
   * @returns True if exclusive execution is required
   */
  private static requiresExclusiveExecution(preset: Preset): boolean {
    // AV1 encoding is extremely CPU-intensive
    if (preset.video.codec === 'av1') {
      return true;
    }

    // ProRes encoding can be memory-intensive
    if (preset.video.codec === 'prores') {
      return true;
    }

    return false;
  }

  /**
   * Creates the actual job record with all required fields
   *
   * @param base - Base job data
   * @param exclusive - Whether job requires exclusive execution
   * @returns Complete job record
   */
  private static createJobRecord(base: BaseJobData, exclusive: boolean): JobRecord {
    const timestamp = now();

    return {
      id: createJobId(),
      path: base.path,
      presetId: base.presetId,
      tier: base.tier,
      state: {
        status: 'queued',
        enqueuedAt: timestamp,
      },
      exclusive,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  }
}
