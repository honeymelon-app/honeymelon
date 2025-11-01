import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { usePrefsStore } from '../prefs';
import { LIMITS, DEFAULTS } from '@/lib/constants';

describe('prefs store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  describe('initial state', () => {
    it('should have default concurrency', () => {
      const store = usePrefsStore();
      expect(store.preferredConcurrency).toBe(LIMITS.DEFAULT_CONCURRENCY);
    });

    it('should have null output directory', () => {
      const store = usePrefsStore();
      expect(store.outputDirectory).toBeNull();
    });

    it('should have includePresetInName as true', () => {
      const store = usePrefsStore();
      expect(store.includePresetInName).toBe(true);
    });

    it('should have includeTierInName as false', () => {
      const store = usePrefsStore();
      expect(store.includeTierInName).toBe(false);
    });

    it('should have default filename separator', () => {
      const store = usePrefsStore();
      expect(store.filenameSeparator).toBe(DEFAULTS.FILENAME_SEPARATOR);
    });
  });

  describe('maxConcurrency computed', () => {
    it('should return preferredConcurrency when valid', () => {
      const store = usePrefsStore();
      store.setPreferredConcurrency(3);
      expect(store.maxConcurrency).toBe(3);
    });

    it('should enforce minimum concurrency', () => {
      const store = usePrefsStore();
      store.setPreferredConcurrency(0);
      expect(store.maxConcurrency).toBe(LIMITS.MIN_CONCURRENCY);
    });

    it('should floor decimal values', () => {
      const store = usePrefsStore();
      store.setPreferredConcurrency(2.7);
      expect(store.maxConcurrency).toBe(2);
    });

    it('should handle negative values', () => {
      const store = usePrefsStore();
      store.setPreferredConcurrency(-5);
      expect(store.maxConcurrency).toBe(LIMITS.MIN_CONCURRENCY);
    });
  });

  describe('hasCustomOutputDirectory computed', () => {
    it('should return false when output directory is null', () => {
      const store = usePrefsStore();
      expect(store.hasCustomOutputDirectory).toBe(false);
    });

    it('should return false when output directory is empty string', () => {
      const store = usePrefsStore();
      store.setOutputDirectory('');
      expect(store.hasCustomOutputDirectory).toBe(false);
    });

    it('should return false when output directory is only whitespace', () => {
      const store = usePrefsStore();
      store.setOutputDirectory('   ');
      expect(store.hasCustomOutputDirectory).toBe(false);
    });

    it('should return true when output directory is set', () => {
      const store = usePrefsStore();
      store.setOutputDirectory('/path/to/output');
      expect(store.hasCustomOutputDirectory).toBe(true);
    });
  });

  describe('setPreferredConcurrency', () => {
    it('should update preferred concurrency', () => {
      const store = usePrefsStore();
      store.setPreferredConcurrency(4);
      expect(store.preferredConcurrency).toBe(4);
    });

    it('should enforce minimum value', () => {
      const store = usePrefsStore();
      store.setPreferredConcurrency(0);
      expect(store.preferredConcurrency).toBe(LIMITS.MIN_CONCURRENCY);
    });

    it('should floor decimal values', () => {
      const store = usePrefsStore();
      store.setPreferredConcurrency(3.9);
      expect(store.preferredConcurrency).toBe(3);
    });

    it('should handle NaN by using minimum', () => {
      const store = usePrefsStore();
      store.setPreferredConcurrency(NaN);
      expect(store.preferredConcurrency).toBe(LIMITS.MIN_CONCURRENCY);
    });

    it('should handle undefined by using minimum', () => {
      const store = usePrefsStore();
      store.setPreferredConcurrency(undefined as any);
      expect(store.preferredConcurrency).toBe(LIMITS.MIN_CONCURRENCY);
    });

    it('should handle very large values', () => {
      const store = usePrefsStore();
      store.setPreferredConcurrency(999);
      expect(store.preferredConcurrency).toBe(999);
    });
  });

  describe('setOutputDirectory', () => {
    it('should set output directory', () => {
      const store = usePrefsStore();
      store.setOutputDirectory('/path/to/output');
      expect(store.outputDirectory).toBe('/path/to/output');
    });

    it('should trim whitespace', () => {
      const store = usePrefsStore();
      store.setOutputDirectory('  /path/to/output  ');
      expect(store.outputDirectory).toBe('/path/to/output');
    });

    it('should set to null for empty string', () => {
      const store = usePrefsStore();
      store.setOutputDirectory('');
      expect(store.outputDirectory).toBeNull();
    });

    it('should set to null for whitespace-only string', () => {
      const store = usePrefsStore();
      store.setOutputDirectory('   ');
      expect(store.outputDirectory).toBeNull();
    });

    it('should set to null when passed null', () => {
      const store = usePrefsStore();
      store.setOutputDirectory('/some/path');
      store.setOutputDirectory(null);
      expect(store.outputDirectory).toBeNull();
    });

    it('should handle paths with spaces', () => {
      const store = usePrefsStore();
      store.setOutputDirectory('/path with spaces/to/output');
      expect(store.outputDirectory).toBe('/path with spaces/to/output');
    });

    it('should handle Windows-style paths', () => {
      const store = usePrefsStore();
      store.setOutputDirectory('C:\\Users\\Test\\Videos');
      expect(store.outputDirectory).toBe('C:\\Users\\Test\\Videos');
    });
  });

  describe('setIncludePresetInName', () => {
    it('should set includePresetInName to true', () => {
      const store = usePrefsStore();
      store.setIncludePresetInName(false);
      store.setIncludePresetInName(true);
      expect(store.includePresetInName).toBe(true);
    });

    it('should set includePresetInName to false', () => {
      const store = usePrefsStore();
      store.setIncludePresetInName(false);
      expect(store.includePresetInName).toBe(false);
    });

    it('should convert truthy values to boolean', () => {
      const store = usePrefsStore();
      store.setIncludePresetInName('yes' as any);
      expect(store.includePresetInName).toBe(true);
    });

    it('should convert falsy values to boolean', () => {
      const store = usePrefsStore();
      store.setIncludePresetInName(0 as any);
      expect(store.includePresetInName).toBe(false);
    });
  });

  describe('setIncludeTierInName', () => {
    it('should set includeTierInName to true', () => {
      const store = usePrefsStore();
      store.setIncludeTierInName(true);
      expect(store.includeTierInName).toBe(true);
    });

    it('should set includeTierInName to false', () => {
      const store = usePrefsStore();
      store.setIncludeTierInName(true);
      store.setIncludeTierInName(false);
      expect(store.includeTierInName).toBe(false);
    });

    it('should convert truthy values to boolean', () => {
      const store = usePrefsStore();
      store.setIncludeTierInName(1 as any);
      expect(store.includeTierInName).toBe(true);
    });

    it('should convert falsy values to boolean', () => {
      const store = usePrefsStore();
      store.setIncludeTierInName('' as any);
      expect(store.includeTierInName).toBe(false);
    });
  });

  describe('setFilenameSeparator', () => {
    it('should set filename separator', () => {
      const store = usePrefsStore();
      store.setFilenameSeparator('_');
      expect(store.filenameSeparator).toBe('_');
    });

    it('should use default for empty string', () => {
      const store = usePrefsStore();
      store.setFilenameSeparator('');
      expect(store.filenameSeparator).toBe(DEFAULTS.FILENAME_SEPARATOR);
    });

    it('should handle multi-character separators', () => {
      const store = usePrefsStore();
      store.setFilenameSeparator('---');
      expect(store.filenameSeparator).toBe('---');
    });

    it('should handle special characters', () => {
      const store = usePrefsStore();
      store.setFilenameSeparator('.');
      expect(store.filenameSeparator).toBe('.');
    });

    it('should handle undefined by using default', () => {
      const store = usePrefsStore();
      store.setFilenameSeparator(undefined as any);
      expect(store.filenameSeparator).toBe(DEFAULTS.FILENAME_SEPARATOR);
    });
  });

  describe('integration scenarios', () => {
    it('should allow resetting output directory', () => {
      const store = usePrefsStore();
      store.setOutputDirectory('/custom/path');
      expect(store.hasCustomOutputDirectory).toBe(true);

      store.setOutputDirectory(null);
      expect(store.hasCustomOutputDirectory).toBe(false);
    });

    it('should maintain state across multiple updates', () => {
      const store = usePrefsStore();

      store.setPreferredConcurrency(3);
      store.setOutputDirectory('/output');
      store.setIncludePresetInName(false);
      store.setIncludeTierInName(true);
      store.setFilenameSeparator('_');

      expect(store.preferredConcurrency).toBe(3);
      expect(store.outputDirectory).toBe('/output');
      expect(store.includePresetInName).toBe(false);
      expect(store.includeTierInName).toBe(true);
      expect(store.filenameSeparator).toBe('_');
    });

    it('should handle rapid updates', () => {
      const store = usePrefsStore();

      for (let i = 1; i <= 10; i++) {
        store.setPreferredConcurrency(i);
      }

      expect(store.preferredConcurrency).toBe(10);
    });

    it('should respect boundaries on computed values', () => {
      const store = usePrefsStore();

      store.setPreferredConcurrency(-100);
      expect(store.maxConcurrency).toBeGreaterThanOrEqual(LIMITS.MIN_CONCURRENCY);

      store.setPreferredConcurrency(100);
      expect(store.maxConcurrency).toBe(100);
    });
  });

  describe('persistence simulation', () => {
    it('should maintain state in store instance', () => {
      const store = usePrefsStore();

      store.setPreferredConcurrency(5);
      store.setOutputDirectory('/test/path');

      const sameStore = usePrefsStore();
      expect(sameStore.preferredConcurrency).toBe(5);
      expect(sameStore.outputDirectory).toBe('/test/path');
    });

    it('should reset state with new pinia instance', () => {
      const store1 = usePrefsStore();
      store1.setPreferredConcurrency(5);

      setActivePinia(createPinia());
      const store2 = usePrefsStore();
      expect(store2.preferredConcurrency).toBe(LIMITS.DEFAULT_CONCURRENCY);
    });
  });
});
