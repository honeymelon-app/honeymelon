<script setup lang="ts">
import { invoke } from '@tauri-apps/api/core';
import { FolderOpenDot, FolderOpen } from 'lucide-vue-next';
import { storeToRefs } from 'pinia';
import { ref, computed, type HTMLAttributes } from 'vue';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { usePrefsStore } from '@/stores/prefs';

const props = defineProps<{
  class?: HTMLAttributes['class'];
}>();

const prefsStore = usePrefsStore();
const { outputDirectory } = storeToRefs(prefsStore);

const isDialogOpen = ref(false);
const isChoosing = ref(false);

const displayPath = computed(() => {
  if (!outputDirectory.value) {
    return 'Same as source';
  }
  const parts = outputDirectory.value.split('/').filter((part) => part.length > 0);
  if (parts.length <= 2) {
    return outputDirectory.value;
  }
  return `.../${parts.slice(-2).join('/')}`;
});

async function chooseDirectory() {
  isChoosing.value = true;
  try {
    const result = await invoke<string | null>('choose_output_directory', {
      defaultPath: outputDirectory.value || null,
    });

    if (result) {
      prefsStore.setOutputDirectory(result);
    }
  } catch (error) {
    console.error('[destination-chooser] Failed to choose directory:', error);
  } finally {
    isChoosing.value = false;
  }
}

function clearDirectory() {
  prefsStore.setOutputDirectory(null);
}

function openDialog() {
  isDialogOpen.value = true;
}
</script>

<template>
  <div :class="cn(props.class)">
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger as-child>
          <Button
            variant="outline"
            size="icon"
            class="cursor-pointer"
            @click="openDialog"
            data-test="destination-trigger"
          >
            <FolderOpenDot class="size-4" :class="{ 'text-primary': outputDirectory }" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Destination: {{ displayPath }}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>

    <Dialog v-model:open="isDialogOpen">
      <DialogContent class="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Output Destination</DialogTitle>
        </DialogHeader>

        <div class="space-y-3">
          <button
            @click="clearDirectory"
            :class="
              cn(
                'w-full text-left rounded-lg border-2 p-4 transition-all hover:bg-accent',
                !outputDirectory ? 'border-primary bg-primary/5' : 'border-border',
              )
            "
            data-test="destination-option-source"
          >
            <div class="flex items-start gap-3">
              <div class="mt-0.5">
                <Folder
                  :class="cn('size-5', !outputDirectory ? 'text-primary' : 'text-muted-foreground')"
                />
              </div>
              <div class="flex-1 min-w-0">
                <div class="font-medium text-sm">Same as source file</div>
                <div class="text-xs text-muted-foreground mt-1">
                  Save converted files in the same folder as the original
                </div>
              </div>
              <div
                v-if="!outputDirectory"
                class="size-5 rounded-full bg-primary flex items-center justify-center shrink-0"
              >
                <div class="size-2 rounded-full bg-primary-foreground" />
              </div>
            </div>
          </button>

          <button
            @click="chooseDirectory"
            :disabled="isChoosing"
            :class="
              cn(
                'w-full text-left rounded-lg border-2 p-4 transition-all hover:bg-accent',
                outputDirectory ? 'border-primary bg-primary/5' : 'border-border',
                isChoosing && 'opacity-50 cursor-not-allowed',
              )
            "
            data-test="destination-option-custom"
          >
            <div class="flex items-start gap-3">
              <div class="mt-0.5">
                <FolderOpen
                  :class="cn('size-5', outputDirectory ? 'text-primary' : 'text-muted-foreground')"
                />
              </div>
              <div class="flex-1 min-w-0">
                <div class="font-medium text-sm">
                  {{ isChoosing ? 'Choosing folder...' : 'Custom folder' }}
                </div>
                <TooltipProvider v-if="outputDirectory">
                  <Tooltip>
                    <TooltipTrigger as-child>
                      <div class="text-xs text-muted-foreground mt-1 truncate cursor-help">
                        {{ outputDirectory }}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent class="max-w-sm">
                      <p class="break-all">{{ outputDirectory }}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <div v-else class="text-xs text-muted-foreground mt-1">
                  Click to choose a destination folder
                </div>
              </div>
              <div class="flex items-center gap-2 shrink-0">
                <div
                  v-if="outputDirectory"
                  class="size-5 rounded-full bg-primary flex items-center justify-center"
                >
                  <div class="size-2 rounded-full bg-primary-foreground" />
                </div>
              </div>
            </div>
          </button>
        </div>

        <div class="flex justify-end pt-2">
          <DialogClose as-child>
            <Button variant="outline" size="sm" class="cursor-pointer"> Close </Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  </div>
</template>
