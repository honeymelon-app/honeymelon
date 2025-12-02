<script setup lang="ts">
/**
 * Main application window component.
 *
 * This component serves as the root container for the Honeymelon desktop application,
 * providing the basic window structure that mimics native macOS window behavior.
 * It includes a draggable title bar region and main content area.
 *
 * Key features:
 * - Implements macOS-style window dragging via WindowDragRegion
 * - Provides accessibility features like skip-to-content links
 * - Uses flexbox layout for responsive content organization
 * - Maintains consistent spacing and theming throughout the application
 *
 * The component acts as a layout wrapper that ensures consistent window behavior
 * and accessibility across different views and states of the application.
 */

import WindowDragRegion from '@/components/WindowDragRegion.vue';
</script>

<template>
  <!-- Main window container -->
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
        class="flex h-full min-h-0 flex-col gap-5 p-5 pt-10"
        data-test="app-main"
      >
        <!-- Slot for injecting page-specific content -->
        <slot />
      </main>
    </div>
  </div>
</template>
