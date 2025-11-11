import { invoke } from '@tauri-apps/api/core';
import { type Ref } from 'vue';

import { inferContainerFromPath, mediaKindForContainer } from '@/lib/media-formats';
import type { Preset } from '@/lib/types';
import { useJobsStore } from '@/stores/jobs';

interface UseFileHandlerOptions {
  presetOptions: Ref<Preset[]>;
  defaultPresetId: Ref<string>;
  presetsReady: Ref<boolean>;
}

export function useFileHandler(options: UseFileHandlerOptions) {
  const { presetOptions, defaultPresetId, presetsReady } = options;
  const jobsStore = useJobsStore();

  function isTauriRuntime(): boolean {
    return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
  }

  function isPresetAvailable(id: string): boolean {
    return presetOptions.value.some((p) => p.id === id);
  }

  function presetsForPath(path: string): Preset[] {
    const container = inferContainerFromPath(path);
    if (!container) {
      return presetOptions.value;
    }

    const kind = mediaKindForContainer(container);
    return presetOptions.value.filter(
      (preset) =>
        preset.mediaKind === kind &&
        (preset.sourceContainers.length === 0 || preset.sourceContainers.includes(container)),
    );
  }

  function selectDefaultPresetForPath(path: string): string | null {
    const candidates = presetsForPath(path);
    if (candidates.length > 0) {
      return candidates[0].id;
    }
    return presetOptions.value[0]?.id ?? null;
  }

  function ensureUsablePresetId(prefId: string): string | null {
    if (!presetsReady.value) return null;
    if (isPresetAvailable(prefId)) return prefId;
    return presetOptions.value[0]?.id ?? null;
  }

  async function ensurePresetsReady(): Promise<boolean> {
    if (presetsReady.value) return true;
    console.warn('[file-handler] Presets not ready yet; ignoring file input right now.');
    return false;
  }

  async function addFiles(fileList: FileList) {
    try {
      if (!(await ensurePresetsReady())) return;

      const { discoverDroppedEntries } = await import('@/lib/file-discovery');
      const entries = await discoverDroppedEntries(fileList);
      const paths = entries.map((e) => e.path).filter((p): p is string => !!p?.trim());

      if (!paths.length) {
        console.warn(
          '[file-handler] No resolvable paths from dropped entries',
          entries.slice(0, 3),
        );
        return;
      }

      const jobIds: string[] = [];
      for (const path of paths) {
        const presetId =
          selectDefaultPresetForPath(path) ?? ensureUsablePresetId(defaultPresetId.value);
        if (!presetId) {
          continue;
        }
        const jobId = jobsStore.enqueue(path, presetId);
        if (jobId) {
          jobIds.push(jobId);
        }
      }

      // Successfully enqueued jobs
    } catch (error) {
      console.error('[file-handler] Failed to add files:', error);
    }
  }

  async function addFilesFromPaths(paths: string[], options: { alreadyExpanded?: boolean } = {}) {
    try {
      if (!(await ensurePresetsReady())) return;

      const validPaths = paths.filter((p) => typeof p === 'string' && p.trim().length > 0);
      if (!validPaths.length) return;

      const { alreadyExpanded = false } = options;

      let expanded: string[] = [];
      if (alreadyExpanded) {
        expanded = Array.from(new Set(validPaths.map((p) => p.trim())));
      } else {
        try {
          expanded = await invoke<string[]>('expand_media_paths', { paths: validPaths });
        } catch {
          expanded = validPaths;
        }
      }
      if (!expanded.length) return;

      const jobIds: string[] = [];
      for (const path of expanded) {
        const presetId =
          selectDefaultPresetForPath(path) ?? ensureUsablePresetId(defaultPresetId.value);
        if (!presetId) {
          continue;
        }
        const jobId = jobsStore.enqueue(path, presetId);
        if (jobId) {
          jobIds.push(jobId);
        }
      }

      // Successfully enqueued jobs
    } catch (error) {
      console.error('[file-handler] Failed to add files from paths:', error);
    }
  }

  async function browseForFiles(mediaKind?: string) {
    if (!(await ensurePresetsReady())) return;
    if (isTauriRuntime()) {
      try {
        const selection = await invoke<string[]>('pick_media_files', {
          mediaKind: mediaKind || null,
        });
        if (Array.isArray(selection) && selection.length > 0) {
          await addFilesFromPaths(selection);
        }
      } catch (error) {
        console.error('[file-handler] Failed to open media picker:', error);
      }
      return;
    }
  }

  return {
    isTauriRuntime,
    isPresetAvailable,
    presetsForPath,
    selectDefaultPresetForPath,
    ensureUsablePresetId,
    addFiles,
    addFilesFromPaths,
    browseForFiles,
  };
}
