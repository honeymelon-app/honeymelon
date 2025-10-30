export type Container = 'mp4' | 'webm' | 'mov' | 'mkv' | 'gif' | 'm4a' | 'mp3' | 'flac' | 'wav';

export type VCodec = 'copy' | 'h264' | 'hevc' | 'vp9' | 'av1' | 'prores' | 'none';

export type ACodec =
  | 'copy'
  | 'aac'
  | 'alac'
  | 'mp3'
  | 'opus'
  | 'vorbis'
  | 'flac'
  | 'pcm_s16le'
  | 'none';

export type Tier = 'fast' | 'balanced' | 'high';

export type SubMode = 'keep' | 'convert' | 'burn' | 'drop';

export interface TierDefaults {
  video?: {
    bitrateK?: number;
    maxrateK?: number;
    bufsizeK?: number;
    crf?: number;
    profile?: string;
  };
  audio?: {
    bitrateK?: number;
    quality?: number;
  };
}

export interface Preset {
  id: string;
  label: string;
  container: Container;
  description?: string;
  video: {
    codec: VCodec;
    tiers?: Partial<Record<Tier, TierDefaults['video']>>;
    copyColorMetadata?: boolean;
  };
  audio: {
    codec: ACodec;
    bitrateK?: number;
    tiers?: Partial<Record<Tier, TierDefaults['audio']>>;
    stereoOnly?: boolean;
  };
  subs?: {
    mode: SubMode;
    burnInAvailable?: boolean;
    notes?: string;
  };
  remuxOnly?: boolean;
  experimental?: boolean;
  outputExtension?: string;
  tags?: string[];
}

export interface ProbeSummary {
  durationSec: number;
  width?: number;
  height?: number;
  fps?: number;
  vcodec?: string;
  acodec?: string;
  hasTextSubs?: boolean;
  hasImageSubs?: boolean;
  channels?: number;
  color?: { primaries?: string; trc?: string; space?: string };
}

export interface CapabilitySnapshot {
  videoEncoders: Set<string>;
  audioEncoders: Set<string>;
  formats: Set<string>;
  filters: Set<string>;
}

export interface PresetAvailability {
  presetId: string;
  available: boolean;
  reason?: string;
}

export interface JobProgress {
  processedSeconds?: number;
  ratio?: number;
  fps?: number;
  speed?: number;
  etaSeconds?: number;
}

export type JobState =
  | {
      status: 'queued';
      enqueuedAt: number;
    }
  | {
      status: 'probing';
      enqueuedAt: number;
      startedAt: number;
    }
  | {
      status: 'planning';
      enqueuedAt: number;
      startedAt: number;
      probeSummary: ProbeSummary;
    }
  | {
      status: 'running';
      enqueuedAt: number;
      startedAt: number;
      progress: JobProgress;
    }
  | {
      status: 'completed';
      enqueuedAt: number;
      startedAt: number;
      finishedAt: number;
      outputPath: string;
    }
  | {
      status: 'failed';
      enqueuedAt: number;
      startedAt: number;
      finishedAt: number;
      error: string;
      code?: string;
    }
  | {
      status: 'cancelled';
      enqueuedAt: number;
      startedAt: number;
      finishedAt: number;
    };
