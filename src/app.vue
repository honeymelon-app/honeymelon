<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import JobQueueItem from '@/components/JobQueueItem.vue';
import AboutDialog from '@/components/AboutDialog.vue';
import PreferencesDialog from '@/components/PreferencesDialog.vue';
import { availablePresets, loadCapabilities } from '@/lib/capability';
import { DEFAULT_PRESET_ID } from '@/lib/presets';
import { useJobsStore } from '@/stores/jobs';
import { useJobOrchestrator } from '@/composables/use-job-orchestrator';
import type { CapabilitySnapshot } from '@/lib/types';
import { Upload, XCircle } from 'lucide-vue-next';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { inferContainerFromPath, mediaKindForContainer } from '@/lib/media-formats';

const capabilities = ref<CapabilitySnapshot>();
const defaultPresetId = ref(DEFAULT_PRESET_ID);
const isDragOver = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);
const presetsReady = computed(() => presetOptions.value.length > 0);

// Store unlisten functions for cleanup
const unlistenDrop = ref<UnlistenFn | null>(null);
const unlistenEnter = ref<UnlistenFn | null>(null);
const unlistenLeave = ref<UnlistenFn | null>(null);
const unlistenMenuAbout = ref<UnlistenFn | null>(null);
const unlistenMenuPreferences = ref<UnlistenFn | null>(null);

const jobsStore = useJobsStore();
const { jobs } = storeToRefs(jobsStore);

const orchestrator = useJobOrchestrator({ autoStartNext: false });

const isAboutOpen = ref(false);
const isPreferencesOpen = ref(false);

const presetOptions = computed(() => availablePresets(capabilities.value));

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

function isPresetAvailable(id: string) {
  return presetOptions.value.some((p) => p.id === id);
}

function presetsForPath(path: string) {
  const container = inferContainerFromPath(path);
  if (!container) {
    return presetOptions.value;
  }

  const kind = mediaKindForContainer(container);
  return presetOptions.value.filter(
    (preset) =>
      preset.mediaKind === kind &&
      (preset.sourceContainers.length === 0 || preset.sourceContainers.includes(container)),
  );
}

function selectDefaultPresetForPath(path: string): string | null {
  const candidates = presetsForPath(path);
  if (candidates.length > 0) {
    return candidates[0].id;
  }
  return presetOptions.value[0]?.id ?? null;
}

function ensureUsablePresetId(prefId: string): string | null {
  if (!presetsReady.value) return null;
  if (isPresetAvailable(prefId)) return prefId;
  // fall back to first available (prevents "uploaded but nothing appears")
  return presetOptions.value[0]?.id ?? null;
}

async function ensurePresetsReady(): Promise<boolean> {
  if (presetsReady.value) return true;
  console.warn('[app] Presets not ready yet; ignoring file input right now.');
  return false;
}

function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

async function browseForFiles() {
  if (!(await ensurePresetsReady())) return;
  if (isTauriRuntime()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const selection = await invoke<string[]>('pick_media_files');
      if (Array.isArray(selection) && selection.length > 0) {
        await addFilesFromPaths(selection);
      }
    } catch (error) {
      console.error('[app] Failed to open media picker:', error);
    }
    return;
  }
  fileInput.value?.click();
}

async function handleFileInput(event: Event) {
  const target = event.target as HTMLInputElement | null;
  if (target?.files) {
    await addFiles(target.files);
    target.value = '';
  }
}

async function addFiles(fileList: FileList) {
  try {
    if (!(await ensurePresetsReady())) return;

    const { discoverDroppedEntries } = await import('@/lib/file-discovery');
    const entries = await discoverDroppedEntries(fileList);
    const paths = entries.map((e) => e.path).filter((p): p is string => !!p?.trim());

    if (!paths.length) {
      console.warn('[app] No resolvable paths from dropped entries', entries.slice(0, 3));
      return;
    }

    // choose a usable preset (fallback to first)
    const jobIds: string[] = [];
    for (const path of paths) {
      const presetId =
        selectDefaultPresetForPath(path) ?? ensureUsablePresetId(defaultPresetId.value);
      if (!presetId) {
        continue;
      }
      const jobId = jobsStore.enqueue(path, presetId);
      if (jobId) {
        jobIds.push(jobId);
      }
    }

    if (jobIds.length) {
      console.log('[app] Enqueued job IDs:', jobIds);
    }
  } catch (error) {
    console.error('[app] Failed to add files:', error);
  }
}

