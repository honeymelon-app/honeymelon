/**
 * FFmpeg capability detection and preset availability management.
 *
 * This module handles the detection of available FFmpeg capabilities on the user's system
 * and determines which conversion presets are supported based on the installed codecs,
 * formats, and filters. It provides a caching mechanism to avoid repeated capability checks.
 *
 * The capability system ensures that only presets compatible with the user's FFmpeg
 * installation are shown as available, preventing conversion failures due to missing
 * encoders or unsupported formats.
 */

import { invoke } from '@tauri-apps/api/core';

import { PRESETS } from './presets';
import type { CapabilitySnapshot, Preset, VCodec, ACodec, Container } from './types';

/**
 * Empty capability snapshot for fallback scenarios.
 *
 * Used when FFmpeg capabilities cannot be detected (e.g., in development
 * or when Tauri runtime is not available). Contains no available capabilities.
 */
const EMPTY_CAPABILITIES: CapabilitySnapshot = {
  videoEncoders: new Set<string>(),
  audioEncoders: new Set<string>(),
  formats: new Set<string>(),
  filters: new Set<string>(),
};
const DEFAULT_E2E_CAPABILITIES: CapabilitySnapshot = {
  videoEncoders: new Set(['h264', 'hevc']),
  audioEncoders: new Set(['aac']),
  formats: new Set(['mp4', 'm4a', 'mov']),
  filters: new Set(['scale', 'fps']),
};

/**
 * Raw capability data structure from Tauri backend.
 *
 * The backend returns arrays instead of Sets for serialization compatibility.
 * This interface represents the raw data before conversion to Sets.
 */
interface RawCapabilitySnapshot {
  /** Array of available video encoder names */
  videoEncoders: string[];
  /** Array of available audio encoder names */
  audioEncoders: string[];
  /** Array of supported container format names */
  formats: string[];
  /** Array of available filter names */
  filters: string[];
}

/**
 * Detects if running in Tauri runtime environment.
 *
 * Checks for the presence of Tauri's internal APIs to determine
 * if the code is running in the desktop application context.
 *
 * @returns true if running in Tauri, false otherwise
 */
function isTauriRuntime(): boolean {
  return (
    typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window && typeof invoke === 'function'
  );
}

/**
 * Cached promise for capability loading.
 *
 * Ensures that FFmpeg capabilities are only probed once per application session,
 * improving performance and reducing unnecessary system calls.
 */
let capabilityPromise: Promise<CapabilitySnapshot> | undefined;

/**
 * Fetches FFmpeg capabilities from the system.
 *
 * Invokes the Tauri backend to probe the installed FFmpeg binary for available
 * encoders, formats, and filters. Converts the raw array data to Sets for
 * efficient lookups.
 *
 * @returns Promise resolving to capability snapshot
 */
async function fetchCapabilities(): Promise<CapabilitySnapshot> {
  if (import.meta.env.VITE_E2E_SIMULATION === 'true') {
    return DEFAULT_E2E_CAPABILITIES;
  }

  if (!isTauriRuntime()) {
    console.warn('[capability] Returning empty capabilities; Tauri runtime not detected.');
    return EMPTY_CAPABILITIES;
  }

  try {
    const raw = await invoke<RawCapabilitySnapshot>('load_capabilities');
    return {
      videoEncoders: new Set(raw.videoEncoders ?? []),
      audioEncoders: new Set(raw.audioEncoders ?? []),
      formats: new Set(raw.formats ?? []),
      filters: new Set(raw.filters ?? []),
    };
  } catch (error) {
    console.error('[capability] Failed to read capabilities:', error);
    return EMPTY_CAPABILITIES;
  }
}

/**
 * Loads FFmpeg capabilities with caching.
 *
 * Returns a cached promise if capabilities have already been requested,
 * otherwise initiates a new capability detection process.
 *
 * @returns Promise resolving to capability snapshot
 */
export function loadCapabilities(): Promise<CapabilitySnapshot> {
  if (!capabilityPromise) {
    capabilityPromise = fetchCapabilities();
  }
  return capabilityPromise;
}

/**
 * Checks if a preset is available based on system capabilities.
 *
 * Determines whether a given preset can be used for conversion based on
 * the detected FFmpeg capabilities. Currently returns true for all presets
 * as a placeholder implementation.
 *
 * TODO: Implement actual capability checking logic based on preset requirements
 *
 * @param _preset - The preset to check (currently unused)
 * @param _capabilities - System capabilities (currently unused)
 * @returns true if preset is available, false otherwise
 */
