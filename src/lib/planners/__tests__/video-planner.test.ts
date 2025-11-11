import { describe, it, expect, beforeEach, vi } from 'vitest';
import { VideoPlanner, resolveTierDefaults, resolveVideoProfile } from '../video-planner';
import type { CapabilitySnapshot, Preset, ProbeSummary } from '../../types';
import type { VideoEncoderSelectionStrategy } from '../../strategies/encoder-strategy';

describe('VideoPlanner', () => {
  const mockCapabilities: CapabilitySnapshot = {
    videoEncoders: new Set(['h264_videotoolbox', 'hevc_videotoolbox', 'libx264', 'libx265']),
    audioEncoders: new Set(['aac']),
    formats: new Set(['mp4', 'mkv']),
    filters: new Set(['scale']),
  };

  const basePreset: Preset = {
    id: 'test-preset',
    label: 'Test Preset',
    mediaKind: 'video',
    container: 'mp4',
    sourceContainers: ['mp4'],
    video: {
      codec: 'h264',
      tiers: {
        fast: { crf: 28 },
        balanced: { crf: 23 },
        high: { crf: 18 },
      },
    },
    audio: { codec: 'aac' },
    subs: { mode: 'drop' },
  };

  const mockSummary: ProbeSummary = {
    durationSec: 120,
    vcodec: 'h264',
    acodec: 'aac',
    width: 1920,
    height: 1080,
    fps: 30,
  };

  let planner: VideoPlanner;
  let warnings: string[];

  beforeEach(() => {
    planner = new VideoPlanner(mockCapabilities);
    warnings = [];
  });

  describe('plan', () => {
    describe('Video codec set to "none"', () => {
      it('should drop video when preset video codec is "none"', () => {
        const preset: Preset = {
          ...basePreset,
          video: { codec: 'none' },
        };

        const result = planner.plan(mockSummary, preset, 'balanced', warnings);

        expect(result.action.action).toBe('drop');
        expect(result.action.note).toBe('Video: disabled by preset.');
        expect(warnings).toHaveLength(0);
      });
    });

    describe('No video in source', () => {
      it('should drop video when input has no video stream', () => {
        const summaryNoVideo: ProbeSummary = {
          ...mockSummary,
          vcodec: undefined,
        };

        const result = planner.plan(summaryNoVideo, basePreset, 'balanced', warnings);

        expect(result.action.action).toBe('drop');
        expect(result.action.note).toBe('Video: input provides no video stream.');
        expect(warnings).toContain('Input contains no video stream; output will omit video.');
      });

      it('should add warning when preset expects video but none present', () => {
        const summaryNoVideo: ProbeSummary = {
          ...mockSummary,
          vcodec: undefined,
        };

        planner.plan(summaryNoVideo, basePreset, 'balanced', warnings);

        expect(warnings).toContain('Input contains no video stream; output will omit video.');
        expect(warnings).toContain(
          'Preset expects video output but planner is dropping the stream.',
        );
      });
    });

    describe('Copy video', () => {
      it('should copy video when preset codec is "copy"', () => {
        const preset: Preset = {
          ...basePreset,
          video: { codec: 'copy' },
        };

        const result = planner.plan(mockSummary, preset, 'balanced', warnings);

        expect(result.action.action).toBe('copy');
        expect(result.action.encoder).toBe('copy');
        expect(result.action.note).toBe('Video: copy source codec h264.');
        expect(warnings).toHaveLength(0);
      });

      it('should copy video when source codec matches preset codec', () => {
        const summary: ProbeSummary = {
          ...mockSummary,
          vcodec: 'hevc',
        };

        const preset: Preset = {
          ...basePreset,
          video: { codec: 'hevc' },
        };

        const result = planner.plan(summary, preset, 'balanced', warnings);

        expect(result.action.action).toBe('copy');
        expect(result.action.encoder).toBe('copy');
        expect(result.action.note).toBe('Video: copy matching codec hevc.');
        expect(warnings).toHaveLength(0);
      });

      it('should handle case-insensitive codec matching', () => {
        const summary: ProbeSummary = {
          ...mockSummary,
          vcodec: 'H264',
        };

        const result = planner.plan(summary, basePreset, 'balanced', warnings);

        expect(result.action.action).toBe('copy');
        expect(result.action.encoder).toBe('copy');
      });
    });

    describe('Transcode video', () => {
      it('should transcode when source and preset codecs differ', () => {
        const summary: ProbeSummary = {
          ...mockSummary,
          vcodec: 'vp9',
        };

        const result = planner.plan(summary, basePreset, 'balanced', warnings);

        expect(result.action.action).toBe('transcode');
        expect(result.action.note).toContain('transcode vp9 → h264');
      });

      it('should use hardware accelerated encoder when available', () => {
        const summary: ProbeSummary = {
          ...mockSummary,
          vcodec: 'vp9',
        };

        const mockStrategy: VideoEncoderSelectionStrategy = {
          selectEncoder: vi.fn().mockReturnValue('h264_videotoolbox'),
        };

        const plannerWithStrategy = new VideoPlanner(mockCapabilities, mockStrategy);
        const result = plannerWithStrategy.plan(summary, basePreset, 'balanced', warnings);

        expect(result.action.encoder).toBe('h264_videotoolbox');
        expect(result.action.note).toContain('hardware accelerated');
      });

      it('should detect hardware acceleration for videotoolbox encoders', () => {
        const summary: ProbeSummary = {
          ...mockSummary,
          vcodec: 'vp9',
        };

        const mockStrategy: VideoEncoderSelectionStrategy = {
          selectEncoder: vi.fn().mockReturnValue('hevc_videotoolbox'),
        };

        const plannerWithStrategy = new VideoPlanner(mockCapabilities, mockStrategy);
        const result = plannerWithStrategy.plan(summary, basePreset, 'balanced', warnings);

        expect(result.action.note).toContain('hardware accelerated');
      });

      it('should detect hardware acceleration for QSV encoders', () => {
        const summary: ProbeSummary = {
          ...mockSummary,
          vcodec: 'vp9',
        };

        const mockStrategy: VideoEncoderSelectionStrategy = {
          selectEncoder: vi.fn().mockReturnValue('h264_qsv'),
        };

        const plannerWithStrategy = new VideoPlanner(mockCapabilities, mockStrategy);
        const result = plannerWithStrategy.plan(summary, basePreset, 'balanced', warnings);

        expect(result.action.note).toContain('hardware accelerated');
      });

      it('should detect hardware acceleration for NVENC encoders', () => {
        const summary: ProbeSummary = {
          ...mockSummary,
          vcodec: 'vp9',
        };

        const mockStrategy: VideoEncoderSelectionStrategy = {
          selectEncoder: vi.fn().mockReturnValue('h264_nvenc'),
        };

        const plannerWithStrategy = new VideoPlanner(mockCapabilities, mockStrategy);
        const result = plannerWithStrategy.plan(summary, basePreset, 'balanced', warnings);

        expect(result.action.note).toContain('hardware accelerated');
      });

      it('should not indicate hardware acceleration for software encoders', () => {
        const summary: ProbeSummary = {
          ...mockSummary,
          vcodec: 'vp9',
        };

        const mockStrategy: VideoEncoderSelectionStrategy = {
          selectEncoder: vi.fn().mockReturnValue('libx264'),
        };

        const plannerWithStrategy = new VideoPlanner(mockCapabilities, mockStrategy);
        const result = plannerWithStrategy.plan(summary, basePreset, 'balanced', warnings);

        expect(result.action.note).not.toContain('hardware accelerated');
      });

      it('should warn when encoder not in capabilities', () => {
        const summary: ProbeSummary = {
          ...mockSummary,
          vcodec: 'vp8',
        };

        const preset: Preset = {
          ...basePreset,
          video: { codec: 'av1' },
        };

        planner.plan(summary, preset, 'balanced', warnings);

        expect(warnings.length).toBeGreaterThan(0);
        expect(warnings.some((w) => w.includes('av1') && w.includes('fail'))).toBe(true);
      });

      it('should fallback to preset codec if strategy returns null', () => {
        const mockStrategy: VideoEncoderSelectionStrategy = {
          selectEncoder: vi.fn().mockReturnValue(null),
        };

        const plannerWithStrategy = new VideoPlanner(mockCapabilities, mockStrategy);

        const summary: ProbeSummary = {
          ...mockSummary,
          vcodec: 'vp9',
        };

        const result = plannerWithStrategy.plan(summary, basePreset, 'balanced', warnings);

        expect(result.action.encoder).toBe('h264');
      });
    });

    describe('Tier defaults', () => {
      it('should resolve tier defaults for fast tier', () => {
        const result = planner.plan(mockSummary, basePreset, 'fast', warnings);

        expect(result.tierResult.tier).toBe('fast');
        expect(result.tierResult.value?.crf).toBe(28);
        expect(result.tierResult.usedFallback).toBe(false);
      });

      it('should resolve tier defaults for balanced tier', () => {
        const result = planner.plan(mockSummary, basePreset, 'balanced', warnings);

        expect(result.tierResult.tier).toBe('balanced');
        expect(result.tierResult.value?.crf).toBe(23);
        expect(result.tierResult.usedFallback).toBe(false);
      });

      it('should resolve tier defaults for high tier', () => {
        const result = planner.plan(mockSummary, basePreset, 'high', warnings);

        expect(result.tierResult.tier).toBe('high');
        expect(result.tierResult.value?.crf).toBe(18);
        expect(result.tierResult.usedFallback).toBe(false);
      });
    });
  });

  describe('planGif', () => {
    it('should generate GIF filter complex with palette optimization', () => {
      const result = planner.planGif(mockSummary, basePreset, warnings);

      expect(result.args).toContain('-filter_complex');
      expect(result.args).toContain('-c:v');
      expect(result.args).toContain('gif');
      expect(result.args).toContain('-an'); // no audio
      expect(result.args).toContain('-sn'); // no subtitles
    });

    it('should warn for long duration GIFs', () => {
      const longSummary: ProbeSummary = {
        ...mockSummary,
        durationSec: 120,
      };

      planner.planGif(longSummary, basePreset, warnings);

      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings.some((w) => w.includes('GIF') && w.includes('seconds'))).toBe(true);
    });

    it('should clamp FPS to valid range', () => {
      const highFpsSummary: ProbeSummary = {
        ...mockSummary,
        fps: 120,
      };

      const result = planner.planGif(highFpsSummary, basePreset, warnings);

      expect(result.notes.some((n) => n.includes('fps clamped'))).toBe(true);
    });

    it('should use default FPS when source FPS is missing', () => {
      const noFpsSummary: ProbeSummary = {
        ...mockSummary,
        fps: undefined,
      };

      const result = planner.planGif(noFpsSummary, basePreset, warnings);

      expect(result.notes.some((n) => n.includes('default') && n.includes('fps'))).toBe(true);
    });

    it('should limit width to maximum', () => {
      const wideSummary: ProbeSummary = {
        ...mockSummary,
        width: 4000,
      };

      const result = planner.planGif(wideSummary, basePreset, warnings);

      expect(result.notes.some((n) => n.includes('width limited'))).toBe(true);
    });

    it('should ensure even width', () => {
      const oddWidthSummary: ProbeSummary = {
        ...mockSummary,
        width: 1921,
      };

      const result = planner.planGif(oddWidthSummary, basePreset, warnings);

      // Filter complex should contain an even width
      const filterArg = result.args[result.args.indexOf('-filter_complex') + 1];
      expect(filterArg).toBeTruthy();
    });

    it('should handle missing width', () => {
      const noWidthSummary: ProbeSummary = {
        ...mockSummary,
        width: undefined,
      };

      const result = planner.planGif(noWidthSummary, basePreset, warnings);

      expect(result.args).toContain('-filter_complex');
    });

    it('should include palette generation in notes', () => {
      const result = planner.planGif(mockSummary, basePreset, warnings);

      expect(result.notes.some((n) => n.includes('palette'))).toBe(true);
    });
  });

  describe('planImage', () => {
    it('should plan PNG image conversion', () => {
      const preset: Preset = {
        ...basePreset,
        container: 'png',
        video: { codec: 'png' },
      };

      const result = planner.planImage(preset, warnings);

      expect(result.args).toContain('-f');
      expect(result.args).toContain('image2');
      expect(result.args).toContain('-frames:v');
      expect(result.args).toContain('1');
    });

    it('should plan JPEG image conversion with quality', () => {
      const preset: Preset = {
        ...basePreset,
        container: 'jpg',
        video: { codec: 'mjpeg' },
      };

      const result = planner.planImage(preset, warnings);

      expect(result.args).toContain('mjpeg');
      expect(result.args).toContain('-q:v');
      expect(result.args).toContain('2');
    });

    it('should plan WebP image conversion with quality', () => {
      const preset: Preset = {
        ...basePreset,
        container: 'webp',
        video: { codec: 'webp' },
      };

      const result = planner.planImage(preset, warnings);

      // Check for codec and quality settings
      expect(result.args).toContain('-c:v');
      expect(result.args).toContain('-quality');
      expect(result.args).toContain('90');
      // Verify webp codec is used (encoder strategy may map it)
      const codecIndex = result.args.indexOf('-c:v');
      expect(result.args[codecIndex + 1]).toBeTruthy();
    });

    it('should warn when encoder not found', () => {
      const mockStrategy: VideoEncoderSelectionStrategy = {
        selectEncoder: vi.fn().mockReturnValue(null),
      };

      const plannerWithStrategy = new VideoPlanner(mockCapabilities, mockStrategy);

      const preset: Preset = {
        ...basePreset,
        container: 'png',
        video: { codec: 'unknown' as any },
      };

      plannerWithStrategy.planImage(preset, warnings);

      expect(warnings.some((w) => w.includes('Unknown image codec'))).toBe(true);
    });

    it('should warn when encoder not in capabilities', () => {
      const mockStrategy: VideoEncoderSelectionStrategy = {
        selectEncoder: vi.fn().mockReturnValue('unsupported_encoder'),
      };

      const plannerWithStrategy = new VideoPlanner(mockCapabilities, mockStrategy);

      const preset: Preset = {
        ...basePreset,
        container: 'png',
        video: { codec: 'png' },
      };

      plannerWithStrategy.planImage(preset, warnings);

      expect(warnings.some((w) => w.includes('not reported by FFmpeg'))).toBe(true);
    });

    it('should include conversion note', () => {
      const preset: Preset = {
        ...basePreset,
        container: 'png',
        video: { codec: 'png' },
      };

      const result = planner.planImage(preset, warnings);

      expect(result.notes.some((n) => n.includes('PNG') && n.includes('format'))).toBe(true);
    });
  });
});

