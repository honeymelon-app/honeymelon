import { invoke } from '@tauri-apps/api/core';

import type { CapabilitySnapshot, Preset } from './types';
import { PRESETS } from './presets';

const EMPTY_CAPABILITIES: CapabilitySnapshot = {
  videoEncoders: new Set<string>(),
  audioEncoders: new Set<string>(),
  formats: new Set<string>(),
  filters: new Set<string>(),
};

interface RawCapabilitySnapshot {
  videoEncoders: string[];
  audioEncoders: string[];
  formats: string[];
  filters: string[];
}

function isTauriRuntime(): boolean {
  return (
    typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window && typeof invoke === 'function'
  );
}

let capabilityPromise: Promise<CapabilitySnapshot> | undefined;

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

export function loadCapabilities(): Promise<CapabilitySnapshot> {
  if (!capabilityPromise) {
    capabilityPromise = fetchCapabilities();
  }
  return capabilityPromise;
}

export function presetIsAvailable(
  preset: Preset,
  capabilities: CapabilitySnapshot | undefined,
): boolean {
  if (!capabilities) {
    return true;
  }

  if (preset.remuxOnly) {
    return true;
  }

  if (
    preset.video.codec !== 'copy' &&
    preset.video.codec !== 'none' &&
    !capabilities.videoEncoders.has(preset.video.codec)
  ) {
    return false;
  }

  if (
    preset.audio.codec !== 'copy' &&
    preset.audio.codec !== 'none' &&
    !capabilities.audioEncoders.has(preset.audio.codec)
  ) {
    return false;
  }

  return true;
}

export function availablePresets(capabilities: CapabilitySnapshot | undefined): Preset[] {
  if (!capabilities) {
    return PRESETS;
  }

  return PRESETS.filter((preset) => presetIsAvailable(preset, capabilities));
}
