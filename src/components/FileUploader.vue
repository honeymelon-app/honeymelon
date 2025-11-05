<script setup lang="ts">
/**
 * File uploader component wrapper.
 *
 * This component serves as a thin abstraction layer over the FileDropZone component,
 * providing a simplified interface for file upload functionality. It passes through
 * all necessary props and events to the underlying FileDropZone while maintaining
 * a clean API for parent components.
 *
 * Purpose:
 * - Simplifies the file upload interface for consuming components
 * - Provides consistent prop forwarding to FileDropZone
 * - Acts as an abstraction layer for potential future enhancements
 * - Maintains separation of concerns between upload logic and UI
 *
 * The component essentially delegates all functionality to FileDropZone,
 * making it easier to use in different contexts without exposing internal details.
 */

import FileDropZone from '@/components/FileDropZone.vue';
import type { MediaKind } from '@/lib/types';

/**
 * Props interface for FileUploader component.
 *
 * Mirrors the essential props from FileDropZone that are needed
 * for file upload functionality, with optional event handlers.
 */
interface FileUploaderProps {
  /** Whether files are currently being dragged over the zone */
  isDragOver: boolean;
  /** Whether there are currently active jobs affecting UI state */
  hasActiveJobs: boolean;
  /** The media kind for file type filtering (optional) */
  mediaKind?: MediaKind;
  /** Callback for file input events */
  // eslint-disable-next-line no-unused-vars
  onFileInput?: (event: Event) => void;
  /** Callback for browse button clicks */
  onBrowse?: () => void;
}

defineProps<FileUploaderProps>();
</script>

<template>
  <!-- Delegate all functionality to FileDropZone component -->
  <FileDropZone
    :is-drag-over="isDragOver"
    :presets-ready="true"
    :has-active-jobs="hasActiveJobs"
    :media-kind="mediaKind"
    @browse="onBrowse"
    @file-input="onFileInput"
  />
</template>
