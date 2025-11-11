import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ref } from 'vue';
import type { Ref } from 'vue';

import { useJobOrchestrator } from '../use-job-orchestrator';
import type { Preset, Tier } from '@/lib/types';

const invokeMock = vi.fn();
const listenMock = vi.fn();
const availablePresetsMock = vi.fn();
const loadCapabilitiesMock = vi.fn();
const planJobMock = vi.fn();
const inferContainerFromPathMock = vi.fn();
const mediaKindForContainerMock = vi.fn();
const parseErrorDetailsMock = vi.fn();
const formatCompletionErrorMock = vi.fn();
const executionStartMock = vi.fn();
const executionCancelMock = vi.fn();
const probeMediaMock = vi.fn();
const notificationModuleMock = {
  isPermissionGranted: vi.fn(),
  requestPermission: vi.fn(),
  sendNotification: vi.fn(),
};

vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => invokeMock(...args),
}));

vi.mock('@tauri-apps/api/event', () => ({
  listen: (...args: unknown[]) => listenMock(...args),
}));

vi.mock('@tauri-apps/plugin-notification', () => ({
  __esModule: true,
  ...notificationModuleMock,
}));

vi.mock('pinia', () => ({
  storeToRefs: (store: { __refs: Record<string, unknown> }) => store.__refs,
}));

vi.mock('@/lib/capability', () => ({
  availablePresets: (...args: unknown[]) => availablePresetsMock(...args),
  loadCapabilities: (...args: unknown[]) => loadCapabilitiesMock(...args),
}));

vi.mock('@/lib/constants', () => ({
  LIMITS: { NOTIFICATION_MAX_BODY_LENGTH: 120 },
}));

vi.mock('@/lib/error-handler', () => ({
  ErrorHandler: {
    parseErrorDetails: (...args: unknown[]) => parseErrorDetailsMock(...args),
    formatCompletionError: (...args: unknown[]) => formatCompletionErrorMock(...args),
  },
}));

vi.mock('@/lib/ffmpeg-plan', () => ({
  planJob: (...args: unknown[]) => planJobMock(...args),
}));

vi.mock('@/lib/ffmpeg-probe', () => ({
  probeMedia: (...args: unknown[]) => probeMediaMock(...args),
}));

vi.mock('@/lib/media-formats', () => ({
  inferContainerFromPath: (...args: unknown[]) => inferContainerFromPathMock(...args),
  mediaKindForContainer: (...args: unknown[]) => mediaKindForContainerMock(...args),
}));

vi.mock('@/lib/utils', async () => {
  const actual = await vi.importActual<typeof import('@/lib/utils')>('@/lib/utils');
  return {
    ...actual,
  };
});

vi.mock('@/services/execution-service', () => ({
  executionService: {
    start: (...args: unknown[]) => executionStartMock(...args),
    cancel: (...args: unknown[]) => executionCancelMock(...args),
  },
}));

const useJobsStoreMock = vi.fn();
const usePrefsStoreMock = vi.fn();

vi.mock('@/stores/jobs', () => ({
  useJobsStore: (...args: unknown[]) => useJobsStoreMock(...args),
}));

vi.mock('@/stores/prefs', () => ({
  usePrefsStore: (...args: unknown[]) => usePrefsStoreMock(...args),
}));

function buildPreset(overrides: Partial<Preset> = {}): Preset {
  return {
    id: 'preset-video-mp4',
    label: 'Video MP4',
    container: 'mp4',
    mediaKind: 'video',
    sourceContainers: [],
    video: { codec: 'h264' },
    audio: { codec: 'aac' },
    subs: { mode: 'keep' },
    outputExtension: 'mp4',
    ...overrides,
  };
}

type MockJob = {
  id: string;
  path: string;
  presetId: string;
  tier: Tier;
  state: { status: string };
  summary?: Record<string, unknown>;
  outputPath?: string;
};

type MockFn = ReturnType<typeof vi.fn>;

interface JobsStore {
  __refs: {
    jobs: Ref<MockJob[]>;
    activeJobs: Ref<MockJob[]>;
    queuedJobs: Ref<MockJob[]>;
    hasExclusiveActive: Ref<boolean>;
  };
  setConcurrency: MockFn;
  updateProgress: MockFn;
  appendLog: MockFn;
  peekNext: MockFn;
  startNext: MockFn;
  markPlanning: MockFn;
  markRunning: MockFn;
  markFailed: MockFn;
  markCompleted: MockFn;
  markProbing: MockFn;
  requeue: MockFn;
  setOutputPath: MockFn;
  getJob: MockFn;
  cancelJob: MockFn;
  setLogs: MockFn;
}

