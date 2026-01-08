/**
 * Media kind filter composable.
 *
 * Provides reactive filtered views of job arrays by media kind (video/audio/image).
 * This composable eliminates the need to repeat the same computed properties
 * for each media kind in the main app component.
 */

import { computed, type ComputedRef, type Ref } from 'vue';

import { filterJobsByMediaKind, filterPresetsByMediaKind } from '@/lib/preset-utils';
import type { JobState, MediaKind, Preset } from '@/lib/types';

/**
 * Job interface for filtering - matches the structure used by JobQueue.
 */
export interface FilterableJob {
  id: string;
  path: string;
  presetId: string;
  state: JobState;
  fileSize?: number;
  duration?: number;
}

/**
 * Return type for the media kind filter composable.
 */
export interface MediaKindFilterResult<T extends FilterableJob> {
  /** Active jobs filtered by media kind */
  activeJobs: ComputedRef<T[]>;
  /** Completed jobs filtered by media kind */
  completedJobs: ComputedRef<T[]>;
  /** Whether there are any active jobs */
  hasActiveJobs: ComputedRef<boolean>;
  /** Whether there are any completed jobs */
  hasCompletedJobs: ComputedRef<boolean>;
  /** Whether there are no jobs at all */
  hasNoJobs: ComputedRef<boolean>;
  /** Whether there are queued jobs ready to start */
  hasQueuedJobs: ComputedRef<boolean>;
  /** Presets filtered by media kind */
  presetOptions: ComputedRef<Preset[]>;
}

/**
 * Convenience type alias for components that receive the filter as a prop.
 */
export type MediaKindFilter = MediaKindFilterResult<FilterableJob>;

/**
 * Creates reactive filtered views of jobs and presets for a specific media kind.
 *
 * This composable centralizes the filtering logic that was previously
 * duplicated for video, audio, and image tabs in the main app component.
 *
 * @param activeJobs - Ref to all active jobs
 * @param completedJobs - Ref to all completed jobs
 * @param allPresetOptions - Ref to all available presets
 * @param mediaKind - The media kind to filter by
 * @returns Reactive filtered views and computed state flags
 *
 * @example
 * ```ts
 * const videoFilter = useMediaKindFilter(activeJobs, completedJobs, presetOptions, 'video');
 * const audioFilter = useMediaKindFilter(activeJobs, completedJobs, presetOptions, 'audio');
 * ```
 */
export function useMediaKindFilter<T extends FilterableJob>(
  activeJobs: Ref<T[]> | ComputedRef<T[]>,
  completedJobs: Ref<T[]> | ComputedRef<T[]>,
  allPresetOptions: Ref<Preset[]> | ComputedRef<Preset[]>,
  mediaKind: MediaKind,
): MediaKindFilterResult<T> {
  const filteredActiveJobs = computed(() => filterJobsByMediaKind(activeJobs.value, mediaKind));

  const filteredCompletedJobs = computed(() =>
    filterJobsByMediaKind(completedJobs.value, mediaKind),
  );

  const hasActiveJobs = computed(() => filteredActiveJobs.value.length > 0);

  const hasCompletedJobs = computed(() => filteredCompletedJobs.value.length > 0);

  const hasNoJobs = computed(
    () => filteredActiveJobs.value.length === 0 && filteredCompletedJobs.value.length === 0,
  );

  const hasQueuedJobs = computed(() =>
    filteredActiveJobs.value.some((job) => job.state.status === 'queued'),
  );

  const presetOptions = computed(() => filterPresetsByMediaKind(allPresetOptions.value, mediaKind));

  return {
    activeJobs: filteredActiveJobs,
    completedJobs: filteredCompletedJobs,
    hasActiveJobs,
    hasCompletedJobs,
    hasNoJobs,
    hasQueuedJobs,
    presetOptions,
  };
}
