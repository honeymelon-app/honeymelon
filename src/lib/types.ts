/**
 * Core type definitions for Honeymelon media conversion application.
 *
 * This module defines all the TypeScript types and interfaces used throughout
 * the application for type safety and developer experience. It includes types
 * for media formats, conversion presets, job states, capabilities, and more.
 *
 * The types are organized to support the three main media kinds (video, audio, image)
 * and provide a comprehensive type system for the conversion pipeline.
 */

/**
 * Supported media container formats.
 *
 * These are the file formats that Honeymelon can read from and write to.
 * Each container type supports different codecs and features.
 */
export type Container =
  | 'mp4'
  | 'webm'
  | 'mov'
  | 'mkv'
  | 'gif'
  | 'm4a'
  | 'mp3'
  | 'flac'
  | 'wav'
  | 'png'
  | 'jpg'
  | 'webp';

/**
 * Media content types supported by the application.
 *
 * Used for UI filtering, file type detection, and conversion logic branching.
 */
export type MediaKind = 'video' | 'audio' | 'image';

/**
 * Supported video codec identifiers.
 *
 * These correspond to FFmpeg codec names and include both encoding codecs
 * and special values like 'copy' (stream copy) and 'none' (no video).
 */
export type VCodec =
  | 'copy'
  | 'h264'
  | 'hevc'
  | 'vp9'
  | 'av1'
  | 'prores'
  | 'gif'
  | 'png'
  | 'mjpeg'
  | 'webp'
  | 'none';

/**
 * Supported audio codec identifiers.
 *
 * These correspond to FFmpeg codec names and include both encoding codecs
 * and special values like 'copy' (stream copy) and 'none' (no audio).
 */
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

/**
 * Quality tiers for conversion presets.
 *
 * Defines the available quality levels that users can choose from,
 * balancing file size, quality, and encoding speed.
 */
export type Tier = 'fast' | 'balanced' | 'high';

/**
 * Subtitle handling modes.
 *
 * Determines how subtitle streams are processed during conversion:
 * - keep: Preserve original subtitle streams
 * - convert: Convert subtitles to a compatible format
 * - burn: Burn subtitles into the video stream
 * - drop: Remove subtitle streams entirely
 */
export type SubMode = 'keep' | 'convert' | 'burn' | 'drop';

/**
 * Default settings for different quality tiers.
 *
 * Defines the encoding parameters that vary by quality tier,
 * allowing presets to specify different settings for fast/balanced/high quality.
 */
export interface TierDefaults {
  /** Video encoding parameters that can vary by tier */
  video?: {
    /** Target bitrate in kilobits per second */
    bitrateK?: number;
    /** Maximum bitrate for variable bitrate encoding */
    maxrateK?: number;
    /** Buffer size for rate control */
    bufsizeK?: number;
    /** Constant Rate Factor (CRF) for quality-based encoding */
    crf?: number;
    /** Encoding profile (e.g., 'main', 'high') */
    profile?: string;
  };
  /** Audio encoding parameters that can vary by tier */
  audio?: {
    /** Target bitrate in kilobits per second */
    bitrateK?: number;
    /** Quality setting (codec-specific, e.g., VBR quality for MP3) */
    quality?: number;
  };
}

/**
 * Conversion preset configuration.
 *
 * Defines a complete conversion preset including codecs, containers,
 * quality tiers, and special handling for different media types.
 * Presets determine how media files are converted from one format to another.
 */
export interface Preset {
  /** Unique identifier for the preset */
  id: string;
  /** Human-readable label for UI display */
  label: string;
  /** Target container format */
  container: Container;
  /** Media type this preset is designed for */
  mediaKind: MediaKind;
  /** Source containers this preset can convert from */
  sourceContainers: Container[];
  /** Optional description for user guidance */
  description?: string;
  /** Video encoding configuration */
  video: {
    /** Video codec to use */
    codec: VCodec;
    /** Tier-specific video settings overrides */
    tiers?: Partial<Record<Tier, TierDefaults['video']>>;
    /** Whether to copy color metadata from source */
    copyColorMetadata?: boolean;
  };
  /** Audio encoding configuration */
  audio: {
    /** Audio codec to use */
    codec: ACodec;
    /** Default audio bitrate in kilobits per second */
    bitrateK?: number;
    /** Tier-specific audio settings overrides */
    tiers?: Partial<Record<Tier, TierDefaults['audio']>>;
    /** Whether to force stereo output (downmix if needed) */
    stereoOnly?: boolean;
  };
  /** Subtitle processing configuration */
  subs?: {
    /** How to handle subtitle streams */
    mode: SubMode;
    /** Whether burn-in is available for this preset */
    burnInAvailable?: boolean;
    /** Additional notes about subtitle handling */
    notes?: string;
  };
  /** Whether this preset only remuxes (no re-encoding) */
  remuxOnly?: boolean;
  /** Whether this preset uses experimental features */
  experimental?: boolean;
  /** File extension for output files */
  outputExtension?: string;
  /** Tags for categorization and filtering */
  tags?: string[];
}

