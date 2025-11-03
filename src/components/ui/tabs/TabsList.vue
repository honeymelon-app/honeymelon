<script setup lang="ts">
import { type HTMLAttributes, computed } from 'vue';
import {
  TabsList,
  type TabsListProps,
  useForwardProps,
} from 'reka-ui';
import { cn } from '@/lib/utils';

const props = defineProps<TabsListProps & { class?: HTMLAttributes['class'] }>();

const delegatedProps = computed(() => {
  const { class: _, ...delegated } = props;

  return delegated;
});

const forwardedProps = useForwardProps(delegatedProps);
</script>

<template>
  <TabsList
    v-bind="forwardedProps"
    :class="cn('inline-flex items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground', props.class)"
  >
    <slot />
  </TabsList>
</template>
