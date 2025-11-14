/**
 * Application orchestration composable - Central coordinator for Honeymelon functionality.
 *
 * This composable serves as the main orchestrator for the entire Honeymelon application,
 * coordinating between various subsystems including file handling, job management, preset
 * configuration, and UI state. It acts as the glue that binds together all the different
 * parts of the application into a cohesive user experience.
 *
 * Key responsibilities:
 * - Manages application-wide state (drag state, capabilities, presets)
 * - Coordinates file upload and processing workflows
 * - Handles job lifecycle management (start, cancel, queue, complete)
 * - Implements batch operations for multiple job management
 * - Manages drag-and-drop interactions
 * - Handles window close confirmation for active jobs
 * - Integrates with Tauri events for desktop-specific functionality
 *
 * Architecture:
 * The composable uses a layered approach:
 * 1. State management via Pinia stores (jobs, capabilities)
 * 2. Business logic delegation to specialized composables (fileHandler, orchestrator)
 * 3. Event handling for user interactions and system events
 * 4. Reactive computed properties for UI state derivation
 * 5. Batch processing logic for efficient job management
 *
 * Job State Management:
 * - ACTIVE_STATUSES: Jobs that are currently being processed or waiting to start
 * - DONE_STATUSES: Jobs that have finished (successfully or with errors)
 * - Queued jobs are managed separately for batch operations
 *
 * Batch Operations:
 * Implements intelligent batch starting that respects concurrency limits and
 * automatically fills available processing slots as jobs complete.
 *
 * Error Handling:
 * Provides comprehensive error handling for job operations with console logging
 * for debugging while maintaining UI stability.
 */

import { storeToRefs } from 'pinia';
import { computed, getCurrentInstance, onMounted, ref, watch, type Ref } from 'vue';

import { useCapabilityGate } from '@/composables/use-capability-gate';
import { useDesktopBridge } from '@/composables/use-desktop-bridge';
import { useFileHandler } from '@/composables/use-file-handler';
import { useJobOrchestrator } from '@/composables/use-job-orchestrator';
import { useJobsStore } from '@/stores/jobs';

/**
 * Job statuses that indicate active/processing state.
 *
 * These statuses represent jobs that are either currently running,
 * queued for processing, or in preparation stages.
 */
const ACTIVE_STATUSES = new Set([
  'queued',
  'probing',
  'planning',
  'running',
  'pending',
  'created',
  'ready',
]);

/**
 * Job statuses that indicate completion.
 *
 * These statuses represent jobs that have finished processing,
 * either successfully, with failure, or were cancelled.
 */
const DONE_STATUSES = new Set(['completed', 'failed', 'cancelled']);

