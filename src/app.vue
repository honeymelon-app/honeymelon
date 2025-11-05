<script setup lang="ts">
/**
 * Root application component for Honeymelon.
 *
 * This is the main Vue component that serves as the entry point for the entire application UI.
 * It orchestrates the high-level application state, including license management, media type
 * filtering, file uploading, and job queue management. The component implements a tabbed interface
 * that allows users to work with different media types (video, audio, image) separately.
 *
 * Key responsibilities:
 * - License activation and validation flow
 * - Media type-based tab navigation and filtering
 * - Integration with file upload and job orchestration systems
 * - Loading state management during app initialization
 * - Global UI layout coordination (window, dialogs, controls)
 *
 * The component uses Vue's Composition API with reactive state management through Pinia stores
 * and composables. It implements a responsive design that adapts to different media types
 * while maintaining consistent UX patterns across tabs.
 *
 * Architecture:
 * - Uses computed properties for reactive filtering of jobs by media type
 * - Implements event handlers for file input, browsing, and job management
 * - Manages dialog states for license activation and about information
 * - Coordinates between multiple child components for a cohesive user experience
 */

import { computed, onMounted, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import Window from '@/components/Window.vue';
import FileUploader from '@/components/FileUploader.vue';
import JobQueue from '@/components/JobQueue.vue';
import AppLoadingSkeleton from '@/components/AppLoadingSkeleton.vue';
import AboutDialog from '@/components/AboutDialog.vue';
import DestinationChooser from '@/components/DestinationChooser.vue';
import LanguageSwitcher from '@/components/LanguageSwitcher.vue';
import ThemeSwitcher from '@/components/ThemeSwitcher.vue';
import LicenseActivationDialog from '@/components/LicenseActivationDialog.vue';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAppOrchestration } from '@/composables/use-app-orchestration';
import { PRESETS } from '@/lib/presets';
import type { MediaKind } from '@/lib/types';
import { useLicenseStore } from '@/stores/license';

const { t } = useI18n();

/**
 * Main application orchestration composable.
 *
 * This composable provides centralized access to all major application state and actions,
 * including drag-and-drop handling, job management, preset configuration, and UI state.
 * It acts as the primary interface between the root component and the application's
 * business logic layer.
 */
const app = useAppOrchestration();
const {
  isDragOver,
  presetsReady,
  activeJobs,
  completedJobs,
  hasActiveJobs,
  hasQueuedJobs,
  presetOptions,
  isAboutOpen,
  handleFileInput,
  handleBrowse,
  handleCancelJob,
  handleUpdatePreset,
  handleStartJob,
  startAll,
  cancelAll,
  clearCompleted,
} = app;

/**
 * License store integration.
 *
 * Manages the application's licensing system, including license validation,
 * activation dialogs, and feature gating. The license system ensures that
 * only valid users can access the media conversion functionality.
 */
const licenseStore = useLicenseStore();
const {
  current: activeLicense,
  initialized: licenseInitialized,
  isLoading: licenseLoading,
  needsActivation,
} = storeToRefs(licenseStore);

/**
 * Initialize license system on component mount.
 *
 * This ensures that license validation occurs early in the application lifecycle,
 * allowing the UI to adapt based on license status (e.g., showing activation dialog).
 */
const openLicenseDialog = () => licenseStore.requestActivationDialog();
onMounted(() => {
  void licenseStore.init();
});

/**
 * Computed properties for license state management.
 *
 * These reactive properties determine when the application is ready to use
 * and when to show loading states or activation prompts.
 */
const licenseReady = computed(() => Boolean(activeLicense.value));
const licenseChecking = computed(() => !licenseInitialized.value || licenseLoading.value);
const showSkeleton = computed(
  () => licenseChecking.value || (licenseReady.value && !presetsReady.value),
);

/**
 * Active tab state for media type filtering.
 *
 * Tracks which media type tab (video/audio/image) is currently selected.
 * This affects which jobs are displayed and which file types are accepted.
 */
const activeTab = ref<MediaKind>('video');

/**
 * Utility functions for job filtering by media type.
 *
 * These functions enable the tabbed interface by filtering jobs based on their
 * associated preset's media kind. This allows users to focus on specific media
 * types while maintaining a unified job queue underneath.
 */

/**
 * Determines the media kind of a job based on its preset.
 *
 * @param presetId - The ID of the preset used for the job
 * @returns The media kind (video/audio/image) or null if preset not found
 */
function getJobMediaKind(presetId: string): MediaKind | null {
  const preset = PRESETS.find((p) => p.id === presetId);
  return preset?.mediaKind ?? null;
}

/**
 * Filters a job array by media kind.
 *
 * @param jobs - Array of jobs to filter
 * @param mediaKind - The media kind to filter by
 * @returns Filtered array of jobs matching the specified media kind
 */
