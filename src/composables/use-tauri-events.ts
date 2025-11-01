import { ref, onMounted, onUnmounted } from 'vue';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';

interface UseTauriEventsOptions {
  onDrop?: (paths: string[]) => void | Promise<void>;
  onDragEnter?: () => void;
  onDragLeave?: () => void;
  onMenuOpen?: () => void | Promise<void>;
  onMenuAbout?: () => void;
  onMenuPreferences?: () => void;
}

export function useTauriEvents(options: UseTauriEventsOptions = {}) {
  const { onDrop, onDragEnter, onDragLeave, onMenuOpen, onMenuAbout, onMenuPreferences } = options;

  const unlistenDrop = ref<UnlistenFn | null>(null);
  const unlistenEnter = ref<UnlistenFn | null>(null);
  const unlistenLeave = ref<UnlistenFn | null>(null);
  const unlistenMenuOpen = ref<UnlistenFn | null>(null);
  const unlistenMenuAbout = ref<UnlistenFn | null>(null);
  const unlistenMenuPreferences = ref<UnlistenFn | null>(null);

  function isTauriRuntime(): boolean {
    return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
  }

  async function setupEventListeners() {
    if (!isTauriRuntime()) return;

    if (onDrop) {
      unlistenDrop.value = await listen<string[]>('tauri://drag-drop', async (event) => {
        console.log('[tauri-events] Drag-drop event:', event);
        const paths = event.payload;
        if (Array.isArray(paths) && paths.length > 0) {
          console.log('[tauri-events] Files from drop:', paths);
          await onDrop(paths);
        }
      });
    }

    if (onDragEnter) {
      unlistenEnter.value = await listen('tauri://drag-enter', () => {
        console.log('[tauri-events] Drag enter');
        onDragEnter();
      });
    }

    if (onDragLeave) {
      unlistenLeave.value = await listen('tauri://drag-leave', () => {
        console.log('[tauri-events] Drag leave');
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

    if (onMenuPreferences) {
      unlistenMenuPreferences.value = await listen('menu:preferences', () => {
        onMenuPreferences();
      });
    }
  }

  function cleanupEventListeners() {
    unlistenDrop.value?.();
    unlistenEnter.value?.();
    unlistenLeave.value?.();
    unlistenMenuOpen.value?.();
    unlistenMenuAbout.value?.();
    unlistenMenuPreferences.value?.();
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
