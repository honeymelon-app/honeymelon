<script setup lang="ts">
import { ref, computed } from 'vue';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-vue-next';
import { useI18n } from 'vue-i18n';
import { getAcceptString } from '@/lib/media-formats';
import type { MediaKind } from '@/lib/types';

interface FileDropZoneProps {
  isDragOver?: boolean;
  presetsReady?: boolean;
  hasActiveJobs?: boolean;
  mediaType?: string;
  mediaKind?: MediaKind;
}

const props = withDefaults(defineProps<FileDropZoneProps>(), {
  isDragOver: false,
  presetsReady: true,
  hasActiveJobs: false,
  mediaType: 'media',
  mediaKind: 'video',
});

const acceptString = computed(() => getAcceptString(props.mediaKind));

const emit = defineEmits<{
  browse: [];
  fileInput: [event: Event];
}>();

const { t } = useI18n();

const fileInput = ref<HTMLInputElement | null>(null);

function handleBrowse() {
  emit('browse');
}

function handleFileInput(event: Event) {
  emit('fileInput', event);
}
</script>

<template>
  <!-- Full Drop Zone (when no active jobs) -->
  <div v-if="!hasActiveJobs" class="py-3">
    <label
      for="file-uploader"
      class="group bg-muted/10 rounded-lg h-52 flex flex-col items-center justify-center cursor-pointer border-2 border-dashed mx-auto"
      :class="{ 'border-primary': isDragOver }"
      role="button"
      aria-label="Upload files"
      tabindex="0"
      @keydown.enter="handleBrowse"
    >
      <Upload class="size-12 text-slate-300" aria-hidden="true" />
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
      <div class="font-semibold text-sm text-foreground mt-2 max-w-xs text-center">
        {{ t('upload.title', { type: mediaType }) }}
      </div>
      <div class="mt-1 text-xs text-muted-foreground text-center">
        {{ t('upload.message') }}
      </div>
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

  <!-- Compact Drop Zone (when jobs exist) -->
  <div v-else class="py-3">
    <label
      for="file-uploader-compact"
      class="group bg-muted/10 rounded-lg flex items-center justify-center cursor-pointer border-2 border-dashed py-3 transition-all"
      :class="{ 'border-primary': isDragOver }"
      role="button"
      aria-label="Upload more files"
      tabindex="0"
      @keydown.enter="handleBrowse"
    >
      <div class="flex items-center gap-3">
        <Upload class="h-5 w-5 text-muted-foreground" aria-hidden="true" />
        <span class="text-sm text-muted-foreground"> Drop more files here or </span>
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
