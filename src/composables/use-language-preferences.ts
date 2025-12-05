import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import { loadState, saveState } from '@/lib/store';

export enum Locale {
  EN = 'en',
  ES = 'es',
  FR = 'fr',
  DE = 'de',
  RU = 'ru',
}

/**
 * A composable function to manage the language preferences of the application.
 *
 * @returns An object with the current locale and a function to set it.
 */
export function useLanguagePreferences() {
  const { locale } = useI18n();
  const currentLocale = ref<string>(Locale.EN);
  let isBootstrapping = true;

  const init = async () => {
    if (typeof localStorage !== 'undefined') {
      const localStorageLocale = localStorage.getItem('locale');
      if (localStorageLocale) {
        currentLocale.value = localStorageLocale;
      }
    }

    const storedLocale = await loadState<string>('locale');
    if (storedLocale) {
      currentLocale.value = storedLocale;
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('locale', storedLocale);
      }
    }

    isBootstrapping = false;
  };

  const setLocale = (newLocale: string) => {
    currentLocale.value = newLocale;
    locale.value = newLocale;
    saveState('locale', newLocale);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('locale', newLocale);
    }
  };

  watch(currentLocale, (newLocale) => {
    if (isBootstrapping) return;
    locale.value = newLocale;
    saveState('locale', newLocale);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('locale', newLocale);
    }
  });

  init();

  return {
    currentLocale,
    setLocale,
  };
}
