/**
 * Encoder Selection Strategy Pattern
 *
 * Provides flexible strategies for selecting the best encoder for a given codec.
 * This pattern allows runtime selection between hardware-accelerated and software-only
 * encoding based on system capabilities or user preferences.
 */

import type { CapabilitySnapshot, VCodec, ACodec } from '../types';

/**
 * Base interface for video encoder selection strategies
 */
export interface VideoEncoderSelectionStrategy {
  /**
   * Selects the best encoder for the given video codec
   * @param codec - Target video codec
   * @param capabilities - Optional capability snapshot for encoder availability
   * @returns Encoder name or null if codec doesn't require encoding
   */
  selectEncoder(codec: VCodec, capabilities?: CapabilitySnapshot): string | null;
}

/**
 * Base interface for audio encoder selection strategies
 */
export interface AudioEncoderSelectionStrategy {
  /**
   * Selects the best encoder for the given audio codec
   * @param codec - Target audio codec
   * @param capabilities - Optional capability snapshot for encoder availability
   * @returns Encoder name or null if codec doesn't require encoding
   */
  selectEncoder(codec: ACodec, capabilities?: CapabilitySnapshot): string | null;
}

/**
 * Hardware-first strategy: Prioritizes hardware-accelerated encoders
 *
 * This strategy attempts to use hardware encoders (like VideoToolbox) first,
 * falling back to software encoders only when hardware acceleration is unavailable.
 */
export class HardwareFirstVideoStrategy implements VideoEncoderSelectionStrategy {
  private readonly encoderMap: Record<VCodec, string[] | string | null> = {
    copy: 'copy',
    none: null,
    h264: ['h264_videotoolbox', 'libx264'],
    hevc: ['hevc_videotoolbox', 'libx265'],
    vp9: ['libvpx-vp9'],
    av1: ['libaom-av1', 'libsvtav1'],
    gif: 'gif',
    prores: ['prores_videotoolbox', 'prores_ks'],
    png: 'png',
    mjpeg: 'mjpeg',
    webp: 'libwebp',
  };

  selectEncoder(codec: VCodec, capabilities?: CapabilitySnapshot): string | null {
    const encoders = this.encoderMap[codec];

    if (encoders === null || encoders === 'copy') {
      return encoders;
    }

    if (typeof encoders === 'string') {
      return encoders;
    }

    // Try each encoder in priority order (hardware first)
    if (capabilities) {
      for (const encoder of encoders) {
        if (capabilities.videoEncoders.has(encoder)) {
          return encoder;
        }
      }
    }

    // Fallback to last (usually software) encoder
    return encoders[encoders.length - 1] ?? null;
  }
}

/**
 * Software-only strategy: Uses only software encoders
 *
 * This strategy always selects software encoders, bypassing hardware acceleration.
 * Useful for consistency across different systems or when hardware acceleration
 * causes issues.
 */
export class SoftwareOnlyVideoStrategy implements VideoEncoderSelectionStrategy {
  private readonly encoderMap: Record<VCodec, string | null> = {
    copy: 'copy',
    none: null,
    h264: 'libx264',
    hevc: 'libx265',
    vp9: 'libvpx-vp9',
    av1: 'libaom-av1',
    gif: 'gif',
    prores: 'prores_ks',
    png: 'png',
    mjpeg: 'mjpeg',
    webp: 'libwebp',
  };

  selectEncoder(codec: VCodec, _capabilities?: CapabilitySnapshot): string | null {
    return this.encoderMap[codec];
  }
}

/**
 * Hardware-first strategy for audio encoders
 *
 * Currently, most audio encoding doesn't have hardware acceleration,
 * so this primarily serves as a consistent interface.
 */
export class HardwareFirstAudioStrategy implements AudioEncoderSelectionStrategy {
  private readonly encoderMap: Record<ACodec, string[] | string | null> = {
    copy: 'copy',
    none: null,
    aac: ['aac'],
    opus: ['libopus'],
    vorbis: ['libvorbis'],
    mp3: ['libmp3lame'],
    flac: ['flac'],
    pcm_s16le: ['pcm_s16le'],
    alac: ['alac'],
  };

  selectEncoder(codec: ACodec, capabilities?: CapabilitySnapshot): string | null {
    const encoders = this.encoderMap[codec];

    if (encoders === null || encoders === 'copy') {
      return encoders;
    }

    if (typeof encoders === 'string') {
      return encoders;
    }

    // Try each encoder in priority order
    if (capabilities) {
      for (const encoder of encoders) {
        if (capabilities.audioEncoders.has(encoder)) {
          return encoder;
        }
      }
    }

    // Fallback to last encoder
    return encoders[encoders.length - 1] ?? null;
  }
}

/**
 * Software-only strategy for audio encoders
 */
export class SoftwareOnlyAudioStrategy implements AudioEncoderSelectionStrategy {
  private readonly encoderMap: Record<ACodec, string | null> = {
    copy: 'copy',
    none: null,
    aac: 'aac',
    opus: 'libopus',
    vorbis: 'libvorbis',
    mp3: 'libmp3lame',
    flac: 'flac',
    pcm_s16le: 'pcm_s16le',
    alac: 'alac',
  };

  selectEncoder(codec: ACodec, _capabilities?: CapabilitySnapshot): string | null {
    return this.encoderMap[codec];
  }
}

/**
 * Default encoder strategies (hardware-first)
 */
export const DEFAULT_VIDEO_STRATEGY = new HardwareFirstVideoStrategy();
export const DEFAULT_AUDIO_STRATEGY = new HardwareFirstAudioStrategy();
