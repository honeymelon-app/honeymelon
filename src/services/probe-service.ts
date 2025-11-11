/**
 * Probe Service - Wraps media probing operations
 *
 * Provides a clean abstraction over FFprobe operations with proper error handling,
 * validation, and transformation of probe results.
 */

import { probeMedia as probeMediaCommand } from '@/lib/ffmpeg-probe';
import type { ProbeSummary } from '@/lib/types';

/**
 * Result of a probe operation
 */
export interface ProbeResult {
  success: boolean;
  summary?: ProbeSummary;
  error?: string;
}

/**
 * ProbeService - Handles media file analysis
 *
 * This service encapsulates all logic related to probing media files,
 * providing a consistent interface for the orchestrator and other components.
 */
export class ProbeService {
  /**
   * Probes a media file to extract metadata
   *
   * @param path - File system path to the media file
   * @returns Promise with probe result
   *
   * @example
   * ```ts
   * const service = new ProbeService();
   * const result = await service.probe('/path/to/video.mp4');
   * if (result.success) {
   *   console.log('Duration:', result.summary.duration);
   * }
   * ```
   */
  async probe(path: string): Promise<ProbeResult> {
    try {
      // Validate input path
      if (!path || typeof path !== 'string') {
        return {
          success: false,
          error: 'Invalid path: path must be a non-empty string',
        };
      }

      // Call the underlying probe command
      const response = await probeMediaCommand(path);

      // Validate response
      if (!response.summary) {
        return {
          success: false,
          error: 'Probe summary missing from response',
        };
      }

      return {
        success: true,
        summary: response.summary,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Probes multiple media files in parallel
   *
   * @param paths - Array of file paths to probe
   * @returns Promise with array of probe results
   *
   * @example
   * ```ts
   * const service = new ProbeService();
   * const results = await service.probeMany(['/video1.mp4', '/video2.mp4']);
   * const successful = results.filter(r => r.success);
   * ```
   */
  async probeMany(paths: string[]): Promise<ProbeResult[]> {
    return Promise.all(paths.map((path) => this.probe(path)));
  }

  /**
   * Validates if a file can be probed
   *
   * @param path - File path to validate
   * @returns True if path appears valid
   */
  validatePath(path: string): boolean {
    if (!path || typeof path !== 'string') {
      return false;
    }

    // Basic validation - could be expanded with more checks
    return path.trim().length > 0;
  }

  /**
   * Checks if a probe summary is valid
   *
   * @param summary - Probe summary to validate
   * @returns True if summary has required fields
   */
  validateSummary(summary: ProbeSummary): boolean {
    // At minimum, should have duration or valid stream info
    return !!(
      summary &&
      (summary.durationSec !== undefined ||
        summary.vcodec !== undefined ||
        summary.acodec !== undefined)
    );
  }
}

/**
 * Singleton instance for convenience
 */
export const probeService = new ProbeService();
