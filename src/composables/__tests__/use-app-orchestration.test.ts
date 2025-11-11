import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ref, nextTick } from 'vue';

import { useAppOrchestration } from '../use-app-orchestration';
import type { Preset } from '@/lib/types';

type Job = {
  id: string;
  path: string;
  presetId: string;
  tier?: string;
  state: {
    status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled' | 'probing' | 'planning';
  };
};

const useFileHandlerMock = vi.fn();
const useJobOrchestratorMock = vi.fn();
const useTauriEventsMock = vi.fn();
const availablePresetsMock = vi.fn();
const loadCapabilitiesMock = vi.fn();
const useJobsStoreMock = vi.fn();
type MockFn = ReturnType<typeof vi.fn>;

vi.mock('pinia', () => ({
  storeToRefs: (store: any) => ({
    jobs: store.jobs,
    maxConcurrency: store.maxConcurrency,
    activeJobs: store.activeJobs,
    queuedJobs: store.queuedJobs,
  }),
}));

vi.mock('@/composables/use-file-handler', () => ({
  useFileHandler: (...args: unknown[]) => useFileHandlerMock(...args),
}));

vi.mock('@/composables/use-job-orchestrator', () => ({
  useJobOrchestrator: (...args: unknown[]) => useJobOrchestratorMock(...args),
}));

vi.mock('@/composables/use-tauri-events', () => ({
  useTauriEvents: (...args: unknown[]) => useTauriEventsMock(...args),
}));

vi.mock('@/lib/capability', () => ({
  availablePresets: (...args: unknown[]) => availablePresetsMock(...args),
  loadCapabilities: (...args: unknown[]) => loadCapabilitiesMock(...args),
}));

vi.mock('@/stores/jobs', () => ({
  useJobsStore: (...args: unknown[]) => useJobsStoreMock(...args),
}));

function buildPreset(overrides: Partial<Preset> = {}): Preset {
  return {
    id: 'preset-base',
    label: 'Preset Base',
    container: 'mp4',
    mediaKind: 'video',
    sourceContainers: [],
    video: { codec: 'h264' },
    audio: { codec: 'aac' },
    subs: { mode: 'keep' },
    ...overrides,
  };
}

