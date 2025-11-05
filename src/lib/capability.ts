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

import type { CapabilitySnapshot, Preset } from './types';
import { PRESETS } from './presets';

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
  _preset: Preset,
  _capabilities: CapabilitySnapshot | undefined,
): boolean {
  return true;
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
export function availablePresets(_capabilities: CapabilitySnapshot | undefined): Preset[] {
  return PRESETS;
}
