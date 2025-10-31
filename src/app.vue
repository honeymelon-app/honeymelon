<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
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

// Simple routing for About and Preferences windows
const currentRoute = ref(
  typeof window !== 'undefined' ? window.location.hash.slice(1) || '/' : '/',
);

const capabilities = ref<CapabilitySnapshot>();
const defaultPresetId = ref(DEFAULT_PRESET_ID);
const isDragOver = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);
const presetsReady = computed(() => presetOptions.value.length > 0);

// Store unlisten functions for cleanup
const unlistenDrop = ref<UnlistenFn | null>(null);
const unlistenEnter = ref<UnlistenFn | null>(null);
const unlistenLeave = ref<UnlistenFn | null>(null);

const jobsStore = useJobsStore();
const { jobs } = storeToRefs(jobsStore);

const orchestrator = useJobOrchestrator();

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
    const presetId = ensureUsablePresetId(defaultPresetId.value);
    if (!presetId) {
      console.error('[app] No presets available yet.');
      return;
    }

    const jobIds = jobsStore.enqueueMany(paths, presetId);
    console.log('[app] Enqueued job IDs:', jobIds);
    orchestrator
      .startNextAvailable()
      .catch((err) => console.error('[app] startNextAvailable', err));
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

    const presetId = ensureUsablePresetId(defaultPresetId.value);
    if (!presetId) {
      console.error('[app] No presets available yet.');
      return;
    }

    const jobIds = jobsStore.enqueueMany(expanded, presetId);
    console.log('[app] Enqueued job IDs:', jobIds);
    orchestrator
      .startNextAvailable()
      .catch((err) => console.error('[app] startNextAvailable', err));
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
}

function clearCompleted() {
  jobsStore.clearCompleted();
}

function handleCancelJob(jobId: string) {
  orchestrator.cancel(jobId).catch((error) => {
    console.error('[app] Failed to cancel job:', jobId, error);
  });
}

function handleUpdatePreset(jobId: string, presetId: string) {
  const usable = ensureUsablePresetId(presetId);
  if (!usable) {
    console.warn('[app] No usable preset right now.');
    return;
  }
  const job = jobsStore.getJob(jobId);
  if (job && job.state.status === 'queued') {
    jobsStore.updateJobPreset(jobId, usable);
  }
}

onMounted(async () => {
  capabilities.value = await loadCapabilities();

  window.addEventListener('hashchange', () => {
    currentRoute.value = window.location.hash.slice(1) || '/';
  });

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
});
</script>

<template>
  <!-- About Dialog -->
  <AboutDialog v-if="currentRoute === '/about'" />

  <!-- Preferences Dialog -->
  <PreferencesDialog v-else-if="currentRoute === '/preferences'" />

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
    <div class="flex-1 w-full overflow-hidden">
      <main class="flex flex-col gap-6 p-6 pt-10">
        <!-- Drop Zone (only show when no active jobs) -->
        <div
          v-if="!hasActiveJobs"
          class="relative flex min-h-[280px] flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all"
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
            <Button size="lg" :disabled="!presetsReady" @click="browseForFiles">
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
          class="relative flex items-center justify-center rounded-lg border-2 border-dashed py-4 transition-all"
          :class="[isDragOver ? 'border-primary bg-primary/5' : 'border-border bg-muted/10']"
        >
          <div class="flex items-center gap-3">
            <Upload :class="['h-5 w-5 text-muted-foreground']" />
            <span class="text-sm text-muted-foreground"> Drop more files here or </span>
            <Button variant="outline" size="sm" :disabled="!presetsReady" @click="browseForFiles">
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
        <section v-if="hasActiveJobs" class="space-y-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <h2 class="text-lg font-semibold">Converting</h2>
              <Badge variant="secondary">
                {{ activeJobs.length }} file{{ activeJobs.length !== 1 ? 's' : '' }}
              </Badge>
            </div>
          </div>
          <div class="">
            <ScrollArea class="w-full space-y-3 h-[500px] overflow-y-auto">
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
              />
            </ScrollArea>
          </div>
        </section>

        <!-- Completed Jobs -->
        <section v-if="hasCompletedJobs" class="space-y-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <h2 class="text-lg font-semibold">Completed</h2>
              <Badge variant="outline">
                {{ completedJobs.length }}
              </Badge>
            </div>
            <Button variant="ghost" size="sm" @click="clearCompleted"> Clear All </Button>
          </div>
          <div class="">
            <ScrollArea class="w-full space-y-3 h-[500px] overflow-y-auto">
              <JobQueueItem
                v-for="job in completedJobs"
                class="mb-4"
                :key="job.id"
                :job-id="job.id"
                :path="job.path"
                :state="job.state"
                :preset-id="job.presetId"
                :available-presets="presetOptions"
                :duration="job.summary?.durationSec"
                @cancel="handleCancelJob"
                @update-preset="handleUpdatePreset"
              />
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
          <Button variant="outline" size="lg" @click="cancelAll">
            <XCircle class="mr-2 h-5 w-5" />
            Cancel All
          </Button>
        </div>
      </div>
    </footer>
  </div>
</template>
