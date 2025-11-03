<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import Window from '@/components/Window.vue';
import FileUploader from '@/components/FileUploader.vue';
import JobQueue from '@/components/JobQueue.vue';
import AppLoadingSkeleton from '@/components/AppLoadingSkeleton.vue';
import AboutDialog from '@/components/AboutDialog.vue';
import LanguageSwitcher from '@/components/LanguageSwitcher.vue';
import ThemeSwitcher from '@/components/ThemeSwitcher.vue';
import { useAppOrchestration } from '@/composables/use-app-orchestration';
import { PRESETS } from '@/lib/presets';
import type { MediaKind } from '@/lib/types';

const { t } = useI18n();

const app = useAppOrchestration();
const {
  isDragOver,
  presetsReady,
  activeJobs,
  completedJobs,
  hasActiveJobs,
  presetOptions,
  isAboutOpen,
  handleFileInput,
  handleBrowse,
  handleCancelJob,
  handleUpdatePreset,
  handleStartJob,
  cancelAll,
  clearCompleted,
} = app;

// Filter jobs by media type
function getJobMediaKind(presetId: string): MediaKind | null {
  const preset = PRESETS.find((p) => p.id === presetId);
  return preset?.mediaKind ?? null;
}

function filterJobsByMediaKind(jobs: typeof activeJobs.value, mediaKind: MediaKind) {
  return jobs.filter((job) => getJobMediaKind(job.presetId) === mediaKind);
}

const videoActiveJobs = computed(() => filterJobsByMediaKind(activeJobs.value, 'video'));
const videoCompletedJobs = computed(() => filterJobsByMediaKind(completedJobs.value, 'video'));
const hasVideoActiveJobs = computed(() => videoActiveJobs.value.length > 0);
const hasVideoCompletedJobs = computed(() => videoCompletedJobs.value.length > 0);
const hasNoVideoJobs = computed(
  () => videoActiveJobs.value.length === 0 && videoCompletedJobs.value.length === 0,
);

const audioActiveJobs = computed(() => filterJobsByMediaKind(activeJobs.value, 'audio'));
const audioCompletedJobs = computed(() => filterJobsByMediaKind(completedJobs.value, 'audio'));
const hasAudioActiveJobs = computed(() => audioActiveJobs.value.length > 0);
const hasAudioCompletedJobs = computed(() => audioCompletedJobs.value.length > 0);
const hasNoAudioJobs = computed(
  () => audioActiveJobs.value.length === 0 && audioCompletedJobs.value.length === 0,
);

const imageActiveJobs = computed(() => filterJobsByMediaKind(activeJobs.value, 'image'));
const imageCompletedJobs = computed(() => filterJobsByMediaKind(completedJobs.value, 'image'));
const hasImageActiveJobs = computed(() => imageActiveJobs.value.length > 0);
const hasImageCompletedJobs = computed(() => imageCompletedJobs.value.length > 0);
const hasNoImageJobs = computed(
  () => imageActiveJobs.value.length === 0 && imageCompletedJobs.value.length === 0,
);
</script>

<template>
  <!-- Loading Skeleton -->
  <AppLoadingSkeleton v-if="!presetsReady" />

  <!-- Main App -->
  <Window
    v-else
    :show-footer="hasActiveJobs"
    :active-job-count="activeJobs.length"
    @cancel-all="cancelAll"
  >
    <!-- Container with relative positioning for absolute controls -->
    <div class="relative flex flex-col flex-1">
      <!-- Top-right controls -->
      <div class="absolute right-0 top-0 z-10 flex items-center gap-x-3">
        <LanguageSwitcher />
        <ThemeSwitcher />
      </div>

      <!-- Tabs for media type filtering -->
      <Tabs default-value="video" class="flex flex-col flex-1">
        <TabsList aria-label="Media type filter">
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

        <KeepAlive>
          <div class="flex-1 flex flex-col min-h-0">
            <!-- Video Tab -->
            <TabsContent
              value="video"
              class="flex-1 flex flex-col data-[state=active]:flex data-[state=inactive]:hidden"
            >
              <FileUploader
                :is-drag-over="isDragOver"
                :has-active-jobs="hasVideoActiveJobs"
                :on-file-input="handleFileInput"
                :on-browse="handleBrowse"
              />
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

            <!-- Audio Tab -->
            <TabsContent
              value="audio"
              class="flex-1 flex flex-col data-[state=active]:flex data-[state=inactive]:hidden"
            >
              <FileUploader
                :is-drag-over="isDragOver"
                :has-active-jobs="hasAudioActiveJobs"
                :on-file-input="handleFileInput"
                :on-browse="handleBrowse"
              />
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

            <!-- Image Tab -->
            <TabsContent
              value="image"
              class="flex-1 flex flex-col data-[state=active]:flex data-[state=inactive]:hidden"
            >
              <FileUploader
                :is-drag-over="isDragOver"
                :has-active-jobs="hasImageActiveJobs"
                :on-file-input="handleFileInput"
                :on-browse="handleBrowse"
              />
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

  <!-- About Dialog -->
  <Dialog v-model:open="isAboutOpen" modal>
    <DialogContent class="sm:max-w-md" aria-labelledby="about-dialog-title">
      <AboutDialog />
    </DialogContent>
  </Dialog>
</template>