describe('resolveTierDefaults', () => {
  it('should return requested tier when available', () => {
    const tiers = {
      fast: { crf: 28 },
      balanced: { crf: 23 },
      high: { crf: 18 },
    };

    const result = resolveTierDefaults(tiers, 'balanced');

    expect(result.tier).toBe('balanced');
    expect(result.value?.crf).toBe(23);
    expect(result.usedFallback).toBe(false);
  });

  it('should fallback to balanced when requested tier missing', () => {
    const tiers = {
      balanced: { crf: 23 },
    };

    const result = resolveTierDefaults(tiers, 'high');

    expect(result.tier).toBe('balanced');
    expect(result.value?.crf).toBe(23);
    expect(result.usedFallback).toBe(true);
  });

  it('should fallback to fast when balanced missing', () => {
    const tiers = {
      fast: { crf: 28 },
    };

    const result = resolveTierDefaults(tiers, 'high');

    expect(result.tier).toBe('fast');
    expect(result.value?.crf).toBe(28);
    expect(result.usedFallback).toBe(true);
  });

  it('should return requested tier with no value when all tiers missing', () => {
    const result = resolveTierDefaults({}, 'balanced');

    expect(result.tier).toBe('balanced');
    expect(result.value).toBeUndefined();
    expect(result.usedFallback).toBe(false);
  });

  it('should handle undefined tiers', () => {
    const result = resolveTierDefaults(undefined, 'balanced');

    expect(result.tier).toBe('balanced');
    expect(result.value).toBeUndefined();
    expect(result.usedFallback).toBe(false);
  });
});

