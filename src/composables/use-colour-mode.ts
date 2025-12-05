import { ref, computed, watch } from 'vue';

import { loadState, saveState } from '@/lib/store';

export type ColorMode = 'light' | 'dark' | 'system';

/**
 * Colour mode composable to handle the colour mode of the application.
 */
export function useColourMode() {
  const mode = ref<ColorMode>('system');

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
    const finalMode = newMode === 'system' ? getSystemTheme() : newMode;
    document.documentElement.setAttribute('data-theme', finalMode);
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(finalMode);
  };

  const getSystemTheme = (): 'light' | 'dark' => {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  };

  const toggleMode = () => {
    if (mode.value === 'system') {
      mode.value = getSystemTheme() === 'dark' ? 'light' : 'dark';
    } else {
      mode.value = mode.value === 'light' ? 'dark' : 'light';
    }
    updateHtmlAttributes(mode.value);
    persistMode(mode.value);
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

    if (mode.value === 'system') {
      // Listen for system theme changes
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = () => {
        updateHtmlAttributes('system');
      };
      mediaQuery.addEventListener('change', listener);
      updateHtmlAttributes('system');
    } else {
      updateHtmlAttributes(mode.value);
    }
  };

  watch(mode, (newMode) => {
    persistMode(newMode);
    updateHtmlAttributes(newMode);
  });

  return {
    mode: computed(() => mode.value),
    toggleMode,
    handleColorModeChange,
  };
}
