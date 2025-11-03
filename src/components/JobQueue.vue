<script setup lang="ts">
import { computed } from 'vue';
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

// Merge active and completed jobs into a single list
const allJobs = computed(() => [...props.activeJobs, ...props.completedJobs]);
</script>

<template>
  <!-- Unified Queue -->
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

  <!-- Empty State -->
  <div v-if="props.hasNoJobs" class="flex items-center justify-center py-24">
    <div class="text-center text-muted-foreground">
      <p class="text-sm">No files in queue</p>
    </div>
  </div>
</template>
