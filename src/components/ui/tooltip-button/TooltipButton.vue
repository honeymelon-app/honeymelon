<script setup lang="ts">
/**
 * Tooltip Button compound component.
 *
 * Combines a Button with a Tooltip in a single reusable component.
 * This eliminates the need to repeat the TooltipProvider > Tooltip > TooltipTrigger > Button
 * pattern across multiple components.
 */
import type { Component } from 'vue';

import { Button, type ButtonVariants } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface TooltipButtonProps {
  /** Tooltip text to display on hover */
  tooltip: string;
  /** Button variant */
  variant?: ButtonVariants['variant'];
  /** Button size */
  size?: ButtonVariants['size'];
  /** Icon component to display */
  icon?: Component;
  /** Additional icon classes */
  iconClass?: string;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Additional button classes */
  class?: string;
  /** Aria label (defaults to tooltip) */
  ariaLabel?: string;
  /** Data-test attribute for testing */
  dataTest?: string;
}

const props = withDefaults(defineProps<TooltipButtonProps>(), {
  variant: 'ghost',
  size: 'icon',
  iconClass: 'h-3.5 w-3.5',
  disabled: false,
});

defineEmits<{
  click: [event: Event];
}>();
</script>

<template>
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger as-child>
        <Button
          :variant="props.variant"
          :size="props.size"
          :disabled="props.disabled"
          :class="cn('cursor-pointer', props.class)"
          :aria-label="props.ariaLabel ?? props.tooltip"
          :data-test="props.dataTest"
          @click="$emit('click', $event)"
        >
          <component
            v-if="props.icon"
            :is="props.icon"
            :class="props.iconClass"
            aria-hidden="true"
          />
          <slot />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{{ props.tooltip }}</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
</template>
