import { describe, it, expect } from 'vitest';

import { AUDIO_CONTAINERS, IMAGE_CONTAINERS, VIDEO_CONTAINERS } from '../media-formats';
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
    const allowedKinds = new Set(['video', 'audio', 'image']);
    PRESETS.forEach((preset) => {
      expect(allowedKinds.has(preset.mediaKind)).toBe(true);
      expect(preset.sourceContainers.length).toBeGreaterThan(0);
    });
  });

  describe('video presets', () => {
    it('provides a preset for each video container target', () => {
      VIDEO_CONTAINERS.forEach((target) => {
        const id = `video-to-${target}`;
        const preset = PRESETS.find((item) => item.id === id);
        expect(preset).toBeDefined();
        expect(preset?.mediaKind).toBe('video');
        expect(preset?.container).toBe(target);
        // Each preset should support all other containers except itself
        const expectedSources = VIDEO_CONTAINERS.filter((c) => c !== target);
        expect(preset?.sourceContainers.sort()).toEqual(expectedSources.sort());
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
    it('provides a preset for each audio container target', () => {
      AUDIO_CONTAINERS.forEach((target) => {
        const id = `audio-to-${target}`;
        const preset = PRESETS.find((item) => item.id === id);
        expect(preset).toBeDefined();
        expect(preset?.mediaKind).toBe('audio');
        expect(preset?.container).toBe(target);
        expect(preset?.video.codec).toBe('none');
        // Each preset should support all other containers except itself
        const expectedSources = AUDIO_CONTAINERS.filter((c) => c !== target);
        expect(preset?.sourceContainers.sort()).toEqual(expectedSources.sort());
      });
    });
  });

  describe('image presets', () => {
    it('provides a preset for each image container target', () => {
      IMAGE_CONTAINERS.forEach((target) => {
        const id = `image-to-${target}`;
        const preset = PRESETS.find((item) => item.id === id);
        expect(preset).toBeDefined();
        expect(preset?.mediaKind).toBe('image');
        expect(preset?.container).toBe(target);
        expect(preset?.audio.codec).toBe('none');
        expect(preset?.video.codec).not.toBe('none');
        const expectedSources = IMAGE_CONTAINERS.filter((c) => c !== target);
        expect(preset?.sourceContainers.sort()).toEqual(expectedSources.sort());
      });
    });
  });
});
