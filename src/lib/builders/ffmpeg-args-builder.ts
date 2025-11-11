import type { AudioAction } from '../planners/audio-planner';
import { SUBTITLE_CONVERT_CODEC, type SubtitlePlanDecision } from '../planners/subtitle-planner';
import type { VideoAction, VideoTierResult } from '../planners/video-planner';
import { resolveVideoProfile } from '../planners/video-planner';
import type { Container, ProbeSummary, Preset, TierDefaults } from '../types';

const CONTAINER_TO_MUXER: Partial<Record<Container, string>> = {
  mp4: 'mp4',
  mov: 'mp4',
  m4a: 'mp4',
  mkv: 'matroska',
  webm: 'webm',
  gif: 'gif',
  mp3: 'mp3',
  flac: 'flac',
  wav: 'wav',
};

function muxerForContainer(container: Container): string | undefined {
  return CONTAINER_TO_MUXER[container];
}

/**
 * Video codec options for the builder
 */
export interface VideoOptions {
  bitrate?: number; // in kbps
  maxrate?: number; // in kbps
  bufsize?: number; // in kbps
  crf?: number;
  profile?: string;
  preset?: string;
}

/**
 * Audio codec options for the builder
 */
export interface AudioOptions {
  bitrate?: number; // in kbps
  sampleRate?: number;
  channels?: number;
}

/**
 * FFmpegArgsBuilder - Fluent interface for building FFmpeg command arguments
 *
 * Implements the Builder design pattern to construct complex FFmpeg command lines
 * in a readable and maintainable way.
 *
 * @example
 * ```ts
 * const args = new FFmpegArgsBuilder()
 *   .withInput('/path/to/input.mp4')
 *   .withProgress()
 *   .withVideoCodec('libx264', { crf: 23, preset: 'medium' })
 *   .withAudioCodec('aac', { bitrate: 128 })
 *   .withOutput('/path/to/output.mp4')
 *   .build();
 * ```
 */
export class FFmpegArgsBuilder {
  private args: string[] = [];
  private notes: string[] = [];

  withVideo(
    videoAction: VideoAction,
    videoTier: VideoTierResult<TierDefaults['video']>,
    preset: Preset,
    summary?: ProbeSummary,
  ): this {
    if (videoAction.action === 'drop') {
      this.args.push('-vn');
    } else {
      this.args.push('-map', '0:v:0?');
      if (videoAction.encoder) {
        this.args.push('-c:v', videoAction.encoder);
      }
      if (videoAction.action === 'transcode' && videoTier.value) {
        const tierDefaults = videoTier.value;
        if (typeof tierDefaults.bitrateK === 'number') {
          this.args.push('-b:v', `${tierDefaults.bitrateK}k`);
        }
        if (typeof tierDefaults.maxrateK === 'number') {
          this.args.push('-maxrate', `${tierDefaults.maxrateK}k`);
        }
        if (typeof tierDefaults.bufsizeK === 'number') {
          this.args.push('-bufsize', `${tierDefaults.bufsizeK}k`);
        }
        if (typeof tierDefaults.crf === 'number') {
          this.args.push('-crf', tierDefaults.crf.toString());
        }
        if (tierDefaults.profile) {
          const profile = resolveVideoProfile(preset.video.codec, tierDefaults.profile);
          if (profile) {
            this.args.push('-profile:v', profile);
          }
        }
        this.notes.push(`Video tier ${videoTier.tier} applied.`);
      }
      if (videoAction.action === 'transcode' && preset.video.copyColorMetadata && summary?.color) {
        const { primaries, trc, space } = summary.color;
        if (primaries) {
          this.args.push('-color_primaries', primaries);
        }
        if (trc) {
          this.args.push('-color_trc', trc);
        }
        if (space) {
          this.args.push('-colorspace', space);
        }
        this.notes.push('Video color metadata copied.');
      }
    }

    this.notes.push(videoAction.note);
    return this;
  }

