/**
 * Application-wide constants for limits, thresholds, and configuration values.
 */

export const LIMITS = {
  /** Maximum number of log lines to retain per job (frontend and backend) */
  JOB_LOG_MAX_LINES: 500,

  /** Maximum recommended duration for GIF output (seconds) */
  GIF_MAX_DURATION_SEC: 20,

  /** Maximum width for GIF output (pixels) */
  GIF_MAX_WIDTH: 640,

  /** Minimum width for GIF output (pixels) */
  GIF_MIN_WIDTH: 2,

  /** Minimum FPS for GIF output */
  GIF_MIN_FPS: 2,

  /** Maximum FPS for GIF output */
  GIF_MAX_FPS: 20,

  /** Progress update throttle interval (milliseconds) */
  PROGRESS_THROTTLE_MS: 250,

  /** Default concurrent job limit */
  DEFAULT_CONCURRENCY: 2,

  /** Minimum concurrent job limit */
  MIN_CONCURRENCY: 1,
} as const;

export const DEFAULTS = {
  /** Default filename separator for output files */
  FILENAME_SEPARATOR: '-' as string,

  /** Default GIF FPS when source FPS unavailable */
  GIF_DEFAULT_FPS: 12,

  /** Default GIF fallback width when source width unavailable */
  GIF_FALLBACK_WIDTH: 480,
};

/**
 * Tauri event names for FFmpeg process communication
 */
export const EVENTS = {
  /** Progress update event from FFmpeg stderr */
  FFMPEG_PROGRESS: 'ffmpeg://progress',

  /** Completion event when FFmpeg process exits */
  FFMPEG_COMPLETION: 'ffmpeg://completion',

  /** Raw stderr line event from FFmpeg */
  FFMPEG_STDERR: 'ffmpeg://stderr',
} as const;
