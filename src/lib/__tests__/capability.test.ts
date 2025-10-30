import { describe, it, expect } from 'vitest';
import { presetIsAvailable, availablePresets } from '../capability';
import type { CapabilitySnapshot, Preset } from '../types';

describe('capability', () => {
  describe('presetIsAvailable', () => {
    const mockPreset: Preset = {
      id: 'test-preset',
      label: 'Test Preset',
      container: 'mp4',
      video: {
        codec: 'h264',
      },
      audio: {
        codec: 'aac',
      },
    };

    it('should return true when no capabilities provided', () => {
      const result = presetIsAvailable(mockPreset, undefined);
      expect(result).toBe(true);
    });

    it('should return true for remuxOnly presets regardless of capabilities', () => {
      const remuxPreset: Preset = {
        ...mockPreset,
        remuxOnly: true,
      };
      const capabilities: CapabilitySnapshot = {
        videoEncoders: new Set(),
        audioEncoders: new Set(),
        formats: new Set(),
        filters: new Set(),
      };
      const result = presetIsAvailable(remuxPreset, capabilities);
      expect(result).toBe(true);
    });

    it('should return true when preset uses copy codec', () => {
      const copyPreset: Preset = {
        ...mockPreset,
        video: { codec: 'copy' },
        audio: { codec: 'copy' },
      };
      const capabilities: CapabilitySnapshot = {
        videoEncoders: new Set(),
        audioEncoders: new Set(),
        formats: new Set(),
        filters: new Set(),
      };
      const result = presetIsAvailable(copyPreset, capabilities);
      expect(result).toBe(true);
    });

    it('should return true when preset uses none codec', () => {
      const nonePreset: Preset = {
        ...mockPreset,
        video: { codec: 'none' },
        audio: { codec: 'none' },
      };
      const capabilities: CapabilitySnapshot = {
        videoEncoders: new Set(),
        audioEncoders: new Set(),
        formats: new Set(),
        filters: new Set(),
      };
      const result = presetIsAvailable(nonePreset, capabilities);
      expect(result).toBe(true);
    });

    it('should return false when required video encoder not available', () => {
      const capabilities: CapabilitySnapshot = {
        videoEncoders: new Set(['hevc_videotoolbox']),
        audioEncoders: new Set(['aac']),
        formats: new Set(),
        filters: new Set(),
      };
      const result = presetIsAvailable(mockPreset, capabilities);
      expect(result).toBe(false);
    });

    it('should return false when required audio encoder not available', () => {
      const capabilities: CapabilitySnapshot = {
        videoEncoders: new Set(['h264_videotoolbox']),
        audioEncoders: new Set(['opus']),
        formats: new Set(),
        filters: new Set(),
      };
      const result = presetIsAvailable(mockPreset, capabilities);
      expect(result).toBe(false);
    });

    it('should return true when both encoders are available', () => {
      const capabilities: CapabilitySnapshot = {
        videoEncoders: new Set(['h264']),
        audioEncoders: new Set(['aac']),
        formats: new Set(),
        filters: new Set(),
      };
      const result = presetIsAvailable(mockPreset, capabilities);
      expect(result).toBe(true);
    });

    it('should handle HEVC preset availability', () => {
      const hevcPreset: Preset = {
        ...mockPreset,
        video: { codec: 'hevc' },
      };
      const capabilities: CapabilitySnapshot = {
        videoEncoders: new Set(['hevc']),
        audioEncoders: new Set(['aac']),
        formats: new Set(),
        filters: new Set(),
      };
      const result = presetIsAvailable(hevcPreset, capabilities);
      expect(result).toBe(true);
    });

    it('should handle VP9 preset availability', () => {
      const vp9Preset: Preset = {
        ...mockPreset,
        video: { codec: 'vp9' },
        audio: { codec: 'opus' },
      };
      const capabilities: CapabilitySnapshot = {
        videoEncoders: new Set(['vp9']),
        audioEncoders: new Set(['opus']),
        formats: new Set(),
        filters: new Set(),
      };
      const result = presetIsAvailable(vp9Preset, capabilities);
      expect(result).toBe(true);
    });

    it('should handle AV1 preset availability', () => {
      const av1Preset: Preset = {
        ...mockPreset,
        video: { codec: 'av1' },
      };
      const capabilities: CapabilitySnapshot = {
        videoEncoders: new Set(['av1']),
        audioEncoders: new Set(['aac']),
        formats: new Set(),
        filters: new Set(),
      };
      const result = presetIsAvailable(av1Preset, capabilities);
      expect(result).toBe(true);
    });

    it('should handle ProRes preset availability', () => {
      const proresPreset: Preset = {
        ...mockPreset,
        video: { codec: 'prores' },
        audio: { codec: 'pcm_s16le' },
      };
      const capabilities: CapabilitySnapshot = {
        videoEncoders: new Set(['prores']),
        audioEncoders: new Set(['pcm_s16le']),
        formats: new Set(),
        filters: new Set(),
      };
      const result = presetIsAvailable(proresPreset, capabilities);
      expect(result).toBe(true);
    });

    it('should handle audio-only presets', () => {
      const audioPreset: Preset = {
        ...mockPreset,
        video: { codec: 'none' },
        audio: { codec: 'mp3' },
      };
      const capabilities: CapabilitySnapshot = {
        videoEncoders: new Set(),
        audioEncoders: new Set(['mp3']),
        formats: new Set(),
        filters: new Set(),
      };
      const result = presetIsAvailable(audioPreset, capabilities);
      expect(result).toBe(true);
    });

    it('should handle FLAC audio codec', () => {
      const flacPreset: Preset = {
        ...mockPreset,
        video: { codec: 'none' },
        audio: { codec: 'flac' },
      };
      const capabilities: CapabilitySnapshot = {
        videoEncoders: new Set(),
        audioEncoders: new Set(['flac']),
        formats: new Set(),
        filters: new Set(),
      };
      const result = presetIsAvailable(flacPreset, capabilities);
      expect(result).toBe(true);
    });

    it('should handle ALAC audio codec', () => {
      const alacPreset: Preset = {
        ...mockPreset,
        video: { codec: 'none' },
        audio: { codec: 'alac' },
      };
      const capabilities: CapabilitySnapshot = {
        videoEncoders: new Set(),
        audioEncoders: new Set(['alac']),
        formats: new Set(),
        filters: new Set(),
      };
      const result = presetIsAvailable(alacPreset, capabilities);
      expect(result).toBe(true);
    });
  });

  describe('availablePresets', () => {
    it('should return all presets when no capabilities provided', () => {
      const presets = availablePresets(undefined);
      expect(presets.length).toBeGreaterThan(0);
    });

    it('should filter presets based on capabilities', () => {
      const capabilities: CapabilitySnapshot = {
        videoEncoders: new Set(['h264_videotoolbox']),
        audioEncoders: new Set(['aac']),
        formats: new Set(),
        filters: new Set(),
      };
      const presets = availablePresets(capabilities);
      expect(presets.length).toBeGreaterThan(0);
      expect(presets.length).toBeLessThan(20);
    });

    it('should include remux presets even with empty capabilities', () => {
      const capabilities: CapabilitySnapshot = {
        videoEncoders: new Set(),
        audioEncoders: new Set(),
        formats: new Set(),
        filters: new Set(),
      };
      const presets = availablePresets(capabilities);
      const remuxPresets = presets.filter((p) => p.remuxOnly);
      expect(remuxPresets.length).toBeGreaterThan(0);
    });

    it('should exclude presets requiring unavailable encoders', () => {
      const capabilities: CapabilitySnapshot = {
        videoEncoders: new Set(['h264_videotoolbox']),
        audioEncoders: new Set(['aac']),
        formats: new Set(),
        filters: new Set(),
      };
      const presets = availablePresets(capabilities);
      const hevcPreset = presets.find((p) => p.id === 'mp4-hevc-aac');
      expect(hevcPreset).toBeUndefined();
    });

    it('should include presets with available encoders', () => {
      const capabilities: CapabilitySnapshot = {
        videoEncoders: new Set(['h264', 'hevc']),
        audioEncoders: new Set(['aac']),
        formats: new Set(),
        filters: new Set(),
      };
      const presets = availablePresets(capabilities);
      const h264Preset = presets.find((p) => p.id === 'mp4-h264-aac-balanced');
      const hevcPreset = presets.find((p) => p.id === 'mp4-hevc-aac');
      expect(h264Preset).toBeDefined();
      expect(hevcPreset).toBeDefined();
    });

    it('should handle full capability set', () => {
      const capabilities: CapabilitySnapshot = {
        videoEncoders: new Set(['h264', 'hevc', 'vp9', 'av1', 'prores']),
        audioEncoders: new Set(['aac', 'alac', 'mp3', 'opus', 'vorbis', 'flac', 'pcm_s16le']),
        formats: new Set(),
        filters: new Set(),
      };
      const presets = availablePresets(capabilities);
      expect(presets.length).toBeGreaterThan(10);
    });

    it('should handle minimal capability set', () => {
      const capabilities: CapabilitySnapshot = {
        videoEncoders: new Set(['h264']),
        audioEncoders: new Set(['aac']),
        formats: new Set(),
        filters: new Set(),
      };
      const presets = availablePresets(capabilities);
      expect(presets.length).toBeGreaterThan(0);
      expect(presets.some((p) => p.id === 'mp4-h264-aac-balanced')).toBe(true);
    });

    it('should include audio-only presets when audio encoders available', () => {
      const capabilities: CapabilitySnapshot = {
        videoEncoders: new Set(),
        audioEncoders: new Set(['aac', 'libmp3lame', 'flac', 'pcm_s16le']),
        formats: new Set(),
        filters: new Set(),
      };
      const presets = availablePresets(capabilities);
      const audioPresets = presets.filter((p) => p.video.codec === 'none');
      expect(audioPresets.length).toBeGreaterThan(0);
    });

    it('should exclude audio presets when audio encoder not available', () => {
      const capabilities: CapabilitySnapshot = {
        videoEncoders: new Set(['h264_videotoolbox']),
        audioEncoders: new Set(['aac']),
        formats: new Set(),
        filters: new Set(),
      };
      const presets = availablePresets(capabilities);
      const mp3Preset = presets.find((p) => p.id === 'audio-mp3');
      expect(mp3Preset).toBeUndefined();
    });

    it('should maintain preset order', () => {
      const capabilities: CapabilitySnapshot = {
        videoEncoders: new Set(['h264_videotoolbox']),
        audioEncoders: new Set(['aac']),
        formats: new Set(),
        filters: new Set(),
      };
      const presets = availablePresets(capabilities);
      const ids = presets.map((p) => p.id);
      const sortedIds = [...ids].sort();
      expect(ids).not.toEqual(sortedIds);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty capability sets gracefully', () => {
      const capabilities: CapabilitySnapshot = {
        videoEncoders: new Set(),
        audioEncoders: new Set(),
        formats: new Set(),
        filters: new Set(),
      };
      const presets = availablePresets(capabilities);
      expect(presets.length).toBeGreaterThan(0);
    });

    it('should handle case-sensitive encoder names', () => {
      const preset: Preset = {
        id: 'test',
        label: 'Test',
        container: 'mp4',
        video: { codec: 'h264' },
        audio: { codec: 'aac' },
      };
      const capabilities: CapabilitySnapshot = {
        videoEncoders: new Set(['h264_videotoolbox']),
        audioEncoders: new Set(['AAC']),
        formats: new Set(),
        filters: new Set(),
      };
      const result = presetIsAvailable(preset, capabilities);
      expect(result).toBe(false);
    });

    it('should handle unknown codec types', () => {
      const preset: Preset = {
        id: 'test',
        label: 'Test',
        container: 'mp4',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        video: { codec: 'unknown' as any },
        audio: { codec: 'aac' },
      };
      const capabilities: CapabilitySnapshot = {
        videoEncoders: new Set(['h264_videotoolbox']),
        audioEncoders: new Set(['aac']),
        formats: new Set(),
        filters: new Set(),
      };
      const result = presetIsAvailable(preset, capabilities);
      expect(result).toBe(false);
    });
  });

  describe('Integration with real presets', () => {
    it('should correctly filter MP4 presets', () => {
      const capabilities: CapabilitySnapshot = {
        videoEncoders: new Set(['h264_videotoolbox', 'hevc_videotoolbox']),
        audioEncoders: new Set(['aac']),
        formats: new Set(),
        filters: new Set(),
      };
      const presets = availablePresets(capabilities);
      const mp4Presets = presets.filter((p) => p.container === 'mp4');
      expect(mp4Presets.length).toBeGreaterThan(0);
    });

    it('should correctly filter WebM presets', () => {
      const capabilities: CapabilitySnapshot = {
        videoEncoders: new Set(['vp9', 'av1']),
        audioEncoders: new Set(['opus']),
        formats: new Set(),
        filters: new Set(),
      };
      const presets = availablePresets(capabilities);
      const webmPresets = presets.filter((p) => p.container === 'webm');
      expect(webmPresets.length).toBeGreaterThan(0);
    });

    it('should always include MKV passthrough', () => {
      const capabilities: CapabilitySnapshot = {
        videoEncoders: new Set(),
        audioEncoders: new Set(),
        formats: new Set(),
        filters: new Set(),
      };
      const presets = availablePresets(capabilities);
      const mkvPassthrough = presets.find((p) => p.id === 'mkv-passthrough');
      expect(mkvPassthrough).toBeDefined();
    });
  });
});
