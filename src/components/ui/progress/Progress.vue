<script setup lang="ts">
import { computed } from 'vue';

import { cn } from '@/lib/utils';

interface ProgressProps {
  modelValue?: number;
  max?: number;
  class?: string;
}

const props = withDefaults(defineProps<ProgressProps>(), {
  modelValue: 0,
  max: 100,
});

const percentage = computed(() => {
  const value = Math.min(Math.max(props.modelValue, 0), props.max);
  const result = (value / props.max) * 100;
  return result;
});
</script>

<template>
  <div
    :class="cn('relative h-2 w-full overflow-hidden rounded-full bg-muted', props.class)"
    role="progressbar"
    :aria-valuemin="0"
    :aria-valuenow="modelValue"
    :aria-valuemax="max"
  >
    <div
      class="h-full bg-primary transition-all duration-300 ease-in-out"
      :style="{ width: `${percentage}%` }"
    />
  </div>
</template>
