import { computed, ref } from 'vue';

import { defineStore } from 'pinia';

const MIN_CONCURRENCY = 1;
const DEFAULT_CONCURRENCY = 2;

const DEFAULT_FILENAME_SEPARATOR = '-';

export const usePrefsStore = defineStore('prefs', () => {
  const preferredConcurrency = ref<number>(DEFAULT_CONCURRENCY);
  const outputDirectory = ref<string | null>(null);
  const includePresetInName = ref(true);
  const includeTierInName = ref(false);
  const filenameSeparator = ref(DEFAULT_FILENAME_SEPARATOR);

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
  };
});
