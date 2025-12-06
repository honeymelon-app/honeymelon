<script setup lang="ts">
import {
  X,
  Play,
  Copy,
  FolderOpen,
  AlertTriangle,
  Clock,
  FileX,
  Settings,
  HardDrive,
  Monitor,
  Film,
  Trash2,
} from 'lucide-vue-next';
import { computed } from 'vue';

import JobProgressBar from '@/components/JobProgressBar.vue';
import JobStatusBadge from '@/components/JobStatusBadge.vue';
import PresetSelector from '@/components/PresetSelector.vue';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { inferContainerFromPath, mediaKindForContainer } from '@/lib/media-formats';
import type { ErrorCategory, JobState, Preset, ProbeSummary } from '@/lib/types';
import { formatFileSize, formatDuration, pathBasename, getFileExtension } from '@/lib/utils';

interface JobQueueItemProps {
  jobId: string;
  path: string;
  state: JobState;
  presetId: string;
  availablePresets: Preset[];
  fileSize?: number;
  duration?: number;
  summary?: ProbeSummary;
  isBatchProcessing?: boolean;
}

const props = defineProps<JobQueueItemProps>();

const emit = defineEmits<{
  cancel: [jobId: string];
  updatePreset: [jobId: string, presetId: string];
  start: [jobId: string];
}>();

const fileName = computed(() => {
  const name = pathBasename(props.path);
  return name || 'Unknown File';
});
const fileExtension = computed(() => getFileExtension(props.path));
const displayFileSize = computed(() => props.fileSize ?? props.summary?.size);
const displayDuration = computed(() => props.duration ?? props.summary?.durationSec);
const resolution = computed(() => {
  if (props.summary?.width && props.summary?.height) {
    return `${props.summary.width}×${props.summary.height}`;
  }
  return undefined;
});
const codecs = computed(() => {
  if (!props.summary) return undefined;
  const parts = [];
  if (props.summary.vcodec) parts.push(props.summary.vcodec);
  if (props.summary.acodec) parts.push(props.summary.acodec);
  return parts.join(' + ');
});

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

const canStart = computed(() => props.state.status === 'queued' && !props.isBatchProcessing);

const canCancel = computed(() => {
  return (
    props.state.status === 'running' ||
    props.state.status === 'queued' ||
    props.state.status === 'probing' ||
    props.state.status === 'planning' ||
    props.state.status === 'completed' ||
    props.state.status === 'failed' ||
    props.state.status === 'cancelled'
  );
});

const isFinished = computed(() => {
  return (
    props.state.status === 'completed' ||
    props.state.status === 'failed' ||
    props.state.status === 'cancelled'
  );
});

const isPermissionError = computed(() => {
  return (
    props.state.status === 'failed' &&
    'code' in props.state &&
    props.state.code === 'job_output_permission'
  );
});

const errorCategory = computed((): ErrorCategory | undefined => {
  if (props.state.status === 'failed' && 'errorCategory' in props.state) {
    return props.state.errorCategory;
  }
  return undefined;
});

/**
 * Returns contextual help text based on error category.
 */
const errorCategoryHelp = computed((): string | undefined => {
  const category = errorCategory.value;
  if (!category) return undefined;

  switch (category) {
    case 'INPUT_PROBLEM':
      return 'The source file may be corrupted or inaccessible. Try a different file.';
    case 'UNSUPPORTED_COMBINATION':
      return "This format combination isn't supported. Try a different preset.";
    case 'RESOURCE_ISSUE':
      return 'Check available disk space and close other applications.';
    case 'TIMEOUT':
      return 'The conversion took too long. Try a faster preset or shorter file.';
    case 'INTERNAL_PIPELINE_ERROR':
      return 'An unexpected error occurred. Please try again or report this issue.';
    default:
      return undefined;
  }
});

/**
 * Returns an icon component based on error category.
 */
