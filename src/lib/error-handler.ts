/**
 * Error handling utilities for Honeymelon.
 *
 * Provides centralized error parsing and formatting to eliminate duplication
 * across the orchestrator and other error-handling code.
 */

/**
 * Error categories from the Rust FFmpeg error classifier.
 * Used to provide appropriate UI feedback and recovery suggestions.
 */
export type ErrorCategory =
  | 'INPUT_PROBLEM'
  | 'UNSUPPORTED_COMBINATION'
  | 'RESOURCE_ISSUE'
  | 'INTERNAL_PIPELINE_ERROR'
  | 'TIMEOUT'
  | 'CANCELLED';

export interface ErrorDetails {
  /** Human-readable error message */
  message: string;
  /** Optional error code for programmatic handling */
  code?: string;
  /** Classified error category */
  category?: ErrorCategory;
}

export interface CompletionPayload {
  message?: string | null;
  exitCode?: number | null;
  code?: string | null;
  /** User-friendly error message from Rust backend */
  userMessage?: string | null;
  /** Classified error category from Rust backend */
  errorCategory?: ErrorCategory | null;
  /** Whether the job timed out */
  timedOut?: boolean;
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
   * Uses the classified user message from the Rust backend when available,
   * falling back to the raw message or exit code information.
   *
   * @param payload - Completion event payload from Rust backend
   * @returns Human-readable error message
   *
   * @example
   * ```ts
   * const message = ErrorHandler.formatCompletionError({
   *   exitCode: 1,
   *   userMessage: "The input file could not be read. Please check the file path and permissions."
   * });
   * console.log(message); // "The input file could not be read..."
   * ```
   */
  static formatCompletionError(payload: CompletionPayload): string {
    // Prefer user-friendly message from error classification
    if (payload.userMessage) {
      return payload.userMessage;
    }

    // Fall back to raw message or exit code
    return (
      payload.message ??
      (payload.exitCode !== undefined && payload.exitCode !== null
        ? `FFmpeg exited with code ${payload.exitCode}`
        : 'FFmpeg process terminated unexpectedly.')
    );
  }

  /**
   * Gets the error category from a completion payload.
   *
   * @param payload - Completion event payload from Rust backend
   * @returns Error category or undefined if not classified
   */
  static getErrorCategory(payload: CompletionPayload): ErrorCategory | undefined {
    return payload.errorCategory ?? undefined;
  }

  /**
   * Checks if a completion represents a timeout.
   *
   * @param payload - Completion event payload from Rust backend
   * @returns true if the job timed out
   */
  static isTimeout(payload: CompletionPayload): boolean {
    return payload.timedOut === true || payload.errorCategory === 'TIMEOUT';
  }
}
