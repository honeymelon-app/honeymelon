<script setup lang="ts">
import WindowDragRegion from '@/components/WindowDragRegion.vue';
import AppFooter from '@/components/AppFooter.vue';

interface WindowProps {
  showFooter: boolean;
  activeJobCount: number;
  onCancelAll?: () => void;
}

const props = defineProps<WindowProps>();
</script>

<template>
  <div class="flex h-screen flex-col bg-background text-foreground">
    <!-- Skip to main content link for keyboard navigation -->
    <a
      href="#main-content"
      class="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:outline-none focus:ring-2 focus:ring-ring"
    >
      Skip to main content
    </a>

    <!-- Drag Region for macOS window controls -->
    <WindowDragRegion />

    <!-- Main Content -->
    <div class="flex-1 w-full min-h-0">
      <main id="main-content" class="flex h-full min-h-0 flex-col gap-6 p-6 pt-10">
        <slot />
      </main>
    </div>

    <!-- Footer Actions -->
    <AppFooter
      v-if="props.showFooter"
      :active-job-count="props.activeJobCount"
      @cancel-all="props.onCancelAll"
    />
  </div>
</template>
