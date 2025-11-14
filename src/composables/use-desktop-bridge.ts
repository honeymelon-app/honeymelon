import { ref, type Ref } from 'vue';

import { useTauriEvents } from '@/composables/use-tauri-events';

interface DesktopBridgeOptions {
  onDrop: (paths: string[]) => void | Promise<void>;
  onBrowseFiles?: () => void | Promise<void>;
  onOpenAbout?: () => void;
}

interface DesktopBridge {
  isDragOver: Ref<boolean>;
}

/**
 * Bridges desktop-only integrations (drag/drop + native menu events)
 * into reactive Vue state so the rest of the app can remain platform-agnostic.
 */
export function useDesktopBridge(options: DesktopBridgeOptions): DesktopBridge {
  const isDragOver = ref(false);

  useTauriEvents({
    onDrop: async (paths) => {
      isDragOver.value = false;
      await options.onDrop(paths);
    },
    onDragEnter: () => {
      isDragOver.value = true;
    },
    onDragLeave: () => {
      isDragOver.value = false;
    },
    onMenuOpen: options.onBrowseFiles,
    onMenuAbout: options.onOpenAbout,
  });

  return {
    isDragOver,
  };
}
