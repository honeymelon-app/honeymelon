<script lang="ts" setup>
import type { HTMLAttributes } from 'vue';
import { reactiveOmit } from '@vueuse/core';
import { DrawerTitle } from 'vaul-vue';
import { cn } from '@/lib/utils';

const props = defineProps<{ class?: HTMLAttributes['class'] } & Record<string, unknown>>();

const delegatedProps = reactiveOmit(props, 'class');
</script>

<template>
  <DrawerTitle
    data-slot="drawer-title"
    v-bind="delegatedProps"
    :class="cn('text-foreground font-semibold', props.class)"
  >
    <slot />
  </DrawerTitle>
</template>
