<script setup lang="ts">
import { Play } from 'lucide-vue-next';

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
    class="border-t border-border/40 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60"
    style="-webkit-app-region: no-drag"
    data-test="app-footer"
  >
    <div class="container mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
      <div class="flex items-center gap-4 text-sm text-muted-foreground">
        <span class="font-medium">
          {{ activeJobCount }} file{{ activeJobCount !== 1 ? 's' : '' }} in queue
        </span>
      </div>
      <div class="flex items-center gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger as-child>
              <Button
                variant="ghost"
                size="sm"
                @click="handleCancelAll"
                class="cursor-pointer text-muted-foreground hover:text-foreground"
                data-test="cancel-all-button"
              >
                Cancel All
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Remove all files from the queue</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger as-child>
              <Button
                variant="default"
                size="sm"
                class="cursor-pointer shadow-sm"
                :disabled="!props.canStartAll"
                @click="handleStartAll"
                data-test="start-all-button"
              >
                <Play class="mr-1.5 h-4 w-4" />
                Convert
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Start converting all queued files</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  </footer>
</template>