  withAudio(
    audioAction: AudioAction,
    audioTier: VideoTierResult<TierDefaults['audio']>,
    preset: Preset,
  ): this {
    if (audioAction.action === 'drop') {
      this.args.push('-an');
    } else {
      this.args.push('-map', '0:a:0?');
      if (audioAction.encoder) {
        this.args.push('-c:a', audioAction.encoder);
      }
      if (audioAction.action === 'transcode') {
        const audioTierDefaults = audioTier.value;
        const bitrateK =
          (audioTierDefaults && typeof audioTierDefaults.bitrateK === 'number'
            ? audioTierDefaults.bitrateK
            : undefined) ?? preset.audio.bitrateK;
        if (typeof bitrateK === 'number') {
          this.args.push('-b:a', `${bitrateK}k`);
        }
        if (audioTierDefaults && typeof audioTierDefaults.quality === 'number') {
          this.args.push('-q:a', audioTierDefaults.quality.toString());
        }
        if (preset.audio.stereoOnly) {
          this.args.push('-ac', '2');
        }
        if (audioTierDefaults) {
          this.notes.push(`Audio tier ${audioTier.tier} applied.`);
        }
      }
    }

    this.notes.push(audioAction.note);
    return this;
  }

  withSubtitles(plan: SubtitlePlanDecision): this {
    const { mode, note, excludeImageStreams } = plan;

    if (mode === 'drop') {
      this.args.push('-sn');
    } else {
      this.args.push('-map', '0:s?');
      this.args.push('-c:s', mode === 'convert' ? SUBTITLE_CONVERT_CODEC : 'copy');

      if (mode === 'convert' && excludeImageStreams) {
        const imageSubtitleCodecs = [
          'hdmv_pgs_subtitle',
          'pgssub',
          'dvd_subtitle',
          'dvb_subtitle',
          'xsub',
        ];

        for (const codec of imageSubtitleCodecs) {
          this.args.push('-map', `-0:s:m:codec:${codec}?`);
        }
      }
    }

    this.notes.push(note);
    return this;
  }

  withContainer(container: Container, requiresFaststart: boolean): this {
    if (requiresFaststart) {
      this.args.push('-movflags', '+faststart');
      this.notes.push('Applied faststart for fragmented MP4/MOV.');
    }

    const muxer = muxerForContainer(container);
    if (muxer) {
      this.args.push('-f', muxer);
    }

    return this;
  }

  withCustomArgs(args: string[]): this {
    this.args.push(...args);
    return this;
  }

  addNote(note: string): this {
    this.notes.push(note);
    return this;
  }

  /**
   * Adds input file path
   * @param path - Path to input file
   */
  withInput(path: string): this {
    this.args.push('-i', path);
    return this;
  }

  /**
   * Enables progress reporting to stderr
   */
  withProgress(): this {
    if (!this.args.includes('-progress')) {
      this.args.push('-progress', 'pipe:2', '-nostats');
    }
    return this;
  }

  /**
   * Adds video codec with options
   * @param codec - Video codec name (e.g., 'libx264')
   * @param options - Video encoding options
   */
  withVideoCodec(codec: string, options?: VideoOptions): this {
    this.args.push('-c:v', codec);

    if (options) {
      if (options.bitrate !== undefined) {
        this.args.push('-b:v', `${options.bitrate}k`);
      }
      if (options.maxrate !== undefined) {
        this.args.push('-maxrate', `${options.maxrate}k`);
      }
      if (options.bufsize !== undefined) {
        this.args.push('-bufsize', `${options.bufsize}k`);
      }
      if (options.crf !== undefined) {
        this.args.push('-crf', options.crf.toString());
      }
      if (options.profile) {
        this.args.push('-profile:v', options.profile);
      }
      if (options.preset) {
        this.args.push('-preset', options.preset);
      }
    }

    return this;
  }

  /**
   * Adds audio codec with options
   * @param codec - Audio codec name (e.g., 'aac')
   * @param options - Audio encoding options
   */
  withAudioCodec(codec: string, options?: AudioOptions): this {
    this.args.push('-c:a', codec);

    if (options) {
      if (options.bitrate !== undefined) {
        this.args.push('-b:a', `${options.bitrate}k`);
      }
      if (options.sampleRate !== undefined) {
        this.args.push('-ar', options.sampleRate.toString());
      }
      if (options.channels !== undefined) {
        this.args.push('-ac', options.channels.toString());
      }
    }

    return this;
  }

  /**
   * Adds output file path
   * @param path - Path to output file
   */
  withOutput(path: string): this {
    this.args.push(path);
    return this;
  }

  /**
   * Overwrite output files without asking
   */
  withOverwrite(): this {
    if (!this.args.includes('-y')) {
      this.args.unshift('-y');
    }
    return this;
  }

  /**
   * Disable stdin interaction
   */
  withNoStdin(): this {
    if (!this.args.includes('-nostdin')) {
      this.args.push('-nostdin');
    }
    return this;
  }

  build(): { ffmpegArgs: string[]; notes: string[] } {
    return {
      ffmpegArgs: this.args,
      notes: this.notes,
    };
  }
}
