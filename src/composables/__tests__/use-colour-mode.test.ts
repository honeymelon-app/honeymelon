import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import { nextTick } from 'vue';

import { useColourMode } from '../use-colour-mode';

const originalMatchMedia = window.matchMedia;
let matchMediaSpy: ReturnType<typeof vi.fn>;

describe('useColourMode', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
    document.documentElement.removeAttribute('data-theme');

    const addEventListener = vi.fn();
    const removeEventListener = vi.fn();
    matchMediaSpy = vi.fn().mockReturnValue({
      matches: false,
      addEventListener,
      removeEventListener,
    });
    window.matchMedia = matchMediaSpy as unknown as typeof window.matchMedia;
  });

  afterAll(() => {
    window.matchMedia = originalMatchMedia;
  });

  it('defaults to system mode when no preference is stored', () => {
    const addEventListener = vi.fn();
    matchMediaSpy.mockReturnValue({
      matches: true,
      addEventListener,
    });

    const { mode, toggleMode } = useColourMode();
    expect(mode.value).toBe('system');

    toggleMode();
    expect(mode.value).toBe('light');
    expect(localStorage.getItem('color-mode')).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(document.documentElement.classList.contains('light')).toBe(true);
  });

  it('toggles between explicit light and dark modes when stored value exists', () => {
    localStorage.setItem('color-mode', 'dark');
    const addEventListener = vi.fn();
    matchMediaSpy.mockReturnValue({
      matches: false,
      addEventListener,
    });

    const { mode, toggleMode } = useColourMode();
    expect(mode.value).toBe('dark');

    toggleMode();
    expect(mode.value).toBe('light');
    expect(localStorage.getItem('color-mode')).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(document.documentElement.classList.contains('light')).toBe(true);
  });

  it('listens for system preference changes when using system mode', async () => {
    const addEventListener = vi.fn();
    matchMediaSpy.mockReturnValue({
      matches: true,
      addEventListener,
    });

    const { handleColorModeChange } = useColourMode();
    handleColorModeChange();
    await nextTick();

    expect(addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.classList.contains('light')).toBe(false);
  });
});
