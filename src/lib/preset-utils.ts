/**
 * Preset filtering and selection utilities.
 *
 * Provides centralized logic for filtering presets based on source file
 * containers and media kinds. This avoids duplicating the filtering logic
 * across multiple components and composables.
 */

import { inferContainerFromPath, mediaKindForContainer } from '@/lib/media-formats';
import { PRESETS } from '@/lib/presets';
import type { MediaKind, Preset } from '@/lib/types';

/**
 * Filters presets that are compatible with a given source file path.
 *
 * Determines the media kind and container from the file path, then returns
 * only presets that:
 * 1. Match the same media kind (video/audio/image)
 * 2. Either accept any source container OR specifically accept the source container
 *
 * @param presets - Available presets to filter
 * @param path - Source file path
 * @returns Filtered array of compatible presets
 */
export function filterPresetsForPath(presets: Preset[], path: string): Preset[] {
  const container = inferContainerFromPath(path);
  if (!container) {
    return presets;
  }

  const kind = mediaKindForContainer(container);
  return presets.filter(
    (preset) =>
      preset.mediaKind === kind &&
      (preset.sourceContainers.length === 0 || preset.sourceContainers.includes(container)),
  );
}

/**
 * Filters presets by media kind.
 *
 * @param presets - Available presets to filter
 * @param kind - Media kind to filter by
 * @returns Filtered array of presets matching the media kind
 */
export function filterPresetsByMediaKind(presets: Preset[], kind: MediaKind): Preset[] {
  return presets.filter((preset) => preset.mediaKind === kind);
}

/**
 * Gets the media kind of a job based on its preset ID.
 *
 * @param presetId - The preset ID
 * @returns The media kind, or null if preset not found
 */
export function getJobMediaKind(presetId: string): MediaKind | null {
  const preset = PRESETS.find((p) => p.id === presetId);
  return preset?.mediaKind ?? null;
}

/**
 * Filters an array of jobs by their media kind.
 *
 * @param jobs - Array of job-like objects with presetId
 * @param mediaKind - The media kind to filter by
 * @returns Filtered array of jobs matching the media kind
 */
export function filterJobsByMediaKind<T extends { presetId: string }>(
  jobs: T[],
  mediaKind: MediaKind,
): T[] {
  return jobs.filter((job) => getJobMediaKind(job.presetId) === mediaKind);
}

/**
 * Selects the best default preset for a given file path.
 *
 * Returns the first compatible preset, or null if no presets are compatible.
 *
 * @param presets - Available presets
 * @param path - Source file path
 * @returns The best preset ID, or null if none available
 */
export function selectDefaultPresetForPath(presets: Preset[], path: string): string | null {
  const compatible = filterPresetsForPath(presets, path);
  if (compatible.length > 0) {
    return compatible[0].id;
  }
  return presets[0]?.id ?? null;
}
