import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import { Locale, SUPPORTED_LOCALES } from '@/lib/locale';
import { loadState, saveState } from '@/lib/store';

const DEFAULT_LOCALE = Locale.EN;

function normalizeLocale(candidate?: string | null): Locale {
  if (!candidate) {
    return DEFAULT_LOCALE;
  }
  const lower = candidate.toLowerCase();
  const match = SUPPORTED_LOCALES.find((locale) => locale === lower);
  return match ?? DEFAULT_LOCALE;
}

/**
 * A composable function to manage the language preferences of the application.
 *
 * @returns An object with the current locale and a function to set it.
 */
export function useLanguagePreferences() {
  const { locale } = useI18n();
  const currentLocale = ref<Locale>(DEFAULT_LOCALE);

  const applyLocale = (next: Locale) => {
    currentLocale.value = next;
    locale.value = next;
    saveState('locale', next);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('locale', next);
    }
  };

  const init = async () => {
    const initialLocale = currentLocale.value;

    // LocalStorage takes precedence for responsiveness, but we still persist to store for parity
    const fromLocalStorage =
      typeof localStorage !== 'undefined' ? localStorage.getItem('locale') : null;
    const fromStore = await loadState<string>('locale');

    const resolved = normalizeLocale(fromLocalStorage ?? fromStore ?? DEFAULT_LOCALE);
    const userMutatedDuringBootstrap = currentLocale.value !== initialLocale;
    const chosen = userMutatedDuringBootstrap ? currentLocale.value : resolved;
    applyLocale(normalizeLocale(chosen));
    // Ensure any mutations that happened during bootstrap are applied once bootstrapping is done.
    applyLocale(normalizeLocale(currentLocale.value));
  };

  const setLocale = (newLocale: string) => {
    applyLocale(normalizeLocale(newLocale));
  };

  watch(
    currentLocale,
    (next) => {
      applyLocale(normalizeLocale(next));
    },
    { flush: 'sync' },
  );

  void init();

  return {
    currentLocale,
    setLocale,
  };
}
