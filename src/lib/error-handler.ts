/**
 * Error handling utilities for Honeymelon.
 *
 * Provides centralized error parsing and formatting to eliminate duplication
 * across the orchestrator and other error-handling code.
 */

export interface ErrorDetails {
  /** Human-readable error message */
  message: string;
  /** Optional error code for programmatic handling */
  code?: string;
}

export interface CompletionPayload {
  message?: string | null;
  exitCode?: number | null;
  code?: string | null;
}

/**
 * ErrorHandler class for parsing and formatting errors consistently.
 *
 * This class consolidates error handling logic that was previously duplicated
 * across multiple locations in the orchestrator.
 */
export class ErrorHandler {
  /**
   * Parses an unknown error into structured error details.
   *
   * Handles various error shapes:
   * - Objects with message/code properties
   * - Error instances
   * - Primitive values (strings, numbers)
   *
   * @param error - The error to parse (can be any type)
   * @returns Structured error details with message and optional code
   *
   * @example
   * ```ts
   * const details = ErrorHandler.parseErrorDetails(new Error('Failed'));
   * console.log(details.message); // "Failed"
   * ```
   */
  static parseErrorDetails(error: unknown): ErrorDetails {
    if (typeof error === 'object' && error !== null) {
      const maybe = error as Record<string, unknown>;
      const message = typeof maybe.message === 'string' ? maybe.message : String(error);
      const code = typeof maybe.code === 'string' ? maybe.code : undefined;
      return { message, code };
    }

    return { message: String(error) };
  }

  /**
   * Formats a completion event payload into a human-readable error message.
   *
   * Used when FFmpeg process completes with a failure status. Provides
   * fallback messages when specific error details are unavailable.
   *
   * @param payload - Completion event payload from Rust backend
   * @returns Human-readable error message
   *
   * @example
   * ```ts
   * const message = ErrorHandler.formatCompletionError({
   *   exitCode: 1,
   *   message: null
   * });
   * console.log(message); // "FFmpeg exited with code 1"
   * ```
   */
  static formatCompletionError(payload: CompletionPayload): string {
    return (
      payload.message ??
      (payload.exitCode !== undefined && payload.exitCode !== null
        ? `FFmpeg exited with code ${payload.exitCode}`
        : 'FFmpeg process terminated unexpectedly.')
    );
  }
}
