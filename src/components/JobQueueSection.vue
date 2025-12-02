<script setup lang="ts">
import { Play, X, Trash2 } from 'lucide-vue-next';

import JobQueueItem from '@/components/JobQueueItem.vue';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
  /** Whether the start all button should be enabled */
  canStartAll?: boolean;
}

defineProps<JobQueueSectionProps>();

const emit = defineEmits<{
  cancel: [jobId: string];
  updatePreset: [jobId: string, presetId: string];
  start: [jobId: string];
  clearCompleted: [];
  cancelAll: [];
  startAll: [];
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

function handleCancelAll() {
  emit('cancelAll');
}

function handleStartAll() {
  emit('startAll');
}
</script>

<template>
  <section
    v-if="jobs.length > 0"
    class="flex flex-col flex-1 min-h-0 gap-3"
    data-test="job-queue-section"
    :data-variant="variant"
    :data-count="jobs.length"
  >
    <!-- Toolbar with title, count, and actions -->
    <div
      class="flex items-center justify-between px-4 py-2.5 bg-muted/50 rounded-lg border border-border/40"
    >
      <div class="flex items-center gap-3">
        <h2 class="text-sm font-medium text-foreground">{{ title }}</h2>
        <span class="text-xs text-muted-foreground">
          {{ jobs.length }} file{{ jobs.length !== 1 ? 's' : '' }}
        </span>
      </div>
      <div class="flex items-center gap-1">
        <TooltipProvider v-if="showClearButton">
          <Tooltip>
            <TooltipTrigger as-child>
              <Button
                variant="ghost"
                size="icon"
                class="h-7 w-7 cursor-pointer text-muted-foreground hover:text-foreground hover:bg-background"
                @click="handleClearCompleted"
                data-test="clear-completed-button"
              >
                <Trash2 class="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Clear completed</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger as-child>
              <Button
                variant="ghost"
                size="icon"
                class="h-7 w-7 cursor-pointer text-muted-foreground hover:text-foreground hover:bg-background"
                @click="handleCancelAll"
                data-test="cancel-all-button"
              >
                <X class="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Clear queue</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <div class="w-px h-4 bg-border/60 mx-1" />
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger as-child>
              <Button
                variant="default"
                size="sm"
                class="h-7 cursor-pointer shadow-sm text-xs px-3"
                :disabled="!canStartAll"
                @click="handleStartAll"
                data-test="start-all-button"
              >
                <Play class="mr-1 h-3 w-3" />
                Convert All
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Start converting all queued files</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
    <!-- Scrollable job list -->
    <ScrollArea class="h-[465px] overflow-hidden">
      <div class="space-y-3 h-full">
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
    </ScrollArea>
  </section>
</template>
