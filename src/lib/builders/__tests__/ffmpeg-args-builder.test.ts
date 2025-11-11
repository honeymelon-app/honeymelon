import { describe, it, expect } from 'vitest';
import { FFmpegArgsBuilder } from '../ffmpeg-args-builder';
import type { AudioAction } from '../../planners/audio-planner';
import type { SubtitlePlanDecision } from '../../planners/subtitle-planner';
import type { VideoAction, VideoTierResult } from '../../planners/video-planner';
import type { Preset, ProbeSummary, TierDefaults } from '../../types';

describe('FFmpegArgsBuilder', () => {
  const basePreset: Preset = {
    id: 'test-preset',
    label: 'Test Preset',
    mediaKind: 'video',
    container: 'mp4',
    sourceContainers: ['mp4'],
    video: { codec: 'h264' },
    audio: { codec: 'aac', bitrateK: 128 },
    subs: { mode: 'keep' },
  };

  describe('withInput', () => {
    it('should add input file path', () => {
      const builder = new FFmpegArgsBuilder();
      const result = builder.withInput('/path/to/input.mp4').build();

      expect(result.ffmpegArgs).toContain('-i');
      expect(result.ffmpegArgs).toContain('/path/to/input.mp4');
    });
  });

  describe('withProgress', () => {
    it('should add progress reporting to stderr', () => {
      const builder = new FFmpegArgsBuilder();
      const result = builder.withProgress().build();

      expect(result.ffmpegArgs).toContain('-progress');
      expect(result.ffmpegArgs).toContain('pipe:2');
      expect(result.ffmpegArgs).toContain('-nostats');
    });

    it('should not duplicate progress args if called twice', () => {
      const builder = new FFmpegArgsBuilder();
      const result = builder.withProgress().withProgress().build();

      const progressCount = result.ffmpegArgs.filter((arg) => arg === '-progress').length;
      expect(progressCount).toBe(1);
    });
  });

  describe('withVideoCodec', () => {
    it('should add video codec without options', () => {
      const builder = new FFmpegArgsBuilder();
      const result = builder.withVideoCodec('libx264').build();

      expect(result.ffmpegArgs).toContain('-c:v');
      expect(result.ffmpegArgs).toContain('libx264');
    });

    it('should add video codec with all options', () => {
      const builder = new FFmpegArgsBuilder();
      const result = builder
        .withVideoCodec('libx264', {
          bitrate: 2000,
          maxrate: 3000,
          bufsize: 4000,
          crf: 23,
          profile: 'high',
          preset: 'medium',
        })
        .build();

      expect(result.ffmpegArgs).toContain('-c:v');
      expect(result.ffmpegArgs).toContain('libx264');
      expect(result.ffmpegArgs).toContain('-b:v');
      expect(result.ffmpegArgs).toContain('2000k');
      expect(result.ffmpegArgs).toContain('-maxrate');
      expect(result.ffmpegArgs).toContain('3000k');
      expect(result.ffmpegArgs).toContain('-bufsize');
      expect(result.ffmpegArgs).toContain('4000k');
      expect(result.ffmpegArgs).toContain('-crf');
      expect(result.ffmpegArgs).toContain('23');
      expect(result.ffmpegArgs).toContain('-profile:v');
      expect(result.ffmpegArgs).toContain('high');
      expect(result.ffmpegArgs).toContain('-preset');
      expect(result.ffmpegArgs).toContain('medium');
    });

    it('should handle partial video options', () => {
      const builder = new FFmpegArgsBuilder();
      const result = builder
        .withVideoCodec('libx265', {
          crf: 28,
          preset: 'slow',
        })
        .build();

      expect(result.ffmpegArgs).toContain('-crf');
      expect(result.ffmpegArgs).toContain('28');
      expect(result.ffmpegArgs).toContain('-preset');
      expect(result.ffmpegArgs).toContain('slow');
      expect(result.ffmpegArgs).not.toContain('-b:v');
    });
  });

  describe('withAudioCodec', () => {
    it('should add audio codec without options', () => {
      const builder = new FFmpegArgsBuilder();
      const result = builder.withAudioCodec('aac').build();

      expect(result.ffmpegArgs).toContain('-c:a');
      expect(result.ffmpegArgs).toContain('aac');
    });

    it('should add audio codec with all options', () => {
      const builder = new FFmpegArgsBuilder();
      const result = builder
        .withAudioCodec('opus', {
          bitrate: 128,
          sampleRate: 48000,
          channels: 2,
        })
        .build();

      expect(result.ffmpegArgs).toContain('-c:a');
      expect(result.ffmpegArgs).toContain('opus');
      expect(result.ffmpegArgs).toContain('-b:a');
      expect(result.ffmpegArgs).toContain('128k');
      expect(result.ffmpegArgs).toContain('-ar');
      expect(result.ffmpegArgs).toContain('48000');
      expect(result.ffmpegArgs).toContain('-ac');
      expect(result.ffmpegArgs).toContain('2');
    });

    it('should handle partial audio options', () => {
      const builder = new FFmpegArgsBuilder();
      const result = builder
        .withAudioCodec('libmp3lame', {
          bitrate: 192,
        })
        .build();

      expect(result.ffmpegArgs).toContain('-b:a');
      expect(result.ffmpegArgs).toContain('192k');
      expect(result.ffmpegArgs).not.toContain('-ar');
      expect(result.ffmpegArgs).not.toContain('-ac');
    });
  });

  describe('withOutput', () => {
    it('should add output file path', () => {
      const builder = new FFmpegArgsBuilder();
      const result = builder.withOutput('/path/to/output.mp4').build();

      expect(result.ffmpegArgs).toContain('/path/to/output.mp4');
      // Output should be last
      expect(result.ffmpegArgs[result.ffmpegArgs.length - 1]).toBe('/path/to/output.mp4');
    });
  });

  describe('withOverwrite', () => {
    it('should add -y flag', () => {
      const builder = new FFmpegArgsBuilder();
      const result = builder.withOverwrite().build();

      expect(result.ffmpegArgs).toContain('-y');
      // -y should be at the beginning
      expect(result.ffmpegArgs[0]).toBe('-y');
    });

    it('should not duplicate -y flag if called twice', () => {
      const builder = new FFmpegArgsBuilder();
      const result = builder.withOverwrite().withOverwrite().build();

      const yCount = result.ffmpegArgs.filter((arg) => arg === '-y').length;
      expect(yCount).toBe(1);
    });
  });

  describe('withNoStdin', () => {
    it('should add -nostdin flag', () => {
      const builder = new FFmpegArgsBuilder();
      const result = builder.withNoStdin().build();

      expect(result.ffmpegArgs).toContain('-nostdin');
    });

    it('should not duplicate -nostdin flag if called twice', () => {
      const builder = new FFmpegArgsBuilder();
      const result = builder.withNoStdin().withNoStdin().build();

      const nostdinCount = result.ffmpegArgs.filter((arg) => arg === '-nostdin').length;
      expect(nostdinCount).toBe(1);
    });
  });

  describe('withVideo', () => {
    it('should drop video with -vn when action is drop', () => {
      const builder = new FFmpegArgsBuilder();
      const videoAction: VideoAction = {
        action: 'drop',
        encoder: null,
        note: 'Video dropped',
      };
      const tierResult: VideoTierResult<TierDefaults['video']> = {
        tier: 'balanced',
        usedFallback: false,
        value: undefined,
      };

      const result = builder.withVideo(videoAction, tierResult, basePreset).build();

      expect(result.ffmpegArgs).toContain('-vn');
      expect(result.notes).toContain('Video dropped');
    });

    it('should copy video codec', () => {
      const builder = new FFmpegArgsBuilder();
      const videoAction: VideoAction = {
        action: 'copy',
        encoder: 'copy',
        note: 'Video copied',
      };
      const tierResult: VideoTierResult<TierDefaults['video']> = {
        tier: 'balanced',
        usedFallback: false,
        value: undefined,
      };

      const result = builder.withVideo(videoAction, tierResult, basePreset).build();

      expect(result.ffmpegArgs).toContain('-map');
      expect(result.ffmpegArgs).toContain('0:v:0?');
      expect(result.ffmpegArgs).toContain('-c:v');
      expect(result.ffmpegArgs).toContain('copy');
      expect(result.notes).toContain('Video copied');
    });

    it('should transcode video with tier defaults', () => {
      const builder = new FFmpegArgsBuilder();
      const videoAction: VideoAction = {
        action: 'transcode',
        encoder: 'libx264',
        note: 'Video transcoded',
      };
      const tierResult: VideoTierResult<TierDefaults['video']> = {
        tier: 'balanced',
        value: {
          bitrateK: 2000,
          maxrateK: 3000,
          bufsizeK: 4000,
          crf: 23,
          profile: 'high',
        },
        usedFallback: false,
      };

      const result = builder.withVideo(videoAction, tierResult, basePreset).build();

      expect(result.ffmpegArgs).toContain('-c:v');
      expect(result.ffmpegArgs).toContain('libx264');
      expect(result.ffmpegArgs).toContain('-b:v');
      expect(result.ffmpegArgs).toContain('2000k');
      expect(result.ffmpegArgs).toContain('-maxrate');
      expect(result.ffmpegArgs).toContain('3000k');
      expect(result.ffmpegArgs).toContain('-bufsize');
      expect(result.ffmpegArgs).toContain('4000k');
      expect(result.ffmpegArgs).toContain('-crf');
      expect(result.ffmpegArgs).toContain('23');
      expect(result.ffmpegArgs).toContain('-profile:v');
      expect(result.ffmpegArgs).toContain('high');
      expect(result.notes).toContain('Video tier balanced applied.');
      expect(result.notes).toContain('Video transcoded');
    });

    it('should copy color metadata when enabled', () => {
      const builder = new FFmpegArgsBuilder();
      const videoAction: VideoAction = {
        action: 'transcode',
        encoder: 'libx265',
        note: 'Video transcoded',
      };
      const tierResult: VideoTierResult<TierDefaults['video']> = {
        tier: 'high',
        usedFallback: false,
        value: {
          crf: 18,
        },
      };
      const preset: Preset = {
        ...basePreset,
        video: {
          codec: 'hevc',
          copyColorMetadata: true,
        },
      };
      const summary: ProbeSummary = {
        durationSec: 120,
        vcodec: 'h264',
        color: {
          primaries: 'bt709',
          trc: 'bt709',
          space: 'bt709',
        },
      };

      const result = builder.withVideo(videoAction, tierResult, preset, summary).build();

      expect(result.ffmpegArgs).toContain('-color_primaries');
      expect(result.ffmpegArgs).toContain('bt709');
      expect(result.ffmpegArgs).toContain('-color_trc');
      expect(result.ffmpegArgs).toContain('bt709');
      expect(result.ffmpegArgs).toContain('-colorspace');
      expect(result.ffmpegArgs).toContain('bt709');
      expect(result.notes).toContain('Video color metadata copied.');
    });

    it('should handle partial color metadata', () => {
      const builder = new FFmpegArgsBuilder();
      const videoAction: VideoAction = {
        action: 'transcode',
        encoder: 'libx265',
        note: 'Video transcoded',
      };
      const tierResult: VideoTierResult<TierDefaults['video']> = {
        tier: 'high',
        usedFallback: false,
        value: { crf: 18 },
      };
      const preset: Preset = {
        ...basePreset,
        video: {
          codec: 'hevc',
          copyColorMetadata: true,
        },
      };
      const summary: ProbeSummary = {
        durationSec: 120,
        vcodec: 'h264',
        color: {
          primaries: 'bt709',
        },
      };

      const result = builder.withVideo(videoAction, tierResult, preset, summary).build();

      expect(result.ffmpegArgs).toContain('-color_primaries');
      expect(result.ffmpegArgs).toContain('bt709');
      expect(result.ffmpegArgs).not.toContain('-color_trc');
      expect(result.ffmpegArgs).not.toContain('-colorspace');
    });

    it('should handle ProRes profile normalization', () => {
      const builder = new FFmpegArgsBuilder();
      const videoAction: VideoAction = {
        action: 'transcode',
        encoder: 'prores_ks',
        note: 'Video transcoded',
      };
      const tierResult: VideoTierResult<TierDefaults['video']> = {
        tier: 'high',
        usedFallback: false,
        value: {
          profile: '422hq',
        },
      };
      const preset: Preset = {
        ...basePreset,
        video: { codec: 'prores' },
      };

      const result = builder.withVideo(videoAction, tierResult, preset).build();

      expect(result.ffmpegArgs).toContain('-profile:v');
      expect(result.ffmpegArgs).toContain('hq');
    });
  });

  describe('withAudio', () => {
    it('should drop audio with -an when action is drop', () => {
      const builder = new FFmpegArgsBuilder();
      const audioAction: AudioAction = {
        action: 'drop',
        encoder: null,
        note: 'Audio dropped',
      };
      const tierResult: VideoTierResult<TierDefaults['audio']> = {
        tier: 'balanced',
        usedFallback: false,
        value: undefined,
      };

      const result = builder.withAudio(audioAction, tierResult, basePreset).build();

      expect(result.ffmpegArgs).toContain('-an');
      expect(result.notes).toContain('Audio dropped');
    });

    it('should copy audio codec', () => {
      const builder = new FFmpegArgsBuilder();
      const audioAction: AudioAction = {
        action: 'copy',
        encoder: 'copy',
        note: 'Audio copied',
      };
      const tierResult: VideoTierResult<TierDefaults['audio']> = {
        tier: 'balanced',
        value: undefined,
        usedFallback: false,
      };

      const result = builder.withAudio(audioAction, tierResult, basePreset).build();

      expect(result.ffmpegArgs).toContain('-map');
      expect(result.ffmpegArgs).toContain('0:a:0?');
      expect(result.ffmpegArgs).toContain('-c:a');
      expect(result.ffmpegArgs).toContain('copy');
      expect(result.notes).toContain('Audio copied');
    });

    it('should transcode audio with tier defaults', () => {
      const builder = new FFmpegArgsBuilder();
      const audioAction: AudioAction = {
        action: 'transcode',
        encoder: 'aac',
        note: 'Audio transcoded',
      };
      const tierResult: VideoTierResult<TierDefaults['audio']> = {
        tier: 'balanced',
        value: {
          bitrateK: 192,
        },
        usedFallback: false,
      };

      const result = builder.withAudio(audioAction, tierResult, basePreset).build();

      expect(result.ffmpegArgs).toContain('-c:a');
      expect(result.ffmpegArgs).toContain('aac');
      expect(result.ffmpegArgs).toContain('-b:a');
      expect(result.ffmpegArgs).toContain('192k');
      expect(result.notes).toContain('Audio tier balanced applied.');
      expect(result.notes).toContain('Audio transcoded');
    });

    it('should use preset bitrate fallback when tier has no bitrate', () => {
      const builder = new FFmpegArgsBuilder();
      const audioAction: AudioAction = {
        action: 'transcode',
        encoder: 'aac',
        note: 'Audio transcoded',
      };
      const tierResult: VideoTierResult<TierDefaults['audio']> = {
        tier: 'balanced',
        usedFallback: false,
        value: {},
      };

      const result = builder.withAudio(audioAction, tierResult, basePreset).build();

      expect(result.ffmpegArgs).toContain('-b:a');
      expect(result.ffmpegArgs).toContain('128k'); // From basePreset.audio.bitrateK
    });

    it('should apply quality option when present', () => {
      const builder = new FFmpegArgsBuilder();
      const audioAction: AudioAction = {
        action: 'transcode',
        encoder: 'libvorbis',
        note: 'Audio transcoded',
      };
      const tierResult: VideoTierResult<TierDefaults['audio']> = {
        tier: 'high',
        usedFallback: false,
        value: {
          quality: 8,
        },
      };

      const result = builder.withAudio(audioAction, tierResult, basePreset).build();

      expect(result.ffmpegArgs).toContain('-q:a');
      expect(result.ffmpegArgs).toContain('8');
    });

    it('should apply stereoOnly when enabled', () => {
      const builder = new FFmpegArgsBuilder();
      const audioAction: AudioAction = {
        action: 'transcode',
        encoder: 'aac',
        note: 'Audio transcoded',
      };
      const tierResult: VideoTierResult<TierDefaults['audio']> = {
        tier: 'balanced',
        usedFallback: false,
        value: {
          bitrateK: 128,
        },
      };
      const preset: Preset = {
        ...basePreset,
        audio: {
          codec: 'aac',
          stereoOnly: true,
        },
      };

      const result = builder.withAudio(audioAction, tierResult, preset).build();

      expect(result.ffmpegArgs).toContain('-ac');
      expect(result.ffmpegArgs).toContain('2');
    });
  });

  describe('withSubtitles', () => {
    it('should drop subtitles with -sn', () => {
      const builder = new FFmpegArgsBuilder();
      const plan: SubtitlePlanDecision = {
        mode: 'drop',
        note: 'Subtitles dropped',
      };

      const result = builder.withSubtitles(plan).build();

      expect(result.ffmpegArgs).toContain('-sn');
      expect(result.notes).toContain('Subtitles dropped');
    });

    it('should copy subtitles', () => {
      const builder = new FFmpegArgsBuilder();
      const plan: SubtitlePlanDecision = {
        mode: 'copy',
        note: 'Subtitles copied',
      };

      const result = builder.withSubtitles(plan).build();

      expect(result.ffmpegArgs).toContain('-map');
      expect(result.ffmpegArgs).toContain('0:s?');
      expect(result.ffmpegArgs).toContain('-c:s');
      expect(result.ffmpegArgs).toContain('copy');
      expect(result.notes).toContain('Subtitles copied');
    });

    it('should convert subtitles to mov_text', () => {
      const builder = new FFmpegArgsBuilder();
      const plan: SubtitlePlanDecision = {
        mode: 'convert',
        note: 'Subtitles converted',
      };

      const result = builder.withSubtitles(plan).build();

      expect(result.ffmpegArgs).toContain('-c:s');
      expect(result.ffmpegArgs).toContain('mov_text');
      expect(result.notes).toContain('Subtitles converted');
    });

    it('should exclude image streams when converting', () => {
      const builder = new FFmpegArgsBuilder();
      const plan: SubtitlePlanDecision = {
        mode: 'convert',
        note: 'Subtitles converted',
        excludeImageStreams: true,
      };

      const result = builder.withSubtitles(plan).build();

      expect(result.ffmpegArgs).toContain('-map');
      expect(result.ffmpegArgs).toContain('-0:s:m:codec:hdmv_pgs_subtitle?');
      expect(result.ffmpegArgs).toContain('-0:s:m:codec:pgssub?');
      expect(result.ffmpegArgs).toContain('-0:s:m:codec:dvd_subtitle?');
      expect(result.ffmpegArgs).toContain('-0:s:m:codec:dvb_subtitle?');
      expect(result.ffmpegArgs).toContain('-0:s:m:codec:xsub?');
    });
  });

  describe('withContainer', () => {
    it('should add faststart for MP4', () => {
      const builder = new FFmpegArgsBuilder();
      const result = builder.withContainer('mp4', true).build();

      expect(result.ffmpegArgs).toContain('-movflags');
      expect(result.ffmpegArgs).toContain('+faststart');
      expect(result.ffmpegArgs).toContain('-f');
      expect(result.ffmpegArgs).toContain('mp4');
      expect(result.notes).toContain('Applied faststart for fragmented MP4/MOV.');
    });

    it('should not add faststart when not required', () => {
      const builder = new FFmpegArgsBuilder();
      const result = builder.withContainer('mp4', false).build();

      expect(result.ffmpegArgs).not.toContain('-movflags');
      expect(result.ffmpegArgs).toContain('-f');
      expect(result.ffmpegArgs).toContain('mp4');
    });

    it('should map container to muxer for mkv', () => {
      const builder = new FFmpegArgsBuilder();
      const result = builder.withContainer('mkv', false).build();

      expect(result.ffmpegArgs).toContain('-f');
      expect(result.ffmpegArgs).toContain('matroska');
    });

    it('should map container to muxer for webm', () => {
      const builder = new FFmpegArgsBuilder();
      const result = builder.withContainer('webm', false).build();

      expect(result.ffmpegArgs).toContain('-f');
      expect(result.ffmpegArgs).toContain('webm');
    });

    it('should map container to muxer for mov', () => {
      const builder = new FFmpegArgsBuilder();
      const result = builder.withContainer('mov', false).build();

      expect(result.ffmpegArgs).toContain('-f');
      expect(result.ffmpegArgs).toContain('mp4');
    });

    it('should handle containers without explicit muxer', () => {
      const builder = new FFmpegArgsBuilder();
      const result = builder.withContainer('unknown' as any, false).build();

      // Should not add -f flag for unknown containers
      expect(result.ffmpegArgs).not.toContain('-f');
    });
  });

  describe('withCustomArgs', () => {
    it('should add custom arguments', () => {
      const builder = new FFmpegArgsBuilder();
      const result = builder
        .withCustomArgs(['-filter:v', 'scale=1280:720', '-threads', '4'])
        .build();

      expect(result.ffmpegArgs).toContain('-filter:v');
      expect(result.ffmpegArgs).toContain('scale=1280:720');
      expect(result.ffmpegArgs).toContain('-threads');
      expect(result.ffmpegArgs).toContain('4');
    });
  });

  describe('addNote', () => {
    it('should add custom note', () => {
      const builder = new FFmpegArgsBuilder();
      const result = builder.addNote('Custom note added').build();

      expect(result.notes).toContain('Custom note added');
    });
  });

  describe('Fluent interface', () => {
    it('should chain multiple methods together', () => {
      const builder = new FFmpegArgsBuilder();
      const result = builder
        .withOverwrite()
        .withInput('/input.mp4')
        .withProgress()
        .withVideoCodec('libx264', { crf: 23 })
        .withAudioCodec('aac', { bitrate: 128 })
        .withNoStdin()
        .withOutput('/output.mp4')
        .build();

      expect(result.ffmpegArgs[0]).toBe('-y');
      expect(result.ffmpegArgs).toContain('-i');
      expect(result.ffmpegArgs).toContain('/input.mp4');
      expect(result.ffmpegArgs).toContain('-progress');
      expect(result.ffmpegArgs).toContain('-c:v');
      expect(result.ffmpegArgs).toContain('libx264');
      expect(result.ffmpegArgs).toContain('-crf');
      expect(result.ffmpegArgs).toContain('23');
      expect(result.ffmpegArgs).toContain('-c:a');
      expect(result.ffmpegArgs).toContain('aac');
      expect(result.ffmpegArgs).toContain('-b:a');
      expect(result.ffmpegArgs).toContain('128k');
      expect(result.ffmpegArgs).toContain('-nostdin');
      expect(result.ffmpegArgs[result.ffmpegArgs.length - 1]).toBe('/output.mp4');
    });
  });

  describe('build', () => {
    it('should return ffmpegArgs and notes', () => {
      const builder = new FFmpegArgsBuilder();
      builder.withInput('/input.mp4');
      builder.addNote('Test note');

      const result = builder.build();

      expect(result).toHaveProperty('ffmpegArgs');
      expect(result).toHaveProperty('notes');
      expect(Array.isArray(result.ffmpegArgs)).toBe(true);
      expect(Array.isArray(result.notes)).toBe(true);
    });
  });
});
