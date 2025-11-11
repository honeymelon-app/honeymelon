/**
 * Execution Service - Wraps FFmpeg job execution operations
 *
 * Provides a clean abstraction over job execution with proper error handling,
 * cancellation support, and concurrency management.
 */

import { invoke } from '@tauri-apps/api/core';

import type { PlannerDecision } from '@/lib/ffmpeg-plan';

/**
 * Result of a job start operation
 */
export interface ExecutionResult {
  success: boolean;
  error?: string;
  code?: string;
}

/**
 * Job execution options
 */
export interface ExecutionOptions {
  jobId: string;
  decision: PlannerDecision;
  outputPath: string;
  exclusive?: boolean;
}

/**
 * Cancellation result
 */
export interface CancellationResult {
  success: boolean;
  cancelled: boolean;
  error?: string;
}

/**
 * ExecutionService - Handles FFmpeg job execution
 *
 * This service encapsulates all logic related to executing FFmpeg conversions,
 * including starting jobs, cancellation, and concurrency control.
 */
export class ExecutionService {
  /**
   * Starts a FFmpeg conversion job
   *
   * @param options - Execution options
   * @returns Promise with execution result
   *
   * @example
   * ```ts
   * const service = new ExecutionService();
   * const result = await service.start({
   *   jobId: 'job-123',
   *   decision: plannerDecision,
   *   outputPath: '/output/video.mp4',
   *   exclusive: false
   * });
   * ```
   */
  async start(options: ExecutionOptions): Promise<ExecutionResult> {
    try {
      // Validate options
      if (!this.validateOptions(options)) {
        return {
          success: false,
          error: 'Invalid execution options',
          code: 'invalid_options',
        };
      }

      // Validate FFmpeg arguments
      if (!options.decision.ffmpegArgs || options.decision.ffmpegArgs.length === 0) {
        return {
          success: false,
          error: 'FFmpeg arguments cannot be empty',
          code: 'job_invalid_args',
        };
      }

      // Start the job via Tauri command
      await invoke<void>('start_job', {
        jobId: options.jobId,
        args: options.decision.ffmpegArgs,
        outputPath: options.outputPath,
        exclusive: options.exclusive ?? false,
      });

      return {
        success: true,
      };
    } catch (error) {
      // Parse error details
      const details = this.parseError(error);
      return {
        success: false,
        error: details.message,
        code: details.code,
      };
    }
  }

  /**
   * Cancels a running job
   *
   * @param jobId - ID of the job to cancel
   * @returns Promise with cancellation result
   *
   * @example
   * ```ts
   * const service = new ExecutionService();
   * const result = await service.cancel('job-123');
   * if (result.cancelled) {
   *   console.log('Job cancelled successfully');
   * }
   * ```
   */
  async cancel(jobId: string): Promise<CancellationResult> {
    try {
      if (!jobId || typeof jobId !== 'string') {
        return {
          success: false,
          cancelled: false,
          error: 'Invalid job ID',
        };
      }

      const cancelled = await invoke<boolean>('cancel_job', { jobId });

      return {
        success: true,
        cancelled,
      };
    } catch (error) {
      const details = this.parseError(error);
      return {
        success: false,
        cancelled: false,
        error: details.message,
      };
    }
  }

  /**
   * Sets the maximum number of concurrent jobs
   *
   * @param limit - Maximum concurrent jobs (minimum 1)
   * @returns Promise that resolves when limit is set
   *
   * @example
   * ```ts
   * const service = new ExecutionService();
   * await service.setConcurrency(4);
   * ```
   */
  async setConcurrency(limit: number): Promise<void> {
    const actualLimit = Math.max(1, Math.floor(limit));
    await invoke<void>('set_max_concurrency', { limit: actualLimit });
  }

  /**
   * Validates execution options
   *
   * @param options - Options to validate
   * @returns True if options are valid
   */
  validateOptions(options: ExecutionOptions): boolean {
    if (!options.jobId || typeof options.jobId !== 'string') {
      return false;
    }

    if (!options.outputPath || typeof options.outputPath !== 'string') {
      return false;
    }

    if (!options.decision) {
      return false;
    }

    return true;
  }

  /**
   * Parses error from various sources
   *
   * @param error - Error to parse
   * @returns Structured error details
   */
  private parseError(error: unknown): { message: string; code?: string } {
    if (typeof error === 'object' && error !== null) {
      const maybe = error as Record<string, unknown>;
      const message = typeof maybe.message === 'string' ? maybe.message : String(error);
      const code = typeof maybe.code === 'string' ? maybe.code : undefined;
      return { message, code };
    }

    return { message: String(error) };
  }

  /**
   * Checks if a job ID format is valid
   *
   * @param jobId - Job ID to validate
   * @returns True if format appears valid
   */
  isValidJobId(jobId: string): boolean {
    return !!(jobId && typeof jobId === 'string' && jobId.trim().length > 0);
  }
}

/**
 * Singleton instance for convenience
 */
export const executionService = new ExecutionService();
