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
  let isBootstrapping = true;

  const applyLocale = (next: Locale) => {
    currentLocale.value = next;
    locale.value = next;
    saveState('locale', next);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('locale', next);
    }
  };

  const init = async () => {
    // LocalStorage takes precedence for responsiveness, but we still persist to store for parity
    const fromLocalStorage =
      typeof localStorage !== 'undefined' ? localStorage.getItem('locale') : null;
    const fromStore = await loadState<string>('locale');

    const resolved = normalizeLocale(fromLocalStorage ?? fromStore ?? DEFAULT_LOCALE);
    applyLocale(resolved);
    isBootstrapping = false;
  };

  const setLocale = (newLocale: string) => {
    applyLocale(normalizeLocale(newLocale));
  };

  watch(
    currentLocale,
    (next) => {
      if (isBootstrapping) return;
      applyLocale(normalizeLocale(next));
    },
    { flush: 'post' },
  );

  void init();

  return {
    currentLocale,
    setLocale,
  };
}
