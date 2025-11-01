<script setup lang="ts">
import { computed } from 'vue';
import { Progress } from '@/components/ui/progress';
import { formatDuration } from '@/lib/utils';
import type { JobState } from '@/lib/types';

interface JobProgressBarProps {
  state: JobState;
  duration?: number;
}

const props = defineProps<JobProgressBarProps>();

const progress = computed(() => {
  if (props.state.status !== 'running') return 0;
  const processed = props.state.progress.processedSeconds ?? 0;
  const total = props.duration ?? 0;
  console.debug('[JobProgressBar] Computing progress:', {
    status: props.state.status,
    processed,
    total,
    progressPercent: total > 0 ? (processed / total) * 100 : 0,
  });
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
