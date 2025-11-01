<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import WindowDragRegion from '@/components/WindowDragRegion.vue';
import FileDropZone from '@/components/FileDropZone.vue';
import JobQueueSection from '@/components/JobQueueSection.vue';
import AppFooter from '@/components/AppFooter.vue';
import AboutDialog from '@/components/AboutDialog.vue';
import PreferencesDialog from '@/components/PreferencesDialog.vue';
import { availablePresets, loadCapabilities } from '@/lib/capability';
import { DEFAULT_PRESET_ID } from '@/lib/presets';
import { useJobsStore } from '@/stores/jobs';
import { useJobOrchestrator } from '@/composables/use-job-orchestrator';
import { useFileHandler } from '@/composables/use-file-handler';
import { useTauriEvents } from '@/composables/use-tauri-events';
import type { CapabilitySnapshot } from '@/lib/types';

const capabilities = ref<CapabilitySnapshot>();
const defaultPresetId = ref(DEFAULT_PRESET_ID);
const isDragOver = ref(false);

const jobsStore = useJobsStore();
const { jobs } = storeToRefs(jobsStore);

const orchestrator = useJobOrchestrator({ autoStartNext: false });

const isAboutOpen = ref(false);
const isPreferencesOpen = ref(false);

const presetOptions = computed(() => availablePresets(capabilities.value));
const presetsReady = computed(() => presetOptions.value.length > 0);

const ACTIVE_STATUSES = new Set([
  'queued',
  'probing',
  'planning',
  'running',
  'pending',
  'created',
  'ready',
]);
const DONE_STATUSES = new Set(['completed', 'failed', 'cancelled']);

const activeJobs = computed(() => jobs.value.filter((j) => ACTIVE_STATUSES.has(j.state.status)));
const completedJobs = computed(() => jobs.value.filter((j) => DONE_STATUSES.has(j.state.status)));

const hasActiveJobs = computed(() => activeJobs.value.length > 0);
const hasCompletedJobs = computed(() => completedJobs.value.length > 0);

const fileHandler = useFileHandler({
  presetOptions,
  defaultPresetId,
  presetsReady,
});

function handleFileInput(event: Event) {
  const target = event.target as HTMLInputElement | null;
  if (target?.files) {
    fileHandler.addFiles(target.files);
    target.value = '';
  }
}

async function handleFileDrop(paths: string[]) {
  isDragOver.value = false;
  await fileHandler.addFilesFromPaths(paths);
}

async function handleBrowse() {
  await fileHandler.browseForFiles();
}

function handleCancelJob(jobId: string) {
  const job = jobsStore.getJob(jobId);
  if (!job) {
    return;
  }

  if (job.state.status === 'queued') {
    jobsStore.removeJob(jobId);
    return;
  }

  orchestrator.cancel(jobId).catch((error) => {
    console.error('[app] Failed to cancel job:', jobId, error);
  });
}

function handleUpdatePreset(jobId: string, presetId: string) {
  const job = jobsStore.getJob(jobId);
  if (!job || job.state.status !== 'queued') {
    return;
  }

  const allowedPresets = fileHandler.presetsForPath(job.path);
  const requested = allowedPresets.find((preset) => preset.id === presetId);
  if (requested) {
    jobsStore.updateJobPreset(jobId, requested.id);
    return;
  }

  const fallback =
    fileHandler.selectDefaultPresetForPath(job.path) ??
    fileHandler.ensureUsablePresetId(defaultPresetId.value);
  if (fallback) {
    jobsStore.updateJobPreset(jobId, fallback);
  } else {
    console.warn('[app] No compatible preset available for job:', jobId);
  }
}

function handleStartJob(jobId: string) {
  const job = jobsStore.getJob(jobId);
  if (!job) {
    return;
  }
  const usablePreset = fileHandler.ensureUsablePresetId(job.presetId);
  if (!usablePreset) {
    console.warn('[app] Cannot start job; preset not ready.');
    return;
  }
  orchestrator
    .startJob({
      jobId,
      path: job.path,
      presetId: usablePreset,
      tier: job.tier,
    })
    .catch((error) => {
      console.error('[app] Failed to start job:', jobId, error);
    });
  console.debug('[app] startJob dispatched', { jobId, presetId: usablePreset });
}

