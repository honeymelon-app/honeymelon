import { computed, ref, type ComputedRef, type Ref } from 'vue';

import { availablePresets, loadCapabilities } from '@/lib/capability';
import { DEFAULT_PRESET_ID } from '@/lib/presets';
import type { CapabilitySnapshot, Preset } from '@/lib/types';

/**
 * Encapsulates FFmpeg capability loading and preset availability state.
 * Provides a single place for the app to await capability detection before
 * enabling preset-dependent flows.
 */
export function useCapabilityGate(): {
  capabilities: Ref<CapabilitySnapshot | undefined>;
  defaultPresetId: Ref<string>;
  presetOptions: ComputedRef<Preset[]>;
  presetsReady: ComputedRef<boolean>;
  loadCapabilitySnapshot: () => Promise<void>;
} {
  const capabilities = ref<CapabilitySnapshot>();
  const defaultPresetId = ref(DEFAULT_PRESET_ID);

  const presetOptions = computed<Preset[]>(() => availablePresets(capabilities.value));
  const presetsReady = computed(() => presetOptions.value.length > 0);

  async function loadCapabilitySnapshot() {
    capabilities.value = await loadCapabilities();
  }

  return {
    capabilities,
    defaultPresetId,
    presetOptions,
    presetsReady,
    loadCapabilitySnapshot,
  };
}
