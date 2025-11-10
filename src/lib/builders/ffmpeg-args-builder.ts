import type { Container, ProbeSummary, Preset, TierDefaults } from '../types';
import type { VideoAction, VideoTierResult } from '../planners/video-planner';
import { resolveVideoProfile } from '../planners/video-planner';
import type { AudioAction } from '../planners/audio-planner';
import { SUBTITLE_CONVERT_CODEC } from '../planners/subtitle-planner';

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

export class FFmpegArgsBuilder {
  private args: string[] = ['-progress', 'pipe:2', '-nostats'];
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

  withSubtitles(mode: 'drop' | 'copy' | 'convert', note: string): this {
    if (mode === 'drop') {
      this.args.push('-sn');
    } else {
      this.args.push('-map', '0:s?');
      this.args.push('-c:s', mode === 'convert' ? SUBTITLE_CONVERT_CODEC : 'copy');
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

  build(): { ffmpegArgs: string[]; notes: string[] } {
    return {
      ffmpegArgs: this.args,
      notes: this.notes,
    };
  }
}
