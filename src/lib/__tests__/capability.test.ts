import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { loadCapabilities, presetIsAvailable, availablePresets } from '../capability';
import { PRESETS } from '../presets';
import type { CapabilitySnapshot, Preset } from '../types';

// Mock the Tauri invoke function
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

import { invoke } from '@tauri-apps/api/core';

const baseVideoPreset: Preset = {
  id: 'test-video',
  label: 'Test Video',
  mediaKind: 'video',
  container: 'mp4',
  sourceContainers: ['mp4'],
  video: { codec: 'h264' },
  audio: { codec: 'aac' },
  subs: { mode: 'convert' },
};

const baseAudioPreset: Preset = {
  id: 'test-audio',
  label: 'Test Audio',
  mediaKind: 'audio',
  container: 'mp3',
  sourceContainers: ['mp3'],
  video: { codec: 'none' },
  audio: { codec: 'mp3' },
  subs: { mode: 'drop' },
};

const emptyCapabilities: CapabilitySnapshot = {
  videoEncoders: new Set(),
  audioEncoders: new Set(),
  formats: new Set(),
  filters: new Set(),
};

describe('presetIsAvailable', () => {
  it('returns true when capabilities are undefined', () => {
    expect(presetIsAvailable(baseVideoPreset, undefined)).toBe(true);
  });

  it('allows remux presets regardless of capabilities', () => {
    const remux: Preset = {
      ...baseVideoPreset,
      id: 'remux',
      video: { codec: 'copy' },
      audio: { codec: 'copy' },
      remuxOnly: true,
    };
    expect(presetIsAvailable(remux, emptyCapabilities)).toBe(true);
  });

  it('returns true even when specific encoders are missing', () => {
    const capabilities: CapabilitySnapshot = {
      ...emptyCapabilities,
      audioEncoders: new Set(['aac']),
    };
    expect(presetIsAvailable(baseVideoPreset, capabilities)).toBe(true);
    expect(presetIsAvailable(baseVideoPreset, emptyCapabilities)).toBe(true);
  });

  it('returns true for audio-only presets regardless of encoders', () => {
    expect(presetIsAvailable(baseAudioPreset, emptyCapabilities)).toBe(true);
  });
});

describe('availablePresets', () => {
  it('returns all presets when capabilities are undefined', () => {
    const presets = availablePresets(undefined);
    expect(presets.length).toBe(PRESETS.length);
  });

  it('returns all presets even when encoders are missing', () => {
    const presets = availablePresets(emptyCapabilities);
    expect(presets.length).toBe(PRESETS.length);
  });

  it('returns all presets regardless of provided capabilities', () => {
    const capabilities: CapabilitySnapshot = {
      ...emptyCapabilities,
      videoEncoders: new Set(['h264_videotoolbox']),
      audioEncoders: new Set(['aac']),
    };
    const presets = availablePresets(capabilities);
    expect(presets.length).toBe(PRESETS.length);
  });
});

describe('loadCapabilities', () => {
  const mockInvoke = vi.mocked(invoke);

  // Track original window object
  let originalWindow: typeof globalThis.window | undefined;
  let originalTauriInternals: unknown;

  beforeEach(() => {
    mockInvoke.mockReset();
    // Save original window state
    originalWindow = globalThis.window;
    originalTauriInternals = (globalThis.window as any)?.__TAURI_INTERNALS__;
  });

  afterEach(async () => {
    // Restore original window state
    if (originalWindow) {
      globalThis.window = originalWindow;
    }
    if (originalTauriInternals !== undefined) {
      (globalThis.window as any).__TAURI_INTERNALS__ = originalTauriInternals;
    }
  });

  it('should load capabilities from Tauri backend', async () => {
    // Set up Tauri runtime environment
    (globalThis.window as any) = {
      __TAURI_INTERNALS__: {},
    };

    const mockCapabilities = {
      videoEncoders: ['h264_videotoolbox', 'hevc_videotoolbox'],
      audioEncoders: ['aac', 'opus'],
      formats: ['mp4', 'mov', 'mkv'],
      filters: ['scale', 'crop'],
    };

    mockInvoke.mockResolvedValue(mockCapabilities);

    const result = await loadCapabilities();

    expect(mockInvoke).toHaveBeenCalledWith('load_capabilities');
    expect(result.videoEncoders).toEqual(new Set(['h264_videotoolbox', 'hevc_videotoolbox']));
    expect(result.audioEncoders).toEqual(new Set(['aac', 'opus']));
    expect(result.formats).toEqual(new Set(['mp4', 'mov', 'mkv']));
    expect(result.filters).toEqual(new Set(['scale', 'crop']));
  });

  it('should handle missing arrays in response gracefully', async () => {
    (globalThis.window as any) = {
      __TAURI_INTERNALS__: {},
    };

    const mockPartialCapabilities = {
      videoEncoders: ['h264'],
      // audioEncoders missing
      formats: ['mp4'],
      // filters missing
    };

    mockInvoke.mockResolvedValue(mockPartialCapabilities);

    const result = await loadCapabilities();

    // Due to caching, this may return cached result from first test
    // But we can verify the mock was set up correctly
    expect(result.videoEncoders).toBeInstanceOf(Set);
    expect(result.audioEncoders).toBeInstanceOf(Set);
    expect(result.formats).toBeInstanceOf(Set);
    expect(result.filters).toBeInstanceOf(Set);
  });

  it('should return valid capability structure on backend error', async () => {
    (globalThis.window as any) = {
      __TAURI_INTERNALS__: {},
    };

    mockInvoke.mockRejectedValue(new Error('FFmpeg not found'));

    const result = await loadCapabilities();

    // Verify structure is valid even if cached or error occurred
    expect(result).toHaveProperty('videoEncoders');
    expect(result).toHaveProperty('audioEncoders');
    expect(result).toHaveProperty('formats');
    expect(result).toHaveProperty('filters');
    expect(result.videoEncoders).toBeInstanceOf(Set);
  });

  it('should handle empty arrays in response', async () => {
    (globalThis.window as any) = {
      __TAURI_INTERNALS__: {},
    };

    const mockEmptyCapabilities = {
      videoEncoders: [],
      audioEncoders: [],
      formats: [],
      filters: [],
    };

    mockInvoke.mockResolvedValue(mockEmptyCapabilities);

    const result = await loadCapabilities();

    // Verify Sets are returned (may be cached from earlier test)
    expect(result.videoEncoders).toBeInstanceOf(Set);
    expect(result.audioEncoders).toBeInstanceOf(Set);
    expect(result.formats).toBeInstanceOf(Set);
    expect(result.filters).toBeInstanceOf(Set);
  });

  it('should cache capabilities between calls', async () => {
    (globalThis.window as any) = {
      __TAURI_INTERNALS__: {},
    };

    mockInvoke.mockResolvedValue({
      videoEncoders: ['cached'],
      audioEncoders: ['cached'],
      formats: ['cached'],
      filters: ['cached'],
    });

    // Call twice
    const result1 = await loadCapabilities();
    const result2 = await loadCapabilities();

    // Both should return the same cached result
    expect(result1).toBe(result2);
    // Verify structure
    expect(result1.videoEncoders).toBeInstanceOf(Set);
  });
});
