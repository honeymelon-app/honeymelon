<script setup lang="ts">
/**
 * Job queue component for displaying and managing media conversion jobs.
 *
 * This component provides a unified view of all conversion jobs (both active and completed)
 * in a single queue interface. It acts as a coordinator between the job data and the
 * JobQueueSection component, which handles the actual rendering and interaction logic.
 *
 * Key responsibilities:
 * - Combines active and completed jobs into a single unified queue
 * - Provides empty state handling when no jobs exist
 * - Delegates job management actions (cancel, update preset, start, clear) to parent
 * - Maintains consistent job display regardless of job state
 *
 * The component uses a "unified" variant of JobQueueSection to present all jobs
 * in chronological order, allowing users to see the complete conversion pipeline
 * in one place rather than separating active and completed jobs.
 */

import { computed } from 'vue';

import JobQueueSection from '@/components/JobQueueSection.vue';
import type { Preset, JobState } from '@/lib/types';

/**
 * Job interface representing a media conversion task.
 *
 * Defines the structure of job objects that are displayed and managed
 * within the job queue interface.
 */
interface Job {
  /** Unique identifier for the job */
  id: string;
  /** File system path to the source media file */
  path: string;
  /** Current state of the job (queued, running, completed, failed, etc.) */
  state: JobState;
  /** ID of the preset being used for conversion */
  presetId: string;
  /** Optional file size in bytes */
  fileSize?: number;
  /** Optional media duration in seconds */
  duration?: number;
}

/**
 * Props interface for JobQueue component.
 *
 * Defines all the data and callbacks needed to render and interact
 * with the job queue, including job lists and event handlers.
 */
interface JobQueueProps {
  /** Array of currently active (running/queued) jobs */
  activeJobs: Job[];
  /** Array of completed (successful/failed) jobs */
  completedJobs: Job[];
  /** Whether there are any active jobs */
  hasActiveJobs: boolean;
  /** Whether there are any completed jobs */
  hasCompletedJobs: boolean;
  /** Whether there are no jobs at all */
  hasNoJobs: boolean;
  /** Available preset options for job configuration */
  presetOptions: Preset[];
  /** Callback for canceling a specific job */
  // eslint-disable-next-line no-unused-vars
  onCancelJob?: (jobId: string) => void;
  /** Callback for updating a job's preset */
  // eslint-disable-next-line no-unused-vars
  onUpdatePreset?: (jobId: string, presetId: string) => void;
  /** Callback for starting a queued job */
  // eslint-disable-next-line no-unused-vars
  onStartJob?: (jobId: string) => void;
  /** Callback for clearing all completed jobs */
  onClearCompleted?: () => void;
}

const props = defineProps<JobQueueProps>();

/**
 * Computed property that merges active and completed jobs.
 *
 * Creates a unified list of all jobs for display in the queue,
 * maintaining the order in which they appear (active jobs first,
 * then completed jobs).
 */
const allJobs = computed(() => [...props.activeJobs, ...props.completedJobs]);
</script>

<template>
  <!-- Unified job queue section when jobs exist -->
  <JobQueueSection
    v-if="!props.hasNoJobs"
    :jobs="allJobs"
    title="Queue"
    variant="unified"
    :available-presets="props.presetOptions"
    :show-clear-button="props.hasCompletedJobs"
    @cancel="props.onCancelJob"
    @update-preset="props.onUpdatePreset"
    @start="props.onStartJob"
    @clear-completed="props.onClearCompleted"
  />

  <!-- Empty state message when no jobs are present -->
  <div v-if="props.hasNoJobs" class="flex items-center justify-center py-24">
    <div class="text-center text-muted-foreground">
      <p class="text-sm">No files in queue</p>
    </div>
  </div>
</template>
