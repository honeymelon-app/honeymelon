/**
 * Shared type definitions for E2E tests
 *
 * These types extend the Window interface to include test-specific
 * properties used by the Tauri mock system and test helpers.
 */

/**
 * Window type extension for storing test progress events
 */
export type TestWindow = typeof window & {
  __test_progress_events?: number[];
};

/**
 * Window type extension for accessing the Honeymelon test API
 */
export type HoneymelonTestWindow = typeof window & {
  __HONEYMELON_TEST_API__?: {
    mockState?: {
      eventListeners: Map<string, Set<(payload: unknown) => void>>;
    };
    jobsStore?: {
      markFailed: (jobId: string, message: string, code?: string) => void;
    };
  };
};