async function addFilesFromPaths(paths: string[]) {
  try {
    if (!(await ensurePresetsReady())) return;

    const validPaths = paths.filter((p) => typeof p === 'string' && p.trim().length > 0);
    if (!validPaths.length) return;

    const { invoke } = await import('@tauri-apps/api/core');
    let expanded: string[] = [];
    try {
      expanded = await invoke<string[]>('expand_media_paths', { paths: validPaths });
    } catch {
      expanded = validPaths;
    }
    if (!expanded.length) return;

    const jobIds: string[] = [];
    for (const path of expanded) {
      const presetId =
        selectDefaultPresetForPath(path) ?? ensureUsablePresetId(defaultPresetId.value);
      if (!presetId) {
        continue;
      }
      const jobId = jobsStore.enqueue(path, presetId);
      if (jobId) {
        jobIds.push(jobId);
      }
    }

    if (jobIds.length) {
      console.log('[app] Enqueued job IDs:', jobIds);
    }
  } catch (error) {
    console.error('[app] Failed to add files from paths:', error);
  }
}

function cancelAll() {
  activeJobs.value.forEach((job) => {
    orchestrator.cancel(job.id).catch((error) => {
      console.error('[app] Failed to cancel job:', job.id, error);
    });
  });
  // Remove any queued jobs since they haven't started yet.
  jobs.value
    .filter((job) => job.state.status === 'queued')
    .forEach((job) => {
      jobsStore.removeJob(job.id);
    });
}

