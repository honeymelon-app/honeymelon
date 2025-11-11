import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { ref, onMounted, onUnmounted } from 'vue';

interface UseTauriEventsOptions {
  onDrop?: (paths: string[]) => void | Promise<void>;
  onDragEnter?: () => void;
  onDragLeave?: () => void;
  onMenuOpen?: () => void | Promise<void>;
  onMenuAbout?: () => void;
}

export function useTauriEvents(options: UseTauriEventsOptions = {}) {
  const { onDrop, onDragEnter, onDragLeave, onMenuOpen, onMenuAbout } = options;

  const unlistenDrop = ref<UnlistenFn | null>(null);
  const unlistenEnter = ref<UnlistenFn | null>(null);
  const unlistenLeave = ref<UnlistenFn | null>(null);
  const unlistenMenuOpen = ref<UnlistenFn | null>(null);
  const unlistenMenuAbout = ref<UnlistenFn | null>(null);

  function isTauriRuntime(): boolean {
    return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
  }

  async function setupEventListeners() {
    if (!isTauriRuntime()) return;

    if (onDrop) {
      const handleDropPaths = async (candidatePaths: unknown) => {
        const raw = Array.isArray(candidatePaths)
          ? candidatePaths.filter((p): p is string => typeof p === 'string' && p.trim().length > 0)
          : [];
        if (!raw.length) {
          return;
        }

        let expanded = raw;
        try {
          expanded = await invoke<string[]>('expand_media_paths', { paths: raw });
        } catch (error) {
          console.warn('[tauri-events] Failed to expand dropped paths via backend:', error);
        }

        if (!expanded.length) {
          return;
        }

        expanded = Array.from(
          new Set(expanded.map((path) => path.trim()).filter((path) => path.length > 0)),
        );

        if (!expanded.length) {
          return;
        }

        await onDrop(expanded);
      };

      unlistenDrop.value = await listen<{ paths?: string[] | null }>(
        'tauri://drag-drop',
        async (event) => {
          await handleDropPaths(event.payload?.paths ?? []);
          if (onDragLeave) {
            onDragLeave();
          }
        },
      );
    }

    if (onDragEnter) {
      unlistenEnter.value = await listen('tauri://drag-enter', () => {
        onDragEnter();
      });
    }

    if (onDragLeave) {
      unlistenLeave.value = await listen('tauri://drag-leave', () => {
        onDragLeave();
      });
    }

    if (onMenuOpen) {
      unlistenMenuOpen.value = await listen('menu:open', async () => {
        await onMenuOpen();
      });
    }

    if (onMenuAbout) {
      unlistenMenuAbout.value = await listen('menu:about', () => {
        onMenuAbout();
      });
    }
  }

  function cleanupEventListeners() {
    unlistenDrop.value?.();
    unlistenEnter.value?.();
    unlistenLeave.value?.();
    unlistenMenuOpen.value?.();
    unlistenMenuAbout.value?.();
  }

  onMounted(() => {
    setupEventListeners().catch((error) => {
      console.error('[tauri-events] Failed to setup event listeners:', error);
    });
  });

  onUnmounted(() => {
    cleanupEventListeners();
  });

  return {
    isTauriRuntime,
    setupEventListeners,
    cleanupEventListeners,
  };
}
