<script setup lang="ts">
import type { Preset, JobState } from '@/lib/types';
import JobQueueSection from '@/components/JobQueueSection.vue';

interface Job {
  id: string;
  path: string;
  state: JobState;
  presetId: string;
  fileSize?: number;
  duration?: number;
}

interface JobQueueProps {
  activeJobs: Job[];
  completedJobs: Job[];
  hasActiveJobs: boolean;
  hasCompletedJobs: boolean;
  hasNoJobs: boolean;
  presetOptions: Preset[];
  // eslint-disable-next-line no-unused-vars
  onCancelJob?: (jobId: string) => void;
  // eslint-disable-next-line no-unused-vars
  onUpdatePreset?: (jobId: string, presetId: string) => void;
  // eslint-disable-next-line no-unused-vars
  onStartJob?: (jobId: string) => void;
  onClearCompleted?: () => void;
}

const props = defineProps<JobQueueProps>();
</script>

<template>
  <!-- Active Queue -->
  <JobQueueSection
    v-if="props.hasActiveJobs"
    :jobs="props.activeJobs"
    title="Converting"
    variant="active"
    :available-presets="props.presetOptions"
    @cancel="props.onCancelJob"
    @update-preset="props.onUpdatePreset"
    @start="props.onStartJob"
  />

  <!-- Completed Jobs -->
  <JobQueueSection
    v-if="props.hasCompletedJobs"
    :jobs="props.completedJobs"
    title="Completed"
    variant="completed"
    :available-presets="props.presetOptions"
    :show-clear-button="true"
    @cancel="props.onCancelJob"
    @update-preset="props.onUpdatePreset"
    @start="props.onStartJob"
    @clear-completed="props.onClearCompleted"
  />

  <!-- Empty State -->
  <div v-if="props.hasNoJobs" class="flex flex-1 items-center justify-center py-12">
    <div class="text-center text-muted-foreground">
      <p class="text-sm">No files in queue</p>
    </div>
  </div>
</template>
