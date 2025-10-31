<script setup lang="ts">
import { computed } from 'vue';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatFileSize, formatDuration, pathBasename, getFileExtension } from '@/lib/utils';
import type { JobState, Preset } from '@/lib/types';
import { File, CheckCircle2, XCircle, Clock, Loader2, AlertCircle, X, Play } from 'lucide-vue-next';

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

const selectedPreset = computed(() => props.availablePresets.find((p) => p.id === props.presetId));

const statusInfo = computed(() => {
  const state = props.state;

  switch (state.status) {
    case 'queued':
      return {
        label: 'Waiting',
        icon: Clock,
        color: 'text-muted-foreground',
        bgColor: 'bg-muted',
      };
    case 'probing':
      return {
        label: 'Analyzing',
        icon: Loader2,
        color: 'text-blue-500',
        bgColor: 'bg-blue-500/10',
        spin: true,
      };
    case 'planning':
      return {
        label: 'Planning',
        icon: Loader2,
        color: 'text-blue-500',
        bgColor: 'bg-blue-500/10',
        spin: true,
      };
    case 'running':
      return {
        label: 'Converting',
        icon: Loader2,
        color: 'text-primary',
        bgColor: 'bg-primary/10',
        spin: true,
      };
    case 'completed':
      return {
        label: 'Done',
        icon: CheckCircle2,
        color: 'text-green-500',
        bgColor: 'bg-green-500/10',
      };
    case 'failed':
      return {
        label: 'Failed',
        icon: AlertCircle,
        color: 'text-red-500',
        bgColor: 'bg-red-500/10',
      };
    case 'cancelled':
      return {
        label: 'Cancelled',
        icon: XCircle,
        color: 'text-orange-500',
        bgColor: 'bg-orange-500/10',
      };
    default:
      return {
        label: 'Unknown',
        icon: File,
        color: 'text-muted-foreground',
        bgColor: 'bg-muted',
      };
  }
});

const progress = computed(() => {
  if (props.state.status !== 'running') return 0;
  const processed = props.state.progress.processedSeconds ?? 0;
  const total = props.duration ?? 0;
  if (total <= 0) return 0;
  return Math.min((processed / total) * 100, 100);
});

const eta = computed(() => {
  if (props.state.status !== 'running') return null;
  const processed = props.state.progress.processedSeconds ?? 0;
  const total = props.duration ?? 0;
  const speed = props.state.progress.speed ?? 0;

  if (total <= 0 || speed <= 0 || processed <= 0) return null;

  const remaining = total - processed;
  return Math.ceil(remaining / speed);
});

const canChangePreset = computed(() => {
  return props.state.status === 'queued';
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

function handlePresetChange(newPresetId: unknown) {
  if (typeof newPresetId === 'string') {
    emit('updatePreset', props.jobId, newPresetId);
  }
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
  >
    <div class="flex items-start gap-4">
      <!-- Status Icon -->
      <div
        :class="[
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
          statusInfo.bgColor,
        ]"
      >
        <component
          :is="statusInfo.icon"
          :class="['h-5 w-5', statusInfo.color, statusInfo.spin && 'animate-spin']"
        />
      </div>

      <!-- Content -->
      <div class="flex-1 space-y-3">
        <!-- Header -->
        <div class="flex items-start justify-between gap-4">
          <div class="min-w-0 flex-1">
            <h3 class="truncate font-medium text-foreground">
              {{ fileName }}
            </h3>
            <div class="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline" class="font-mono">
                {{ fileExtension }}
              </Badge>
              <span v-if="fileSize">{{ formatFileSize(fileSize) }}</span>
              <span v-if="duration">{{ formatDuration(duration) }}</span>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <Button v-if="canStart" size="sm" class="h-8 px-3" @click="handleStart">
              <Play class="mr-2 h-4 w-4" />
              Start
            </Button>
            <Button
              v-if="canCancel"
              variant="ghost"
              size="icon"
              class="h-8 w-8 shrink-0"
              @click="handleCancel"
            >
              <X class="h-4 w-4" />
            </Button>
          </div>
        </div>

        <!-- Format Selector or Display -->
        <div class="flex items-center gap-3">
          <span class="text-xs text-muted-foreground">Convert to:</span>
          <Select
            v-if="canChangePreset"
            :model-value="presetId"
            @update:model-value="handlePresetChange"
          >
            <SelectTrigger class="h-8 w-auto min-w-[180px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="preset in availablePresets" :key="preset.id" :value="preset.id">
                {{ preset.label }}
              </SelectItem>
            </SelectContent>
          </Select>
          <Badge v-else variant="secondary" class="text-xs">
            {{ selectedPreset?.label || presetId }}
          </Badge>
        </div>

        <!-- Progress Bar (only when running) -->
        <div v-if="state.status === 'running'" class="space-y-2">
          <Progress :model-value="progress" class="h-1.5" />
          <div class="flex items-center justify-between text-xs text-muted-foreground">
            <span>{{ Math.round(progress) }}% complete</span>
            <span v-if="eta">{{ formatDuration(eta) }} remaining</span>
          </div>
        </div>

        <!-- Status Message -->
        <div class="flex flex-wrap items-start gap-2 text-xs">
          <Badge
            :variant="
              state.status === 'completed'
                ? 'default'
                : state.status === 'failed'
                  ? 'destructive'
                  : 'secondary'
            "
          >
            {{ statusInfo.label }}
          </Badge>
          <span v-if="state.status === 'failed' && 'error' in state" class="text-red-500">
            {{ state.error }}
          </span>
          <Button
            v-if="isPermissionError"
            variant="link"
            size="sm"
            class="px-0 text-xs"
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
