<script setup lang="ts">
import FileDropZone from '@/components/FileDropZone.vue';

interface FileUploaderProps {
  isDragOver: boolean;
  hasActiveJobs: boolean;
  // eslint-disable-next-line no-unused-vars
  onFileInput?: (event: Event) => void;
  onBrowse?: () => void;
}

const props = defineProps<FileUploaderProps>();
</script>

<template>
  <FileDropZone
    :is-drag-over="props.isDragOver"
    :presets-ready="true"
    :has-active-jobs="props.hasActiveJobs"
    @browse="props.onBrowse"
    @file-input="props.onFileInput"
  />
</template>
