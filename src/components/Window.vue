<script setup lang="ts">
/**
 * Main application window component.
 *
 * This component serves as the root container for the Honeymelon desktop application,
 * providing the basic window structure that mimics native macOS window behavior.
 * It includes a draggable title bar region, main content area, and optional footer
 * for job management actions.
 *
 * Key features:
 * - Implements macOS-style window dragging via WindowDragRegion
 * - Provides accessibility features like skip-to-content links
 * - Conditionally shows footer with job control buttons when jobs are active
 * - Uses flexbox layout for responsive content organization
 * - Maintains consistent spacing and theming throughout the application
 *
 * The component acts as a layout wrapper that ensures consistent window behavior
 * and accessibility across different views and states of the application.
 */

import AppFooter from '@/components/AppFooter.vue';
import WindowDragRegion from '@/components/WindowDragRegion.vue';

/**
 * Props interface for the Window component.
 *
 * Defines the configuration options for window behavior, particularly
 * the footer display and job management capabilities.
 */
interface WindowProps {
  /** Whether to display the footer with job control buttons */
  showFooter: boolean;
  /** Number of currently active jobs, used for footer display logic */
  activeJobCount: number;
  /** Callback for canceling all active jobs */
  onCancelAll?: () => void;
  /** Callback for starting all queued jobs */
  onStartAll?: () => void;
  /** Whether the start all button should be enabled */
  canStartAll?: boolean;
}

const props = defineProps<WindowProps>();
</script>

<template>
  <!-- Main window container with full screen height and theme-aware colors -->
  <div class="flex h-screen flex-col bg-background text-foreground">
    <!-- Accessibility: Skip link for keyboard navigation to main content -->
    <a
      href="#main-content"
      class="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:outline-none focus:ring-2 focus:ring-ring"
    >
      Skip to main content
    </a>

    <!-- Window drag region for macOS window movement -->
    <WindowDragRegion />

    <!-- Main content area with flexible height and padding -->
    <div class="flex-1 w-full min-h-0">
      <main
        id="main-content"
        class="flex h-full min-h-0 flex-col gap-6 p-6 pt-10"
        data-test="app-main"
      >
        <!-- Slot for injecting page-specific content -->
        <slot />
      </main>
    </div>

    <!-- Conditional footer for job management when jobs are active -->
    <AppFooter
      v-if="props.showFooter"
      :active-job-count="props.activeJobCount"
      :can-start-all="props.canStartAll ?? false"
      @cancel-all="props.onCancelAll"
      @start-all="props.onStartAll"
    />
  </div>
</template>
