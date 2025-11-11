import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { useTauriEvents } from '../use-tauri-events';

const invokeMock = vi.fn();
const listenMock = vi.fn();

vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => invokeMock(...args),
}));

vi.mock('@tauri-apps/api/event', () => ({
  listen: (...args: unknown[]) => listenMock(...args),
}));

describe('useTauriEvents', () => {
  beforeEach(() => {
    invokeMock.mockReset();
    listenMock.mockReset();
    delete (window as unknown as { __TAURI_INTERNALS__?: Record<string, unknown> })
      .__TAURI_INTERNALS__;
  });

  afterEach(() => {
    delete (window as unknown as { __TAURI_INTERNALS__?: Record<string, unknown> })
      .__TAURI_INTERNALS__;
  });

  it('skips listener setup outside Tauri runtime', async () => {
    const options = {
      onDrop: vi.fn(),
      onDragEnter: vi.fn(),
      onDragLeave: vi.fn(),
      onMenuOpen: vi.fn(),
      onMenuAbout: vi.fn(),
    };

    const { setupEventListeners } = useTauriEvents(options);
    await setupEventListeners();

    expect(listenMock).not.toHaveBeenCalled();
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it('registers listeners, expands drop paths, and cleans up correctly', async () => {
    (window as unknown as { __TAURI_INTERNALS__?: Record<string, unknown> }).__TAURI_INTERNALS__ =
      {};

    const onDrop = vi.fn();
    const onDragEnter = vi.fn();
    const onDragLeave = vi.fn();
    const onMenuOpen = vi.fn().mockResolvedValue(undefined);
    const onMenuAbout = vi.fn();

    const unlistenSpies: Record<string, ReturnType<typeof vi.fn>> = {};
    const registeredHandlers: Record<string, (payload?: any) => unknown> = {};

    listenMock.mockImplementation((event: string, handler: (event: any) => unknown) => {
      registeredHandlers[event] = handler;
      const unlisten = vi.fn();
      unlistenSpies[event] = unlisten;
      return Promise.resolve(unlisten);
    });

    invokeMock.mockImplementation((command: string, payload?: { paths?: string[] }) => {
      if (command === 'expand_media_paths') {
        return Promise.resolve((payload?.paths ?? []).map((p) => p.trim()).filter(Boolean));
      }
      return Promise.resolve([]);
    });

    const { setupEventListeners, cleanupEventListeners } = useTauriEvents({
      onDrop,
      onDragEnter,
      onDragLeave,
      onMenuOpen,
      onMenuAbout,
    });

    await setupEventListeners();

    expect(Object.keys(registeredHandlers)).toEqual(
      expect.arrayContaining([
        'tauri://drag-drop',
        'tauri://drag-enter',
        'tauri://drag-leave',
        'menu:open',
        'menu:about',
      ]),
    );

    await registeredHandlers['tauri://drag-enter']();
    expect(onDragEnter).toHaveBeenCalledTimes(1);

    await registeredHandlers['tauri://drag-drop']({
      payload: { paths: [' file-a.mp4 ', 'file-b.mp4', ''] },
    });
    expect(invokeMock).toHaveBeenCalledWith('expand_media_paths', {
      paths: [' file-a.mp4 ', 'file-b.mp4'],
    });
    expect(onDrop).toHaveBeenCalledWith(['file-a.mp4', 'file-b.mp4']);
    expect(onDragLeave).toHaveBeenCalledTimes(1);

    await registeredHandlers['menu:open']();
    expect(onMenuOpen).toHaveBeenCalled();

    registeredHandlers['menu:about']();
    expect(onMenuAbout).toHaveBeenCalled();

    cleanupEventListeners();

    Object.values(unlistenSpies).forEach((spy) => {
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });
});
