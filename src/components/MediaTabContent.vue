<script setup lang="ts">
/**
 * Media Tab Content component.
 *
 * Renders the content for a single media type tab (video/audio/image).
 * This component eliminates code duplication by providing a reusable
 * structure for the FileDropZone and JobQueue combination used in each tab.
 */
import FileDropZone from '@/components/FileDropZone.vue';
import JobQueue from '@/components/JobQueue.vue';
import { TabsContent } from '@/components/ui/tabs';
import type { MediaKindFilterResult, FilterableJob } from '@/composables/use-media-kind-filter';
import type { MediaKind } from '@/lib/types';

/* eslint-disable no-unused-vars */
interface MediaTabContentProps {
  /** The media kind this tab handles */
  mediaKind: MediaKind;
  /** Whether files are currently being dragged over the app */
  isDragOver: boolean;
  /** Filter object containing reactive job/preset data for this media kind */
  filter: MediaKindFilterResult<FilterableJob>;
  /** Handler for browsing files */
  onBrowse: () => void;
  /** Handler for cancelling a job */
  onCancelJob: (jobId: string) => void;
  /** Handler for updating a single job's preset */
  onUpdatePreset: (jobId: string, presetId: string) => void;
  /** Handler for updating all jobs' presets for this media kind */
  onUpdateAllPresets: (presetId: string) => void;
  /** Handler for starting a single job */
  onStartJob: (jobId: string) => void;
  /** Handler for clearing completed jobs */
  onClearCompleted: () => void;
  /** Handler for cancelling all jobs */
  onCancelAll: () => void;
  /** Handler for starting all queued jobs */
  onStartAll: () => void;
  /** Whether batch auto-start is in progress */
  isBatchProcessing: boolean;
}

const props = defineProps<MediaTabContentProps>();
</script>

<template>
  <TabsContent
    :value="props.mediaKind"
    class="flex-1 flex flex-col data-[state=active]:flex data-[state=inactive]:hidden gap-y-2"
    data-test="media-pane"
    :data-media-kind="props.mediaKind"
  >
    <!-- File drop zone for this media type -->
    <FileDropZone
      :is-drag-over="props.isDragOver"
      :presets-ready="true"
      :has-active-jobs="props.filter.hasActiveJobs.value || props.filter.hasCompletedJobs.value"
      :media-kind="props.mediaKind"
      @browse="props.onBrowse"
    />
    <!-- Job queue displaying conversion jobs for this media type -->
    <JobQueue
      :active-jobs="props.filter.activeJobs.value"
      :completed-jobs="props.filter.completedJobs.value"
      :has-active-jobs="props.filter.hasActiveJobs.value"
      :has-completed-jobs="props.filter.hasCompletedJobs.value"
      :has-no-jobs="props.filter.hasNoJobs.value"
      :has-queued-jobs="props.filter.hasQueuedJobs.value"
      :preset-options="props.filter.presetOptions.value"
      :on-cancel-job="props.onCancelJob"
      :on-update-preset="props.onUpdatePreset"
      :on-update-all-presets="props.onUpdateAllPresets"
      :on-start-job="props.onStartJob"
      :on-clear-completed="props.onClearCompleted"
      :on-cancel-all="props.onCancelAll"
      :on-start-all="props.onStartAll"
      :is-batch-processing="props.isBatchProcessing"
    />
  </TabsContent>
</template>
