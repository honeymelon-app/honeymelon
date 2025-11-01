<script setup lang="ts">
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import Window from '@/components/Window.vue';
import FileUploader from '@/components/FileUploader.vue';
import JobQueue from '@/components/JobQueue.vue';
import AppLoadingSkeleton from '@/components/AppLoadingSkeleton.vue';
import AboutDialog from '@/components/AboutDialog.vue';
import PreferencesDialog from '@/components/PreferencesDialog.vue';
import { useAppOrchestration } from '@/composables/use-app-orchestration';

const app = useAppOrchestration();
const {
  isDragOver,
  presetsReady,
  activeJobs,
  completedJobs,
  hasActiveJobs,
  hasCompletedJobs,
  hasNoJobs,
  presetOptions,
  isAboutOpen,
  isPreferencesOpen,
  handleFileInput,
  handleBrowse,
  handleCancelJob,
  handleUpdatePreset,
  handleStartJob,
  cancelAll,
  clearCompleted,
} = app;
</script>

<template>
  <!-- Loading Skeleton -->
  <AppLoadingSkeleton v-if="!presetsReady" />

  <!-- Main App -->
  <Window
    v-else
    :show-footer="hasActiveJobs"
    :active-job-count="activeJobs.length"
    @cancel-all="cancelAll"
  >
    <!-- File Uploader -->
    <FileUploader
      :is-drag-over="isDragOver"
      :has-active-jobs="hasActiveJobs"
      :on-file-input="handleFileInput"
      :on-browse="handleBrowse"
    />

    <!-- Job Queue -->
    <JobQueue
      :active-jobs="activeJobs"
      :completed-jobs="completedJobs"
      :has-active-jobs="hasActiveJobs"
      :has-completed-jobs="hasCompletedJobs"
      :has-no-jobs="hasNoJobs"
      :preset-options="presetOptions"
      :on-cancel-job="handleCancelJob"
      :on-update-preset="handleUpdatePreset"
      :on-start-job="handleStartJob"
      :on-clear-completed="clearCompleted"
    />
  </Window>

  <!-- About Dialog -->
  <Dialog v-model:open="isAboutOpen" modal>
    <DialogContent class="sm:max-w-md">
      <AboutDialog />
    </DialogContent>
  </Dialog>

  <!-- Preferences Dialog -->
  <Dialog v-model:open="isPreferencesOpen" modal>
    <DialogContent class="sm:max-w-2xl pt-12">
      <ScrollArea class="max-h-[70vh] overflow-y-auto pr-2">
        <PreferencesDialog />
      </ScrollArea>
    </DialogContent>
  </Dialog>
</template>
