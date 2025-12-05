import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';

import { LIMITS, DEFAULTS } from '@/lib/constants';
import { loadState, saveState } from '@/lib/store';

const MIN_CONCURRENCY = LIMITS.MIN_CONCURRENCY;
const DEFAULT_CONCURRENCY = LIMITS.DEFAULT_CONCURRENCY;
const DEFAULT_FILENAME_SEPARATOR = DEFAULTS.FILENAME_SEPARATOR;

interface PrefsState {
  preferredConcurrency: number;
  outputDirectory: string | null;
  includePresetInName: boolean;
  includeTierInName: boolean;
  filenameSeparator: string;
}

export const usePrefsStore = defineStore('prefs', () => {
  const preferredConcurrency = ref<number>(DEFAULT_CONCURRENCY);
  const outputDirectory = ref<string | null>(null);
  const includePresetInName = ref(true);
  const includeTierInName = ref(false);
  const filenameSeparator = ref(DEFAULT_FILENAME_SEPARATOR);
  const isInitialized = ref(false);

  const maxConcurrency = computed(() =>
    Math.max(MIN_CONCURRENCY, Math.floor(preferredConcurrency.value || MIN_CONCURRENCY)),
  );

  const hasCustomOutputDirectory = computed(() => Boolean(outputDirectory.value?.trim().length));

  function setPreferredConcurrency(value: number) {
    preferredConcurrency.value = Math.max(MIN_CONCURRENCY, Math.floor(value || MIN_CONCURRENCY));
  }

  function setOutputDirectory(value: string | null) {
    const sanitized = value?.trim() ?? '';
    outputDirectory.value = sanitized.length ? sanitized : null;
  }

  function setIncludePresetInName(value: boolean) {
    includePresetInName.value = Boolean(value);
  }

  function setIncludeTierInName(value: boolean) {
    includeTierInName.value = Boolean(value);
  }

  function setFilenameSeparator(value: string) {
    filenameSeparator.value = value?.length ? value : DEFAULT_FILENAME_SEPARATOR;
  }

  async function init() {
    if (isInitialized.value) return;

    const state = await loadState<PrefsState>('prefs');
    if (state) {
      if (typeof state.preferredConcurrency === 'number') {
        preferredConcurrency.value = state.preferredConcurrency;
      }
      if (typeof state.outputDirectory === 'string' || state.outputDirectory === null) {
        outputDirectory.value = state.outputDirectory;
      }
      if (typeof state.includePresetInName === 'boolean') {
        includePresetInName.value = state.includePresetInName;
      }
      if (typeof state.includeTierInName === 'boolean') {
        includeTierInName.value = state.includeTierInName;
      }
      if (typeof state.filenameSeparator === 'string') {
        filenameSeparator.value = state.filenameSeparator;
      }
    }
    isInitialized.value = true;
  }

  // Persist changes
  watch(
    [
      preferredConcurrency,
      outputDirectory,
      includePresetInName,
      includeTierInName,
      filenameSeparator,
    ],
    () => {
      if (!isInitialized.value) return;
      saveState('prefs', {
        preferredConcurrency: preferredConcurrency.value,
        outputDirectory: outputDirectory.value,
        includePresetInName: includePresetInName.value,
        includeTierInName: includeTierInName.value,
        filenameSeparator: filenameSeparator.value,
      });
    },
  );

  // Initialize immediately
  init();

  return {
    preferredConcurrency,
    maxConcurrency,
    outputDirectory,
    hasCustomOutputDirectory,
    includePresetInName,
    includeTierInName,
    filenameSeparator,
    setPreferredConcurrency,
    setOutputDirectory,
    setIncludePresetInName,
    setIncludeTierInName,
    setFilenameSeparator,
    init,
  };
});
