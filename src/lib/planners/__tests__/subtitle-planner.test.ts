import { describe, it, expect, beforeEach } from 'vitest';
import { SubtitlePlanner, SUBTITLE_CONVERT_CODEC } from '../subtitle-planner';
import type { Preset, ProbeSummary, ContainerRule } from '../../types';

describe('SubtitlePlanner', () => {
  const basePreset: Preset = {
    id: 'test-preset',
    label: 'Test Preset',
    mediaKind: 'video',
    container: 'mp4',
    sourceContainers: ['mp4'],
    video: { codec: 'h264' },
    audio: { codec: 'aac' },
    subs: { mode: 'keep' },
  };

  const baseSummary: ProbeSummary = {
    format: 'mp4',
    duration: 120,
    acodec: 'aac',
    vcodec: 'h264',
    width: 1920,
    height: 1080,
    hasVideo: true,
    hasAudio: true,
    hasSubtitles: false,
    hasTextSubs: false,
    hasImageSubs: false,
  };

  const mp4Rule: ContainerRule = {
    container: 'mp4',
    video: 'any',
    audio: 'any',
    subtitles: {
      text: ['mov_text'],
      image: [],
    },
  };

  const mkvRule: ContainerRule = {
    container: 'mkv',
    video: 'any',
    audio: 'any',
    subtitles: {
      text: 'any',
      image: 'any',
    },
  };

  let planner: SubtitlePlanner;
  let warnings: string[];

  beforeEach(() => {
    planner = new SubtitlePlanner();
    warnings = [];
  });

  describe('No subtitle policy in preset', () => {
    it('should drop when preset has no subs field', () => {
      const preset: Preset = {
        ...basePreset,
        subs: undefined,
      };

      const summary: ProbeSummary = {
        ...baseSummary,
        hasTextSubs: true,
      };

      const result = planner.plan(preset, mp4Rule, summary, warnings);

      expect(result.mode).toBe('drop');
      expect(result.note).toBe('Subtitles: drop (preset has no subtitle policy).');
    });

    it('should indicate no streams when none detected', () => {
      const preset: Preset = {
        ...basePreset,
        subs: undefined,
      };

      const result = planner.plan(preset, mp4Rule, baseSummary, warnings);

      expect(result.mode).toBe('drop');
      expect(result.note).toBe('Subtitles: no streams detected.');
    });
  });

  describe('Mode: keep', () => {
    it('should keep text subtitles when present', () => {
      const summary: ProbeSummary = {
        ...baseSummary,
        hasTextSubs: true,
      };

      const result = planner.plan(basePreset, mp4Rule, summary, warnings);

      expect(result.mode).toBe('copy');
      expect(result.note).toBe('Subtitles: keep existing streams.');
      expect(warnings).toHaveLength(0);
    });

    it('should keep image subtitles when present', () => {
      const summary: ProbeSummary = {
        ...baseSummary,
        hasImageSubs: true,
      };

      const result = planner.plan(basePreset, mkvRule, summary, warnings);

      expect(result.mode).toBe('copy');
      expect(result.note).toBe('Subtitles: keep existing streams.');
      expect(warnings).toHaveLength(0);
    });

    it('should keep both text and image subtitles when present', () => {
      const summary: ProbeSummary = {
        ...baseSummary,
        hasTextSubs: true,
        hasImageSubs: true,
      };

      const result = planner.plan(basePreset, mkvRule, summary, warnings);

      expect(result.mode).toBe('copy');
      expect(result.note).toBe('Subtitles: keep existing streams.');
      expect(warnings).toHaveLength(0);
    });

    it('should warn when container does not permit text subtitles', () => {
      const summary: ProbeSummary = {
        ...baseSummary,
        hasTextSubs: true,
      };

      const restrictiveRule: ContainerRule = {
        container: 'webm',
        video: 'any',
        audio: 'any',
        subtitles: {
          text: [],
          image: [],
        },
      };

      const result = planner.plan(basePreset, restrictiveRule, summary, warnings);

      expect(result.mode).toBe('copy');
      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings.some((w) => w.includes('does not permit text subtitles'))).toBe(true);
    });

    it('should warn when container does not permit image subtitles', () => {
      const summary: ProbeSummary = {
        ...baseSummary,
        hasImageSubs: true,
      };

      const result = planner.plan(basePreset, mp4Rule, summary, warnings);

      expect(result.mode).toBe('copy');
      expect(warnings).toContain('mp4 does not permit image subtitles; consider burn-in.');
    });

    it('should handle keep mode with no streams detected', () => {
      const result = planner.plan(basePreset, mp4Rule, baseSummary, warnings);

      expect(result.mode).toBe('copy');
      expect(result.note).toBe('Subtitles: keep requested but no streams detected.');
    });

    it('should not warn when container rule is undefined', () => {
      const summary: ProbeSummary = {
        ...baseSummary,
        hasTextSubs: true,
        hasImageSubs: true,
      };

      const result = planner.plan(basePreset, undefined, summary, warnings);

      expect(result.mode).toBe('copy');
      expect(warnings).toHaveLength(0);
    });
  });

  describe('Mode: convert', () => {
    const convertPreset: Preset = {
      ...basePreset,
      subs: { mode: 'convert' },
    };

    it('should convert text subtitles to mov_text', () => {
      const summary: ProbeSummary = {
        ...baseSummary,
        hasTextSubs: true,
      };

      const result = planner.plan(convertPreset, mp4Rule, summary, warnings);

      expect(result.mode).toBe('convert');
      expect(result.note).toBe('Subtitles: convert text streams to mov_text.');
      expect(result.excludeImageStreams).toBeFalsy();
      expect(warnings).toHaveLength(0);
    });

    it('should drop when no subtitles detected', () => {
      const result = planner.plan(convertPreset, mp4Rule, baseSummary, warnings);

      expect(result.mode).toBe('drop');
      expect(result.note).toBe('Subtitles: no streams detected.');
    });

    it('should drop when only image subtitles present', () => {
      const summary: ProbeSummary = {
        ...baseSummary,
        hasImageSubs: true,
      };

      const result = planner.plan(convertPreset, mp4Rule, summary, warnings);

      expect(result.mode).toBe('drop');
      expect(result.note).toBe('Subtitles: drop (no convertible text streams).');
      expect(warnings).toContain(
        'Only image-based subtitles detected; dropping for compatibility.',
      );
    });

    it('should convert text and drop image subtitles', () => {
      const summary: ProbeSummary = {
        ...baseSummary,
        hasTextSubs: true,
        hasImageSubs: true,
      };

      const result = planner.plan(convertPreset, mp4Rule, summary, warnings);

      expect(result.mode).toBe('convert');
      expect(result.note).toBe(
        'Subtitles: convert text streams to mov_text; drop image-based streams.',
      );
      expect(result.excludeImageStreams).toBe(true);
      expect(warnings).toContain(
        'Image-based subtitles dropped; conversion only affects text streams.',
      );
    });

    it('should drop when container does not support mov_text', () => {
      const summary: ProbeSummary = {
        ...baseSummary,
        hasTextSubs: true,
      };

      const restrictiveRule: ContainerRule = {
        container: 'webm',
        video: 'any',
        audio: 'any',
        subtitles: {
          text: [],
          image: [],
        },
      };

      const result = planner.plan(convertPreset, restrictiveRule, summary, warnings);

      expect(result.mode).toBe('drop');
      expect(result.note).toBe('Subtitles: drop (target lacks mov_text support).');
      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings.some((w) => w.includes('does not advertise mov_text'))).toBe(true);
    });

    it('should convert when container rule is undefined', () => {
      const summary: ProbeSummary = {
        ...baseSummary,
        hasTextSubs: true,
      };

      const result = planner.plan(convertPreset, undefined, summary, warnings);

      expect(result.mode).toBe('convert');
      expect(result.note).toBe('Subtitles: convert text streams to mov_text.');
    });

    it('should convert when container rule allows any text subtitles', () => {
      const summary: ProbeSummary = {
        ...baseSummary,
        hasTextSubs: true,
      };

      const result = planner.plan(convertPreset, mkvRule, summary, warnings);

      expect(result.mode).toBe('convert');
      expect(result.note).toBe('Subtitles: convert text streams to mov_text.');
    });
  });

  describe('Mode: burn', () => {
    const burnPreset: Preset = {
      ...basePreset,
      subs: { mode: 'burn' },
    };

    it('should request burn-in and defer to execution layer', () => {
      const summary: ProbeSummary = {
        ...baseSummary,
        hasTextSubs: true,
      };

      const result = planner.plan(burnPreset, mp4Rule, summary, warnings);

      expect(result.mode).toBe('drop');
      expect(result.note).toBe('Subtitles: burn-in requested (planner defers to execution).');
      expect(warnings).toContain(
        'Subtitle burn-in requested; execution layer must inject subtitle filters.',
      );
    });

    it('should warn even when no subtitles present', () => {
      const result = planner.plan(burnPreset, mp4Rule, baseSummary, warnings);

      expect(result.mode).toBe('drop');
      expect(warnings).toContain(
        'Subtitle burn-in requested; execution layer must inject subtitle filters.',
      );
    });
  });

  describe('Mode: drop', () => {
    const dropPreset: Preset = {
      ...basePreset,
      subs: { mode: 'drop' },
    };

    it('should drop when subtitles present', () => {
      const summary: ProbeSummary = {
        ...baseSummary,
        hasTextSubs: true,
      };

      const result = planner.plan(dropPreset, mp4Rule, summary, warnings);

      expect(result.mode).toBe('drop');
      expect(result.note).toBe('Subtitles: drop streams per preset.');
    });

    it('should indicate no streams when none detected', () => {
      const result = planner.plan(dropPreset, mp4Rule, baseSummary, warnings);

      expect(result.mode).toBe('drop');
      expect(result.note).toBe('Subtitles: no streams detected.');
    });
  });

  describe('Unrecognized mode', () => {
    it('should drop for unrecognized mode', () => {
      const preset: Preset = {
        ...basePreset,
        subs: { mode: 'unknown' as any },
      };

      const result = planner.plan(preset, mp4Rule, baseSummary, warnings);

      expect(result.mode).toBe('drop');
      expect(result.note).toBe('Subtitles: drop (unrecognized mode).');
    });
  });

  describe('Constants', () => {
    it('should export SUBTITLE_CONVERT_CODEC as mov_text', () => {
      expect(SUBTITLE_CONVERT_CODEC).toBe('mov_text');
    });
  });
});
