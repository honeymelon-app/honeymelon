import { describe, it, expect } from 'vitest';

import { presetIsAvailable, availablePresets } from '../capability';
import { PRESETS } from '../presets';
import type { CapabilitySnapshot, Preset } from '../types';

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
