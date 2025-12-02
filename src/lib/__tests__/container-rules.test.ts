import { describe, it, expect } from 'vitest';
import { CONTAINER_RULES } from '../container-rules';

describe('container-rules', () => {
  describe('MP4 container rules', () => {
    const mp4 = CONTAINER_RULES.mp4;

    it('should have correct label', () => {
      expect(mp4.label).toBe('MP4');
    });

    it('should allow H.264, HEVC, and AV1 video codecs', () => {
      expect(mp4.video).toContain('h264');
      expect(mp4.video).toContain('hevc');
      expect(mp4.video).toContain('av1');
    });

    it('should allow AAC, ALAC, MP3 and AC3 audio codecs', () => {
      expect(mp4.audio).toContain('aac');
      expect(mp4.audio).toContain('alac');
      expect(mp4.audio).toContain('mp3');
      expect(mp4.audio).toContain('ac3');
    });

    it('should only allow mov_text for text subtitles', () => {
      expect(mp4.subtitles?.text).toEqual(['mov_text']);
    });

    it('should not allow image subtitles', () => {
      expect(mp4.subtitles?.image).toEqual([]);
    });

    it('should require faststart flag', () => {
      expect(mp4.requiresFaststart).toBe(true);
    });
  });

  describe('WebM container rules', () => {
    const webm = CONTAINER_RULES.webm;

    it('should have correct label', () => {
      expect(webm.label).toBe('WebM');
    });

    it('should allow VP8, VP9, and AV1 video codecs', () => {
      expect(webm.video).toContain('vp8');
      expect(webm.video).toContain('vp9');
      expect(webm.video).toContain('av1');
    });

    it('should allow Opus and Vorbis audio codecs', () => {
      expect(webm.audio).toContain('opus');
      expect(webm.audio).toContain('vorbis');
    });

    it('should not allow text subtitles', () => {
      expect(webm.subtitles?.text).toEqual([]);
    });

    it('should not allow image subtitles', () => {
      expect(webm.subtitles?.image).toEqual([]);
    });

    it('should not require faststart', () => {
      expect(webm.requiresFaststart).toBeUndefined();
    });
  });

  describe('MOV container rules', () => {
    const mov = CONTAINER_RULES.mov;

    it('should have correct label', () => {
      expect(mov.label).toBe('QuickTime MOV');
    });

    it('should allow H.264, HEVC and ProRes video codecs', () => {
      expect(mov.video).toContain('h264');
      expect(mov.video).toContain('hevc');
      expect(mov.video).toContain('prores');
    });

    it('should allow AAC, PCM, and ALAC audio codecs', () => {
      expect(mov.audio).toContain('aac');
      expect(mov.audio).toContain('pcm_s16le');
      expect(mov.audio).toContain('pcm_s24le');
      expect(mov.audio).toContain('alac');
    });

    it('should not allow subtitles', () => {
      expect(mov.subtitles?.text).toEqual([]);
      expect(mov.subtitles?.image).toEqual([]);
    });

    it('should require faststart flag', () => {
      expect(mov.requiresFaststart).toBe(true);
    });
  });

  describe('MKV container rules', () => {
    const mkv = CONTAINER_RULES.mkv;

    it('should have correct label', () => {
      expect(mkv.label).toBe('Matroska MKV');
    });

    it('should allow any video codec', () => {
      expect(mkv.video).toBe('any');
    });

    it('should allow any audio codec', () => {
      expect(mkv.audio).toBe('any');
    });

    it('should allow any text subtitles', () => {
      expect(mkv.subtitles?.text).toBe('any');
    });

    it('should allow any image subtitles', () => {
      expect(mkv.subtitles?.image).toBe('any');
    });

    it('should not require faststart', () => {
      expect(mkv.requiresFaststart).toBeUndefined();
    });
  });

  describe('GIF container rules', () => {
    const gif = CONTAINER_RULES.gif;

    it('should have correct label', () => {
      expect(gif.label).toBe('GIF');
    });

    it('should only allow gif video codec', () => {
      expect(gif.video).toEqual(['gif']);
    });

    it('should not allow audio', () => {
      expect(gif.audio).toEqual([]);
    });

    it('should not allow subtitles', () => {
      expect(gif.subtitles?.text).toEqual([]);
      expect(gif.subtitles?.image).toEqual([]);
    });

    it('should have usage notes', () => {
      expect(gif.notes).toBeDefined();
    });
  });

  describe('Audio-only container rules', () => {
    it('M4A should allow AAC and ALAC', () => {
      const m4a = CONTAINER_RULES.m4a;
      expect(m4a.video).toEqual([]);
      expect(m4a.audio).toContain('aac');
      expect(m4a.audio).toContain('alac');
    });

    it('MP3 should only allow MP3 codec', () => {
      const mp3 = CONTAINER_RULES.mp3;
      expect(mp3.video).toEqual([]);
      expect(mp3.audio).toEqual(['mp3']);
    });

    it('FLAC should only allow FLAC codec', () => {
      const flac = CONTAINER_RULES.flac;
      expect(flac.video).toEqual([]);
      expect(flac.audio).toEqual(['flac']);
    });

    it('WAV should allow PCM codecs', () => {
      const wav = CONTAINER_RULES.wav;
      expect(wav.video).toEqual([]);
      expect(wav.audio).toContain('pcm_s16le');
      expect(wav.audio).toContain('pcm_s24le');
    });

    // New audio containers from Comet
    it('Ogg should allow Vorbis, Opus, and FLAC', () => {
      const ogg = CONTAINER_RULES.ogg;
      expect(ogg.video).toEqual([]);
      expect(ogg.audio).toContain('vorbis');
      expect(ogg.audio).toContain('opus');
      expect(ogg.audio).toContain('flac');
    });

    it('AAC should only allow AAC codec', () => {
      const aac = CONTAINER_RULES.aac;
      expect(aac.video).toEqual([]);
      expect(aac.audio).toEqual(['aac']);
    });

    it('AIFF should allow PCM codecs', () => {
      const aiff = CONTAINER_RULES.aiff;
      expect(aiff.video).toEqual([]);
      expect(aiff.audio).toContain('pcm_s16le');
      expect(aiff.audio).toContain('pcm_s24le');
    });

    it('Opus should only allow Opus codec', () => {
      const opus = CONTAINER_RULES.opus;
      expect(opus.video).toEqual([]);
      expect(opus.audio).toEqual(['opus']);
    });
  });

  describe('New video container rules from Comet', () => {
    it('AVI should have correct codecs', () => {
      const avi = CONTAINER_RULES.avi;
      expect(avi.label).toBe('AVI');
      expect(avi.video).toContain('mpeg4');
      expect(avi.video).toContain('h264');
      expect(avi.audio).toContain('mp3');
      expect(avi.audio).toContain('pcm_s16le');
    });

    it('FLV should have correct codecs', () => {
      const flv = CONTAINER_RULES.flv;
      expect(flv.label).toBe('Flash Video FLV');
      expect(flv.video).toContain('flv1');
      expect(flv.video).toContain('h264');
      expect(flv.audio).toContain('mp3');
      expect(flv.audio).toContain('aac');
    });

    it('M4V should have correct codecs', () => {
      const m4v = CONTAINER_RULES.m4v;
      expect(m4v.label).toBe('M4V (iTunes Video)');
      expect(m4v.video).toContain('h264');
      expect(m4v.video).toContain('hevc');
      expect(m4v.audio).toContain('aac');
      expect(m4v.requiresFaststart).toBe(true);
    });

    it('TS should have correct codecs', () => {
      const ts = CONTAINER_RULES.ts;
      expect(ts.label).toBe('MPEG Transport Stream');
      expect(ts.video).toContain('h264');
      expect(ts.video).toContain('hevc');
      expect(ts.video).toContain('mpeg2video');
      expect(ts.audio).toContain('aac');
      expect(ts.audio).toContain('mp3');
      expect(ts.audio).toContain('ac3');
    });

    it('OGV should have correct codecs', () => {
      const ogv = CONTAINER_RULES.ogv;
      expect(ogv.label).toBe('Ogg Video');
      expect(ogv.video).toContain('theora');
      expect(ogv.video).toContain('vp8');
      expect(ogv.audio).toContain('vorbis');
      expect(ogv.audio).toContain('opus');
    });

    it('MPEG should have correct codecs', () => {
      const mpeg = CONTAINER_RULES.mpeg;
      expect(mpeg.label).toBe('MPEG Video');
      expect(mpeg.video).toContain('mpeg2video');
      expect(mpeg.video).toContain('mpeg4');
      expect(mpeg.audio).toContain('mp2');
      expect(mpeg.audio).toContain('mp3');
    });
  });

  describe('New image container rules from Comet', () => {
    it('BMP should have correct codecs', () => {
      const bmp = CONTAINER_RULES.bmp;
      expect(bmp.label).toBe('BMP');
      expect(bmp.video).toEqual(['bmp']);
      expect(bmp.audio).toEqual([]);
    });

    it('TIFF should have correct codecs', () => {
      const tiff = CONTAINER_RULES.tiff;
      expect(tiff.label).toBe('TIFF');
      expect(tiff.video).toEqual(['tiff']);
      expect(tiff.audio).toEqual([]);
    });
  });

  describe('Container rule completeness', () => {
    it('should have rules for all common containers', () => {
      const containers = Object.keys(CONTAINER_RULES);
      // Original containers
      expect(containers).toContain('mp4');
      expect(containers).toContain('webm');
      expect(containers).toContain('mov');
      expect(containers).toContain('mkv');
      expect(containers).toContain('gif');
      expect(containers).toContain('m4a');
      expect(containers).toContain('mp3');
      expect(containers).toContain('flac');
      expect(containers).toContain('wav');
      // New video containers from Comet
      expect(containers).toContain('avi');
      expect(containers).toContain('flv');
      expect(containers).toContain('m4v');
      expect(containers).toContain('ts');
      expect(containers).toContain('ogv');
      expect(containers).toContain('mpeg');
      // New audio containers from Comet
      expect(containers).toContain('ogg');
      expect(containers).toContain('aac');
      expect(containers).toContain('aiff');
      expect(containers).toContain('opus');
      // New image containers from Comet
      expect(containers).toContain('bmp');
      expect(containers).toContain('tiff');
    });

    it('should have valid structure for each container', () => {
      Object.values(CONTAINER_RULES).forEach((rule) => {
        expect(rule.label).toBeDefined();
        expect(rule.label.length).toBeGreaterThan(0);
        expect(rule.video).toBeDefined();
        expect(rule.audio).toBeDefined();
      });
    });

    it('should have consistent type for video rules', () => {
      Object.values(CONTAINER_RULES).forEach((rule) => {
        expect(typeof rule.video === 'string' || Array.isArray(rule.video)).toBe(true);
      });
    });

    it('should have consistent type for audio rules', () => {
      Object.values(CONTAINER_RULES).forEach((rule) => {
        expect(typeof rule.audio === 'string' || Array.isArray(rule.audio)).toBe(true);
      });
    });
  });

  describe('Codec validation logic', () => {
    it('should validate "any" allows all codecs conceptually', () => {
      const mkv = CONTAINER_RULES.mkv;
      expect(mkv.video).toBe('any');
      expect(mkv.audio).toBe('any');
    });

    it('should validate array-based codec lists are non-empty for functional containers', () => {
      const mp4 = CONTAINER_RULES.mp4;
      if (Array.isArray(mp4.video)) {
        expect(mp4.video.length).toBeGreaterThan(0);
      }
      if (Array.isArray(mp4.audio)) {
        expect(mp4.audio.length).toBeGreaterThan(0);
      }
    });

    it('should allow empty arrays for incompatible stream types', () => {
      const gif = CONTAINER_RULES.gif;
      expect(gif.audio).toEqual([]);
    });
  });

  describe('Subtitle handling', () => {
    it('should have subtitle rules for video containers', () => {
      expect(CONTAINER_RULES.mp4.subtitles).toBeDefined();
      expect(CONTAINER_RULES.webm.subtitles).toBeDefined();
      expect(CONTAINER_RULES.mov.subtitles).toBeDefined();
      expect(CONTAINER_RULES.mkv.subtitles).toBeDefined();
    });

    it('should not have subtitle rules for audio-only containers', () => {
      expect(CONTAINER_RULES.m4a.subtitles).toBeUndefined();
      expect(CONTAINER_RULES.mp3.subtitles).toBeUndefined();
      expect(CONTAINER_RULES.flac.subtitles).toBeUndefined();
      expect(CONTAINER_RULES.wav.subtitles).toBeUndefined();
    });

    it('should differentiate text and image subtitles', () => {
      const mp4Subs = CONTAINER_RULES.mp4.subtitles;
      expect(mp4Subs?.text).toBeDefined();
      expect(mp4Subs?.image).toBeDefined();
      expect(mp4Subs?.text).not.toBe(mp4Subs?.image);
    });
  });
});
