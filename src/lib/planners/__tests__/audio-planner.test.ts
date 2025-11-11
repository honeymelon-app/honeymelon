import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AudioPlanner } from '../audio-planner';
import type { CapabilitySnapshot, Preset, ProbeSummary } from '../../types';
import type { AudioEncoderSelectionStrategy } from '../../strategies/encoder-strategy';

describe('AudioPlanner', () => {
  const mockCapabilities: CapabilitySnapshot = {
    videoEncoders: new Set(['h264_videotoolbox']),
    audioEncoders: new Set(['aac', 'libopus', 'libmp3lame']),
    formats: new Set(['mp4', 'mkv']),
    filters: new Set(['scale']),
  };

  const basePreset: Preset = {
    id: 'test-preset',
    label: 'Test Preset',
    mediaKind: 'video',
    container: 'mp4',
    sourceContainers: ['mp4'],
    video: { codec: 'h264' },
    audio: {
      codec: 'aac',
      tiers: {
        fast: { bitrateK: 128 },
        balanced: { bitrateK: 192 },
        high: { bitrateK: 256 },
      },
    },
    subs: { mode: 'drop' },
  };

  const mockSummary: ProbeSummary = {
    durationSec: 120,
    acodec: 'aac',
    vcodec: 'h264',
    width: 1920,
    height: 1080,
  };

  let planner: AudioPlanner;
  let warnings: string[];

  beforeEach(() => {
    planner = new AudioPlanner(mockCapabilities);
    warnings = [];
  });

  describe('Audio codec set to "none"', () => {
    it('should drop audio when preset audio codec is "none"', () => {
      const preset: Preset = {
        ...basePreset,
        audio: { codec: 'none' },
      };

      const result = planner.plan(mockSummary, preset, 'balanced', warnings);

      expect(result.action.action).toBe('drop');
      expect(result.action.note).toBe('Audio: disabled by preset.');
      expect(warnings).toHaveLength(0);
    });
  });

  describe('No audio in source', () => {
    it('should drop audio when input has no audio stream', () => {
      const summaryNoAudio: ProbeSummary = {
        ...mockSummary,
        acodec: undefined,
      };

      const result = planner.plan(summaryNoAudio, basePreset, 'balanced', warnings);

      expect(result.action.action).toBe('drop');
      expect(result.action.note).toBe('Audio: input provides no audio stream.');
      expect(warnings).toContain('Input contains no audio stream; output will omit audio.');
    });

    it('should add warning when preset expects audio but none present', () => {
      const summaryNoAudio: ProbeSummary = {
        ...mockSummary,
        acodec: undefined,
      };

      planner.plan(summaryNoAudio, basePreset, 'balanced', warnings);

      expect(warnings).toContain('Input contains no audio stream; output will omit audio.');
      expect(warnings).toContain('Preset expects audio output but planner is dropping the stream.');
    });
  });

  describe('Copy audio', () => {
    it('should copy audio when preset codec is "copy"', () => {
      const preset: Preset = {
        ...basePreset,
        audio: { codec: 'copy' },
      };

      const result = planner.plan(mockSummary, preset, 'balanced', warnings);

      expect(result.action.action).toBe('copy');
      expect(result.action.encoder).toBe('copy');
      expect(result.action.note).toBe('Audio: copy source codec aac.');
      expect(warnings).toHaveLength(0);
    });

    it('should copy audio when source codec matches preset codec', () => {
      const summary: ProbeSummary = {
        ...mockSummary,
        acodec: 'opus',
      };

      const preset: Preset = {
        ...basePreset,
        audio: { codec: 'opus' },
      };

      const result = planner.plan(summary, preset, 'balanced', warnings);

      expect(result.action.action).toBe('copy');
      expect(result.action.encoder).toBe('copy');
      expect(result.action.note).toBe('Audio: copy matching codec opus.');
      expect(warnings).toHaveLength(0);
    });

    it('should handle case-insensitive codec matching', () => {
      const summary: ProbeSummary = {
        ...mockSummary,
        acodec: 'AAC',
      };

      const preset: Preset = {
        ...basePreset,
        audio: { codec: 'aac' },
      };

      const result = planner.plan(summary, preset, 'balanced', warnings);

      expect(result.action.action).toBe('copy');
      expect(result.action.encoder).toBe('copy');
      expect(result.action.note).toContain('copy matching codec aac');
    });
  });

  describe('Transcode audio', () => {
    it('should transcode when source and preset codecs differ', () => {
      const summary: ProbeSummary = {
        ...mockSummary,
        acodec: 'mp3',
      };

      const preset: Preset = {
        ...basePreset,
        audio: { codec: 'aac' },
      };

      const result = planner.plan(summary, preset, 'balanced', warnings);

      expect(result.action.action).toBe('transcode');
      expect(result.action.encoder).toBe('aac');
      expect(result.action.note).toBe('Audio: transcode mp3 → aac with aac.');
      expect(warnings).toHaveLength(0);
    });

    it('should use encoder from strategy', () => {
      const mockStrategy: AudioEncoderSelectionStrategy = {
        selectEncoder: vi.fn().mockReturnValue('libopus'),
      };

      const plannerWithStrategy = new AudioPlanner(mockCapabilities, mockStrategy);

      const summary: ProbeSummary = {
        ...mockSummary,
        acodec: 'aac',
      };

      const preset: Preset = {
        ...basePreset,
        audio: { codec: 'opus' },
      };

      const result = plannerWithStrategy.plan(summary, preset, 'balanced', warnings);

      expect(result.action.action).toBe('transcode');
      expect(result.action.encoder).toBe('libopus');
      expect(mockStrategy.selectEncoder).toHaveBeenCalledWith('opus', mockCapabilities);
    });

    it('should fallback to preset codec if strategy returns null', () => {
      const mockStrategy: AudioEncoderSelectionStrategy = {
        selectEncoder: vi.fn().mockReturnValue(null),
      };

      const plannerWithStrategy = new AudioPlanner(mockCapabilities, mockStrategy);

      const summary: ProbeSummary = {
        ...mockSummary,
        acodec: 'mp3', // Different from preset codec
      };

      const preset: Preset = {
        ...basePreset,
        audio: { codec: 'aac' },
      };

      const result = plannerWithStrategy.plan(summary, preset, 'balanced', warnings);

      expect(result.action.action).toBe('transcode');
      expect(result.action.encoder).toBe('aac'); // Falls back to preset codec
    });

    it('should warn when encoder not in capabilities', () => {
      const summary: ProbeSummary = {
        ...mockSummary,
        acodec: 'flac',
      };

      const preset: Preset = {
        ...basePreset,
        audio: { codec: 'vorbis' }, // Not in mockCapabilities
      };

      planner.plan(summary, preset, 'balanced', warnings);

      // Check that at least one warning exists mentioning the encoder and potential failure
      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings.some((w) => w.includes('vorbis') && w.includes('fail'))).toBe(true);
    });

    it('should not warn when encoder is in capabilities', () => {
      const summary: ProbeSummary = {
        ...mockSummary,
        acodec: 'mp3',
      };

      const preset: Preset = {
        ...basePreset,
        audio: { codec: 'aac' }, // In mockCapabilities
      };

      planner.plan(summary, preset, 'balanced', warnings);

      expect(warnings).toHaveLength(0);
    });
  });

  describe('Tier defaults', () => {
    it('should resolve tier defaults for fast tier', () => {
      const preset: Preset = {
        ...basePreset,
        audio: {
          codec: 'aac',
          tiers: {
            fast: { bitrateK: 96 },
            balanced: { bitrateK: 128 },
            high: { bitrateK: 192 },
          },
        },
      };

      const result = planner.plan(mockSummary, preset, 'fast', warnings);

      expect(result.tierResult.tier).toBe('fast');
      expect(result.tierResult.value?.bitrateK).toBe(96);
    });

    it('should resolve tier defaults for balanced tier', () => {
      const preset: Preset = {
        ...basePreset,
        audio: {
          codec: 'opus',
          tiers: {
            fast: { bitrateK: 64 },
            balanced: { bitrateK: 96 },
            high: { bitrateK: 128 },
          },
        },
      };

      const result = planner.plan(mockSummary, preset, 'balanced', warnings);

      expect(result.tierResult.tier).toBe('balanced');
      expect(result.tierResult.value?.bitrateK).toBe(96);
    });

    it('should resolve tier defaults for high tier', () => {
      const preset: Preset = {
        ...basePreset,
        audio: {
          codec: 'aac',
          tiers: {
            fast: { bitrateK: 128 },
            balanced: { bitrateK: 192 },
            high: { bitrateK: 256 },
          },
        },
      };

      const result = planner.plan(mockSummary, preset, 'high', warnings);

      expect(result.tierResult.tier).toBe('high');
      expect(result.tierResult.value?.bitrateK).toBe(256);
    });
  });

  describe('Without capabilities', () => {
    it('should work without capabilities provided', () => {
      const plannerNoCap = new AudioPlanner();

      const result = plannerNoCap.plan(mockSummary, basePreset, 'balanced', warnings);

      expect(result.action.action).toBe('copy'); // aac matches aac
      expect(warnings).toHaveLength(0);
    });

    it('should not warn about missing encoder when capabilities undefined', () => {
      const plannerNoCap = new AudioPlanner();

      const summary: ProbeSummary = {
        ...mockSummary,
        acodec: 'mp3',
      };

      const preset: Preset = {
        ...basePreset,
        audio: { codec: 'vorbis' },
      };

      plannerNoCap.plan(summary, preset, 'balanced', warnings);

      expect(warnings).toHaveLength(0);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty source codec (drops audio)', () => {
      const summary: ProbeSummary = {
        ...mockSummary,
        acodec: '',
      };

      const result = planner.plan(summary, basePreset, 'balanced', warnings);

      // Empty string is treated as no audio codec
      expect(result.action.action).toBe('drop');
      expect(result.action.note).toBe('Audio: input provides no audio stream.');
    });

    it('should normalize source codec to lowercase', () => {
      const summary: ProbeSummary = {
        ...mockSummary,
        acodec: 'MP3',
      };

      const preset: Preset = {
        ...basePreset,
        audio: { codec: 'mp3' },
      };

      const result = planner.plan(summary, preset, 'balanced', warnings);

      expect(result.action.action).toBe('copy');
      expect(result.action.note).toContain('copy matching codec mp3');
    });

    it('should handle complex codec names', () => {
      const summary: ProbeSummary = {
        ...mockSummary,
        acodec: 'pcm_s16le',
      };

      const preset: Preset = {
        ...basePreset,
        audio: { codec: 'flac' },
      };

      const result = planner.plan(summary, preset, 'balanced', warnings);

      expect(result.action.action).toBe('transcode');
      expect(result.action.note).toContain('pcm_s16le → flac');
    });
  });
});