describe('useAppOrchestration', () => {
  let jobsRef: ReturnType<typeof ref<Job[]>>;
  let maxConcurrencyRef: ReturnType<typeof ref<number>>;
  let activeJobsRef: ReturnType<typeof ref<Job[]>>;
  let queuedJobsRef: ReturnType<typeof ref<Job[]>>;
  let jobsStore: {
    jobs: typeof jobsRef;
    maxConcurrency: typeof maxConcurrencyRef;
    activeJobs: typeof activeJobsRef;
    queuedJobs: typeof queuedJobsRef;
    getJob: MockFn;
    removeJob: MockFn;
    updateJobPreset: MockFn;
    clearCompleted: MockFn;
  };
  let fileHandler: {
    addFiles: MockFn;
    addFilesFromPaths: MockFn;
    browseForFiles: MockFn;
    presetsForPath: MockFn;
    selectDefaultPresetForPath: MockFn;
    ensureUsablePresetId: MockFn;
    isTauriRuntime: MockFn;
  };
  let orchestrator: {
    cancel: MockFn;
    startJob: MockFn;
    startNextAvailable: MockFn;
  };
  let capturedFileHandlerOptions: unknown;

  beforeEach(() => {
    vi.clearAllMocks();
    jobsRef = ref<Job[]>([]);
    maxConcurrencyRef = ref(2);
    activeJobsRef = ref<Job[]>([]);
    queuedJobsRef = ref<Job[]>([]);

    jobsStore = {
      jobs: jobsRef,
      maxConcurrency: maxConcurrencyRef,
      activeJobs: activeJobsRef,
      queuedJobs: queuedJobsRef,
      getJob: vi.fn(),
      removeJob: vi.fn(),
      updateJobPreset: vi.fn(),
      clearCompleted: vi.fn(),
    };

    fileHandler = {
      addFiles: vi.fn(),
      addFilesFromPaths: vi.fn().mockResolvedValue(undefined),
      browseForFiles: vi.fn().mockResolvedValue(undefined),
      presetsForPath: vi.fn(),
      selectDefaultPresetForPath: vi.fn(),
      ensureUsablePresetId: vi.fn(),
      isTauriRuntime: vi.fn().mockReturnValue(false),
    };

    orchestrator = {
      cancel: vi.fn().mockResolvedValue(undefined),
      startJob: vi.fn().mockResolvedValue(undefined),
      startNextAvailable: vi.fn().mockResolvedValue(true),
    };

    capturedFileHandlerOptions = undefined;
    useJobsStoreMock.mockReturnValue(jobsStore);
    useFileHandlerMock.mockImplementation((options: unknown) => {
      capturedFileHandlerOptions = options;
      return fileHandler;
    });
    useJobOrchestratorMock.mockReturnValue(orchestrator);
    useTauriEventsMock.mockReset();
    availablePresetsMock.mockReturnValue([buildPreset({ id: 'preset-a' })]);
    loadCapabilitiesMock.mockResolvedValue(undefined);
  });

  it('wires drag-and-drop handlers and file input handling', async () => {
    const { handleFileInput, handleFileDrop, isDragOver } = useAppOrchestration();

    expect(useTauriEventsMock).toHaveBeenCalled();

    const files = {} as FileList;
    const inputTarget = { files, value: 'something' } as unknown as HTMLInputElement;
    const inputEvent = { target: inputTarget } as unknown as Event;
    handleFileInput(inputEvent);
    expect(fileHandler.addFiles).toHaveBeenCalledWith(files);
    expect(inputTarget.value).toBe('');

    isDragOver.value = true;
    await handleFileDrop(['one.mp4']);
    expect(isDragOver.value).toBe(false);
    expect(fileHandler.addFilesFromPaths).toHaveBeenCalledWith(['one.mp4'], {
      alreadyExpanded: true,
    });
    expect(capturedFileHandlerOptions).toMatchObject({
      defaultPresetId: expect.objectContaining({ value: expect.any(String) }),
      presetsReady: expect.any(Object),
    });
  });

  it('cancels queued jobs via store and running jobs via orchestrator', async () => {
    const jobQueued: Job = {
      id: 'job-queued',
      path: 'queued.mp4',
      presetId: 'preset',
      state: { status: 'queued' },
    };
    const jobRunning: Job = {
      id: 'job-running',
      path: 'running.mp4',
      presetId: 'preset',
      state: { status: 'running' },
    };

    jobsStore.getJob.mockImplementation((id: string) => {
      if (id === 'job-queued') return jobQueued;
      if (id === 'job-running') return jobRunning;
      return undefined;
    });

    const { handleCancelJob } = useAppOrchestration();

    handleCancelJob('job-queued');
    expect(jobsStore.removeJob).toHaveBeenCalledWith('job-queued');
    expect(orchestrator.cancel).not.toHaveBeenCalled();

    handleCancelJob('job-running');
    expect(orchestrator.cancel).toHaveBeenCalledWith('job-running');
  });

  it('updates presets with fallbacks for queued jobs', () => {
    const job: Job = {
      id: 'job-one',
      path: 'video.mp4',
      presetId: 'preset-a',
      state: { status: 'queued' },
    };
    jobsStore.getJob.mockReturnValue(job);

    const allowedPreset = buildPreset({ id: 'preset-b' });
    fileHandler.presetsForPath.mockReturnValue([allowedPreset]);

    const { handleUpdatePreset } = useAppOrchestration();

    handleUpdatePreset('job-one', 'preset-b');
    expect(jobsStore.updateJobPreset).toHaveBeenCalledWith('job-one', 'preset-b');

    fileHandler.presetsForPath.mockReturnValue([]);
    fileHandler.selectDefaultPresetForPath.mockReturnValue('fallback');
    jobsStore.updateJobPreset.mockClear();

    handleUpdatePreset('job-one', 'preset-c');
    expect(jobsStore.updateJobPreset).toHaveBeenCalledWith('job-one', 'fallback');
  });

  it('starts jobs when presets are available and warns otherwise', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const job: Job = {
      id: 'job-one',
      path: 'video.mp4',
      presetId: 'preset-a',
      state: { status: 'queued' },
    };

    jobsStore.getJob.mockReturnValue(job);
    fileHandler.ensureUsablePresetId.mockReturnValue('preset-a');

    const { handleStartJob } = useAppOrchestration();
    await handleStartJob('job-one');
    expect(orchestrator.startJob).toHaveBeenCalledWith({
      jobId: 'job-one',
      path: 'video.mp4',
      presetId: 'preset-a',
      tier: job.tier,
    });

    orchestrator.startJob.mockClear();
    fileHandler.ensureUsablePresetId.mockReturnValue(null);
    await handleStartJob('job-one');
    expect(orchestrator.startJob).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith('[app] Cannot start job; preset not ready.');
    warnSpy.mockRestore();
  });

  it('starts batches and reacts to processing slot changes', async () => {
    const jobA: Job = {
      id: 'job-a',
      path: 'a.mp4',
      presetId: 'preset-a',
      state: { status: 'queued' },
    };
    const jobB: Job = {
      id: 'job-b',
      path: 'b.mp4',
      presetId: 'preset-a',
      state: { status: 'queued' },
    };
    jobsRef.value = [jobA, jobB];
    queuedJobsRef.value = [jobA, jobB];

    const { startAll } = useAppOrchestration();

    orchestrator.startNextAvailable
      .mockImplementationOnce(async () => true)
      .mockImplementationOnce(async () => true);

    startAll();
    await Promise.resolve();
    expect(orchestrator.startNextAvailable).toHaveBeenCalled();

    orchestrator.startNextAvailable.mockClear();
    activeJobsRef.value = [jobA];
    await nextTick();
    activeJobsRef.value = [];
    await Promise.resolve();

    expect(orchestrator.startNextAvailable).toHaveBeenCalled();
  });

  it('cancels all active and queued jobs, then clears completed items', async () => {
    const cancelSpy = orchestrator.cancel;
    const jobQueued: Job = {
      id: 'queued',
      path: 'queued.mp4',
      presetId: 'preset-a',
      state: { status: 'queued' },
    };
    const jobRunning: Job = {
      id: 'running',
      path: 'running.mp4',
      presetId: 'preset-a',
      state: { status: 'running' },
    };
    jobsRef.value = [jobQueued, jobRunning];
    queuedJobsRef.value = [jobQueued];

    const { cancelAll, clearCompleted, openAbout, isAboutOpen } = useAppOrchestration();

    await nextTick();
    cancelAll();
    expect(cancelSpy).toHaveBeenCalledWith('queued');
    expect(cancelSpy).toHaveBeenCalledWith('running');
    expect(jobsStore.removeJob).toHaveBeenCalledWith('queued');

    clearCompleted();
    expect(jobsStore.clearCompleted).toHaveBeenCalled();

    expect(isAboutOpen.value).toBe(false);
    openAbout();
    expect(isAboutOpen.value).toBe(true);
  });

  it('delegates browse requests to the file handler', async () => {
    const { handleBrowse } = useAppOrchestration();
    await handleBrowse('video');
    expect(fileHandler.browseForFiles).toHaveBeenCalledWith('video');
  });
});
