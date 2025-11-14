<script setup lang="ts">
import { MoonStar, Sun, SunMoon } from 'lucide-vue-next';
import { type HTMLAttributes, onMounted } from 'vue';

import { Button } from '@/components/ui/button';
import { useColourMode } from '@/composables/use-colour-mode';
import { cn } from '@/lib/utils';

const { mode, toggleMode, handleColorModeChange } = useColourMode();

const props = defineProps<{
  class?: HTMLAttributes['class'];
}>();

onMounted(() => {
  handleColorModeChange();
});
</script>

<template>
  <div :class="cn(props.class)">
    <Button
      variant="outline"
      size="icon"
      class="cursor-pointer"
      @click="toggleMode"
      data-test="theme-toggle"
    >
      <MoonStar v-if="mode === 'light'" class="size-4" />
      <Sun v-if="mode === 'dark'" class="size-4" />
      <SunMoon v-if="mode === 'system'" class="size-4" />
    </Button>
  </div>
</template>