function clearCompleted() {
  jobsStore.clearCompleted();
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

  const allowedPresets = presetsForPath(job.path);
  const requested = allowedPresets.find((preset) => preset.id === presetId);
  if (requested) {
    jobsStore.updateJobPreset(jobId, requested.id);
    return;
  }

  const fallback =
    selectDefaultPresetForPath(job.path) ?? ensureUsablePresetId(defaultPresetId.value);
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
  const usablePreset = ensureUsablePresetId(job.presetId);
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

function openAbout() {
  isAboutOpen.value = true;
}

function openPreferences() {
  isPreferencesOpen.value = true;
}

onMounted(async () => {
  capabilities.value = await loadCapabilities();

  // Prevent accidental window close when jobs are running
  if (isTauriRuntime()) {
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

  // Listen for menu:open event from native menu
  if (isTauriRuntime()) {
    await listen('menu:open', () => {
      browseForFiles().catch((error) => {
        console.error('[app] Failed to open file picker from menu:', error);
      });
    });

    unlistenMenuAbout.value = await listen('menu:about', () => {
      openAbout();
    });

    unlistenMenuPreferences.value = await listen('menu:preferences', () => {
      openPreferences();
    });
  }

  // Listen for Tauri file drop events and store unlisten functions
  // In Tauri v2, the drag-drop event payload is just the array of paths
  unlistenDrop.value = await listen<string[]>('tauri://drag-drop', async (event) => {
    console.log('[app] Tauri drag-drop event:', event);
    const paths = event.payload;
    if (Array.isArray(paths) && paths.length > 0) {
      console.log('[app] Files from Tauri drop:', paths);
      isDragOver.value = false;
      await addFilesFromPaths(paths);
    }
  });

  unlistenEnter.value = await listen('tauri://drag-enter', () => {
    console.log('[app] Drag enter');
    isDragOver.value = true;
  });

  unlistenLeave.value = await listen('tauri://drag-leave', () => {
    console.log('[app] Drag leave');
    isDragOver.value = false;
  });
});

onUnmounted(() => {
  // Clean up event listeners
  unlistenDrop.value?.();
  unlistenEnter.value?.();
  unlistenLeave.value?.();
  unlistenMenuAbout.value?.();
  unlistenMenuPreferences.value?.();
});
</script>

<template>
  <p v-if="!presetsReady" class="text-xs text-muted-foreground">Initializing presets…</p>

  <!-- Main App -->
  <div v-else class="flex h-screen flex-col bg-background text-foreground">
    <!-- Drag Region for macOS window controls -->
    <div
      data-tauri-drag-region
      class="fixed left-0 right-0 top-0 z-50 h-10 select-none will-change-auto"
      style="
        background: transparent;
        pointer-events: auto;
        -webkit-user-select: none;
        -webkit-app-region: drag;
        backface-visibility: hidden;
        transform: translateZ(0);
      "
    />

    <!-- Main Content with ScrollArea -->
    <div class="flex-1 w-full min-h-0">
      <main class="flex h-full min-h-0 flex-col gap-6 p-6 pt-10">
        <!-- Drop Zone (only show when no active jobs) -->
        <div
          v-if="!hasActiveJobs"
          class="relative flex min-h-[280px] flex-none flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all"
          :class="[
            isDragOver ? 'border-primary bg-primary/5 shadow-lg' : 'border-border bg-muted/20',
          ]"
        >
          <div class="flex flex-col items-center gap-4 text-center">
            <div class="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Upload
                :class="['h-8 w-8 text-primary transition-transform', isDragOver && 'scale-110']"
              />
            </div>
            <div class="space-y-2">
              <h2 class="text-xl font-semibold">Drop your media files here</h2>
              <p class="text-sm text-muted-foreground">or click to browse your computer</p>
            </div>
            <Button
              size="lg"
              :disabled="!presetsReady"
              @click="browseForFiles"
              class="cursor-pointer"
            >
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
          :class="[isDragOver ? 'border-primary bg-primary/5' : 'border-border bg-muted/10']"
        >
          <div class="flex items-center gap-3">
            <Upload :class="['h-5 w-5 text-muted-foreground']" />
            <span class="text-sm text-muted-foreground"> Drop more files here or </span>
            <Button
              variant="outline"
              size="sm"
              :disabled="!presetsReady"
              class="cursor-pointer"
              @click="browseForFiles"
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

        <!-- Active Queue -->
        <section v-if="hasActiveJobs" class="flex flex-1 min-h-0 flex-col space-y-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <h2 class="text-lg font-semibold">Converting</h2>
              <Badge variant="secondary">
                {{ activeJobs.length }} file{{ activeJobs.length !== 1 ? 's' : '' }}
              </Badge>
            </div>
          </div>
          <div class="flex min-h-0 flex-1">
            <ScrollArea class="flex-1 min-h-0 [&_[data-slot=scroll-area-viewport]]:pb-6">
              <div class="flex flex-col gap-3 pr-3">
                <JobQueueItem
                  v-for="job in activeJobs"
                  :key="job.id"
                  :job-id="job.id"
                  :path="job.path"
                  :state="job.state"
                  :preset-id="job.presetId"
                  :available-presets="presetOptions"
                  :duration="job.summary?.durationSec"
                  @cancel="handleCancelJob"
                  @update-preset="handleUpdatePreset"
                  @start="handleStartJob"
                />
              </div>
            </ScrollArea>
          </div>
        </section>

        <!-- Completed Jobs -->
        <section v-if="hasCompletedJobs" class="flex flex-1 min-h-0 flex-col space-y-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <h2 class="text-lg font-semibold">Completed</h2>
              <Badge variant="outline">
                {{ completedJobs.length }}
              </Badge>
            </div>
            <Button variant="ghost" size="sm" @click="clearCompleted"> Clear All </Button>
          </div>
          <div class="flex min-h-0 flex-1">
            <ScrollArea class="flex-1 min-h-0 [&_[data-slot=scroll-area-viewport]]:pb-6">
              <div class="flex flex-col gap-3 pr-3">
                <JobQueueItem
                  v-for="job in completedJobs"
                  :key="job.id"
                  :job-id="job.id"
                  :path="job.path"
                  :state="job.state"
                  :preset-id="job.presetId"
                  :available-presets="presetOptions"
                  :duration="job.summary?.durationSec"
                  @cancel="handleCancelJob"
                  @update-preset="handleUpdatePreset"
                  @start="handleStartJob"
                />
              </div>
            </ScrollArea>
          </div>
        </section>

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
    <footer
      v-if="hasActiveJobs"
      class="border-t border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
      style="-webkit-app-region: no-drag"
    >
      <div class="container mx-auto flex h-20 max-w-6xl items-center justify-between px-6">
        <div class="flex items-center gap-4 text-sm text-muted-foreground">
          <span>{{ activeJobs.length }} file{{ activeJobs.length !== 1 ? 's' : '' }} in queue</span>
        </div>
        <div class="flex items-center gap-3">
          <Button variant="outline" size="lg" @click="cancelAll" class="cursor-pointer">
            <XCircle class="mr-2 h-5 w-5" />
            Cancel All
          </Button>
        </div>
      </div>
    </footer>
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
