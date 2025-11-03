<script setup lang="ts">
import { computed } from 'vue';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import {
  formatFileSize,
  pathBasename,
  getFileExtension,
  extractFileName,
} from '@/lib/utils';
import { inferContainerFromPath, mediaKindForContainer } from '@/lib/media-formats';
import type { JobState, Preset } from '@/lib/types';
import { X, Ban, BadgeCheck, FileVideo, FileAudio, FileImage } from 'lucide-vue-next';

interface JobQueueItemProps {
  jobId: string;
  path: string;
  state: JobState;
  presetId: string;
  availablePresets: Preset[];
  fileSize?: number;
  duration?: number;
}

const props = defineProps<JobQueueItemProps>();

const emit = defineEmits<{
  cancel: [jobId: string];
  remove: [jobId: string];
  updatePreset: [jobId: string, presetId: string];
  start: [jobId: string];
}>();

const fileName = computed(() => pathBasename(props.path));
const fileExtension = computed(() => getFileExtension(props.path));

const sourceContainer = computed(() => inferContainerFromPath(props.path));
const sourceMediaKind = computed(() =>
  sourceContainer.value ? mediaKindForContainer(sourceContainer.value) : undefined,
);

const selectedPreset = computed(() =>
  props.availablePresets.find((p) => p.id === props.presetId),
);

const targetExtension = computed(() => {
  if (selectedPreset.value) {
    return (selectedPreset.value.outputExtension || selectedPreset.value.container).toUpperCase();
  }
  return '';
});

const isConverting = computed(() => {
  return (
    props.state.status === 'running' ||
    props.state.status === 'probing' ||
    props.state.status === 'planning'
  );
});

const isCompleted = computed(() => props.state.status === 'completed');

const progress = computed(() => {
  if (props.state.status === 'running' && props.state.progress.ratio !== undefined) {
    const percentage = Math.round(props.state.progress.ratio * 100);
    return Math.min(Math.max(percentage, 0), 100);
  }
  if (props.state.status === 'completed') {
    return 100;
  }
  return 0;
});

const mediaIcon = computed(() => {
  switch (sourceMediaKind.value) {
    case 'video':
      return FileVideo;
    case 'audio':
      return FileAudio;
    case 'image':
      return FileImage;
    default:
      return FileVideo;
  }
});

function handleCancel() {
  emit('cancel', props.jobId);
}

function handleRemove() {
  emit('remove', props.jobId);
}
</script>

<template>
  <div class="flex justify-between items-center gap-x-6 py-3">
    <!-- Icon section (left) -->
    <div class="flex items-center min-w-0 gap-x-3">
      <div class="p-4 rounded-lg bg-muted border relative">
        <BadgeCheck
          v-if="isCompleted"
          class="size-4 text-primary absolute top-0 right-0 m-0.5"
        />
        <component :is="mediaIcon" class="size-6" />
      </div>

      <!-- File info section (center) -->
      <div class="min-w-0 flex-auto">
        <div class="flex items-center gap-x-1">
          <p class="text-sm font-semibold leading-4 text-foreground truncate">
            {{ extractFileName(fileName) }}
          </p>
        </div>
        <div class="mt-0.5 flex items-center gap-x-2 text-xs">
          <p class="text-muted-foreground font-medium">
            {{ fileSize ? formatFileSize(fileSize) : '' }}
          </p>
          <span>&middot;</span>
          <p class="text-muted-foreground">
            Converting from
            <span class="text-foreground mx-1 px-1 py-px rounded font-medium bg-muted">
              {{ fileExtension }}
            </span>
            to
            <span class="text-foreground mx-1 px-1 py-px rounded font-medium bg-muted">
              {{ targetExtension }}
            </span>
          </p>
        </div>
        <div class="mt-1.5 flex items-center gap-x-2">
          <Progress :model-value="progress" class="w-60" aria-label="Conversion progress" />
          <span class="text-xs">{{ progress }}%</span>
        </div>
      </div>
    </div>

    <!-- Actions section (right) -->
    <div class="shrink-0 flex items-center gap-x-1">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger as-child>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              class="text-foreground"
              :disabled="!isConverting"
              @click="handleCancel"
            >
              <Ban class="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Cancel</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger as-child>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              class="text-destructive"
              :disabled="isConverting"
              @click="handleRemove"
            >
              <X class="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Remove</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  </div>
</template>
