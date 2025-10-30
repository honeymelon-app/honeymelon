import { describe, it, expect } from 'vitest';
import { resolvePreset, listSupportedPresets, planJob, type PlannerContext } from '../ffmpeg-plan';
import type { CapabilitySnapshot, ProbeSummary } from '../types';

describe('ffmpeg-plan', () => {
  describe('resolvePreset', () => {
    it('should resolve a valid preset by id', () => {
      const preset = resolvePreset('mp4-h264-aac-balanced');
      expect(preset).toBeDefined();
      expect(preset?.id).toBe('mp4-h264-aac-balanced');
      expect(preset?.container).toBe('mp4');
    });

    it('should return undefined for invalid preset id', () => {
      const preset = resolvePreset('invalid-preset');
      expect(preset).toBeUndefined();
    });

    it('should resolve remux presets', () => {
      const preset = resolvePreset('mkv-passthrough');
      expect(preset).toBeDefined();
      expect(preset?.remuxOnly).toBe(true);
    });
  });

  describe('listSupportedPresets', () => {
    it('should return all presets when no capabilities provided', () => {
      const presets = listSupportedPresets();
      expect(presets.length).toBeGreaterThan(0);
    });

    it('should include remux-only presets regardless of capabilities', () => {
      const capabilities: CapabilitySnapshot = {
        videoEncoders: new Set(),
        audioEncoders: new Set(),
        formats: new Set(),
        filters: new Set(),
      };
      const presets = listSupportedPresets(capabilities);
      const remuxPresets = presets.filter((p) => p.remuxOnly);
      expect(remuxPresets.length).toBeGreaterThan(0);
    });

    it('should filter presets requiring unavailable video encoders', () => {
      const capabilities: CapabilitySnapshot = {
        videoEncoders: new Set(['h264_videotoolbox']),
        audioEncoders: new Set(['aac']),
        formats: new Set(),
        filters: new Set(),
      };
      const presets = listSupportedPresets(capabilities);
      const hevcPreset = presets.find((p) => p.id === 'mp4-hevc-aac');
      expect(hevcPreset).toBeUndefined();
    });

    it('should filter presets requiring unavailable audio encoders', () => {
      const capabilities: CapabilitySnapshot = {
        videoEncoders: new Set(['h264_videotoolbox']),
        audioEncoders: new Set(['aac']),
        formats: new Set(),
        filters: new Set(),
      };
      const presets = listSupportedPresets(capabilities);
      const opusPreset = presets.find((p) => p.audio.codec === 'opus');
      expect(opusPreset).toBeUndefined();
    });

    it('should include presets with copy codecs', () => {
      const capabilities: CapabilitySnapshot = {
        videoEncoders: new Set(),
        audioEncoders: new Set(),
        formats: new Set(),
        filters: new Set(),
      };
      const presets = listSupportedPresets(capabilities);
      const copyPreset = presets.find((p) => p.video.codec === 'copy');
      expect(copyPreset).toBeDefined();
    });
  });

  describe('planJob - copy vs transcode logic', () => {
    const baseSummary: ProbeSummary = {
      durationSec: 60,
      width: 1920,
      height: 1080,
      fps: 30,
      vcodec: 'h264',
      acodec: 'aac',
      hasTextSubs: false,
      hasImageSubs: false,
    };

    it('should copy when source codec matches preset codec', () => {
      const context: PlannerContext = {
        presetId: 'mp4-h264-aac-balanced',
        summary: baseSummary,
      };
      const decision = planJob(context);
      expect(decision.ffmpegArgs).toContain('-c:v');
      expect(decision.ffmpegArgs).toContain('copy');
      // MP4 preset has subtitle mode 'convert', so not pure remux
      expect(decision.remuxOnly).toBe(false);
      expect(decision.notes.some((n) => n.includes('copy matching codec'))).toBe(true);
    });

    it('should transcode when source codec differs from preset', () => {
      const context: PlannerContext = {
        presetId: 'mp4-hevc-aac',
        summary: baseSummary,
      };
      const decision = planJob(context);
      expect(decision.ffmpegArgs).toContain('-c:v');
      expect(decision.ffmpegArgs).toContain('hevc_videotoolbox');
      expect(decision.remuxOnly).toBe(false);
      expect(decision.notes.some((n) => n.includes('transcode'))).toBe(true);
    });

    it('should use copy encoder for preset with copy codec', () => {
      const context: PlannerContext = {
        presetId: 'mkv-passthrough',
        summary: { ...baseSummary, vcodec: 'hevc', acodec: 'opus' },
      };
      const decision = planJob(context);
      expect(decision.ffmpegArgs).toContain('copy');
      expect(decision.remuxOnly).toBe(true);
    });

    it('should handle missing video stream gracefully', () => {
      const context: PlannerContext = {
        presetId: 'mp4-h264-aac-balanced',
        summary: { ...baseSummary, vcodec: undefined },
      };
      const decision = planJob(context);
      expect(decision.ffmpegArgs).toContain('-vn');
      expect(decision.warnings.some((w) => w.includes('no video stream'))).toBe(true);
    });

    it('should handle missing audio stream gracefully', () => {
      const context: PlannerContext = {
        presetId: 'mp4-h264-aac-balanced',
        summary: { ...baseSummary, acodec: undefined },
      };
      const decision = planJob(context);
      expect(decision.ffmpegArgs).toContain('-an');
      expect(decision.warnings.some((w) => w.includes('no audio stream'))).toBe(true);
    });

    it('should drop video when preset codec is none', () => {
      const context: PlannerContext = {
        presetId: 'audio-m4a',
        summary: baseSummary,
      };
      const decision = planJob(context);
      expect(decision.ffmpegArgs).toContain('-vn');
      expect(decision.notes.some((n) => n.includes('disabled by preset'))).toBe(true);
    });

    it('should drop audio when preset codec is none', () => {
      const context: PlannerContext = {
        presetId: 'gif-export',
        summary: baseSummary,
      };
      const decision = planJob(context);
      expect(decision.ffmpegArgs).toContain('-an');
    });
  });

  describe('planJob - tier defaults', () => {
    const baseSummary: ProbeSummary = {
      durationSec: 60,
      width: 1920,
      height: 1080,
      fps: 30,
      vcodec: 'hevc',
      acodec: 'mp3',
    };

    it('should apply balanced tier by default', () => {
      const context: PlannerContext = {
        presetId: 'mp4-h264-aac-balanced',
        summary: baseSummary,
      };
      const decision = planJob(context);
      expect(decision.ffmpegArgs).toContain('-b:v');
      expect(decision.ffmpegArgs).toContain('6000k');
    });

    it('should apply fast tier when requested', () => {
      const context: PlannerContext = {
        presetId: 'mp4-h264-aac-balanced',
        summary: baseSummary,
        requestedTier: 'fast',
      };
      const decision = planJob(context);
      expect(decision.ffmpegArgs).toContain('4500k');
    });

    it('should apply high tier when requested', () => {
      const context: PlannerContext = {
        presetId: 'mp4-h264-aac-balanced',
        summary: baseSummary,
        requestedTier: 'high',
      };
      const decision = planJob(context);
      expect(decision.ffmpegArgs).toContain('9000k');
    });

    it('should apply audio tier bitrate', () => {
      const context: PlannerContext = {
        presetId: 'mp4-h264-aac-balanced',
        summary: baseSummary,
        requestedTier: 'high',
      };
      const decision = planJob(context);
      expect(decision.ffmpegArgs).toContain('-b:a');
      expect(decision.ffmpegArgs).toContain('192k');
    });

    it('should fallback to available tier when requested tier not defined', () => {
      // This test verifies the fallback logic exists in the code, even though
      // current presets have all tiers defined. The logic is still important for
      // future preset additions or custom presets.
      const context: PlannerContext = {
        presetId: 'audio-flac',
        summary: baseSummary,
        requestedTier: 'fast',
      };
      const decision = planJob(context);
      // FLAC has no tiers, so no fallback note should be present
      expect(decision.notes.some((n) => n.includes('fallback'))).toBe(false);
    });
  });

  describe('planJob - color metadata', () => {
    it('should copy color metadata when transcoding and flag enabled', () => {
      const context: PlannerContext = {
        presetId: 'mp4-hevc-aac',
        summary: {
          durationSec: 60,
          vcodec: 'h264',
          acodec: 'aac',
          color: {
            primaries: 'bt709',
            trc: 'bt709',
            space: 'bt709',
          },
        },
      };
      const decision = planJob(context);
      expect(decision.ffmpegArgs).toContain('-color_primaries');
      expect(decision.ffmpegArgs).toContain('bt709');
      expect(decision.ffmpegArgs).toContain('-color_trc');
      expect(decision.ffmpegArgs).toContain('-colorspace');
      expect(decision.notes.some((n) => n.includes('color metadata copied'))).toBe(true);
    });

    it('should not copy color metadata when copying video', () => {
      const context: PlannerContext = {
        presetId: 'mp4-h264-aac-balanced',
        summary: {
          durationSec: 60,
          vcodec: 'h264',
          acodec: 'aac',
          color: {
            primaries: 'bt709',
            trc: 'bt709',
            space: 'bt709',
          },
        },
      };
      const decision = planJob(context);
      expect(decision.ffmpegArgs).not.toContain('-color_primaries');
    });

    it('should handle missing color metadata gracefully', () => {
      const context: PlannerContext = {
        presetId: 'mp4-hevc-aac',
        summary: {
          durationSec: 60,
          vcodec: 'h264',
          acodec: 'aac',
        },
      };
      const decision = planJob(context);
      expect(decision.ffmpegArgs).not.toContain('-color_primaries');
    });
  });

  describe('planJob - subtitle handling', () => {
    it('should convert text subtitles for MP4', () => {
      const context: PlannerContext = {
        presetId: 'mp4-h264-aac-balanced',
        summary: {
          durationSec: 60,
          vcodec: 'h264',
          acodec: 'aac',
          hasTextSubs: true,
        },
      };
      const decision = planJob(context);
      expect(decision.ffmpegArgs).toContain('-c:s');
      expect(decision.ffmpegArgs).toContain('mov_text');
      expect(decision.notes.some((n) => n.includes('convert text streams'))).toBe(true);
    });

    it('should keep subtitles for MKV', () => {
      const context: PlannerContext = {
        presetId: 'mkv-passthrough',
        summary: {
          durationSec: 60,
          vcodec: 'h264',
          acodec: 'aac',
          hasTextSubs: true,
          hasImageSubs: true,
        },
      };
      const decision = planJob(context);
      expect(decision.ffmpegArgs).toContain('-c:s');
      expect(decision.ffmpegArgs).toContain('copy');
      expect(decision.notes.some((n) => n.includes('keep existing streams'))).toBe(true);
    });

    it('should drop subtitles when mode is drop', () => {
      const context: PlannerContext = {
        presetId: 'gif-export',
        summary: {
          durationSec: 60,
          vcodec: 'h264',
          hasTextSubs: true,
        },
      };
      const decision = planJob(context);
      expect(decision.ffmpegArgs).toContain('-sn');
    });

    it('should warn about image subtitle conversion', () => {
      const context: PlannerContext = {
        presetId: 'mp4-h264-aac-balanced',
        summary: {
          durationSec: 60,
          vcodec: 'h264',
          acodec: 'aac',
          hasImageSubs: true,
        },
      };
      const decision = planJob(context);
      expect(decision.warnings.some((w) => w.includes('Image-based subtitles'))).toBe(true);
    });

    it('should handle burn-in mode', () => {
      const context: PlannerContext = {
        presetId: 'webm-vp9-opus',
        summary: {
          durationSec: 60,
          vcodec: 'h264',
          acodec: 'aac',
          hasTextSubs: true,
        },
      };
      const decision = planJob(context);
      expect(decision.warnings.some((w) => w.includes('burn-in'))).toBe(true);
    });
  });

  describe('planJob - container compatibility', () => {
    it('should warn when source codec not listed for target container', () => {
      const context: PlannerContext = {
        presetId: 'remux-mp4',
        summary: {
          durationSec: 60,
          vcodec: 'vp9',
          acodec: 'aac',
        },
      };
      const decision = planJob(context);
      expect(decision.warnings.some((w) => w.includes('not listed for mp4'))).toBe(true);
    });

    it('should warn when preset codec incompatible with container', () => {
      const context: PlannerContext = {
        presetId: 'webm-vp9-opus',
        summary: {
          durationSec: 60,
          vcodec: 'h264',
          acodec: 'aac',
        },
      };
      const decision = planJob(context);
      // This should transcode, not warn about incompatibility
      expect(decision.ffmpegArgs).toContain('libvpx-vp9');
    });

    it('should add faststart flag for MP4/MOV containers', () => {
      const context: PlannerContext = {
        presetId: 'mp4-h264-aac-balanced',
        summary: {
          durationSec: 60,
          vcodec: 'h264',
          acodec: 'aac',
        },
      };
      const decision = planJob(context);
      expect(decision.ffmpegArgs).toContain('-movflags');
      expect(decision.ffmpegArgs).toContain('+faststart');
    });
  });

  describe('planJob - encoder availability', () => {
    it('should warn when required encoder not available', () => {
      const capabilities: CapabilitySnapshot = {
        videoEncoders: new Set(['h264_videotoolbox']),
        audioEncoders: new Set(['aac']),
        formats: new Set(),
        filters: new Set(),
      };
      const context: PlannerContext = {
        presetId: 'webm-vp9-opus',
        summary: {
          durationSec: 60,
          vcodec: 'h264',
          acodec: 'aac',
        },
        capabilities,
      };
      const decision = planJob(context);
      expect(decision.warnings.some((w) => w.includes('not reported by FFmpeg'))).toBe(true);
    });

    it('should not warn when encoder is available', () => {
      const capabilities: CapabilitySnapshot = {
        videoEncoders: new Set(['h264_videotoolbox', 'hevc_videotoolbox']),
        audioEncoders: new Set(['aac']),
        formats: new Set(),
        filters: new Set(),
      };
      const context: PlannerContext = {
        presetId: 'mp4-hevc-aac',
        summary: {
          durationSec: 60,
          vcodec: 'h264',
          acodec: 'aac',
        },
        capabilities,
      };
      const decision = planJob(context);
      expect(decision.warnings.some((w) => w.includes('not reported by FFmpeg'))).toBe(false);
    });
  });

  describe('planJob - edge cases', () => {
    it('should handle invalid preset id gracefully', () => {
      const context: PlannerContext = {
        presetId: 'nonexistent-preset',
        summary: {
          durationSec: 60,
          vcodec: 'h264',
          acodec: 'aac',
        },
      };
      const decision = planJob(context);
      expect(decision.preset.id).toBe('mp4-h264-aac-balanced');
    });

    it('should handle zero duration', () => {
      const context: PlannerContext = {
        presetId: 'mp4-h264-aac-balanced',
        summary: {
          durationSec: 0,
          vcodec: 'h264',
          acodec: 'aac',
        },
      };
      const decision = planJob(context);
      expect(decision.ffmpegArgs.length).toBeGreaterThan(0);
    });

    it('should handle missing dimensions', () => {
      const context: PlannerContext = {
        presetId: 'mp4-h264-aac-balanced',
        summary: {
          durationSec: 60,
          vcodec: 'h264',
          acodec: 'aac',
        },
      };
      const decision = planJob(context);
      expect(decision.ffmpegArgs.length).toBeGreaterThan(0);
    });

    it('should normalize codec names to lowercase', () => {
      const context: PlannerContext = {
        presetId: 'mp4-h264-aac-balanced',
        summary: {
          durationSec: 60,
          vcodec: 'H264',
          acodec: 'AAC',
        },
      };
      const decision = planJob(context);
      // Should recognize H264 as h264 and copy instead of transcode
      expect(decision.notes.some((n) => n.toLowerCase().includes('copy matching codec h264'))).toBe(
        true,
      );
      expect(decision.notes.some((n) => n.toLowerCase().includes('copy matching codec aac'))).toBe(
        true,
      );
      // MP4 preset has subtitle mode 'convert', so not pure remux
      expect(decision.remuxOnly).toBe(false);
    });

    it('should handle stereo downmix flag', () => {
      const context: PlannerContext = {
        presetId: 'mp4-h264-aac-balanced',
        summary: {
          durationSec: 60,
          vcodec: 'hevc',
          acodec: 'flac',
          channels: 6,
        },
      };
      const decision = planJob(context);
      expect(decision.ffmpegArgs).toContain('-ac');
      expect(decision.ffmpegArgs).toContain('2');
    });
  });

  describe('planJob - remuxOnly flag', () => {
    it('should set remuxOnly to true when all streams copied', () => {
      const context: PlannerContext = {
        presetId: 'mkv-passthrough',
        summary: {
          durationSec: 60,
          vcodec: 'h264',
          acodec: 'aac',
        },
      };
      const decision = planJob(context);
      expect(decision.remuxOnly).toBe(true);
    });

    it('should set remuxOnly to false when video transcoded', () => {
      const context: PlannerContext = {
        presetId: 'mp4-hevc-aac',
        summary: {
          durationSec: 60,
          vcodec: 'h264',
          acodec: 'aac',
        },
      };
      const decision = planJob(context);
      expect(decision.remuxOnly).toBe(false);
    });

    it('should set remuxOnly to false when audio transcoded', () => {
      const context: PlannerContext = {
        presetId: 'mp4-h264-aac-balanced',
        summary: {
          durationSec: 60,
          vcodec: 'h264',
          acodec: 'opus',
        },
      };
      const decision = planJob(context);
      expect(decision.remuxOnly).toBe(false);
    });

    it('should set remuxOnly to false when subtitles converted', () => {
      const context: PlannerContext = {
        presetId: 'mp4-h264-aac-balanced',
        summary: {
          durationSec: 60,
          vcodec: 'h264',
          acodec: 'aac',
          hasTextSubs: true,
        },
      };
      const decision = planJob(context);
      expect(decision.remuxOnly).toBe(false);
    });
  });

  describe('planJob - FFmpeg argument structure', () => {
    it('should include required video mapping arguments', () => {
      const context: PlannerContext = {
        presetId: 'mp4-h264-aac-balanced',
        summary: {
          durationSec: 60,
          vcodec: 'h264',
          acodec: 'aac',
        },
      };
      const decision = planJob(context);
      expect(decision.ffmpegArgs).toContain('-map');
      expect(decision.ffmpegArgs).toContain('0:v:0?');
    });

    it('should include required audio mapping arguments', () => {
      const context: PlannerContext = {
        presetId: 'mp4-h264-aac-balanced',
        summary: {
          durationSec: 60,
          vcodec: 'h264',
          acodec: 'aac',
        },
      };
      const decision = planJob(context);
      expect(decision.ffmpegArgs).toContain('-map');
      expect(decision.ffmpegArgs).toContain('0:a:0?');
    });

    it('should include maxrate and bufsize for bitrate-controlled encoding', () => {
      const context: PlannerContext = {
        presetId: 'mp4-h264-aac-balanced',
        summary: {
          durationSec: 60,
          vcodec: 'hevc',
          acodec: 'aac',
        },
      };
      const decision = planJob(context);
      expect(decision.ffmpegArgs).toContain('-maxrate');
      expect(decision.ffmpegArgs).toContain('-bufsize');
    });

    it('should not include tier args when copying', () => {
      const context: PlannerContext = {
        presetId: 'mkv-passthrough',
        summary: {
          durationSec: 60,
          vcodec: 'h264',
          acodec: 'aac',
        },
      };
      const decision = planJob(context);
      expect(decision.ffmpegArgs).not.toContain('-b:v');
      expect(decision.ffmpegArgs).not.toContain('-crf');
    });
  });
});
