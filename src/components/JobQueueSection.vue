<script setup lang="ts">
import JobQueueItem from '@/components/JobQueueItem.vue';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { JobState, Preset } from '@/lib/types';

interface JobRecord {
  id: string;
  path: string;
  state: JobState;
  presetId: string;
  summary?: {
    durationSec?: number;
  };
}

interface JobQueueSectionProps {
  jobs: JobRecord[];
  title: string;
  variant: 'active' | 'completed' | 'unified';
  availablePresets: Preset[];
  showClearButton?: boolean;
}

defineProps<JobQueueSectionProps>();

const emit = defineEmits<{
  cancel: [jobId: string];
  updatePreset: [jobId: string, presetId: string];
  start: [jobId: string];
  clearCompleted: [];
}>();

function handleCancel(jobId: string) {
  emit('cancel', jobId);
}

function handleUpdatePreset(jobId: string, presetId: string) {
  emit('updatePreset', jobId, presetId);
}

function handleStart(jobId: string) {
  emit('start', jobId);
}

function handleClearCompleted() {
  emit('clearCompleted');
}
</script>

<template>
  <section v-if="jobs.length > 0" class="space-y-4">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <h2 class="text-lg font-semibold">{{ title }}</h2>
        <Badge :variant="variant === 'completed' ? 'outline' : 'secondary'">
          {{ jobs.length }} file{{ jobs.length !== 1 ? 's' : '' }}
        </Badge>
      </div>
      <Button
        v-if="showClearButton"
        variant="ghost"
        size="sm"
        class="cursor-pointer"
        @click="handleClearCompleted"
      >
        Clear Completed
      </Button>
    </div>
    <ScrollArea class="h-[490px] w-full">
      <div class="divide-y divide-muted space-y-3 h-full">
        <JobQueueItem
          v-for="job in jobs"
          :key="job.id"
          :job-id="job.id"
          :path="job.path"
          :state="job.state"
          :preset-id="job.presetId"
          :available-presets="availablePresets"
          :duration="job.summary?.durationSec"
          @cancel="handleCancel"
          @update-preset="handleUpdatePreset"
          @start="handleStart"
        />
      </div>
      <div class="h-14">&nbsp;</div>
    </ScrollArea>
  </section>
</template>