interface PrefsStore {
  __refs: {
    maxConcurrency: Ref<number>;
    outputDirectory: Ref<string>;
    includePresetInName: Ref<boolean>;
    includeTierInName: Ref<boolean>;
    filenameSeparator: Ref<string>;
  };
  setPreferredConcurrency: MockFn;
}
interface SetupStoresResult {
  job: MockJob;
  jobsStore: JobsStore;
  prefsStore: PrefsStore;
  refs: {
    jobsRef: Ref<MockJob[]>;
    activeJobsRef: Ref<MockJob[]>;
    queuedJobsRef: Ref<MockJob[]>;
    hasExclusiveActiveRef: Ref<boolean>;
    prefsRefs: {
      maxConcurrency: Ref<number>;
      outputDirectory: Ref<string>;
      includePresetInName: Ref<boolean>;
      includeTierInName: Ref<boolean>;
      filenameSeparator: Ref<string>;
    };
  };
}

function setupStores(jobOverrides: Partial<MockJob> = {}): SetupStoresResult {
  const job: MockJob = {
    id: 'job-1',
    path: '/media/input.mp4',
    presetId: 'preset-video-mp4',
    tier: 'balanced',
    state: { status: 'queued' },
    ...jobOverrides,
  };

  const jobsRef = ref<MockJob[]>([job]);
  const activeJobsRef = ref<MockJob[]>([]);
  const queuedJobsRef = ref<MockJob[]>([]);
  const hasExclusiveActiveRef = ref(false);

  const jobsStore: JobsStore = {
    __refs: {
      jobs: jobsRef,
      activeJobs: activeJobsRef,
      queuedJobs: queuedJobsRef,
      hasExclusiveActive: hasExclusiveActiveRef,
    },
    setConcurrency: vi.fn(),
    updateProgress: vi.fn(),
    appendLog: vi.fn(),
    peekNext: vi.fn().mockReturnValue(job),
    startNext: vi.fn().mockReturnValue(job),
    markPlanning: vi.fn().mockImplementation((_id: string, summary: Record<string, unknown>) => {
      job.summary = { ...summary, durationSec: 0.5 };
    }),
    markRunning: vi.fn(),
    markFailed: vi.fn(),
    markCompleted: vi.fn(),
    markProbing: vi.fn(),
    requeue: vi.fn(),
    setOutputPath: vi.fn().mockImplementation((_id: string, output: string) => {
      job.outputPath = output;
    }),
    getJob: vi.fn().mockReturnValue(job),
    cancelJob: vi.fn(),
    setLogs: vi.fn(),
    markPlanningSummary: job.summary,
  } as unknown as JobsStore;

  const prefsRefs = {
    maxConcurrency: ref(2),
    outputDirectory: ref('/tmp/output'),
    includePresetInName: ref(true),
    includeTierInName: ref(true),
    filenameSeparator: ref('-'),
  };

  const prefsStore: PrefsStore = {
    __refs: prefsRefs,
    setPreferredConcurrency: vi.fn(),
  } as unknown as PrefsStore;

  useJobsStoreMock.mockReturnValue(jobsStore);
  usePrefsStoreMock.mockReturnValue(prefsStore);

  return {
    job,
    jobsStore,
    prefsStore,
    refs: {
      jobsRef,
      activeJobsRef,
      queuedJobsRef,
      hasExclusiveActiveRef,
      prefsRefs,
    },
  };
}

