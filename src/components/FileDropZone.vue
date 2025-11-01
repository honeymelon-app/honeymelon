<script setup lang="ts">
import { computed, ref } from 'vue';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-vue-next';

interface FileDropZoneProps {
  isDragOver?: boolean;
  presetsReady?: boolean;
  hasActiveJobs?: boolean;
}

const props = withDefaults(defineProps<FileDropZoneProps>(), {
  isDragOver: false,
  presetsReady: true,
  hasActiveJobs: false,
});

const emit = defineEmits<{
  browse: [];
  fileInput: [event: Event];
}>();

const fileInput = ref<HTMLInputElement | null>(null);

function handleBrowse() {
  emit('browse');
}

function handleFileInput(event: Event) {
  emit('fileInput', event);
}

const dropZoneClasses = computed(() => [
  props.isDragOver ? 'border-primary bg-primary/5 shadow-lg' : 'border-border bg-muted/20',
]);

const compactDropZoneClasses = computed(() => [
  props.isDragOver ? 'border-primary bg-primary/5' : 'border-border bg-muted/10',
]);

const uploadIconClasses = computed(() => [
  'h-8 w-8 text-primary transition-transform',
  props.isDragOver && 'scale-110',
]);
</script>

<template>
  <!-- Full Drop Zone (when no active jobs) -->
  <div
    v-if="!hasActiveJobs"
    class="relative flex min-h-[280px] flex-none flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all"
    :class="dropZoneClasses"
  >
    <div class="flex flex-col items-center gap-4 text-center">
      <div class="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
        <Upload :class="uploadIconClasses" />
      </div>
      <div class="space-y-2">
        <h2 class="text-xl font-semibold">Drop your media files here</h2>
        <p class="text-sm text-muted-foreground">or click to browse your computer</p>
      </div>
      <Button size="lg" :disabled="!presetsReady" @click="handleBrowse" class="cursor-pointer">
        Choose Files
      </Button>
    </div>
    <input
      ref="fileInput"
      class="hidden"
      multiple
      type="file"
      accept="video/*,audio/*"
      @change="handleFileInput"
    />
  </div>

  <!-- Compact Drop Zone (when jobs exist) -->
  <div
    v-else
    class="relative flex flex-none items-center justify-center rounded-lg border-2 border-dashed py-4 transition-all"
    :class="compactDropZoneClasses"
  >
    <div class="flex items-center gap-3">
      <Upload class="h-5 w-5 text-muted-foreground" />
      <span class="text-sm text-muted-foreground"> Drop more files here or </span>
      <Button
        variant="outline"
        size="sm"
        :disabled="!presetsReady"
        class="cursor-pointer"
        @click="handleBrowse"
      >
        Browse
      </Button>
    </div>
    <input
      ref="fileInput"
      class="hidden"
      multiple
      type="file"
      accept="video/*,audio/*"
      @change="handleFileInput"
    />
  </div>
</template>
