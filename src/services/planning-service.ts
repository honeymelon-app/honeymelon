/**
 * Planning Service - Wraps conversion planning operations
 *
 * Provides a clean abstraction over FFmpeg argument planning with validation,
 * preset resolution, and decision-making logic.
 */

import { planJob, resolvePreset } from '@/lib/ffmpeg-plan';
import type { PlannerDecision, PlannerContext } from '@/lib/ffmpeg-plan';
import type { CapabilitySnapshot, ProbeSummary, Tier } from '@/lib/types';

/**
 * Result of a planning operation
 */
export interface PlanningResult {
  success: boolean;
  decision?: PlannerDecision;
  error?: string;
}

/**
 * Planning options
 */
export interface PlanningOptions {
  presetId: string;
  summary: ProbeSummary;
  tier?: Tier;
  capabilities?: CapabilitySnapshot;
}

/**
 * PlanningService - Handles conversion planning logic
 *
 * This service encapsulates all logic related to planning FFmpeg conversions,
 * including preset resolution, decision-making, and validation.
 */
export class PlanningService {
  /**
   * Creates a conversion plan for a media file
   *
   * @param options - Planning options
   * @returns Promise with planning result
   *
   * @example
   * ```ts
   * const service = new PlanningService();
   * const result = await service.plan({
   *   presetId: 'web-h264',
   *   summary: probeSummary,
   *   tier: 'balanced'
   * });
   * if (result.success) {
   *   console.log('FFmpeg args:', result.decision.ffmpegArgs);
   * }
   * ```
   */
  async plan(options: PlanningOptions): Promise<PlanningResult> {
    try {
      // Validate preset exists
      const preset = resolvePreset(options.presetId);
      if (!preset) {
        return {
          success: false,
          error: `Preset ${options.presetId} not found`,
        };
      }

      // Validate summary
      if (!options.summary) {
        return {
          success: false,
          error: 'Probe summary is required for planning',
        };
      }

      // Create planner context
      const context: PlannerContext = {
        presetId: options.presetId,
        summary: options.summary,
        capabilities: options.capabilities,
        requestedTier: options.tier,
      };

      // Execute planning
      const decision = planJob(context);

      // Validate decision
      if (!decision.ffmpegArgs || decision.ffmpegArgs.length === 0) {
        return {
          success: false,
          error: 'Planning produced empty FFmpeg arguments',
        };
      }

      return {
        success: true,
        decision,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Creates conversion plans for multiple files
   *
   * @param optionsArray - Array of planning options
   * @returns Promise with array of planning results
   *
   * @example
   * ```ts
   * const service = new PlanningService();
   * const results = await service.planMany([
   *   { presetId: 'web-h264', summary: summary1 },
   *   { presetId: 'web-h264', summary: summary2 }
   * ]);
   * ```
   */
  async planMany(optionsArray: PlanningOptions[]): Promise<PlanningResult[]> {
    return Promise.all(optionsArray.map((options) => this.plan(options)));
  }

  /**
   * Validates planning options
   *
   * @param options - Options to validate
   * @returns True if options are valid
   */
  validateOptions(options: PlanningOptions): boolean {
    if (!options.presetId || typeof options.presetId !== 'string') {
      return false;
    }

    if (!options.summary) {
      return false;
    }

    const preset = resolvePreset(options.presetId);
    if (!preset) {
      return false;
    }

    return true;
  }

  /**
   * Checks if a decision is valid for execution
   *
   * @param decision - Planning decision to validate
   * @returns True if decision can be executed
   */
  validateDecision(decision: PlannerDecision): boolean {
    return !!(decision && decision.preset && decision.ffmpegArgs && decision.ffmpegArgs.length > 0);
  }

  /**
   * Estimates if a job will be remux-only (fast)
   *
   * @param options - Planning options
   * @returns True if job is likely remux-only
   */
  async estimateRemuxOnly(options: PlanningOptions): Promise<boolean> {
    const result = await this.plan(options);
    return result.success ? (result.decision?.remuxOnly ?? false) : false;
  }
}

/**
 * Singleton instance for convenience
 */
export const planningService = new PlanningService();