/**
 * Summary of media file properties from probing.
 *
 * Contains metadata extracted from media files using FFmpeg probing,
 * used to determine appropriate conversion settings and display information.
 */
export interface ProbeSummary {
  /** Duration of the media in seconds */
  durationSec: number;
  /** Video width in pixels (video only) */
  width?: number;
  /** Video height in pixels (video only) */
  height?: number;
  /** Video frame rate (video only) */
  fps?: number;
  /** Video codec name */
  vcodec?: string;
  /** Audio codec name */
  acodec?: string;
  /** Whether the file contains text-based subtitles */
  hasTextSubs?: boolean;
  /** Whether the file contains image-based subtitles */
  hasImageSubs?: boolean;
  /** Number of audio channels */
  channels?: number;
  /** Color space information */
  color?: {
    /** Color primaries (e.g., 'bt709', 'bt2020') */
    primaries?: string;
    /** Transfer characteristics (gamma curve) */
    trc?: string;
    /** Color space (e.g., 'bt709', 'bt2020nc') */
    space?: string;
  };
}

/**
 * Snapshot of FFmpeg capabilities on the current system.
 *
 * Contains information about which codecs, formats, and filters are
 * available in the installed FFmpeg binary, used to determine preset availability.
 */
export interface CapabilitySnapshot {
  /** Set of available video encoder names */
  videoEncoders: Set<string>;
  /** Set of available audio encoder names */
  audioEncoders: Set<string>;
  /** Set of supported container format names */
  formats: Set<string>;
  /** Set of available filter names */
  filters: Set<string>;
}

/**
 * Availability status of a conversion preset.
 *
 * Indicates whether a preset can be used on the current system
 * and provides reasons if it's unavailable.
 */
export interface PresetAvailability {
  /** Preset identifier */
  presetId: string;
  /** Whether the preset is available for use */
  available: boolean;
  /** Reason why the preset is unavailable (if applicable) */
  reason?: string;
}

/**
 * Progress information for an active conversion job.
 *
 * Contains real-time progress metrics extracted from FFmpeg output,
 * used to display conversion progress to users.
 */
export interface JobProgress {
  /** Number of seconds processed so far */
  processedSeconds?: number;
  /** Completion ratio (0.0 to 1.0) */
  ratio?: number;
  /** Current encoding frame rate */
  fps?: number;
  /** Encoding speed multiplier (e.g., 2.0x speed) */
  speed?: number;
  /** Estimated time remaining in seconds */
  etaSeconds?: number;
}

/**
 * Custom error class for job-related errors.
 *
 * Extends the standard Error class with an optional error code
 * for programmatic error handling and user messaging.
 */
export class JobError extends Error {
  /** Optional error code for categorization */
  code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = 'JobError';
    this.code = code;
    // Restore prototype chain
    Object.setPrototypeOf(this, JobError.prototype);
  }
}

/**
 * Union type representing all possible states of a conversion job.
 *
 * Jobs progress through these states in order: queued → probing → planning → running → completed/failed/cancelled.
 * Each state contains relevant metadata for that stage of processing.
 */
export type JobState =
  | {
      /** Job is waiting in queue */
      status: 'queued';
      /** Timestamp when job was enqueued */
      enqueuedAt: number;
    }
  | {
      /** Job is being analyzed for metadata */
      status: 'probing';
      /** Timestamp when job was enqueued */
      enqueuedAt: number;
      /** Timestamp when probing started */
      startedAt: number;
    }
  | {
      /** Job parameters are being planned based on probe data */
      status: 'planning';
      /** Timestamp when job was enqueued */
      enqueuedAt: number;
      /** Timestamp when processing started */
      startedAt: number;
      /** Metadata extracted from the source file */
      probeSummary: ProbeSummary;
    }
  | {
      /** Job is actively being converted */
      status: 'running';
      /** Timestamp when job was enqueued */
      enqueuedAt: number;
      /** Timestamp when processing started */
      startedAt: number;
      /** Current conversion progress */
      progress: JobProgress;
    }
  | {
      /** Job completed successfully */
      status: 'completed';
      /** Timestamp when job was enqueued */
      enqueuedAt: number;
      /** Timestamp when processing started */
      startedAt: number;
      /** Timestamp when job finished */
      finishedAt: number;
      /** Path to the output file */
      outputPath: string;
    }
  | {
      /** Job failed with an error */
      status: 'failed';
      /** Timestamp when job was enqueued */
      enqueuedAt: number;
      /** Timestamp when processing started */
      startedAt: number;
      /** Timestamp when job finished */
      finishedAt: number;
      /** Error message describing the failure */
      error: string;
      /** Optional error code for categorization */
      code?: string;
    }
  | {
      /** Job was cancelled by user */
      status: 'cancelled';
      /** Timestamp when job was enqueued */
      enqueuedAt: number;
      /** Timestamp when processing started */
      startedAt: number;
      /** Timestamp when job finished */
      finishedAt: number;
    };
