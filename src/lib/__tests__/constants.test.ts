import { describe, it, expect } from 'vitest';
import { LIMITS, DEFAULTS, EVENTS } from '../constants';

describe('constants', () => {
  describe('LIMITS', () => {
    it('should define JOB_LOG_MAX_LINES', () => {
      expect(LIMITS.JOB_LOG_MAX_LINES).toBe(500);
      expect(typeof LIMITS.JOB_LOG_MAX_LINES).toBe('number');
    });

    it('should define GIF_MAX_DURATION_SEC', () => {
      expect(LIMITS.GIF_MAX_DURATION_SEC).toBe(20);
      expect(typeof LIMITS.GIF_MAX_DURATION_SEC).toBe('number');
    });

    it('should define GIF_MAX_WIDTH', () => {
      expect(LIMITS.GIF_MAX_WIDTH).toBe(640);
      expect(typeof LIMITS.GIF_MAX_WIDTH).toBe('number');
    });

    it('should define GIF_MIN_WIDTH', () => {
      expect(LIMITS.GIF_MIN_WIDTH).toBe(2);
      expect(typeof LIMITS.GIF_MIN_WIDTH).toBe('number');
    });

    it('should define GIF_MIN_FPS', () => {
      expect(LIMITS.GIF_MIN_FPS).toBe(2);
      expect(typeof LIMITS.GIF_MIN_FPS).toBe('number');
    });

    it('should define GIF_MAX_FPS', () => {
      expect(LIMITS.GIF_MAX_FPS).toBe(20);
      expect(typeof LIMITS.GIF_MAX_FPS).toBe('number');
    });

    it('should define PROGRESS_THROTTLE_MS', () => {
      expect(LIMITS.PROGRESS_THROTTLE_MS).toBe(250);
      expect(typeof LIMITS.PROGRESS_THROTTLE_MS).toBe('number');
    });

    it('should define DEFAULT_CONCURRENCY', () => {
      expect(LIMITS.DEFAULT_CONCURRENCY).toBe(2);
      expect(typeof LIMITS.DEFAULT_CONCURRENCY).toBe('number');
    });

    it('should define MIN_CONCURRENCY', () => {
      expect(LIMITS.MIN_CONCURRENCY).toBe(1);
      expect(typeof LIMITS.MIN_CONCURRENCY).toBe('number');
    });

    it('should have sensible GIF width limits', () => {
      expect(LIMITS.GIF_MIN_WIDTH).toBeLessThan(LIMITS.GIF_MAX_WIDTH);
      expect(LIMITS.GIF_MIN_WIDTH).toBeGreaterThan(0);
      expect(LIMITS.GIF_MAX_WIDTH).toBeGreaterThan(0);
    });

    it('should have sensible GIF FPS limits', () => {
      expect(LIMITS.GIF_MIN_FPS).toBeLessThan(LIMITS.GIF_MAX_FPS);
      expect(LIMITS.GIF_MIN_FPS).toBeGreaterThan(0);
      expect(LIMITS.GIF_MAX_FPS).toBeGreaterThan(0);
    });

    it('should have sensible concurrency limits', () => {
      expect(LIMITS.MIN_CONCURRENCY).toBeLessThanOrEqual(LIMITS.DEFAULT_CONCURRENCY);
      expect(LIMITS.MIN_CONCURRENCY).toBeGreaterThan(0);
      expect(LIMITS.DEFAULT_CONCURRENCY).toBeGreaterThan(0);
    });

    it('should be readonly (as const)', () => {
      // Type-level check - this should not compile if LIMITS is mutable
      // @ts-expect-error - LIMITS is readonly

      LIMITS.JOB_LOG_MAX_LINES = 1000;
    });
  });

  describe('DEFAULTS', () => {
    it('should define FILENAME_SEPARATOR as string', () => {
      expect(DEFAULTS.FILENAME_SEPARATOR).toBe('-');
      expect(typeof DEFAULTS.FILENAME_SEPARATOR).toBe('string');
    });

    it('should define GIF_DEFAULT_FPS', () => {
      expect(DEFAULTS.GIF_DEFAULT_FPS).toBe(12);
      expect(typeof DEFAULTS.GIF_DEFAULT_FPS).toBe('number');
    });

    it('should define GIF_FALLBACK_WIDTH', () => {
      expect(DEFAULTS.GIF_FALLBACK_WIDTH).toBe(480);
      expect(typeof DEFAULTS.GIF_FALLBACK_WIDTH).toBe('number');
    });

    it('should have GIF_DEFAULT_FPS within valid range', () => {
      expect(DEFAULTS.GIF_DEFAULT_FPS).toBeGreaterThanOrEqual(LIMITS.GIF_MIN_FPS);
      expect(DEFAULTS.GIF_DEFAULT_FPS).toBeLessThanOrEqual(LIMITS.GIF_MAX_FPS);
    });

    it('should have GIF_FALLBACK_WIDTH within valid range', () => {
      expect(DEFAULTS.GIF_FALLBACK_WIDTH).toBeGreaterThanOrEqual(LIMITS.GIF_MIN_WIDTH);
      expect(DEFAULTS.GIF_FALLBACK_WIDTH).toBeLessThanOrEqual(LIMITS.GIF_MAX_WIDTH);
    });

    it('should have non-empty FILENAME_SEPARATOR', () => {
      expect(DEFAULTS.FILENAME_SEPARATOR.length).toBeGreaterThan(0);
    });
  });

  describe('EVENTS', () => {
    it('should define FFMPEG_PROGRESS event name', () => {
      expect(EVENTS.FFMPEG_PROGRESS).toBe('ffmpeg://progress');
      expect(typeof EVENTS.FFMPEG_PROGRESS).toBe('string');
    });

    it('should define FFMPEG_COMPLETION event name', () => {
      expect(EVENTS.FFMPEG_COMPLETION).toBe('ffmpeg://completion');
      expect(typeof EVENTS.FFMPEG_COMPLETION).toBe('string');
    });

    it('should define FFMPEG_STDERR event name', () => {
      expect(EVENTS.FFMPEG_STDERR).toBe('ffmpeg://stderr');
      expect(typeof EVENTS.FFMPEG_STDERR).toBe('string');
    });

    it('should have unique event names', () => {
      const eventValues = Object.values(EVENTS);
      const uniqueValues = new Set(eventValues);
      expect(eventValues.length).toBe(uniqueValues.size);
    });

    it('should use ffmpeg:// protocol for all events', () => {
      expect(EVENTS.FFMPEG_PROGRESS).toMatch(/^ffmpeg:\/\//);
      expect(EVENTS.FFMPEG_COMPLETION).toMatch(/^ffmpeg:\/\//);
      expect(EVENTS.FFMPEG_STDERR).toMatch(/^ffmpeg:\/\//);
    });

    it('should be readonly (as const)', () => {
      // Type-level check - this should not compile if EVENTS is mutable
      // @ts-expect-error - EVENTS is readonly

      EVENTS.FFMPEG_PROGRESS = 'new-event';
    });
  });

  describe('integration', () => {
    it('should have consistent GIF configuration across LIMITS and DEFAULTS', () => {
      // Default FPS should be within limits
      expect(DEFAULTS.GIF_DEFAULT_FPS).toBeGreaterThanOrEqual(LIMITS.GIF_MIN_FPS);
      expect(DEFAULTS.GIF_DEFAULT_FPS).toBeLessThanOrEqual(LIMITS.GIF_MAX_FPS);

      // Fallback width should be within limits
      expect(DEFAULTS.GIF_FALLBACK_WIDTH).toBeGreaterThanOrEqual(LIMITS.GIF_MIN_WIDTH);
      expect(DEFAULTS.GIF_FALLBACK_WIDTH).toBeLessThanOrEqual(LIMITS.GIF_MAX_WIDTH);
    });

    it('should have reasonable values for production use', () => {
      // Log limit should be reasonable
      expect(LIMITS.JOB_LOG_MAX_LINES).toBeGreaterThan(10);
      expect(LIMITS.JOB_LOG_MAX_LINES).toBeLessThan(10000);

      // Progress throttle should be reasonable (not too fast, not too slow)
      expect(LIMITS.PROGRESS_THROTTLE_MS).toBeGreaterThan(50);
      expect(LIMITS.PROGRESS_THROTTLE_MS).toBeLessThan(1000);

      // GIF duration limit should be reasonable
      expect(LIMITS.GIF_MAX_DURATION_SEC).toBeGreaterThan(5);
      expect(LIMITS.GIF_MAX_DURATION_SEC).toBeLessThan(120);
    });

    it('should export all required constants', () => {
      expect(LIMITS).toBeDefined();
      expect(DEFAULTS).toBeDefined();
      expect(EVENTS).toBeDefined();

      expect(Object.keys(LIMITS).length).toBeGreaterThan(0);
      expect(Object.keys(DEFAULTS).length).toBeGreaterThan(0);
      expect(Object.keys(EVENTS).length).toBeGreaterThan(0);
    });
  });

  describe('type safety', () => {
    it('should have correct types for LIMITS', () => {
      const _jobLogMax: number = LIMITS.JOB_LOG_MAX_LINES;
      const _gifMaxDuration: number = LIMITS.GIF_MAX_DURATION_SEC;
      const _progressThrottle: number = LIMITS.PROGRESS_THROTTLE_MS;

      expect(_jobLogMax).toBeDefined();
      expect(_gifMaxDuration).toBeDefined();
      expect(_progressThrottle).toBeDefined();
    });

    it('should have correct types for DEFAULTS', () => {
      const _separator: string = DEFAULTS.FILENAME_SEPARATOR;
      const _gifFps: number = DEFAULTS.GIF_DEFAULT_FPS;
      const _gifWidth: number = DEFAULTS.GIF_FALLBACK_WIDTH;

      expect(_separator).toBeDefined();
      expect(_gifFps).toBeDefined();
      expect(_gifWidth).toBeDefined();
    });

    it('should have correct types for EVENTS', () => {
      const _progress: string = EVENTS.FFMPEG_PROGRESS;
      const _completion: string = EVENTS.FFMPEG_COMPLETION;
      const _stderr: string = EVENTS.FFMPEG_STDERR;

      expect(_progress).toBeDefined();
      expect(_completion).toBeDefined();
      expect(_stderr).toBeDefined();
    });
  });
});
