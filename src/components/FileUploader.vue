<script setup lang="ts">
import FileDropZone from '@/components/FileDropZone.vue';
import type { MediaKind } from '@/lib/types';

interface FileUploaderProps {
  isDragOver: boolean;
  hasActiveJobs: boolean;
  mediaKind?: MediaKind;
  // eslint-disable-next-line no-unused-vars
  onFileInput?: (event: Event) => void;
  onBrowse?: () => void;
}

defineProps<FileUploaderProps>();
</script>

<template>
  <FileDropZone
    :is-drag-over="isDragOver"
    :presets-ready="true"
    :has-active-jobs="hasActiveJobs"
    :media-kind="mediaKind"
    @browse="onBrowse"
    @file-input="onFileInput"
  />
</template>