export function useAppOrchestration() {
  /**
   * Application capabilities snapshot.
   *
   * Contains information about available FFmpeg codecs, formats, and
   * system capabilities that determine which presets are available.
   */
  const { defaultPresetId, presetOptions, presetsReady, loadCapabilitySnapshot } =
    useCapabilityGate();

  /**
   * About dialog visibility state.
   */
  const isAboutOpen = ref(false);

  /**
   * Jobs store integration.
   *
   * Provides access to the centralized job management state.
   */
  const jobsStore = useJobsStore();
  const jobsRefs = storeToRefs(jobsStore);
  const jobs = jobsRefs.jobs;
  const maxConcurrency = jobsRefs.maxConcurrency;
  const processingJobs = jobsRefs.activeJobs;
  const storeQueuedJobs = jobsRefs.queuedJobs;

  /**
   * Job orchestrator for managing job execution.
   *
   * Handles the actual starting, monitoring, and cancellation of conversion jobs.
   */
  const orchestrator = useJobOrchestrator({ autoStartNext: false });

  /**
   * Active jobs (currently processing or queued).
   *
   * Jobs that are in active states and require processing resources.
   */
  const activeJobs = computed(() => jobs.value.filter((j) => ACTIVE_STATUSES.has(j.state.status)));

  /**
   * Completed jobs (finished processing).
   *
   * Jobs that have finished, either successfully or with errors.
   */
  const completedJobs = computed(() => jobs.value.filter((j) => DONE_STATUSES.has(j.state.status)));

  /**
   * Queued jobs from the store.
   *
   * Jobs that are waiting to be started.
   */
  const queuedJobs = computed(() => storeQueuedJobs.value);

  /**
   * Computed properties for job state checks.
   *
   * These reactive properties provide convenient boolean checks for UI rendering
   * and conditional logic throughout the application.
   */
  const hasActiveJobs = computed(() => activeJobs.value.length > 0);
  const hasCompletedJobs = computed(() => completedJobs.value.length > 0);
  const hasNoJobs = computed(() => jobs.value.length === 0);
  const hasQueuedJobs = computed(() => queuedJobs.value.length > 0);

  /**
   * File handler for managing file operations.
   *
   * Handles file selection, validation, and preset compatibility checking.
   */
  const fileHandler = useFileHandler({
    presetOptions,
    defaultPresetId,
    presetsReady,
  });

  /**
   * Handles file input from HTML file inputs.
   *
   * Processes files selected through traditional file input elements,
   * adds them to the job queue, and resets the input for future selections.
   */
  function handleFileInput(event: Event) {
    const target = event.target as HTMLInputElement | null;
    if (target?.files) {
      fileHandler.addFiles(target.files);
      target.value = '';
    }
  }

  /**
   * Snapshot of the desktop drag state so file handlers invoked directly
   * (e.g. from tests) still clear the indicator after processing.
   */
  let dragStateRef: Ref<boolean> | null = null;

  /**
   * Handles file drop events from drag-and-drop operations.
   *
   * Processes files dropped onto the application and adds them to the job queue.
   * Ensures the drag-over visual state resets even when invoked outside of the
   * desktop bridge callbacks.
   */
  async function handleFileDrop(paths: string[]) {
    if (dragStateRef) {
      dragStateRef.value = false;
    }
    await fileHandler.addFilesFromPaths(paths, { alreadyExpanded: true });
  }

  /**
   * Handles browse button clicks for file selection.
   *
   * Opens the system's file browser dialog, optionally filtered by media kind.
   */
  async function handleBrowse(mediaKind?: string) {
    await fileHandler.browseForFiles(mediaKind);
  }

  /**
   * Handles job cancellation requests.
   *
   * Cancels a specific job, either by removing it from the queue (if queued)
   * or by stopping active processing (if running).
   */
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

  /**
   * Handles preset updates for queued jobs.
   *
   * Updates the preset for a queued job, ensuring the new preset is compatible
   * with the file type. Falls back to a compatible preset if the requested one
   * is not available.
   */
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

    // Fallback to a compatible preset
    const fallback =
      fileHandler.selectDefaultPresetForPath(job.path) ??
      fileHandler.ensureUsablePresetId(defaultPresetId.value);
    if (fallback) {
      jobsStore.updateJobPreset(jobId, fallback);
    } else {
      console.warn('[app] No compatible preset available for job:', jobId);
    }
  }

  /**
   * Batch auto-start flag.
   *
   * Controls whether the system should automatically start queued jobs
   * as processing slots become available.
   */
  const batchAutoStart = ref(false);

  /**
   * Fills available processing slots with queued jobs.
   *
   * Implements intelligent batch processing that starts queued jobs
   * while respecting concurrency limits and preventing infinite loops.
   */
  async function fillActiveSlots() {
    if (!batchAutoStart.value) {
      return;
    }

    const maxIterations = Math.max(jobs.value.length, 1);
    let iterations = 0;

    const concurrencyLimit = Math.max(maxConcurrency.value, 1);

    while (
      batchAutoStart.value &&
      queuedJobs.value.length > 0 &&
      processingJobs.value.length < concurrencyLimit
    ) {
      const beforeActive = processingJobs.value.length;
      const started = await orchestrator.startNextAvailable();
      const afterActive = processingJobs.value.length;
      if (!started && afterActive <= beforeActive) {
        break;
      }

      iterations += 1;
      if (iterations >= maxIterations) {
        break;
      }
    }

    if (!queuedJobs.value.length) {
      batchAutoStart.value = false;
    }
  }

  /**
   * Watcher for active job count changes.
   *
   * Monitors changes in the number of active jobs and triggers batch
   * processing when slots become available.
   */
  watch(
    () => processingJobs.value.length,
    (next, prev) => {
      if (!batchAutoStart.value) {
        return;
      }
      if (next < prev && queuedJobs.value.length > 0) {
        void fillActiveSlots();
      }
      if (next === 0 && queuedJobs.value.length === 0) {
        batchAutoStart.value = false;
      }
    },
  );

  /**
   * Watcher for queued job count changes.
   *
   * Triggers batch processing when new jobs are queued and batch mode is active.
   */
  watch(
    () => queuedJobs.value.length,
    (next) => {
      if (!batchAutoStart.value) {
        return;
      }
      if (next === 0) {
        batchAutoStart.value = false;
        return;
      }
      void fillActiveSlots();
    },
  );

  /**
   * Handles starting a specific job.
   *
   * Starts an individual job with proper preset validation and error handling.
   */
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
  }

  /**
   * Starts all queued jobs in batch mode.
   *
   * Enables batch auto-start and begins processing all queued jobs
   * according to concurrency limits.
   */
  function startAll() {
    if (!queuedJobs.value.length) {
      return;
    }
    batchAutoStart.value = true;
    void fillActiveSlots();
  }

  /**
   * Cancels all active jobs.
   *
   * Stops batch processing and cancels all currently running jobs,
   * also removes any queued jobs from the queue.
   */
  function cancelAll() {
    batchAutoStart.value = false;
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

  /**
   * Clears all completed jobs from the queue.
   *
   * Removes finished jobs (successful or failed) from the display.
   */
  function clearCompleted() {
    jobsStore.clearCompleted();
  }

  /**
   * Opens the about dialog.
   */
  function openAbout() {
    isAboutOpen.value = true;
  }

  /**
   * Tauri event handlers for desktop-specific functionality.
   *
   * Sets up event listeners for drag-and-drop, menu actions, and other
   * desktop-specific interactions.
   */
  const { isDragOver } = useDesktopBridge({
    onDrop: handleFileDrop,
    onBrowseFiles: () => handleBrowse(),
    onOpenAbout: openAbout,
  });
  dragStateRef = isDragOver;

  /**
   * Initialization logic on component mount.
   *
   * Loads system capabilities, sets up window close handling for active jobs,
   * and prepares the application for use.
   */
  const hasInstanceContext = !!getCurrentInstance();

  const initializeCapabilities = async () => {
    await loadCapabilitySnapshot();

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
  };

  if (hasInstanceContext) {
    onMounted(() => {
      void initializeCapabilities();
    });
  } else {
    void initializeCapabilities();
  }

  /**
   * Return object with all state and handlers.
   *
   * Exposes the composable's reactive state and event handlers
   * for use by consuming components.
   */
  return {
    // State
    isDragOver,
    presetsReady,
    activeJobs,
    completedJobs,
    hasActiveJobs,
    hasCompletedJobs,
    hasNoJobs,
    hasQueuedJobs,
    presetOptions,
    isAboutOpen,

    // Handlers
    handleFileInput,
    handleFileDrop,
    handleBrowse,
    handleCancelJob,
    handleUpdatePreset,
    handleStartJob,
    startAll,
    cancelAll,
    clearCompleted,
    openAbout,
  };
}