function filterJobsByMediaKind(jobs: typeof activeJobs.value, mediaKind: MediaKind) {
  return jobs.filter((job) => getJobMediaKind(job.presetId) === mediaKind);
}

/**
 * Computed properties for video jobs.
 *
 * These reactive properties provide filtered views of the job queue specifically
 * for video-related operations, enabling the video tab functionality.
 */
const videoActiveJobs = computed(() => filterJobsByMediaKind(activeJobs.value, 'video'));
const videoCompletedJobs = computed(() => filterJobsByMediaKind(completedJobs.value, 'video'));
const hasVideoActiveJobs = computed(() => videoActiveJobs.value.length > 0);
const hasVideoCompletedJobs = computed(() => videoCompletedJobs.value.length > 0);
const hasNoVideoJobs = computed(
  () => videoActiveJobs.value.length === 0 && videoCompletedJobs.value.length === 0,
);

/**
 * Computed properties for audio jobs.
 *
 * Similar to video jobs but for audio-specific operations and the audio tab.
 */
const audioActiveJobs = computed(() => filterJobsByMediaKind(activeJobs.value, 'audio'));
const audioCompletedJobs = computed(() => filterJobsByMediaKind(completedJobs.value, 'audio'));
const hasAudioActiveJobs = computed(() => audioActiveJobs.value.length > 0);
const hasAudioCompletedJobs = computed(() => audioCompletedJobs.value.length > 0);
const hasNoAudioJobs = computed(
  () => audioActiveJobs.value.length === 0 && audioCompletedJobs.value.length === 0,
);

/**
 * Computed properties for image jobs.
 *
 * Similar to other media types but for image processing operations.
 */
const imageActiveJobs = computed(() => filterJobsByMediaKind(activeJobs.value, 'image'));
const imageCompletedJobs = computed(() => filterJobsByMediaKind(completedJobs.value, 'image'));
const hasImageActiveJobs = computed(() => imageActiveJobs.value.length > 0);
const hasImageCompletedJobs = computed(() => imageCompletedJobs.value.length > 0);
const hasNoImageJobs = computed(
  () => imageActiveJobs.value.length === 0 && imageCompletedJobs.value.length === 0,
);

/**
 * Media-kind-specific event handlers.
 *
 * These handlers ensure that when files are added through different tabs,
 * the appropriate tab becomes active and the file input is processed correctly.
 * This provides a seamless user experience when switching between media types.
 */

/**
 * Handles file input for video files and switches to video tab.
 */
const handleVideoFileInput = (event: Event) => {
  activeTab.value = 'video';
  handleFileInput(event);
};

/**
 * Handles file input for audio files and switches to audio tab.
 */
const handleAudioFileInput = (event: Event) => {
  activeTab.value = 'audio';
  handleFileInput(event);
};

/**
 * Handles file input for image files and switches to image tab.
 */
const handleImageFileInput = (event: Event) => {
  activeTab.value = 'image';
  handleFileInput(event);
};

/**
 * Media-kind-specific browse handlers.
 *
 * These functions trigger file browsing dialogs filtered by media type,
 * ensuring users can only select appropriate file types for each tab.
 */
const handleVideoBrowse = () => handleBrowse('video');
const handleAudioBrowse = () => handleBrowse('audio');
const handleImageBrowse = () => handleBrowse('image');
</script>

