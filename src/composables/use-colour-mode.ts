import { ref, computed, watch, onUnmounted, getCurrentInstance } from 'vue';

import { loadState, saveState } from '@/lib/store';

export type ColorMode = 'light' | 'dark' | 'system';

/**
 * Colour mode composable to handle the colour mode of the application.
 */
export function useColourMode() {
  const mode = ref<ColorMode>('system');
  const systemMediaQuery = ref<ReturnType<typeof window.matchMedia> | null>(null);
  let systemMediaQueryListener: ((event: Event) => void) | null = null;

  const persistMode = (value: ColorMode) => {
    saveState('color-mode', value);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('color-mode', value);
    }
  };

  const loadInitialMode = () => {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('color-mode') as ColorMode | null;
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        mode.value = stored;
        return;
      }
    }
  };

  const updateHtmlAttributes = (newMode: ColorMode) => {
    if (typeof document === 'undefined') return;
    const finalMode = newMode === 'system' ? getSystemTheme() : newMode;
    document.documentElement.setAttribute('data-theme', finalMode);
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(finalMode);
  };

  const getSystemTheme = (): 'light' | 'dark' => {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  };

  const detachSystemThemeListener = () => {
    if (!systemMediaQuery.value || !systemMediaQueryListener) return;

    const mq = systemMediaQuery.value as ReturnType<typeof window.matchMedia> & {
      addListener?: (listener: (event: Event) => void) => void;
      removeListener?: (listener: (event: Event) => void) => void;
    };

    if (typeof mq.removeEventListener === 'function') {
      mq.removeEventListener('change', systemMediaQueryListener);
    } else if (typeof mq.removeListener === 'function') {
      mq.removeListener(systemMediaQueryListener);
    }

    systemMediaQueryListener = null;
    systemMediaQuery.value = null;
  };

  const ensureSystemThemeListener = () => {
    if (typeof window === 'undefined') return;
    if (systemMediaQuery.value && systemMediaQueryListener) return;

    systemMediaQuery.value = window.matchMedia('(prefers-color-scheme: dark)');
    systemMediaQueryListener = () => {
      // Only react to system theme changes when we're in system mode.
      if (mode.value === 'system') {
        updateHtmlAttributes('system');
      }
    };

    const mq = systemMediaQuery.value as ReturnType<typeof window.matchMedia> & {
      addListener?: (listener: (event: Event) => void) => void;
      removeListener?: (listener: (event: Event) => void) => void;
    };

    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', systemMediaQueryListener);
    } else if (typeof mq.addListener === 'function') {
      mq.addListener(systemMediaQueryListener);
    }
  };

  const toggleMode = () => {
    // Cycle through: light -> dark -> system -> light
    if (mode.value === 'light') {
      mode.value = 'dark';
    } else if (mode.value === 'dark') {
      mode.value = 'system';
    } else {
      mode.value = 'light';
    }
  };

  loadInitialMode();
  updateHtmlAttributes(mode.value);

  const handleColorModeChange = async () => {
    // Load saved state from Tauri store if present
    const savedMode = await loadState<ColorMode>('color-mode');
    if (savedMode) {
      mode.value = savedMode;
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('color-mode', savedMode);
      }
    }
  };

  watch(
    mode,
    (newMode) => {
      persistMode(newMode);
      updateHtmlAttributes(newMode);

      if (newMode === 'system') {
        ensureSystemThemeListener();
        updateHtmlAttributes('system');
      } else {
        detachSystemThemeListener();
      }
    },
    { flush: 'sync' },
  );

  if (mode.value === 'system') {
    ensureSystemThemeListener();
  }

  // Only register lifecycle hooks when used inside a component setup().
  if (getCurrentInstance()) {
    onUnmounted(() => {
      detachSystemThemeListener();
    });
  }

  return {
    mode: computed(() => mode.value),
    toggleMode,
    handleColorModeChange,
  };
}
