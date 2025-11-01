<script setup lang="ts">
// Empty script - purely presentational component for macOS window dragging
</script>

<template>
  <div
    data-tauri-drag-region
    class="fixed left-0 right-0 top-0 z-50 h-10 select-none will-change-auto"
    style="
      background: transparent;
      pointer-events: auto;
      -webkit-user-select: none;
      -webkit-app-region: drag;
      backface-visibility: hidden;
      transform: translateZ(0);
    "
  />
</template>
