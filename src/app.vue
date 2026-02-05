<script setup lang="ts">
/**
 * Copyright (C) 2025-2026 Jerome Thayananthajothy
 *
 * This file is part of Honeymelon.
 *
 * Honeymelon is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

/**
 * Root application component for Honeymelon.
 *
 * This is the main Vue component that serves as the entry point for the entire application UI.
 * It orchestrates the high-level application state, including media type filtering, file uploading,
 * and job queue management. The component implements a tabbed interface that allows users to work
 * with different media types (video, audio, image) separately.
 *
 * Key responsibilities:
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
 * - Manages dialog states for about information and settings
 * - Coordinates between multiple child components for a cohesive user experience
 */

import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import AboutDialog from '@/components/AboutDialog.vue';
import AppLoadingSkeleton from '@/components/AppLoadingSkeleton.vue';
import DestinationChooser from '@/components/DestinationChooser.vue';
import LanguageSwitcher from '@/components/LanguageSwitcher.vue';
import MediaTabContent from '@/components/MediaTabContent.vue';
import ThemeSwitcher from '@/components/ThemeSwitcher.vue';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { VisuallyHidden } from '@/components/ui/visually-hidden';
import Window from '@/components/Window.vue';
import { useAppOrchestration } from '@/composables/use-app-orchestration';
import { useMediaKindFilter } from '@/composables/use-media-kind-filter';
import type { MediaKind } from '@/lib/types';

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
  presetOptions,
  isAboutOpen,
  handleBrowse,
  handleCancelJob,
  handleUpdatePreset,
  handleUpdateAllPresets,
  handleStartJob,
  startAll,
  cancelAll,
  clearCompleted,
  batchAutoStart,
} = app;

/**
 * Computed property to show loading skeleton during app initialization.
 *
 * The skeleton is displayed while the application is loading capabilities
 * and preparing presets for media conversion.
 */
const showSkeleton = computed(() => !presetsReady.value);

/**
 * Active tab state for media type filtering.
 *
 * Tracks which media type tab (video/audio/image) is currently selected.
 * This affects which jobs are displayed and which file types are accepted.
 */
const activeTab = ref<MediaKind>('video');

/**
 * Media-kind-specific filters using the centralized composable.
 *
 * Each filter provides reactive views of jobs and presets filtered by media kind,
 * eliminating the need to repeat computed properties for each media type.
 */
const videoFilter = useMediaKindFilter(activeJobs, completedJobs, presetOptions, 'video');
const audioFilter = useMediaKindFilter(activeJobs, completedJobs, presetOptions, 'audio');
const imageFilter = useMediaKindFilter(activeJobs, completedJobs, presetOptions, 'image');

/**
 * Media-kind-specific browse handlers.
 *
 * These functions trigger file browsing dialogs filtered by media type,
 * ensuring users can only select appropriate file types for each tab.
 */
const handleVideoBrowse = () => handleBrowse('video');
const handleAudioBrowse = () => handleBrowse('audio');
const handleImageBrowse = () => handleBrowse('image');

/**
 * Media-kind-specific bulk preset update handlers.
 *
 * These functions ensure bulk preset changes only affect jobs of the correct media type.
 */
const handleVideoUpdateAllPresets = (presetId: string) => handleUpdateAllPresets(presetId, 'video');
const handleAudioUpdateAllPresets = (presetId: string) => handleUpdateAllPresets(presetId, 'audio');
const handleImageUpdateAllPresets = (presetId: string) => handleUpdateAllPresets(presetId, 'image');
</script>

<template>
  <!-- Loading Skeleton - Shows during app initialization -->
  <AppLoadingSkeleton v-if="showSkeleton" />

  <!-- Main Application Interface -->
  <Window v-else>
    <!-- Container with relative positioning for absolute controls -->
    <div class="relative flex flex-col flex-1">
      <!-- Top-right controls for global settings -->
      <div class="absolute right-0 top-0 z-10 flex items-center gap-x-3">
        <DestinationChooser />
        <LanguageSwitcher />
        <ThemeSwitcher />
      </div>

      <!-- Media Type Tabs - Core navigation for filtering by video/audio/image -->
      <Tabs v-model="activeTab" default-value="video" class="flex flex-col flex-1">
        <TabsList aria-label="Media type filter" class="w-fit">
          <TabsTrigger
            value="video"
            aria-label="Video files"
            data-test="media-tab"
            data-media-kind="video"
          >
            {{ t('media.video') }}
          </TabsTrigger>
          <TabsTrigger
            value="audio"
            aria-label="Audio files"
            data-test="media-tab"
            data-media-kind="audio"
          >
            {{ t('media.audio') }}
          </TabsTrigger>
          <TabsTrigger
            value="image"
            aria-label="Image files"
            data-test="media-tab"
            data-media-kind="image"
          >
            {{ t('media.image') }}
          </TabsTrigger>
        </TabsList>

        <!-- KeepAlive preserves component state when switching tabs -->
        <KeepAlive>
          <div class="flex-1 flex flex-col min-h-0">
            <!-- Video Tab Content -->
            <MediaTabContent
              media-kind="video"
              :is-drag-over="isDragOver"
              :filter="videoFilter"
              :on-browse="handleVideoBrowse"
              :on-cancel-job="handleCancelJob"
              :on-update-preset="handleUpdatePreset"
              :on-update-all-presets="handleVideoUpdateAllPresets"
              :on-start-job="handleStartJob"
              :on-clear-completed="clearCompleted"
              :on-cancel-all="cancelAll"
              :on-start-all="startAll"
              :is-batch-processing="batchAutoStart"
            />

            <!-- Audio Tab Content -->
            <MediaTabContent
              media-kind="audio"
              :is-drag-over="isDragOver"
              :filter="audioFilter"
              :on-browse="handleAudioBrowse"
              :on-cancel-job="handleCancelJob"
              :on-update-preset="handleUpdatePreset"
              :on-update-all-presets="handleAudioUpdateAllPresets"
              :on-start-job="handleStartJob"
              :on-clear-completed="clearCompleted"
              :on-cancel-all="cancelAll"
              :on-start-all="startAll"
              :is-batch-processing="batchAutoStart"
            />

            <!-- Image Tab Content -->
            <MediaTabContent
              media-kind="image"
              :is-drag-over="isDragOver"
              :filter="imageFilter"
              :on-browse="handleImageBrowse"
              :on-cancel-job="handleCancelJob"
              :on-update-preset="handleUpdatePreset"
              :on-update-all-presets="handleImageUpdateAllPresets"
              :on-start-job="handleStartJob"
              :on-clear-completed="clearCompleted"
              :on-cancel-all="cancelAll"
              :on-start-all="startAll"
              :is-batch-processing="batchAutoStart"
            />
          </div>
        </KeepAlive>
      </Tabs>
    </div>
  </Window>

  <!-- About Dialog - Modal overlay for application information -->
  <Dialog v-model:open="isAboutOpen" modal>
    <DialogContent class="sm:max-w-md">
      <VisuallyHidden>
        <DialogTitle>About Honeymelon</DialogTitle>
        <DialogDescription>
          Application information, version details, and open source license.
        </DialogDescription>
      </VisuallyHidden>
      <AboutDialog @close="isAboutOpen = false" />
    </DialogContent>
  </Dialog>
</template>