function cancelAll() {
  activeJobs.value.forEach((job) => {
    orchestrator.cancel(job.id).catch((error) => {
      console.error('[app] Failed to cancel job:', job.id, error);
    });
  });
  jobs.value
    .filter((job) => job.state.status === 'queued')
    .forEach((job) => {
      jobsStore.removeJob(job.id);
    });
}

function clearCompleted() {
  jobsStore.clearCompleted();
}

function openAbout() {
  isAboutOpen.value = true;
}

function openPreferences() {
  isPreferencesOpen.value = true;
}

useTauriEvents({
  onDrop: handleFileDrop,
  onDragEnter: () => {
    isDragOver.value = true;
  },
  onDragLeave: () => {
    isDragOver.value = false;
  },
  onMenuOpen: handleBrowse,
  onMenuAbout: openAbout,
  onMenuPreferences: openPreferences,
});

onMounted(async () => {
  capabilities.value = await loadCapabilities();

  if (fileHandler.isTauriRuntime()) {
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    const currentWindow = getCurrentWindow();
    await currentWindow.onCloseRequested(async (event) => {
      if (hasActiveJobs.value) {
        const confirmed = window.confirm(
          `You have ${activeJobs.value.length} job(s) currently running. Are you sure you want to quit? This will cancel all active jobs.`,
        );
        if (!confirmed) {
          event.preventDefault();
        }
      }
    });
  }
});
</script>

<template>
  <p v-if="!presetsReady" class="text-xs text-muted-foreground">Initializing presets…</p>

  <!-- Main App -->
  <div v-else class="flex h-screen flex-col bg-background text-foreground">
    <!-- Drag Region for macOS window controls -->
    <WindowDragRegion />

    <!-- Main Content with ScrollArea -->
    <div class="flex-1 w-full min-h-0">
      <main class="flex h-full min-h-0 flex-col gap-6 p-6 pt-10">
        <!-- Drop Zone -->
        <FileDropZone
          :is-drag-over="isDragOver"
          :presets-ready="presetsReady"
          :has-active-jobs="hasActiveJobs"
          @browse="handleBrowse"
          @file-input="handleFileInput"
        />

        <!-- Active Queue -->
        <JobQueueSection
          :jobs="activeJobs"
          title="Converting"
          variant="active"
          :available-presets="presetOptions"
          @cancel="handleCancelJob"
          @update-preset="handleUpdatePreset"
          @start="handleStartJob"
        />

        <!-- Completed Jobs -->
        <JobQueueSection
          :jobs="completedJobs"
          title="Completed"
          variant="completed"
          :available-presets="presetOptions"
          :show-clear-button="true"
          @cancel="handleCancelJob"
          @update-preset="handleUpdatePreset"
          @start="handleStartJob"
          @clear-completed="clearCompleted"
        />

        <!-- Empty State -->
        <div
          v-if="!hasActiveJobs && !hasCompletedJobs && jobs.length === 0"
          class="flex flex-1 items-center justify-center py-12"
        >
          <div class="text-center text-muted-foreground">
            <p class="text-sm">No files in queue</p>
          </div>
        </div>
      </main>
    </div>

    <!-- Footer Actions -->
    <AppFooter v-if="hasActiveJobs" :active-job-count="activeJobs.length" @cancel-all="cancelAll" />
  </div>

  <Dialog :open="isAboutOpen" @update:open="(value) => (isAboutOpen = value)" modal>
    <DialogContent class="sm:max-w-md">
      <AboutDialog />
    </DialogContent>
  </Dialog>

  <Dialog :open="isPreferencesOpen" @update:open="(value) => (isPreferencesOpen = value)" modal>
    <DialogContent class="sm:max-w-2xl pt-12">
      <ScrollArea class="max-h-[70vh] overflow-y-auto pr-2">
        <PreferencesDialog />
      </ScrollArea>
    </DialogContent>
  </Dialog>
</template>
