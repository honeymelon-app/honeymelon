import { describe, it, expect } from 'vitest';

import { AUDIO_CONTAINERS, VIDEO_CONTAINERS } from '../media-formats';
import { PRESETS, DEFAULT_PRESET_ID } from '../presets';

describe('generated presets', () => {
  it('includes the default preset', () => {
    const defaultPreset = PRESETS.find((preset) => preset.id === DEFAULT_PRESET_ID);
    expect(defaultPreset).toBeDefined();
  });

  it('contains unique identifiers', () => {
    const ids = PRESETS.map((preset) => preset.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('never targets the same container as the source', () => {
    PRESETS.forEach((preset) => {
      expect(preset.sourceContainers).not.toContain(preset.container);
    });
  });

  it('declares media kind and source containers for every preset', () => {
    PRESETS.forEach((preset) => {
      expect(preset.mediaKind).toMatch(/^(video|audio)$/);
      expect(preset.sourceContainers.length).toBeGreaterThan(0);
    });
  });

  describe('video presets', () => {
    it('provides every source → target combination', () => {
      VIDEO_CONTAINERS.forEach((source) => {
        VIDEO_CONTAINERS.forEach((target) => {
          if (source === target) return;
          const id = `video-${source}-to-${target}`;
          const preset = PRESETS.find((item) => item.id === id);
          expect(preset).toBeDefined();
          expect(preset?.mediaKind).toBe('video');
          expect(preset?.sourceContainers).toContain(source);
          expect(preset?.container).toBe(target);
        });
      });
    });

    it('configures GIF outputs with GIF video codec and no audio', () => {
      const gifTargets = PRESETS.filter((preset) => preset.container === 'gif');
      expect(gifTargets.length).toBeGreaterThan(0);
      gifTargets.forEach((preset) => {
        expect(preset.mediaKind).toBe('video');
        expect(preset.video.codec).toBe('gif');
        expect(preset.audio.codec).toBe('none');
        expect(preset.subs?.mode).toBe('drop');
      });
    });
  });

  describe('audio presets', () => {
    it('provides every source → target combination', () => {
      AUDIO_CONTAINERS.forEach((source) => {
        AUDIO_CONTAINERS.forEach((target) => {
          if (source === target) return;
          const id = `audio-${source}-to-${target}`;
          const preset = PRESETS.find((item) => item.id === id);
          expect(preset).toBeDefined();
          expect(preset?.mediaKind).toBe('audio');
          expect(preset?.sourceContainers).toContain(source);
          expect(preset?.container).toBe(target);
          expect(preset?.video.codec).toBe('none');
        });
      });
    });
  });
});
