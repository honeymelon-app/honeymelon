import { describe, it, expect } from 'vitest';
import { PRESETS, DEFAULT_PRESET_ID } from '../presets';

describe('presets', () => {
  describe('DEFAULT_PRESET_ID', () => {
    it('should reference an existing preset', () => {
      const defaultPreset = PRESETS.find((p) => p.id === DEFAULT_PRESET_ID);
      expect(defaultPreset).toBeDefined();
    });
  });

  describe('Preset structure validation', () => {
    it('should have unique preset IDs', () => {
      const ids = PRESETS.map((p) => p.id);
      const uniqueIds = new Set(ids);
      expect(ids.length).toBe(uniqueIds.size);
    });

    it('should have valid structure for all presets', () => {
      PRESETS.forEach((preset) => {
        expect(preset.id).toBeDefined();
        expect(preset.label).toBeDefined();
        expect(preset.container).toBeDefined();
        expect(preset.video).toBeDefined();
        expect(preset.video.codec).toBeDefined();
        expect(preset.audio).toBeDefined();
        expect(preset.audio.codec).toBeDefined();
      });
    });

    it('should have non-empty labels', () => {
      PRESETS.forEach((preset) => {
        expect(preset.label.length).toBeGreaterThan(0);
      });
    });
  });

  describe('MP4 H.264 + AAC preset', () => {
    const preset = PRESETS.find((p) => p.id === 'mp4-h264-aac-balanced');

    it('should exist', () => {
      expect(preset).toBeDefined();
    });

    it('should have correct container and codecs', () => {
      expect(preset?.container).toBe('mp4');
      expect(preset?.video.codec).toBe('h264');
      expect(preset?.audio.codec).toBe('aac');
    });

    it('should have all three tiers for video', () => {
      expect(preset?.video.tiers).toBeDefined();
      expect(preset?.video.tiers?.fast).toBeDefined();
      expect(preset?.video.tiers?.balanced).toBeDefined();
      expect(preset?.video.tiers?.high).toBeDefined();
    });

    it('should have all three tiers for audio', () => {
      expect(preset?.audio.tiers).toBeDefined();
      expect(preset?.audio.tiers?.fast).toBeDefined();
      expect(preset?.audio.tiers?.balanced).toBeDefined();
      expect(preset?.audio.tiers?.high).toBeDefined();
    });

    it('should have increasing bitrates across tiers', () => {
      const fast = preset?.video.tiers?.fast?.bitrateK ?? 0;
      const balanced = preset?.video.tiers?.balanced?.bitrateK ?? 0;
      const high = preset?.video.tiers?.high?.bitrateK ?? 0;
      expect(balanced).toBeGreaterThan(fast);
      expect(high).toBeGreaterThan(balanced);
    });

    it('should enable color metadata copy', () => {
      expect(preset?.video.copyColorMetadata).toBe(true);
    });

    it('should have subtitle settings', () => {
      expect(preset?.subs).toBeDefined();
      expect(preset?.subs?.mode).toBe('convert');
    });
  });

  describe('MP4 HEVC + AAC preset', () => {
    const preset = PRESETS.find((p) => p.id === 'mp4-hevc-aac');

    it('should exist', () => {
      expect(preset).toBeDefined();
    });

    it('should use HEVC codec', () => {
      expect(preset?.video.codec).toBe('hevc');
    });

    it('should have lower bitrates than H.264 for same tier', () => {
      const h264 = PRESETS.find((p) => p.id === 'mp4-h264-aac-balanced');
      const h264Bitrate = h264?.video.tiers?.balanced?.bitrateK ?? 0;
      const hevcBitrate = preset?.video.tiers?.balanced?.bitrateK ?? 0;
      expect(hevcBitrate).toBeLessThan(h264Bitrate);
    });
  });

  describe('WebM presets', () => {
    const vp9Preset = PRESETS.find((p) => p.id === 'webm-vp9-opus');
    const av1Preset = PRESETS.find((p) => p.id === 'webm-av1-opus');

    it('should have VP9 preset', () => {
      expect(vp9Preset).toBeDefined();
      expect(vp9Preset?.video.codec).toBe('vp9');
      expect(vp9Preset?.audio.codec).toBe('opus');
    });

    it('should have AV1 preset', () => {
      expect(av1Preset).toBeDefined();
      expect(av1Preset?.video.codec).toBe('av1');
      expect(av1Preset?.audio.codec).toBe('opus');
    });

    it('should mark AV1 as experimental', () => {
      expect(av1Preset?.experimental).toBe(true);
    });

    it('should use burn-in for subtitles', () => {
      expect(vp9Preset?.subs?.mode).toBe('burn');
      expect(av1Preset?.subs?.mode).toBe('burn');
    });
  });

  describe('ProRes preset', () => {
    const preset = PRESETS.find((p) => p.id === 'mov-prores-pcm');

    it('should exist', () => {
      expect(preset).toBeDefined();
    });

    it('should use MOV container', () => {
      expect(preset?.container).toBe('mov');
    });

    it('should use ProRes and PCM codecs', () => {
      expect(preset?.video.codec).toBe('prores');
      expect(preset?.audio.codec).toBe('pcm_s16le');
    });

    it('should have ProRes profiles in tiers', () => {
      expect(preset?.video.tiers?.fast?.profile).toBe('422');
      expect(preset?.video.tiers?.balanced?.profile).toBe('422hq');
      expect(preset?.video.tiers?.high?.profile).toBe('422hq');
    });

    it('should have very high bitrates', () => {
      const bitrate = preset?.video.tiers?.balanced?.bitrateK ?? 0;
      expect(bitrate).toBeGreaterThan(100000);
    });
  });

  describe('Remux presets', () => {
    const mkvPassthrough = PRESETS.find((p) => p.id === 'mkv-passthrough');
    const remuxMp4 = PRESETS.find((p) => p.id === 'remux-mp4');
    const remuxMkv = PRESETS.find((p) => p.id === 'remux-mkv');

    it('should have MKV passthrough preset', () => {
      expect(mkvPassthrough).toBeDefined();
      expect(mkvPassthrough?.remuxOnly).toBe(true);
    });

    it('should have remux MP4 preset', () => {
      expect(remuxMp4).toBeDefined();
      expect(remuxMp4?.remuxOnly).toBe(true);
    });

    it('should have remux MKV preset', () => {
      expect(remuxMkv).toBeDefined();
      expect(remuxMkv?.remuxOnly).toBe(true);
    });

    it('should use copy codec for remux presets', () => {
      expect(mkvPassthrough?.video.codec).toBe('copy');
      expect(mkvPassthrough?.audio.codec).toBe('copy');
      expect(remuxMp4?.video.codec).toBe('copy');
      expect(remuxMp4?.audio.codec).toBe('copy');
    });

    it('should handle subtitles appropriately for remux', () => {
      expect(mkvPassthrough?.subs?.mode).toBe('keep');
      expect(remuxMp4?.subs?.mode).toBe('convert');
    });
  });

  describe('Audio-only presets', () => {
    const m4a = PRESETS.find((p) => p.id === 'audio-m4a');
    const mp3 = PRESETS.find((p) => p.id === 'audio-mp3');
    const flac = PRESETS.find((p) => p.id === 'audio-flac');
    const wav = PRESETS.find((p) => p.id === 'audio-wav');

    it('should have M4A preset with none video codec', () => {
      expect(m4a).toBeDefined();
      expect(m4a?.video.codec).toBe('none');
      expect(m4a?.audio.codec).toBe('aac');
    });

    it('should have MP3 preset with none video codec', () => {
      expect(mp3).toBeDefined();
      expect(mp3?.video.codec).toBe('none');
      expect(mp3?.audio.codec).toBe('mp3');
    });

    it('should have FLAC preset with none video codec', () => {
      expect(flac).toBeDefined();
      expect(flac?.video.codec).toBe('none');
      expect(flac?.audio.codec).toBe('flac');
    });

    it('should have WAV preset with none video codec', () => {
      expect(wav).toBeDefined();
      expect(wav?.video.codec).toBe('none');
      expect(wav?.audio.codec).toBe('pcm_s16le');
    });

    it('should have tiered bitrates for lossy audio codecs', () => {
      expect(m4a?.audio.tiers).toBeDefined();
      expect(mp3?.audio.tiers).toBeDefined();
    });

    it('should not have tiers for lossless audio codecs', () => {
      expect(flac?.audio.tiers).toBeUndefined();
      expect(wav?.audio.tiers).toBeUndefined();
    });
  });

  describe('GIF preset', () => {
    const preset = PRESETS.find((p) => p.id === 'gif-export');

    it('should exist', () => {
      expect(preset).toBeDefined();
    });

    it('should use GIF container', () => {
      expect(preset?.container).toBe('gif');
    });

    it('should have none for audio and video codecs', () => {
      expect(preset?.video.codec).toBe('none');
      expect(preset?.audio.codec).toBe('none');
    });

    it('should drop subtitles', () => {
      expect(preset?.subs?.mode).toBe('drop');
    });

    it('should have length-guard tag', () => {
      expect(preset?.tags).toContain('length-guard');
    });
  });

  describe('Tier configuration consistency', () => {
    it('should have consistent tier names across presets', () => {
      const validTiers = ['fast', 'balanced', 'high'];
      PRESETS.forEach((preset) => {
        if (preset.video.tiers) {
          Object.keys(preset.video.tiers).forEach((tier) => {
            expect(validTiers).toContain(tier);
          });
        }
        if (preset.audio.tiers) {
          Object.keys(preset.audio.tiers).forEach((tier) => {
            expect(validTiers).toContain(tier);
          });
        }
      });
    });

    it('should have video tiers only for transcode presets', () => {
      PRESETS.forEach((preset) => {
        if (preset.video.codec === 'copy' || preset.video.codec === 'none') {
          expect(preset.video.tiers).toBeUndefined();
        }
      });
    });

    it('should have audio tiers for transcode presets with lossy codecs', () => {
      const lossyCodecs = ['aac', 'mp3', 'opus', 'vorbis'];
      PRESETS.forEach((preset) => {
        if (lossyCodecs.includes(preset.audio.codec)) {
          expect(preset.audio.tiers).toBeDefined();
        }
      });
    });
  });

  describe('Subtitle mode consistency', () => {
    it('should have valid subtitle modes', () => {
      const validModes = ['keep', 'convert', 'burn', 'drop'];
      PRESETS.forEach((preset) => {
        if (preset.subs) {
          expect(validModes).toContain(preset.subs.mode);
        }
      });
    });

    it('should not have subtitle settings for audio-only presets', () => {
      PRESETS.forEach((preset) => {
        if (preset.video.codec === 'none' && preset.container !== 'gif') {
          // GIF has video codec 'none' but still has subtitle settings (drop mode)
          // Only check true audio-only presets (m4a, mp3, flac, wav)
          expect(preset.subs).toBeUndefined();
        }
      });
    });
  });

  describe('Container and codec compatibility', () => {
    it('should use appropriate video codecs for MP4 container', () => {
      const mp4Presets = PRESETS.filter((p) => p.container === 'mp4');
      const validMp4VideoCodecs = ['h264', 'hevc', 'av1', 'copy'];
      mp4Presets.forEach((preset) => {
        expect(validMp4VideoCodecs).toContain(preset.video.codec);
      });
    });

    it('should use appropriate audio codecs for MP4 container', () => {
      const mp4Presets = PRESETS.filter((p) => p.container === 'mp4');
      const validMp4AudioCodecs = ['aac', 'alac', 'mp3', 'copy'];
      mp4Presets.forEach((preset) => {
        expect(validMp4AudioCodecs).toContain(preset.audio.codec);
      });
    });

    it('should use appropriate codecs for WebM container', () => {
      const webmPresets = PRESETS.filter((p) => p.container === 'webm');
      const validWebmVideoCodecs = ['vp8', 'vp9', 'av1'];
      const validWebmAudioCodecs = ['opus', 'vorbis'];
      webmPresets.forEach((preset) => {
        expect(validWebmVideoCodecs).toContain(preset.video.codec);
        expect(validWebmAudioCodecs).toContain(preset.audio.codec);
      });
    });

    it('should use appropriate codecs for MOV container', () => {
      const movPresets = PRESETS.filter((p) => p.container === 'mov');
      const validMovVideoCodecs = ['h264', 'prores'];
      const validMovAudioCodecs = ['aac', 'pcm_s16le'];
      movPresets.forEach((preset) => {
        expect(validMovVideoCodecs).toContain(preset.video.codec);
        expect(validMovAudioCodecs).toContain(preset.audio.codec);
      });
    });
  });

  describe('Preset count and coverage', () => {
    it('should have a reasonable number of presets', () => {
      expect(PRESETS.length).toBeGreaterThanOrEqual(10);
      expect(PRESETS.length).toBeLessThanOrEqual(20);
    });

    it('should cover common use cases', () => {
      const ids = PRESETS.map((p) => p.id);
      expect(ids).toContain('mp4-h264-aac-balanced');
      expect(ids).toContain('webm-vp9-opus');
      expect(ids).toContain('mkv-passthrough');
    });

    it('should have at least one preset per major container type', () => {
      const containers = PRESETS.map((p) => p.container);
      expect(new Set(containers)).toContain('mp4');
      expect(new Set(containers)).toContain('webm');
      expect(new Set(containers)).toContain('mov');
      expect(new Set(containers)).toContain('mkv');
    });
  });

  describe('Bitrate validation', () => {
    it('should have reasonable video bitrates', () => {
      PRESETS.forEach((preset) => {
        Object.values(preset.video.tiers ?? {}).forEach((tier) => {
          if (tier?.bitrateK) {
            expect(tier.bitrateK).toBeGreaterThan(0);
            expect(tier.bitrateK).toBeLessThan(500000);
          }
        });
      });
    });

    it('should have reasonable audio bitrates', () => {
      PRESETS.forEach((preset) => {
        Object.values(preset.audio.tiers ?? {}).forEach((tier) => {
          if (tier?.bitrateK) {
            expect(tier.bitrateK).toBeGreaterThan(0);
            expect(tier.bitrateK).toBeLessThan(1000);
          }
        });
      });
    });
  });

  describe('Special flags', () => {
    it('should mark only appropriate presets as remuxOnly', () => {
      PRESETS.forEach((preset) => {
        if (preset.remuxOnly) {
          expect(preset.video.codec).toBe('copy');
          expect(preset.audio.codec).toBe('copy');
        }
      });
    });

    it('should use stereoOnly flag appropriately', () => {
      PRESETS.forEach((preset) => {
        if (preset.audio.stereoOnly) {
          expect(['aac', 'mp3', 'opus', 'vorbis']).toContain(preset.audio.codec);
        }
      });
    });

    it('should only mark slow encoders as experimental', () => {
      PRESETS.forEach((preset) => {
        if (preset.experimental) {
          expect(['av1']).toContain(preset.video.codec);
        }
      });
    });
  });
});
