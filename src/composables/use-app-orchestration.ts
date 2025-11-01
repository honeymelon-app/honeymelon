import { computed, onMounted, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { availablePresets, loadCapabilities } from '@/lib/capability';
import { DEFAULT_PRESET_ID } from '@/lib/presets';
import { useJobsStore } from '@/stores/jobs';
import { useJobOrchestrator } from '@/composables/use-job-orchestrator';
import { useFileHandler } from '@/composables/use-file-handler';
import { useTauriEvents } from '@/composables/use-tauri-events';
import type { CapabilitySnapshot } from '@/lib/types';

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

export function useAppOrchestration() {
  const capabilities = ref<CapabilitySnapshot>();
  const defaultPresetId = ref(DEFAULT_PRESET_ID);
  const isDragOver = ref(false);
  const isAboutOpen = ref(false);
  const isPreferencesOpen = ref(false);

  const jobsStore = useJobsStore();
  const { jobs } = storeToRefs(jobsStore);

  const orchestrator = useJobOrchestrator({ autoStartNext: false });

  const presetOptions = computed(() => availablePresets(capabilities.value));
  const presetsReady = computed(() => presetOptions.value.length > 0);

  const activeJobs = computed(() => jobs.value.filter((j) => ACTIVE_STATUSES.has(j.state.status)));
  const completedJobs = computed(() => jobs.value.filter((j) => DONE_STATUSES.has(j.state.status)));

  const hasActiveJobs = computed(() => activeJobs.value.length > 0);
  const hasCompletedJobs = computed(() => completedJobs.value.length > 0);
  const hasNoJobs = computed(() => jobs.value.length === 0);

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

  return {
    // State
    isDragOver,
    presetsReady,
    activeJobs,
    completedJobs,
    hasActiveJobs,
    hasCompletedJobs,
    hasNoJobs,
    presetOptions,
    isAboutOpen,
    isPreferencesOpen,

    // Handlers
    handleFileInput,
    handleFileDrop,
    handleBrowse,
    handleCancelJob,
    handleUpdatePreset,
    handleStartJob,
    cancelAll,
    clearCompleted,
    openAbout,
    openPreferences,
  };
}
