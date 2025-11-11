import { describe, it, expect } from 'vitest';
import {
  HardwareFirstVideoStrategy,
  SoftwareOnlyVideoStrategy,
  HardwareFirstAudioStrategy,
  SoftwareOnlyAudioStrategy,
  DEFAULT_VIDEO_STRATEGY,
  DEFAULT_AUDIO_STRATEGY,
} from '../encoder-strategy';
import type { CapabilitySnapshot } from '../../types';

describe('HardwareFirstVideoStrategy', () => {
  const strategy = new HardwareFirstVideoStrategy();

  const hwCapabilities: CapabilitySnapshot = {
    videoEncoders: new Set(['h264_videotoolbox', 'hevc_videotoolbox', 'prores_videotoolbox']),
    audioEncoders: new Set(),
    formats: new Set(),
    filters: new Set(),
  };

  const swCapabilities: CapabilitySnapshot = {
    videoEncoders: new Set(['libx264', 'libx265', 'libvpx-vp9', 'prores_ks']),
    audioEncoders: new Set(),
    formats: new Set(),
    filters: new Set(),
  };

  describe('Special codecs', () => {
    it('should return null for "none" codec', () => {
      expect(strategy.selectEncoder('none')).toBeNull();
      expect(strategy.selectEncoder('none', hwCapabilities)).toBeNull();
    });

    it('should return "copy" for copy codec', () => {
      expect(strategy.selectEncoder('copy')).toBe('copy');
      expect(strategy.selectEncoder('copy', hwCapabilities)).toBe('copy');
    });
  });

  describe('Simple codecs (single encoder)', () => {
    it('should return gif encoder', () => {
      expect(strategy.selectEncoder('gif')).toBe('gif');
    });

    it('should return png encoder', () => {
      expect(strategy.selectEncoder('png')).toBe('png');
    });

    it('should return mjpeg encoder', () => {
      expect(strategy.selectEncoder('mjpeg')).toBe('mjpeg');
    });

    it('should return webp encoder', () => {
      expect(strategy.selectEncoder('webp')).toBe('libwebp');
    });
  });

  describe('Hardware-first selection', () => {
    it('should prefer h264_videotoolbox when available', () => {
      expect(strategy.selectEncoder('h264', hwCapabilities)).toBe('h264_videotoolbox');
    });

    it('should fall back to libx264 when hardware not available', () => {
      expect(strategy.selectEncoder('h264', swCapabilities)).toBe('libx264');
    });

    it('should prefer hevc_videotoolbox when available', () => {
      expect(strategy.selectEncoder('hevc', hwCapabilities)).toBe('hevc_videotoolbox');
    });

    it('should fall back to libx265 when hardware not available', () => {
      expect(strategy.selectEncoder('hevc', swCapabilities)).toBe('libx265');
    });

    it('should prefer prores_videotoolbox when available', () => {
      expect(strategy.selectEncoder('prores', hwCapabilities)).toBe('prores_videotoolbox');
    });

    it('should fall back to prores_ks when hardware not available', () => {
      expect(strategy.selectEncoder('prores', swCapabilities)).toBe('prores_ks');
    });
  });

  describe('Software-only codecs', () => {
    it('should return libvpx-vp9 for VP9', () => {
      expect(strategy.selectEncoder('vp9')).toBe('libvpx-vp9');
      expect(strategy.selectEncoder('vp9', hwCapabilities)).toBe('libvpx-vp9');
    });

    it('should prefer libaom-av1 for AV1', () => {
      const av1Capabilities: CapabilitySnapshot = {
        videoEncoders: new Set(['libaom-av1']),
        audioEncoders: new Set(),
        formats: new Set(),
        filters: new Set(),
      };

      expect(strategy.selectEncoder('av1', av1Capabilities)).toBe('libaom-av1');
    });

    it('should fall back to libsvtav1 for AV1 when libaom not available', () => {
      const svtCapabilities: CapabilitySnapshot = {
        videoEncoders: new Set(['libsvtav1']),
        audioEncoders: new Set(),
        formats: new Set(),
        filters: new Set(),
      };

      expect(strategy.selectEncoder('av1', svtCapabilities)).toBe('libsvtav1');
    });

    it('should return default AV1 encoder when no capabilities', () => {
      expect(strategy.selectEncoder('av1')).toBe('libsvtav1');
    });
  });

  describe('Without capabilities', () => {
    it('should fall back to last encoder in list', () => {
      expect(strategy.selectEncoder('h264')).toBe('libx264');
      expect(strategy.selectEncoder('hevc')).toBe('libx265');
      expect(strategy.selectEncoder('prores')).toBe('prores_ks');
    });
  });
});

