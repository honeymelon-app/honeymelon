import { ref, onMounted, onUnmounted } from 'vue';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';

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
      unlistenDrop.value = await listen<{ paths?: string[] | null }>(
        'tauri://drag-drop',
        async (event) => {
          const payloadPaths = event.payload?.paths;
          const paths = Array.isArray(payloadPaths) ? payloadPaths : [];
          if (paths.length > 0) {
            await onDrop(paths);
          }
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
