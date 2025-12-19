import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ref, nextTick } from 'vue';

import { useLanguagePreferences } from '../use-language-preferences';
import { Locale } from '@/lib/locale';

const useI18nMock = vi.fn();

vi.mock('vue-i18n', () => ({
  useI18n: () => useI18nMock(),
}));

function createStorageMock(): Storage {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
    get length() {
      return Object.keys(store).length;
    },
  } as Storage;
}

describe('useLanguagePreferences', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createStorageMock());
    useI18nMock.mockReset();
    localStorage.clear();
  });

  it('initializes with stored locale and syncs i18n state', async () => {
    localStorage.setItem('locale', Locale.FR);
    const i18n = { locale: ref(Locale.EN) };
    useI18nMock.mockReturnValue(i18n);

    const { currentLocale } = useLanguagePreferences();

    await nextTick();

    expect(currentLocale.value).toBe(Locale.FR);
    expect(i18n.locale.value).toBe(Locale.FR);
  });

  it('setLocale updates current locale, i18n locale, and storage', () => {
    const i18n = { locale: ref(Locale.EN) };
    useI18nMock.mockReturnValue(i18n);

    const { currentLocale, setLocale } = useLanguagePreferences();
    setLocale(Locale.ES);

    expect(currentLocale.value).toBe(Locale.ES);
    expect(i18n.locale.value).toBe(Locale.ES);
    expect(localStorage.getItem('locale')).toBe(Locale.ES);
  });

  it('persists direct ref mutations through watcher', async () => {
    const i18n = { locale: ref(Locale.EN) };
    useI18nMock.mockReturnValue(i18n);

    const { currentLocale } = useLanguagePreferences();
    currentLocale.value = Locale.DE;

    await vi.waitUntil(() => i18n.locale.value === Locale.DE, { timeout: 100 });

    expect(localStorage.getItem('locale')).toBe(Locale.DE);
  });
});
