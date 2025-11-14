<script setup lang="ts">
import { Play } from 'lucide-vue-next';

import { Button } from '@/components/ui/button';

interface AppFooterProps {
  activeJobCount: number;
  canStartAll?: boolean;
}

const props = withDefaults(defineProps<AppFooterProps>(), {
  canStartAll: false,
});

const emit = defineEmits<{
  cancelAll: [];
  startAll: [];
}>();

function handleCancelAll() {
  emit('cancelAll');
}

function handleStartAll() {
  emit('startAll');
}
</script>

<template>
  <footer
    class="border-t border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
    style="-webkit-app-region: no-drag"
    data-test="app-footer"
  >
    <div class="container mx-auto flex h-20 max-w-6xl items-center justify-between px-6">
      <div class="flex items-center gap-4 text-sm text-muted-foreground">
        <span>{{ activeJobCount }} file{{ activeJobCount !== 1 ? 's' : '' }} in queue</span>
      </div>
      <div class="flex items-center gap-3">
        <Button
          variant="ghost"
          size="lg"
          @click="handleCancelAll"
          class="cursor-pointer"
          data-test="cancel-all-button"
        >
          Cancel All
        </Button>
        <Button
          variant="default"
          size="lg"
          class="cursor-pointer"
          :disabled="!props.canStartAll"
          @click="handleStartAll"
          data-test="start-all-button"
        >
          <Play class="mr-2 h-5 w-5" />
          Start All
        </Button>
      </div>
    </div>
  </footer>
</template>
