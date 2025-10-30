<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import JobQueueItem from '@/components/JobQueueItem.vue';
import AboutDialog from '@/components/AboutDialog.vue';
import PreferencesDialog from '@/components/PreferencesDialog.vue';
import { availablePresets, loadCapabilities } from '@/lib/capability';
import { DEFAULT_PRESET_ID, PRESETS } from '@/lib/presets';
import { useJobsStore } from '@/stores/jobs';
import { useJobOrchestrator } from '@/composables/use-job-orchestrator';
import type { CapabilitySnapshot } from '@/lib/types';
import { Upload, XCircle } from 'lucide-vue-next';
import { listen } from '@tauri-apps/api/event';
import type { DragDropEvent } from '@tauri-apps/api/window';
import { MEDIA_EXTENSIONS } from '@/lib/file-discovery';

// Simple routing for About and Preferences windows
const currentRoute = ref(window.location.hash.slice(1) || '/');

const capabilities = ref<CapabilitySnapshot>();
const defaultPresetId = ref(DEFAULT_PRESET_ID);
const isDragOver = ref(false);
const fileInput = ref<HTMLInputElement>();

const jobsStore = useJobsStore();
const { jobs } = storeToRefs(jobsStore);

const orchestrator = useJobOrchestrator();

const presetOptions = computed(() => availablePresets(capabilities.value));

const activeJobs = computed(() =>
  jobs.value.filter(
    (job) =>
      job.state.status === 'queued' ||
      job.state.status === 'probing' ||
      job.state.status === 'planning' ||
      job.state.status === 'running',
  ),
);

const completedJobs = computed(() =>
  jobs.value.filter(
    (job) =>
      job.state.status === 'completed' ||
      job.state.status === 'failed' ||
      job.state.status === 'cancelled',
  ),
);

const hasActiveJobs = computed(() => activeJobs.value.length > 0);
const hasCompletedJobs = computed(() => completedJobs.value.length > 0);

function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

async function browseForFiles() {
  if (isTauriRuntime()) {
    try {
      const { open } = await import('@tauri-apps/api/dialog');
      const selection = await open({
        multiple: true,
        filters: [
          {
            name: 'Media',
            extensions: MEDIA_EXTENSIONS,
          },
        ],
      });

      if (Array.isArray(selection)) {
        await addFilesFromPaths(selection);
      } else if (typeof selection === 'string' && selection.length > 0) {
        await addFilesFromPaths([selection]);
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
    console.log('[app] Adding files:', fileList);
    const { discoverDroppedEntries } = await import('@/lib/file-discovery');
    const entries = await discoverDroppedEntries(fileList);
    console.log('[app] Discovered entries:', entries);

    if (!entries.length) {
      console.warn('[app] No valid media files found');
      return;
    }

    const paths = entries.map((entry) => entry.path).filter(Boolean) as string[];
    console.log('[app] Paths to enqueue:', paths);

    const jobIds = jobsStore.enqueueMany(paths, defaultPresetId.value);
    console.log('[app] Enqueued job IDs:', jobIds);
    console.log('[app] Total jobs in store:', jobsStore.jobs.length);

    void orchestrator.startNextAvailable();
  } catch (error) {
    console.error('[app] Failed to add files:', error);
  }
}

async function addFilesFromPaths(paths: string[]) {
  try {
    console.log('[app] Adding files from paths:', paths);

    if (!paths.length) {
      console.warn('[app] No paths provided');
      return;
    }

    // Filter for media files
    const { invoke } = await import('@tauri-apps/api/core');
    let expanded: string[] = [];
    try {
      expanded = await invoke<string[]>('expand_media_paths', { paths });
      console.log('[app] Expanded paths:', expanded);
    } catch (error) {
      console.warn('[app] Failed to expand paths, using original:', error);
      expanded = paths;
    }

    if (!expanded.length) {
      console.warn('[app] No valid media files after expansion');
      return;
    }

    const jobIds = jobsStore.enqueueMany(expanded, defaultPresetId.value);
    console.log('[app] Enqueued job IDs:', jobIds);
    console.log('[app] Total jobs in store:', jobsStore.jobs.length);

    void orchestrator.startNextAvailable();
  } catch (error) {
    console.error('[app] Failed to add files from paths:', error);
  }
}

function cancelAll() {
  activeJobs.value.forEach((job) => {
    void orchestrator.cancel(job.id);
  });
}

function clearCompleted() {
  jobsStore.clearCompleted();
}

function handleCancelJob(jobId: string) {
  void orchestrator.cancel(jobId);
}

function handleUpdatePreset(jobId: string, presetId: string) {
  const job = jobsStore.getJob(jobId);
  if (job && job.state.status === 'queued') {
    job.presetId = presetId;
  }
}

onMounted(async () => {
  capabilities.value = await loadCapabilities();

  window.addEventListener('hashchange', () => {
    currentRoute.value = window.location.hash.slice(1) || '/';
  });

  // Listen for Tauri file drop events
  await listen<DragDropEvent>('tauri://drag-drop', async (event) => {
    console.log('[app] Tauri drag-drop event:', event);
    const payload = event.payload;
    if (payload?.type === 'drop' && Array.isArray(payload.paths) && payload.paths.length > 0) {
      console.log('[app] Files from Tauri drop:', payload.paths);
      isDragOver.value = false;
      await addFilesFromPaths(payload.paths);
    }
  });

  await listen<DragDropEvent>('tauri://drag-enter', (event) => {
    if (event.payload?.type === 'enter' || event.payload?.type === 'over') {
      isDragOver.value = true;
    }
  });

  await listen<DragDropEvent>('tauri://drag-leave', (event) => {
    if (event.payload?.type === 'leave') {
      isDragOver.value = false;
    }
  });
});
</script>

<template>
  <!-- About Dialog -->
  <AboutDialog v-if="currentRoute === '/about'" />

  <!-- Preferences Dialog -->
  <PreferencesDialog v-else-if="currentRoute === '/preferences'" />

  <!-- Main App -->
  <div v-else class="flex min-h-screen flex-col bg-background text-foreground">
    <!-- Drag Region for macOS window controls -->
    <div
      data-tauri-drag-region
      class="fixed left-0 right-0 top-0 h-10 select-none"
      style="
        background: transparent;
        pointer-events: auto;
        -webkit-user-select: none;
        -webkit-app-region: drag;
      "
    />

    <!-- Main Content -->
    <main class="flex flex-1 flex-col gap-6 p-6 pt-10" style="-webkit-app-region: no-drag">
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
          <Button size="lg" @click="browseForFiles"> Choose Files </Button>
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
          <Button variant="outline" size="sm" @click="browseForFiles"> Browse </Button>
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
        <div class="space-y-3">
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
        <div class="space-y-3">
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
          />
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

    <!-- Footer Actions -->
    <footer
      v-if="hasActiveJobs"
      class="border-t border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
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
