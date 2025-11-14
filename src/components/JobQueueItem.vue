<script setup lang="ts">
import { X, Play } from 'lucide-vue-next';
import { computed } from 'vue';

import JobProgressBar from '@/components/JobProgressBar.vue';
import JobStatusBadge from '@/components/JobStatusBadge.vue';
import PresetSelector from '@/components/PresetSelector.vue';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { inferContainerFromPath, mediaKindForContainer } from '@/lib/media-formats';
import type { JobState, Preset } from '@/lib/types';
import { formatFileSize, formatDuration, pathBasename, getFileExtension } from '@/lib/utils';

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
  updatePreset: [jobId: string, presetId: string];
  start: [jobId: string];
}>();

const fileName = computed(() => pathBasename(props.path));
const fileExtension = computed(() => getFileExtension(props.path));

const sourceContainer = computed(() => inferContainerFromPath(props.path));
const sourceMediaKind = computed(() =>
  sourceContainer.value ? mediaKindForContainer(sourceContainer.value) : undefined,
);

const filteredPresets = computed(() => {
  return props.availablePresets.filter((preset) => {
    if (sourceMediaKind.value && preset.mediaKind !== sourceMediaKind.value) {
      return false;
    }
    if (
      sourceContainer.value &&
      preset.sourceContainers.length > 0 &&
      !preset.sourceContainers.includes(sourceContainer.value)
    ) {
      return false;
    }
    return true;
  });
});

const presetChoices = computed(() =>
  filteredPresets.value.length ? filteredPresets.value : props.availablePresets,
);

const statusLabel = computed(() => {
  const state = props.state;
  switch (state.status) {
    case 'queued':
      return 'Waiting';
    case 'probing':
      return 'Analyzing';
    case 'planning':
      return 'Planning';
    case 'running':
      return 'Converting';
    case 'completed':
      return 'Done';
    case 'failed':
      return 'Failed';
    case 'cancelled':
      return 'Cancelled';
    default:
      return 'Unknown';
  }
});

const statusVariant = computed(() => {
  const state = props.state;
  if (state.status === 'completed') return 'default';
  if (state.status === 'failed') return 'destructive';
  return 'secondary';
});

const canChangePreset = computed(() => {
  return props.state.status === 'queued' && presetChoices.value.length > 0;
});

const canStart = computed(() => props.state.status === 'queued');

const canCancel = computed(() => {
  return (
    props.state.status === 'running' ||
    props.state.status === 'queued' ||
    props.state.status === 'probing' ||
    props.state.status === 'planning'
  );
});

const isPermissionError = computed(() => {
  return (
    props.state.status === 'failed' &&
    'code' in props.state &&
    props.state.code === 'job_output_permission'
  );
});

const permissionHelpText =
  'Choose a different output folder or grant Honeymelon Full Disk Access in System Settings.';

function handleCancel() {
  emit('cancel', props.jobId);
}

function handlePresetChange(newPresetId: string) {
  emit('updatePreset', props.jobId, newPresetId);
}

function handleStart() {
  emit('start', props.jobId);
}

async function handleOpenDiskAccessHelp() {
  try {
    const { openUrl } = await import('@tauri-apps/plugin-opener');
    await openUrl('x-apple.systempreferences:com.apple.preference.security?Privacy_FullDiskAccess');
  } catch (error) {
    console.error('[JobQueueItem] Failed to open Full Disk Access settings', error);
  }
}
</script>

<template>
  <div
    class="group relative rounded-lg border border-border/50 bg-card p-4 transition-all hover:border-border"
    data-test="job-card"
    :data-job-id="jobId"
    :data-state="state.status"
  >
    <div class="flex items-start gap-4">
      <!-- Status Icon -->
      <JobStatusBadge :state="state" />

      <!-- Content -->
      <div class="flex-1 space-y-3">
        <!-- Header -->
        <div class="flex items-start justify-between gap-4">
          <div class="min-w-0 flex-1">
            <h3 class="truncate font-medium text-foreground max-w-sm">
              {{ fileName }}
            </h3>
            <div class="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <Badge variant="outline" class="font-mono">
                {{ fileExtension }}
              </Badge>
              <span v-if="fileSize">{{ formatFileSize(fileSize) }}</span>
              <span v-if="duration">{{ formatDuration(duration) }}</span>
            </div>
          </div>

          <div class="flex items-center gap-3">
            <Button
              v-if="canStart"
              size="sm"
              class="h-8 px-3 cursor-pointer"
              aria-label="Start conversion job"
              @click="handleStart"
              data-test="job-start-button"
            >
              <Play class="mr-2 h-4 w-4" aria-hidden="true" />
              Start
            </Button>
            <Button
              v-if="canCancel"
              variant="ghost"
              size="icon"
              class="h-8 w-8 shrink-0 cursor-pointer"
              aria-label="Cancel job"
              @click="handleCancel"
              data-test="job-cancel-button"
            >
              <X class="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>

        <!-- Preset Selector -->
        <PresetSelector
          :preset-id="presetId"
          :available-presets="presetChoices"
          :editable="canChangePreset"
          @update="handlePresetChange"
        />

        <!-- Progress Bar -->
        <JobProgressBar :state="state" :duration="duration" />

        <!-- Status Message -->
        <div
          class="flex flex-wrap items-center gap-3 text-xs"
          aria-live="polite"
          aria-atomic="true"
        >
          <Badge :variant="statusVariant">
            {{ statusLabel }}
          </Badge>
          <span
            v-if="state.status === 'failed' && 'error' in state"
            class="text-red-500"
            role="alert"
          >
            {{ state.error }}
          </span>
          <Button
            v-if="isPermissionError"
            variant="link"
            size="sm"
            class="px-0 text-xs cursor-pointer"
            @click="handleOpenDiskAccessHelp"
          >
            Open Settings
          </Button>
          <span v-if="isPermissionError" class="text-muted-foreground">
            {{ permissionHelpText }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
