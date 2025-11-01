<script setup lang="ts">
import { computed, watch } from 'vue';
import { Progress } from '@/components/ui/progress';
import { formatDuration } from '@/lib/utils';
import type { JobState } from '@/lib/types';

interface JobProgressBarProps {
  state: JobState;
  duration?: number;
}

const props = defineProps<JobProgressBarProps>();

watch(
  () => props.state,
  (newState) => {
    if (newState.status === 'running') {
      console.debug('[JobProgressBar] State changed:', {
        status: newState.status,
        processedSeconds: newState.progress.processedSeconds,
        progressObject: newState.progress,
      });
    }
  },
  { deep: true },
);

const progress = computed(() => {
  if (props.state.status !== 'running') return 0;
  const ratio = props.state.progress?.ratio;

  if (typeof ratio === 'number' && Number.isFinite(ratio)) {
    const percent = Math.min(Math.max(ratio * 100, 0), 100);
    console.debug('[JobProgressBar] Computing progress (ratio):', { ratio, percent });
    return percent;
  }

  const processed = props.state.progress?.processedSeconds ?? 0;
  const total = props.duration ?? 0;
  const percent = total > 0 ? Math.min(Math.max((processed / total) * 100, 0), 100) : 0;
  console.debug('[JobProgressBar] Computing progress (duration):', {
    status: props.state.status,
    processed,
    total,
    percent,
  });
  return percent;
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
</script>

<template>
  <div v-if="state.status === 'running'" class="space-y-2">
    <Progress
      :model-value="progress"
      class="h-1.5"
      :aria-label="`Conversion progress: ${Math.round(progress)}% complete`"
    />
    <div
      class="flex items-center justify-between text-xs text-muted-foreground"
      aria-live="polite"
      aria-atomic="false"
    >
      <span>{{ Math.round(progress) }}% complete</span>
      <span v-if="eta">{{ formatDuration(eta) }} remaining</span>
    </div>
  </div>
</template>
