<script setup lang="ts">
import { Button } from '@/components/ui/button';
import { XCircle } from 'lucide-vue-next';

interface AppFooterProps {
  activeJobCount: number;
}

defineProps<AppFooterProps>();

const emit = defineEmits<{
  cancelAll: [];
}>();

function handleCancelAll() {
  emit('cancelAll');
}
</script>

<template>
  <footer
    class="border-t border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
    style="-webkit-app-region: no-drag"
  >
    <div class="container mx-auto flex h-20 max-w-6xl items-center justify-between px-6">
      <div class="flex items-center gap-4 text-sm text-muted-foreground">
        <span>{{ activeJobCount }} file{{ activeJobCount !== 1 ? 's' : '' }} in queue</span>
      </div>
      <div class="flex items-center gap-3">
        <Button variant="outline" size="lg" @click="handleCancelAll" class="cursor-pointer">
          <XCircle class="mr-2 h-5 w-5" />
          Cancel All
        </Button>
      </div>
    </div>
  </footer>
</template>
