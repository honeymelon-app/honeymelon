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
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';

import { Button } from '@/components/ui/button';
import { getAcceptString } from '@/lib/media-formats';
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
const props = withDefaults(defineProps<FileDropZoneProps>(), {
  isDragOver: false,
  presetsReady: true,
  hasActiveJobs: false,
  mediaType: 'media',
  mediaKind: 'video',
});

/**
 * Computed property for file input accept string.
 *
 * Generates the appropriate file type filter string based on the media kind,
 * ensuring users can only select supported file formats for conversion.
 */
const acceptString = computed(() => getAcceptString(props.mediaKind));

/**
 * Event emissions for file selection actions.
 *
 * Defines the events that parent components can listen to for handling
 * file uploads through different interaction methods.
 */
const emit = defineEmits<{
  /** Emitted when user clicks browse button */
  browse: [];
  /** Emitted when files are selected via input or drop */
  fileInput: [event: Event];
}>();

const { t } = useI18n();

/**
 * Reference to the hidden file input element.
 *
 * Used for programmatically triggering file selection dialogs.
 */
const fileInput = ref<HTMLInputElement | null>(null);

/**
 * Handles browse button clicks.
 *
 * Emits the browse event to allow parent components to handle
 * file dialog opening logic.
 */
function handleBrowse() {
  emit('browse');
}

/**
 * Handles file input change events.
 *
 * Emits the fileInput event with the change event, allowing
 * parent components to process the selected files.
 */
function handleFileInput(event: Event) {
  emit('fileInput', event);
}
</script>

<template>
  <!-- Full-size drop zone displayed when no active jobs exist -->
  <div v-if="!hasActiveJobs" class="py-3">
    <label
      for="file-uploader"
      class="group bg-muted/10 rounded-lg h-52 flex flex-col items-center justify-center cursor-pointer border-2 border-dashed mx-auto"
      :class="{ 'border-primary': isDragOver }"
      role="button"
      aria-label="Upload files"
      tabindex="0"
      @keydown.enter="handleBrowse"
      @dragover.prevent
      @dragenter.prevent
      @drop.prevent
    >
      <!-- Upload icon for visual indication -->
      <Upload class="size-12 text-slate-300" aria-hidden="true" />
      <!-- Hidden file input for actual file selection -->
      <input
        ref="fileInput"
        type="file"
        id="file-uploader"
        class="hidden"
        @change="handleFileInput"
        multiple
        :accept="acceptString"
        aria-label="Upload media files"
      />
      <!-- Main upload prompt text -->
      <div class="font-semibold text-sm text-foreground mt-2 max-w-xs text-center">
        {{ t('upload.title', { type: mediaType }) }}
      </div>
      <!-- Secondary instruction text -->
      <div class="mt-1 text-xs text-muted-foreground text-center">
        {{ t('upload.message') }}
      </div>
      <!-- Browse button for explicit file selection -->
      <div class="mt-4">
        <Button
          @click="handleBrowse"
          variant="secondary"
          class="group-hover:bg-secondary/80"
          :disabled="!presetsReady"
        >
          {{ t('upload.select') }}
        </Button>
      </div>
    </label>
  </div>

  <!-- Compact drop zone displayed when jobs are active -->
  <div v-else class="py-3">
    <label
      for="file-uploader-compact"
      class="group bg-muted/10 rounded-lg flex items-center justify-center cursor-pointer border-2 border-dashed py-3 transition-all"
      :class="{ 'border-primary': isDragOver }"
      role="button"
      aria-label="Upload more files"
      tabindex="0"
      @keydown.enter="handleBrowse"
      @dragover.prevent
      @dragenter.prevent
      @drop.prevent
    >
      <div class="flex items-center gap-3">
        <!-- Upload icon -->
        <Upload class="h-5 w-5 text-muted-foreground" aria-hidden="true" />
        <!-- Compact upload prompt -->
        <span class="text-sm text-muted-foreground"> Drop more files here or </span>
        <!-- Browse button -->
        <Button
          variant="outline"
          size="sm"
          :disabled="!presetsReady"
          class="cursor-pointer"
          aria-label="Browse for more media files"
          @click="handleBrowse"
        >
          Browse
        </Button>
      </div>
      <!-- Hidden file input for compact mode -->
      <input
        ref="fileInput"
        type="file"
        id="file-uploader-compact"
        class="hidden"
        @change="handleFileInput"
        multiple
        :accept="acceptString"
        aria-label="Upload more media files"
      />
    </label>
  </div>
</template>