<template>
  <!-- License Activation Dialog Component -->
  <LicenseActivationDialog />

  <!-- Loading Skeleton - Shows during app initialization -->
  <AppLoadingSkeleton v-if="showSkeleton" />

  <!-- Main Application Interface -->
  <template v-else>
    <!-- License Activation Required Screen -->
    <div v-if="needsActivation" class="flex h-screen items-center justify-center bg-background">
      <Card class="w-full max-w-md border border-border/70 bg-background/95 shadow-lg">
        <CardHeader>
          <CardTitle class="flex items-center gap-2 text-lg">
            {{ t('app.license.requiredTitle', 'Activation Required') }}
          </CardTitle>
          <CardDescription>
            {{
              t(
                'app.license.requiredBody',
                'Enter your Honeymelon license to unlock the media converter. The window will reopen automatically.',
              )
            }}
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-4 text-sm text-muted-foreground">
          <p>
            {{
              t(
                'app.license.instructions',
                'If you just purchased a license, copy the key from your email or the customer portal.',
              )
            }}
          </p>
        </CardContent>
        <CardFooter class="flex justify-end">
          <Button size="sm" @click="openLicenseDialog">{{
            t('app.license.enterKey', 'Enter License Key')
          }}</Button>
        </CardFooter>
      </Card>
    </div>

    <!-- Main Application Window -->
    <Window
      v-else
      :show-footer="hasActiveJobs"
      :active-job-count="activeJobs.length"
      :can-start-all="hasQueuedJobs"
      @cancel-all="cancelAll"
      @start-all="startAll"
    >
      <!-- Container with relative positioning for absolute controls -->
      <div class="relative flex flex-col flex-1">
        <!-- Top-right controls for global settings -->
        <div class="absolute right-0 top-0 z-10 flex items-center gap-x-3" v-if="licenseReady">
          <DestinationChooser />
          <LanguageSwitcher />
          <ThemeSwitcher />
        </div>

        <!-- Media Type Tabs - Core navigation for filtering by video/audio/image -->
        <Tabs v-model="activeTab" default-value="video" class="flex flex-col flex-1">
          <TabsList aria-label="Media type filter" class="w-fit">
            <TabsTrigger value="video" aria-label="Video files">
              {{ t('media.video') }}
            </TabsTrigger>
            <TabsTrigger value="audio" aria-label="Audio files">
              {{ t('media.audio') }}
            </TabsTrigger>
            <TabsTrigger value="image" aria-label="Image files">
              {{ t('media.image') }}
            </TabsTrigger>
          </TabsList>

          <!-- KeepAlive preserves component state when switching tabs -->
          <KeepAlive>
            <div class="flex-1 flex flex-col min-h-0">
              <!-- Video Tab Content -->
              <TabsContent
                value="video"
                class="flex-1 flex flex-col data-[state=active]:flex data-[state=inactive]:hidden gap-y-2"
              >
                <!-- File uploader for video files -->
                <FileUploader
                  :is-drag-over="isDragOver"
                  :has-active-jobs="hasVideoActiveJobs || hasVideoCompletedJobs"
                  :media-kind="'video'"
                  :on-file-input="handleVideoFileInput"
                  :on-browse="handleVideoBrowse"
                />
                <!-- Job queue displaying video conversion jobs -->
                <JobQueue
                  :active-jobs="videoActiveJobs"
                  :completed-jobs="videoCompletedJobs"
                  :has-active-jobs="hasVideoActiveJobs"
                  :has-completed-jobs="hasVideoCompletedJobs"
                  :has-no-jobs="hasNoVideoJobs"
                  :preset-options="presetOptions"
                  :on-cancel-job="handleCancelJob"
                  :on-update-preset="handleUpdatePreset"
                  :on-start-job="handleStartJob"
                  :on-clear-completed="clearCompleted"
                />
              </TabsContent>

              <!-- Audio Tab Content -->
              <TabsContent
                value="audio"
                class="flex-1 flex flex-col data-[state=active]:flex data-[state=inactive]:hidden gap-y-2"
              >
                <!-- File uploader for audio files -->
                <FileUploader
                  :is-drag-over="isDragOver"
                  :has-active-jobs="hasAudioActiveJobs || hasAudioCompletedJobs"
                  :media-kind="'audio'"
                  :on-file-input="handleAudioFileInput"
                  :on-browse="handleAudioBrowse"
                />
                <!-- Job queue displaying audio conversion jobs -->
                <JobQueue
                  :active-jobs="audioActiveJobs"
                  :completed-jobs="audioCompletedJobs"
                  :has-active-jobs="hasAudioActiveJobs"
                  :has-completed-jobs="hasAudioCompletedJobs"
                  :has-no-jobs="hasNoAudioJobs"
                  :preset-options="presetOptions"
                  :on-cancel-job="handleCancelJob"
                  :on-update-preset="handleUpdatePreset"
                  :on-start-job="handleStartJob"
                  :on-clear-completed="clearCompleted"
                />
              </TabsContent>

              <!-- Image Tab Content -->
              <TabsContent
                value="image"
                class="flex-1 flex flex-col data-[state=active]:flex data-[state=inactive]:hidden gap-y-2"
              >
                <!-- File uploader for image files -->
                <FileUploader
                  :is-drag-over="isDragOver"
                  :has-active-jobs="hasImageActiveJobs || hasImageCompletedJobs"
                  :media-kind="'image'"
                  :on-file-input="handleImageFileInput"
                  :on-browse="handleImageBrowse"
                />
                <!-- Job queue displaying image conversion jobs -->
                <JobQueue
                  :active-jobs="imageActiveJobs"
                  :completed-jobs="imageCompletedJobs"
                  :has-active-jobs="hasImageActiveJobs"
                  :has-completed-jobs="hasImageCompletedJobs"
                  :has-no-jobs="hasNoImageJobs"
                  :preset-options="presetOptions"
                  :on-cancel-job="handleCancelJob"
                  :on-update-preset="handleUpdatePreset"
                  :on-start-job="handleStartJob"
                  :on-clear-completed="clearCompleted"
                />
              </TabsContent>
            </div>
          </KeepAlive>
        </Tabs>
      </div>
    </Window>
  </template>

  <!-- About Dialog - Modal overlay for application information -->
  <Dialog v-model:open="isAboutOpen" modal>
    <DialogContent class="sm:max-w-md" aria-labelledby="about-dialog-title">
      <AboutDialog />
    </DialogContent>
  </Dialog>
</template>
