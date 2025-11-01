<script setup lang="ts">
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import JobQueueItem from '@/components/JobQueueItem.vue';
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
  variant: 'active' | 'completed';
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
  <section v-if="jobs.length > 0" class="flex flex-1 min-h-0 flex-col space-y-4">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <h2 class="text-lg font-semibold">{{ title }}</h2>
        <Badge :variant="variant === 'active' ? 'secondary' : 'outline'">
          {{ jobs.length }} file{{ jobs.length !== 1 ? 's' : '' }}
        </Badge>
      </div>
      <Button
        v-if="showClearButton && variant === 'completed'"
        variant="ghost"
        size="sm"
        @click="handleClearCompleted"
      >
        Clear All
      </Button>
    </div>
    <div class="flex min-h-0 flex-1">
      <ScrollArea class="flex-1 min-h-0 [&_[data-slot=scroll-area-viewport]]:pb-6">
        <ul class="flex flex-col gap-3 pr-3" role="list">
          <li v-for="job in jobs" :key="job.id">
            <JobQueueItem
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
          </li>
        </ul>
      </ScrollArea>
    </div>
  </section>
</template>