describe('SoftwareOnlyVideoStrategy', () => {
  const strategy = new SoftwareOnlyVideoStrategy();

  const hwCapabilities: CapabilitySnapshot = {
    videoEncoders: new Set(['h264_videotoolbox', 'hevc_videotoolbox']),
    audioEncoders: new Set(),
    formats: new Set(),
    filters: new Set(),
  };

  describe('Special codecs', () => {
    it('should return null for "none" codec', () => {
      expect(strategy.selectEncoder('none')).toBeNull();
    });

    it('should return "copy" for copy codec', () => {
      expect(strategy.selectEncoder('copy')).toBe('copy');
    });
  });

  describe('Always uses software encoders', () => {
    it('should use libx264 even when hardware available', () => {
      expect(strategy.selectEncoder('h264', hwCapabilities)).toBe('libx264');
      expect(strategy.selectEncoder('h264')).toBe('libx264');
    });

    it('should use libx265 even when hardware available', () => {
      expect(strategy.selectEncoder('hevc', hwCapabilities)).toBe('libx265');
      expect(strategy.selectEncoder('hevc')).toBe('libx265');
    });

    it('should use libvpx-vp9 for VP9', () => {
      expect(strategy.selectEncoder('vp9')).toBe('libvpx-vp9');
    });

    it('should use libaom-av1 for AV1', () => {
      expect(strategy.selectEncoder('av1')).toBe('libaom-av1');
    });

    it('should use prores_ks for ProRes', () => {
      expect(strategy.selectEncoder('prores', hwCapabilities)).toBe('prores_ks');
    });

    it('should use gif for GIF', () => {
      expect(strategy.selectEncoder('gif')).toBe('gif');
    });

    it('should use png for PNG', () => {
      expect(strategy.selectEncoder('png')).toBe('png');
    });

    it('should use mjpeg for MJPEG', () => {
      expect(strategy.selectEncoder('mjpeg')).toBe('mjpeg');
    });

    it('should use libwebp for WebP', () => {
      expect(strategy.selectEncoder('webp')).toBe('libwebp');
    });
  });
});

describe('HardwareFirstAudioStrategy', () => {
  const strategy = new HardwareFirstAudioStrategy();

  const capabilities: CapabilitySnapshot = {
    videoEncoders: new Set(),
    audioEncoders: new Set(['aac', 'libopus', 'libmp3lame']),
    formats: new Set(),
    filters: new Set(),
  };

  describe('Special codecs', () => {
    it('should return null for "none" codec', () => {
      expect(strategy.selectEncoder('none')).toBeNull();
      expect(strategy.selectEncoder('none', capabilities)).toBeNull();
    });

    it('should return "copy" for copy codec', () => {
      expect(strategy.selectEncoder('copy')).toBe('copy');
      expect(strategy.selectEncoder('copy', capabilities)).toBe('copy');
    });
  });

  describe('Audio encoder selection', () => {
    it('should select aac when available', () => {
      expect(strategy.selectEncoder('aac', capabilities)).toBe('aac');
    });

    it('should select libopus for opus', () => {
      expect(strategy.selectEncoder('opus', capabilities)).toBe('libopus');
    });

    it('should select libvorbis for vorbis', () => {
      const vorbisCapabilities: CapabilitySnapshot = {
        ...capabilities,
        audioEncoders: new Set(['libvorbis']),
      };
      expect(strategy.selectEncoder('vorbis', vorbisCapabilities)).toBe('libvorbis');
    });

    it('should select libmp3lame for mp3', () => {
      expect(strategy.selectEncoder('mp3', capabilities)).toBe('libmp3lame');
    });

    it('should select flac for flac', () => {
      const flacCapabilities: CapabilitySnapshot = {
        ...capabilities,
        audioEncoders: new Set(['flac']),
      };
      expect(strategy.selectEncoder('flac', flacCapabilities)).toBe('flac');
    });

    it('should select pcm_s16le for pcm_s16le', () => {
      const pcmCapabilities: CapabilitySnapshot = {
        ...capabilities,
        audioEncoders: new Set(['pcm_s16le']),
      };
      expect(strategy.selectEncoder('pcm_s16le', pcmCapabilities)).toBe('pcm_s16le');
    });

    it('should select alac for alac', () => {
      const alacCapabilities: CapabilitySnapshot = {
        ...capabilities,
        audioEncoders: new Set(['alac']),
      };
      expect(strategy.selectEncoder('alac', alacCapabilities)).toBe('alac');
    });
  });

  describe('Without capabilities', () => {
    it('should fall back to default encoders', () => {
      expect(strategy.selectEncoder('aac')).toBe('aac');
      expect(strategy.selectEncoder('opus')).toBe('libopus');
      expect(strategy.selectEncoder('vorbis')).toBe('libvorbis');
      expect(strategy.selectEncoder('mp3')).toBe('libmp3lame');
      expect(strategy.selectEncoder('flac')).toBe('flac');
      expect(strategy.selectEncoder('pcm_s16le')).toBe('pcm_s16le');
      expect(strategy.selectEncoder('alac')).toBe('alac');
    });
  });
});