const errorIcon = computed(() => {
  const category = errorCategory.value;
  switch (category) {
    case 'INPUT_PROBLEM':
      return FileX;
    case 'UNSUPPORTED_COMBINATION':
      return Settings;
    case 'RESOURCE_ISSUE':
      return HardDrive;
    case 'TIMEOUT':
      return Clock;
    default:
      return AlertTriangle;
  }
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

async function handleCopyPath() {
  try {
    if (typeof window === 'undefined' || !window.navigator?.clipboard?.writeText) {
      throw new Error('Clipboard API unavailable');
    }
    await window.navigator.clipboard.writeText(props.path);
  } catch (error) {
    console.error('[JobQueueItem] Failed to copy path to clipboard', error);
  }
}

async function handleShowInFinder() {
  try {
    const { revealItemInDir } = await import('@tauri-apps/plugin-opener');
    await revealItemInDir(props.path);
  } catch (error) {
    console.error('[JobQueueItem] Failed to reveal in Finder', error);
  }
}
</script>

<template>
  <ContextMenu>
    <ContextMenuTrigger as-child>
      <div
        class="group relative flex flex-col gap-3 rounded-lg border bg-card p-3 transition-all hover:border-border"
        :class="{
          'opacity-75 hover:opacity-100': isFinished,
        }"
        data-test="job-queue-item"
        :data-status="state.status"
      >
        <div class="flex items-start gap-3">
          <!-- Status Icon -->
          <JobStatusBadge :state="state" />

          <!-- Content -->
          <div class="flex-1 space-y-2.5 min-w-0">
            <!-- Header -->
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0 flex-1">
                <h3 class="truncate font-medium text-foreground text-sm">
                  {{ fileName }}
                </h3>
                <div class="mt-1 flex flex-wrap items-center gap-2.5 text-xs text-muted-foreground">
                  <Badge variant="outline" class="font-mono text-[10px] px-1.5 py-0 h-5">
                    {{ fileExtension }}
                  </Badge>
                  <span v-if="displayFileSize" class="flex items-center gap-1 text-[11px]">
                    <HardDrive class="w-3 h-3 opacity-70" />
                    {{ formatFileSize(displayFileSize) }}
                  </span>
                  <span v-if="displayDuration" class="flex items-center gap-1 text-[11px]">
                    <Clock class="w-3 h-3 opacity-70" />
                    {{ formatDuration(displayDuration) }}
                  </span>
                  <span
                    v-if="resolution"
                    class="flex items-center gap-1 text-[11px] border-l pl-2.5 ml-0.5 border-border/50 hidden sm:inline-flex"
                  >
                    <Monitor class="w-3 h-3 opacity-70" />
                    {{ resolution }}
                  </span>
                  <span
                    v-if="codecs"
                    class="flex items-center gap-1 text-[10px] opacity-75 hidden sm:inline-flex"
                  >
                    <Film class="w-3 h-3 opacity-70" />
                    {{ codecs }}
                  </span>
                </div>
              </div>

              <div class="flex items-center gap-2 shrink-0">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger as-child>
                      <Button
                        variant="ghost"
                        size="icon"
                        class="h-7 w-7 shrink-0 cursor-pointer text-muted-foreground hover:text-foreground hover:bg-accent btn-press"
                        aria-label="Show in Finder"
                        @click.stop="handleShowInFinder"
                      >
                        <FolderOpen class="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Show in Finder</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger as-child>
                      <Button
                        v-if="canStart"
                        size="sm"
                        class="h-7 px-2.5 text-xs cursor-pointer shadow-sm btn-press group/btn"
                        aria-label="Start conversion job"
                        @click="handleStart"
                        data-test="job-start-button"
                      >
                        <Play
                          class="mr-1 h-3 w-3 transition-transform duration-200 group-hover/btn:scale-110"
                          aria-hidden="true"
                        />
                        Start
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Start converting this file</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger as-child>
                      <Button
                        v-if="canCancel"
                        variant="ghost"
                        size="icon"
                        class="h-7 w-7 shrink-0 cursor-pointer text-muted-foreground hover:text-destructive hover:bg-destructive/10 btn-press"
                        :aria-label="isFinished ? 'Remove from list' : 'Cancel job'"
                        @click="handleCancel"
                        data-test="job-cancel-button"
                      >
                        <component
                          :is="isFinished ? Trash2 : X"
                          class="h-3.5 w-3.5 transition-transform duration-200 hover:scale-110"
                          aria-hidden="true"
                        />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{{ isFinished ? 'Remove from list' : 'Cancel job' }}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
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
              class="flex flex-wrap items-center gap-2 text-[11px]"
              aria-live="polite"
              aria-atomic="true"
            >
              <Badge :variant="statusVariant" class="text-[10px] px-1.5 py-0 h-5">
                {{ statusLabel }}
              </Badge>
              <TooltipProvider v-if="state.status === 'failed' && 'error' in state">
                <Tooltip>
                  <TooltipTrigger as-child>
                    <span
                      class="text-destructive truncate max-w-[200px] cursor-help inline-flex items-center gap-1"
                      role="alert"
                    >
                      <component :is="errorIcon" class="h-3 w-3 shrink-0" aria-hidden="true" />
                      {{ state.error }}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent class="max-w-xs">
                    <div class="space-y-1">
                      <p>{{ state.error }}</p>
                      <p v-if="errorCategoryHelp" class="text-muted-foreground text-xs">
                        {{ errorCategoryHelp }}
                      </p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <Button
                v-if="isPermissionError"
                variant="link"
                size="sm"
                class="px-0 text-[11px] h-auto cursor-pointer"
                @click="handleOpenDiskAccessHelp"
              >
                Open Settings
              </Button>
              <span v-if="isPermissionError" class="text-muted-foreground text-[11px]">
                {{ permissionHelpText }}
              </span>
              <span
                v-else-if="errorCategoryHelp && !isPermissionError && state.status === 'failed'"
                class="text-muted-foreground text-[11px]"
              >
                {{ errorCategoryHelp }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </ContextMenuTrigger>
    <ContextMenuContent class="w-48">
      <ContextMenuItem v-if="canStart" @click="handleStart">
        <Play class="mr-2 h-4 w-4" />
        Start Conversion
      </ContextMenuItem>
      <ContextMenuItem v-if="canCancel" @click="handleCancel">
        <X class="mr-2 h-4 w-4" />
        Cancel
      </ContextMenuItem>
      <ContextMenuSeparator v-if="canStart || canCancel" />
      <ContextMenuItem @click="handleCopyPath">
        <Copy class="mr-2 h-4 w-4" />
        Copy File Path
      </ContextMenuItem>
      <ContextMenuItem @click="handleShowInFinder">
        <FolderOpen class="mr-2 h-4 w-4" />
        Show in Finder
      </ContextMenuItem>
    </ContextMenuContent>
  </ContextMenu>
</template>
