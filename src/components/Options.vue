<script setup lang="ts">
import { cn } from '@/lib/utils';
import { HTMLAttributes } from 'vue';

const props = defineProps<{
  class?: HTMLAttributes['class'];
}>();
</script>

<template>
  <div :class="cn('flex items-center justify-between bg-muted rounded-lg', props.class)">
    <slot name="left" />
    <slot name="right" />
  </div>
</template>