describe('SoftwareOnlyAudioStrategy', () => {
  const strategy = new SoftwareOnlyAudioStrategy();

  const capabilities: CapabilitySnapshot = {
    videoEncoders: new Set(),
    audioEncoders: new Set(['aac', 'libopus', 'libmp3lame']),
    formats: new Set(),
    filters: new Set(),
  };

  describe('Special codecs', () => {
    it('should return null for "none" codec', () => {
      expect(strategy.selectEncoder('none')).toBeNull();
    });

    it('should return "copy" for copy codec', () => {
      expect(strategy.selectEncoder('copy')).toBe('copy');
    });
  });

  describe('Audio encoder selection', () => {
    it('should always use aac regardless of capabilities', () => {
      expect(strategy.selectEncoder('aac', capabilities)).toBe('aac');
      expect(strategy.selectEncoder('aac')).toBe('aac');
    });

    it('should always use libopus for opus', () => {
      expect(strategy.selectEncoder('opus', capabilities)).toBe('libopus');
      expect(strategy.selectEncoder('opus')).toBe('libopus');
    });

    it('should always use libvorbis for vorbis', () => {
      expect(strategy.selectEncoder('vorbis')).toBe('libvorbis');
    });

    it('should always use libmp3lame for mp3', () => {
      expect(strategy.selectEncoder('mp3')).toBe('libmp3lame');
    });

    it('should always use flac for flac', () => {
      expect(strategy.selectEncoder('flac')).toBe('flac');
    });

    it('should always use pcm_s16le for pcm_s16le', () => {
      expect(strategy.selectEncoder('pcm_s16le')).toBe('pcm_s16le');
    });

    it('should always use alac for alac', () => {
      expect(strategy.selectEncoder('alac')).toBe('alac');
    });
  });
});

describe('Default strategies', () => {
  it('should export DEFAULT_VIDEO_STRATEGY as HardwareFirstVideoStrategy', () => {
    expect(DEFAULT_VIDEO_STRATEGY).toBeInstanceOf(HardwareFirstVideoStrategy);
  });

  it('should export DEFAULT_AUDIO_STRATEGY as HardwareFirstAudioStrategy', () => {
    expect(DEFAULT_AUDIO_STRATEGY).toBeInstanceOf(HardwareFirstAudioStrategy);
  });

  it('should use default video strategy correctly', () => {
    expect(DEFAULT_VIDEO_STRATEGY.selectEncoder('h264')).toBe('libx264');
  });

  it('should use default audio strategy correctly', () => {
    expect(DEFAULT_AUDIO_STRATEGY.selectEncoder('aac')).toBe('aac');
  });
});