describe('useJobOrchestrator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadCapabilitiesMock.mockResolvedValue({
      formats: new Set(),
      videoEncoders: new Set(),
      audioEncoders: new Set(),
      filters: new Set(),
    });
    availablePresetsMock.mockReturnValue([buildPreset()]);
    planJobMock.mockReturnValue({
      preset: buildPreset(),
      ffmpegArgs: ['-progress', 'pipe:2'],
      remuxOnly: true,
      notes: [],
      warnings: [],
    });
    inferContainerFromPathMock.mockReturnValue('mp4');
    mediaKindForContainerMock.mockReturnValue('video');
    parseErrorDetailsMock.mockReturnValue({ message: 'parsed', code: 'parsed' });
    formatCompletionErrorMock.mockReturnValue('formatted');
    probeMediaMock.mockResolvedValue({ summary: { durationSec: 1 } });
    notificationModuleMock.isPermissionGranted.mockResolvedValue(true);
    notificationModuleMock.requestPermission.mockResolvedValue('granted');
    notificationModuleMock.sendNotification.mockResolvedValue(undefined);
    invokeMock.mockResolvedValue(undefined);
    executionStartMock.mockResolvedValue({ success: true });
    executionCancelMock.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    delete (window as unknown as { __TAURI_INTERNALS__?: Record<string, unknown> })
      .__TAURI_INTERNALS__;
  });

  it('starts a job in simulation mode and completes with generated output path', async () => {
    const { job, jobsStore, prefsStore } = setupStores();
    vi.useFakeTimers();

    const decisionPreset = buildPreset({ id: 'preset-video-mp4' });
    planJobMock.mockReturnValue({
      preset: decisionPreset,
      ffmpegArgs: [],
      remuxOnly: true,
      notes: [],
      warnings: [],
    });

    const orchestrator = useJobOrchestrator({ simulate: true, autoStartNext: false });

    expect(jobsStore.setConcurrency).toHaveBeenCalledWith(2);
    expect(prefsStore.setPreferredConcurrency).not.toHaveBeenCalled();
    expect(listenMock).not.toHaveBeenCalled();

    const startPromise = orchestrator.startJob({
      jobId: job.id,
      path: job.path,
      presetId: job.presetId,
      tier: job.tier,
    });

    await vi.advanceTimersByTimeAsync(200);
    await startPromise;

    expect(jobsStore.markProbing).toHaveBeenCalledWith(job.id);
    expect(jobsStore.markPlanning).toHaveBeenCalledWith(
      job.id,
      expect.objectContaining({ durationSec: expect.any(Number) }),
    );
    expect(jobsStore.markRunning).toHaveBeenCalledWith(
      job.id,
      expect.objectContaining({ ffmpegArgs: expect.arrayContaining(['-i', job.path]) }),
    );

    expect(jobsStore.setOutputPath).toHaveBeenCalledWith(
      job.id,
      expect.stringContaining('/tmp/output/input-preset-video-mp4-balanced.mp4'),
    );

    await vi.advanceTimersByTimeAsync(1000);

    expect(jobsStore.updateProgress).toHaveBeenCalled();
    expect(jobsStore.markCompleted).toHaveBeenCalledWith(
      job.id,
      expect.stringContaining('/tmp/output/input-preset-video-mp4-balanced.mp4'),
    );
    expect(jobsStore.appendLog).toHaveBeenCalledWith(job.id, 'Simulation completed');
  });

  it('marks job as failed when planning throws an error', async () => {
    const { job, jobsStore } = setupStores();
    vi.useFakeTimers();

    availablePresetsMock.mockReturnValue([]);
    parseErrorDetailsMock.mockReturnValue({ message: 'cannot plan', code: 'EPLAN' });

    const orchestrator = useJobOrchestrator({ simulate: true, autoStartNext: false });

    const startPromise = orchestrator.startJob({
      jobId: job.id,
      path: job.path,
      presetId: job.presetId,
      tier: job.tier,
    });

    await vi.advanceTimersByTimeAsync(200);
    await startPromise;

    expect(jobsStore.markFailed).toHaveBeenCalledWith(job.id, 'cannot plan', 'EPLAN');
    expect(jobsStore.markRunning).not.toHaveBeenCalled();
  });

  it('requeues job when another active job prevents start', async () => {
    const { job, jobsStore, refs } = setupStores();
    vi.useFakeTimers();

    refs.activeJobsRef.value = [
      {
        id: 'running-other',
        path: '/media/other.mp4',
        presetId: 'preset-video-mp4',
        tier: 'balanced',
        state: { status: 'running' },
      } as MockJob,
    ];

    planJobMock.mockReturnValue({
      preset: buildPreset(),
      ffmpegArgs: ['-progress', 'pipe:2'],
      remuxOnly: false,
      notes: [],
      warnings: [],
    });

    const orchestrator = useJobOrchestrator({ simulate: true, autoStartNext: false });

    const resultPromise = orchestrator.startNextAvailable();
    await vi.advanceTimersByTimeAsync(200);
    const result = await resultPromise;

    expect(result).toBe(false);
    expect(jobsStore.requeue).toHaveBeenCalledWith(job.id);
    expect(jobsStore.markRunning).not.toHaveBeenCalled();
    expect(jobsStore.markFailed).not.toHaveBeenCalled();
  });

  it('requeues and records failure for execution runner errors when not simulating', async () => {
    const { job, jobsStore } = setupStores();
    (window as unknown as { __TAURI_INTERNALS__?: Record<string, unknown> }).__TAURI_INTERNALS__ =
      {};

    listenMock.mockImplementation(() => Promise.resolve(vi.fn()));
    executionStartMock.mockResolvedValue({ success: false, error: 'boom', code: 'EFAIL' });
    parseErrorDetailsMock.mockReturnValue({ message: 'boom', code: 'EFAIL' });
    planJobMock.mockReturnValue({
      preset: buildPreset(),
      ffmpegArgs: ['-i', job.path, '-c', 'copy'],
      remuxOnly: true,
      notes: [],
      warnings: [],
    });
    probeMediaMock.mockResolvedValue({ summary: { durationSec: 2 } });

    const orchestrator = useJobOrchestrator({ simulate: false, autoStartNext: false });

    await orchestrator.startJob({
      jobId: job.id,
      path: job.path,
      presetId: job.presetId,
      tier: job.tier,
    });

    expect(executionStartMock).toHaveBeenCalledWith({
      jobId: job.id,
      decision: expect.any(Object),
      outputPath: expect.any(String),
      exclusive: expect.any(Boolean),
    });
    expect(jobsStore.markFailed).toHaveBeenCalledWith(job.id, 'boom', 'EFAIL');
    expect(jobsStore.requeue).toHaveBeenCalledWith(job.id);
  });

  it('processes backend events and dispatches notifications', async () => {
    const { job, jobsStore } = setupStores();
    (window as unknown as { __TAURI_INTERNALS__?: Record<string, unknown> }).__TAURI_INTERNALS__ =
      {};

    const registeredHandlers: Record<string, (event: any) => unknown> = {};
    listenMock.mockImplementation((event: string, handler: (event: any) => unknown) => {
      registeredHandlers[event] = handler;
      return Promise.resolve(vi.fn());
    });
    useJobOrchestrator({ simulate: false, autoStartNext: false });

    job.outputPath = '/media/output.mp4';
    jobsStore.getJob.mockReturnValue(job);

    await registeredHandlers['ffmpeg://progress']({
      payload: {
        jobId: job.id,
        progress: { processedSeconds: 5, fps: 48, speed: 1.5 },
        raw: 'progress-line',
      },
    });
    expect(jobsStore.updateProgress).toHaveBeenCalledWith(job.id, {
      processedSeconds: 5,
      fps: 48,
      speed: 1.5,
    });
    expect(jobsStore.appendLog).toHaveBeenCalledWith(job.id, 'progress-line');

    await registeredHandlers['ffmpeg://stderr']({
      payload: {
        jobId: job.id,
        line: 'stderr-line',
      },
    });
    expect(jobsStore.appendLog).toHaveBeenCalledWith(job.id, 'stderr-line');

    await registeredHandlers['ffmpeg://completion']({
      payload: {
        jobId: job.id,
        success: true,
        cancelled: false,
        logs: ['line-a'],
        message: null,
      },
    });
    expect(jobsStore.setLogs).toHaveBeenCalledWith(job.id, ['line-a']);
    expect(jobsStore.markCompleted).toHaveBeenCalledWith(job.id, job.outputPath);
    await vi.waitFor(() =>
      expect(notificationModuleMock.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Conversion complete' }),
      ),
    );

    notificationModuleMock.sendNotification.mockClear();
    await registeredHandlers['ffmpeg://completion']({
      payload: {
        jobId: job.id,
        success: false,
        cancelled: false,
        message: 'boom',
        code: 'ERR',
      },
    });
    expect(jobsStore.markFailed).toHaveBeenCalledWith(job.id, 'formatted', 'ERR');
    await vi.waitFor(() =>
      expect(notificationModuleMock.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Conversion failed' }),
      ),
    );
  });

  it('cancels simulated jobs and clears timers', async () => {
    const { job, jobsStore } = setupStores();
    vi.useFakeTimers();

    const orchestrator = useJobOrchestrator({ simulate: true, autoStartNext: false });

    const startPromise = orchestrator.startJob({
      jobId: job.id,
      path: job.path,
      presetId: job.presetId,
      tier: job.tier,
    });

    await vi.advanceTimersByTimeAsync(200);
    await startPromise;

    await orchestrator.cancel(job.id);

    expect(jobsStore.cancelJob).toHaveBeenCalledWith(job.id);

    vi.useRealTimers();
  });
});
