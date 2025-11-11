<script setup lang="ts">
import { HTMLAttributes } from 'vue';

import { cn } from '@/lib/utils';

const props = defineProps<{
  class?: HTMLAttributes['class'];
}>();
</script>

<template>
  <div
    :class="
      cn(
        'w-full rounded-lg bg-muted p-1 text-muted-foreground flex items-center justify-between shadow',
        props.class,
      )
    "
  >
    <slot name="left" />
    <slot name="right" />
  </div>
</template>