export function presetIsAvailable(
  preset: Preset,
  capabilities: CapabilitySnapshot | undefined,
): boolean {
  // In non-Tauri or dev contexts we may not have capabilities; allow presets then.
  if (!capabilities) return true;

  const { videoEncoders, audioEncoders, formats } = capabilities;

  // If backend did not return formats, do not block presets by format.
  const formatOk = formats.size === 0 || containerSupported(preset.container, formats);
  if (!formatOk) {
    return false;
  }

  const videoCodec = preset.video?.codec;
  const audioCodec = preset.audio?.codec;

  const videoUnknown = videoEncoders.size === 0;
  const audioUnknown = audioEncoders.size === 0;

  const videoOk =
    videoCodec === 'none' ||
    videoCodec === 'copy' ||
    videoUnknown ||
    hasVideoEncoder(videoEncoders, videoCodec);

  const audioOk =
    audioCodec === 'none' ||
    audioCodec === 'copy' ||
    audioUnknown ||
    hasAudioEncoder(audioEncoders, audioCodec);

  return videoOk && audioOk;
}

/**
 * Returns all available presets for the current system.
 *
 * Filters the complete preset list based on system capabilities,
 * returning only presets that can be successfully executed.
 * Currently returns all presets as a placeholder implementation.
 *
 * TODO: Implement actual preset filtering based on capability checking
 *
 * @param _capabilities - System capabilities (currently unused)
 * @returns Array of available presets
 */
export function availablePresets(capabilities: CapabilitySnapshot | undefined): Preset[] {
  if (!capabilities) return PRESETS;
  return PRESETS.filter((preset) => presetIsAvailable(preset, capabilities));
}

function hasVideoEncoder(encoders: Set<string>, codec: VCodec): boolean {
  if (encoders.has(codec)) return true;

  const aliases: Record<VCodec, string[]> = {
    copy: [],
    none: [],
    h264: ['libx264', 'h264_videotoolbox', 'h264_nvenc'],
    hevc: ['libx265', 'hevc_videotoolbox', 'hevc_nvenc'],
    vp8: ['libvpx'],
    vp9: ['libvpx-vp9'],
    av1: ['libaom-av1', 'svtav1'],
    prores: ['prores', 'prores_ks', 'prores_aw'],
    gif: ['gif'],
    png: ['png'],
    mjpeg: ['mjpeg'],
    webp: ['libwebp', 'webp'],
    bmp: ['bmp'],
    tiff: ['tiff'],
    mpeg4: ['mpeg4'],
    flv1: ['flv1'],
    mpeg2video: ['mpeg2video'],
    theora: ['libtheora'],
  } as const;

  return (aliases[codec] ?? []).some((alias) => encoders.has(alias));
}

function hasAudioEncoder(encoders: Set<string>, codec: ACodec): boolean {
  if (encoders.has(codec)) return true;

  const aliases: Record<ACodec, string[]> = {
    copy: [],
    none: [],
    aac: ['libfdk_aac'],
    alac: ['alac'],
    mp3: ['libmp3lame', 'mp3'],
    opus: ['libopus', 'opus'],
    vorbis: ['libvorbis', 'vorbis'],
    flac: ['flac'],
    pcm_s16le: ['pcm_s16le'],
    pcm_s24le: ['pcm_s24le'],
    mp2: ['mp2'],
    ac3: ['ac3'],
  } as const;

  return (aliases[codec] ?? []).some((alias) => encoders.has(alias));
}

function containerSupported(container: Container, formats: Set<string>): boolean {
  // formats often use canonical names; include aliases per container
  if (formats.has(container)) return true;

  const aliases: Record<Container, string[]> = {
    // video
    mp4: ['mov', 'mp4'],
    mov: ['mov'],
    mkv: ['matroska', 'mkv'],
    webm: ['webm'],
    gif: ['gif'],
    avi: ['avi'],
    flv: ['flv'],
    m4v: ['mov', 'mp4', 'm4v'],
    ts: ['mpegts', 'ts'],
    ogv: ['ogg'],
    mpeg: ['mpeg'],
    // audio
    m4a: ['ipod', 'm4a', 'mov', 'mp4'],
    mp3: ['mp3'],
    flac: ['flac'],
    wav: ['wav'],
    ogg: ['ogg'],
    aac: ['adts', 'aac'],
    aiff: ['aiff'],
    opus: ['ogg', 'opus'],
    // image
    png: ['image2', 'png'],
    jpg: ['image2', 'mjpeg', 'jpg', 'jpeg'],
    webp: ['webp'],
    bmp: ['image2', 'bmp'],
    tiff: ['tiff', 'image2'],
  } as const;

  return (aliases[container] ?? []).some((alias) => formats.has(alias));
}
