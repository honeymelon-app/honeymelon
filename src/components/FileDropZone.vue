<script setup lang="ts">
/**
 * File drop zone component for media file uploads.
 *
 * This component provides an interactive drag-and-drop interface for uploading media files
 * to be processed by Honeymelon. It adapts its appearance and behavior based on the current
 * application state, showing either a full-size drop zone (when no jobs are active) or a
 * compact version (when jobs exist).
 *
 * Key features:
 * - Drag-and-drop file upload with visual feedback
 * - File type filtering based on media kind (video/audio/image)
 * - Accessibility support with keyboard navigation and screen reader labels
 * - Responsive design that adapts to job queue state
 * - Internationalization support for all text content
 * - Multiple file selection capability
 *
 * The component emits events for file selection through both drag-drop and browse button
 * interactions, allowing parent components to handle the actual file processing logic.
 *
 * Technical implementation:
 * - Uses computed properties for dynamic accept strings based on media type
 * - Implements proper ARIA attributes for accessibility
 * - Handles keyboard events for non-mouse users
 * - Conditionally renders different UI states based on job activity
 */

import { Upload } from 'lucide-vue-next';
import { useI18n } from 'vue-i18n';

import { Button } from '@/components/ui/button';
import type { MediaKind } from '@/lib/types';

/**
 * Props interface for FileDropZone component.
 *
 * Defines the configuration options that control the drop zone's behavior
 * and appearance based on application state.
 */
interface FileDropZoneProps {
  /** Whether files are currently being dragged over the zone */
  isDragOver?: boolean;
  /** Whether presets are loaded and ready for file processing */
  presetsReady?: boolean;
  /** Whether there are currently active jobs in the queue */
  hasActiveJobs?: boolean;
  /** Display name for the media type (used in translations) */
  mediaType?: string;
  /** The specific media kind for file type filtering */
  mediaKind?: MediaKind;
}

/**
 * Default props with sensible fallbacks.
 *
 * Ensures the component works correctly even when some props are not provided.
 */
defineProps<FileDropZoneProps>();

/**
 * Event emissions for file selection actions.
 *
 * Defines the events that parent components can listen to for handling
 * file uploads through Tauri's native file picker.
 */
const emit = defineEmits<{
  /** Emitted when user clicks to browse for files */
  browse: [];
}>();

const { t } = useI18n();

/**
 * Handles browse/click actions.
 *
 * Emits the browse event to trigger Tauri's native file picker.
 */
function handleBrowse() {
  emit('browse');
}
</script>

<template>
  <!-- Full-size drop zone displayed when no active jobs exist -->
  <div v-if="!hasActiveJobs" class="py-2">
    <div
      class="group rounded-lg h-48 flex flex-col items-center justify-center cursor-pointer border-2 border-dashed border-border/60 mx-auto hover:border-primary/40 hover:bg-accent/30 transition-all duration-200"
      :class="{ 'border-primary bg-primary/5 scale-[1.01]': isDragOver }"
      role="button"
      aria-label="Upload files"
      tabindex="0"
      data-test="file-dropzone"
      :data-media-kind="mediaKind"
      data-variant="full"
      @click="handleBrowse"
      @keydown.enter="handleBrowse"
      @dragover.prevent
      @dragenter.prevent
      @drop.prevent
    >
      <!-- Upload icon for visual indication -->
      <div
        class="w-12 h-12 rounded-full bg-muted/80 flex items-center justify-center mb-3 group-hover:bg-primary/10 transition-colors duration-200"
      >
        <Upload
          class="w-6 h-6 text-muted-foreground group-hover:text-primary/70 transition-colors duration-200"
          aria-hidden="true"
        />
      </div>
      <!-- Main upload prompt text -->
      <div class="font-medium text-sm text-foreground max-w-xs text-center">
        {{ t('upload.title', { type: mediaType }) }}
      </div>
      <!-- Secondary instruction text -->
      <div class="mt-1 text-xs text-muted-foreground text-center">
        {{ t('upload.message') }}
      </div>
      <!-- Browse button for explicit file selection -->
      <div class="mt-4">
        <Button
          @click.stop="handleBrowse"
          variant="secondary"
          size="sm"
          class="cursor-pointer"
          :disabled="!presetsReady"
          data-test="file-browse-button"
          :data-media-kind="mediaKind"
        >
          {{ t('upload.select') }}
        </Button>
      </div>
    </div>
  </div>

  <!-- Compact drop zone displayed when jobs are active -->
  <div v-else class="py-1">
    <div
      class="group rounded-lg flex items-center justify-center cursor-pointer border border-dashed border-border/60 py-2.5 px-4 hover:border-primary/40 hover:bg-accent/30 transition-all duration-200"
      :class="{ 'border-primary bg-primary/5': isDragOver }"
      role="button"
      aria-label="Upload more files"
      tabindex="0"
      data-test="file-dropzone"
      :data-media-kind="mediaKind"
      data-variant="compact"
      @click="handleBrowse"
      @keydown.enter="handleBrowse"
      @dragover.prevent
      @dragenter.prevent
      @drop.prevent
    >
      <div class="flex items-center gap-3">
        <!-- Upload icon -->
        <Upload class="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <!-- Compact upload prompt -->
        <span class="text-sm text-muted-foreground">Drop more files or</span>
        <!-- Browse button -->
        <Button
          variant="ghost"
          size="sm"
          :disabled="!presetsReady"
          class="cursor-pointer h-7 px-2 text-primary hover:text-primary"
          aria-label="Browse for more media files"
          @click.stop="handleBrowse"
          data-test="file-browse-button"
          :data-media-kind="mediaKind"
        >
          Browse
        </Button>
      </div>
    </div>
  </div>
</template>
