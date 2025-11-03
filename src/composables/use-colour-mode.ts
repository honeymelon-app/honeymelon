import { ref, computed, watch } from 'vue';

export type ColorMode = 'light' | 'dark' | 'system';

/**
 * Colour mode composable to handle the colour mode of the application.
 */
export function useColourMode() {
  const storedMode = localStorage.getItem('color-mode') as ColorMode | null;
  const mode = ref<ColorMode>(storedMode || 'system');

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
    localStorage.setItem('color-mode', mode.value);
  };

  const handleColorModeChange = () => {
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
    localStorage.setItem('color-mode', newMode);
    updateHtmlAttributes(newMode);
  });

  return {
    mode: computed(() => mode.value),
    toggleMode,
    handleColorModeChange,
  };
}
