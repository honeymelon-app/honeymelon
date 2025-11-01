<script setup lang="ts">
import { useAppOrchestration } from '@/composables/use-app-orchestration';

const app = useAppOrchestration();
</script>

<template>
  <div v-if="!app.presetsReady" class="p-6">
    <p class="text-xs text-muted-foreground">Initializing presets…</p>
  </div>

  <div v-else class="flex h-screen flex-col bg-background text-foreground">
    <slot
      :is-drag-over="app.isDragOver"
      :active-jobs="app.activeJobs"
      :completed-jobs="app.completedJobs"
      :has-active-jobs="app.hasActiveJobs"
      :has-completed-jobs="app.hasCompletedJobs"
      :has-no-jobs="app.hasNoJobs"
      :preset-options="app.presetOptions"
      :on-file-input="app.handleFileInput"
      :on-browse="app.handleBrowse"
      :on-cancel-job="app.handleCancelJob"
      :on-update-preset="app.handleUpdatePreset"
      :on-start-job="app.handleStartJob"
      :on-cancel-all="app.cancelAll"
      :on-clear-completed="app.clearCompleted"
    />
  </div>
</template>