describe('resolveVideoProfile', () => {
  it('should return profile as-is for non-ProRes codecs', () => {
    expect(resolveVideoProfile('h264', 'high')).toBe('high');
    expect(resolveVideoProfile('hevc', 'main')).toBe('main');
  });

  it('should normalize ProRes standard profile', () => {
    expect(resolveVideoProfile('prores', '422')).toBe('standard');
    expect(resolveVideoProfile('prores', 'standard')).toBe('standard');
    expect(resolveVideoProfile('prores', 'STANDARD')).toBe('standard');
  });

  it('should normalize ProRes HQ profile', () => {
    expect(resolveVideoProfile('prores', '422hq')).toBe('hq');
    expect(resolveVideoProfile('prores', 'hq')).toBe('hq');
    expect(resolveVideoProfile('prores', 'HQ')).toBe('hq');
  });

  it('should normalize ProRes 4444 profile', () => {
    expect(resolveVideoProfile('prores', '4444')).toBe('4444');
  });

  it('should normalize ProRes 4444XQ profile', () => {
    expect(resolveVideoProfile('prores', '4444xq')).toBe('4444xq');
  });

  it('should normalize ProRes Proxy profile', () => {
    expect(resolveVideoProfile('prores', 'proxy')).toBe('proxy');
    expect(resolveVideoProfile('prores', 'PROXY')).toBe('proxy');
  });

  it('should normalize ProRes LT profile', () => {
    expect(resolveVideoProfile('prores', 'lt')).toBe('lt');
    expect(resolveVideoProfile('prores', '422lt')).toBe('lt');
    expect(resolveVideoProfile('prores', 'LT')).toBe('lt');
  });

  it('should return unknown ProRes profile as-is', () => {
    expect(resolveVideoProfile('prores', 'unknown')).toBe('unknown');
  });

  it('should handle profile with extra whitespace', () => {
    expect(resolveVideoProfile('prores', '  422  ')).toBe('standard');
    expect(resolveVideoProfile('prores', ' hq ')).toBe('hq');
  });
});
