import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ref } from 'vue';

import { createRunnerEventSubscriber } from '@/composables/orchestrator/event-subscriber';
import { createPlannerClient } from '@/composables/orchestrator/planner-client';
import { createRunnerClient } from '@/composables/orchestrator/runner-client';
import { planJob } from '@/lib/ffmpeg-plan';
import { ExecutionService } from '@/services/execution-service';
import type { CapabilitySnapshot } from '@/lib/types';
import type { useJobsStore } from '@/stores/jobs';

const invokeMock = vi.fn();
const listenMock = vi.fn();

vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => invokeMock(...args),
}));

vi.mock('@tauri-apps/api/event', () => ({
  listen: (...args: unknown[]) => listenMock(...args),
}));

vi.mock('@/lib/ffmpeg-probe', () => ({
  probeMedia: vi.fn(async () => ({
    summary: {
      durationSec: 64,
      width: 1920,
      height: 1080,
      fps: 30,
      vcodec: 'h264',
      acodec: 'aac',
    },
  })),
}));

type JobsStoreStub = {
  getJob: ReturnType<typeof vi.fn>;
  setOutputPath: ReturnType<typeof vi.fn>;
  markFailed: ReturnType<typeof vi.fn>;
  markCompleted: ReturnType<typeof vi.fn>;
  updateProgress: ReturnType<typeof vi.fn>;
  appendLog: ReturnType<typeof vi.fn>;
  cancelJob: ReturnType<typeof vi.fn>;
};

type JobsStoreInstance = ReturnType<typeof useJobsStore>;
type JobStub = {
  id: string;
  path: string;
  presetId: string;
  tier: 'balanced' | 'fast' | 'high';
  exclusive: boolean;
  summary?: { durationSec?: number };
};

function createJobsStoreStub(overrides: Partial<JobStub> = {}) {
  const job: JobStub = {
    id: 'job-42',
    path: '/media/input.mov',
    presetId: 'video-to-mp4',
    tier: 'balanced',
    exclusive: false,
    summary: {
      durationSec: 64,
    },
    ...overrides,
  };

  const stub: JobsStoreStub = {
    getJob: vi.fn().mockReturnValue(job),
    setOutputPath: vi.fn(),
    markFailed: vi.fn(),
    markCompleted: vi.fn(),
    updateProgress: vi.fn(),
    appendLog: vi.fn(),
    cancelJob: vi.fn(),
  };

  return { job, stub };
}

describe('orchestrator planner/runner integration', () => {
  beforeEach(() => {
    invokeMock.mockReset();
    listenMock.mockReset();
  });

  it('plans a preset and starts a job via the runner client (tauri invoke mocked)', async () => {
    invokeMock.mockImplementation((command: string) => {
      if (command === 'file_exists') {
        return Promise.resolve(false);
      }
      return Promise.resolve(undefined);
    });

    const capabilities = ref<CapabilitySnapshot | undefined>(undefined);
    const planner = createPlannerClient({
      simulate: false,
      capabilities,
      requirePresetBeforeStart: true,
    });

    const summary = await planner.probe('/media/input.mov');
    const decision = planner.ensureDecisionHasInput(
      await planner.plan(summary, 'video-to-mp4', 'balanced', '/media/input.mov'),
      '/media/input.mov',
    );

    const { job, stub } = createJobsStoreStub();
    const runner = createRunnerClient({
      jobs: stub as unknown as JobsStoreInstance,
      outputDirectory: ref('/tmp/output'),
      includePresetInName: ref(true),
      includeTierInName: ref(true),
      filenameSeparator: ref('-'),
      simulate: false,
      execution: new ExecutionService(),
    });

    const started = await runner.run(job.id, decision);

    expect(started).toBe(true);
    expect(stub.setOutputPath).toHaveBeenCalledWith(job.id, expect.stringContaining('/tmp/output'));
    expect(stub.markFailed).not.toHaveBeenCalled();
    expect(invokeMock).toHaveBeenCalledWith(
      'start_job',
      expect.objectContaining({
        jobId: job.id,
        args: expect.arrayContaining(['-i', job.path]),
        outputPath: expect.stringContaining('.mp4'),
        exclusive: false,
      }),
    );
  });

  it('builds output paths with preset/tier and custom separator', async () => {
    invokeMock.mockImplementation((command: string) => {
      if (command === 'file_exists') {
        return Promise.resolve(false);
      }
      return Promise.resolve(undefined);
    });

    const planner = createPlannerClient({
      simulate: true,
      capabilities: ref<CapabilitySnapshot | undefined>(undefined),
      requirePresetBeforeStart: false,
    });

    const decision = planner.ensureDecisionHasInput(
      planJob({
        presetId: 'video-to-mp4',
        summary: {
          durationSec: 64,
          width: 1920,
          height: 1080,
          fps: 30,
          vcodec: 'h264',
          acodec: 'aac',
        },
      }),
      '/media/input.mov',
    );

    const { job, stub } = createJobsStoreStub();
    const runner = createRunnerClient({
      jobs: stub as unknown as JobsStoreInstance,
      outputDirectory: ref('/tmp/output'),
      includePresetInName: ref(true),
      includeTierInName: ref(true),
      filenameSeparator: ref('--'),
      simulate: false,
      execution: new ExecutionService(),
    });

    await runner.run(job.id, decision);

    expect(stub.setOutputPath).toHaveBeenCalledWith(
      job.id,
      '/tmp/output/input--video-to-mp4--balanced.mp4',
    );
  });

  it('falls back to the source directory when output directory is empty', async () => {
    invokeMock.mockImplementation((command: string) => {
      if (command === 'file_exists') {
        return Promise.resolve(false);
      }
      return Promise.resolve(undefined);
    });

    const planner = createPlannerClient({
      simulate: true,
      capabilities: ref<CapabilitySnapshot | undefined>(undefined),
      requirePresetBeforeStart: false,
    });

    const decision = planner.ensureDecisionHasInput(
      planJob({
        presetId: 'video-to-mp4',
        summary: {
          durationSec: 64,
          width: 1920,
          height: 1080,
          fps: 30,
          vcodec: 'h264',
          acodec: 'aac',
        },
      }),
      '/media/input.mov',
    );

    const { job, stub } = createJobsStoreStub({ path: '/media/input.mov' });
    const runner = createRunnerClient({
      jobs: stub as unknown as JobsStoreInstance,
      outputDirectory: ref(''),
      includePresetInName: ref(false),
      includeTierInName: ref(false),
      filenameSeparator: ref('-'),
      simulate: false,
      execution: new ExecutionService(),
    });

    await runner.run(job.id, decision);

    expect(stub.setOutputPath).toHaveBeenCalledWith(job.id, '/media/input.mp4');
  });

  it('appends a numeric suffix when output already exists', async () => {
    invokeMock.mockImplementation((command: string, payload?: { path?: string }) => {
      if (command === 'file_exists' && payload?.path) {
        if (payload.path === '/tmp/output/input.mp4') {
          return Promise.resolve(true);
        }
        return Promise.resolve(false);
      }
      return Promise.resolve(undefined);
    });

    const planner = createPlannerClient({
      simulate: true,
      capabilities: ref<CapabilitySnapshot | undefined>(undefined),
      requirePresetBeforeStart: false,
    });

    const decision = planner.ensureDecisionHasInput(
      planJob({
        presetId: 'video-to-mp4',
        summary: {
          durationSec: 64,
          width: 1920,
          height: 1080,
          fps: 30,
          vcodec: 'h264',
          acodec: 'aac',
        },
      }),
      '/media/input.mov',
    );

    const { job, stub } = createJobsStoreStub();
    const runner = createRunnerClient({
      jobs: stub as unknown as JobsStoreInstance,
      outputDirectory: ref('/tmp/output'),
      includePresetInName: ref(false),
      includeTierInName: ref(false),
      filenameSeparator: ref('-'),
      simulate: false,
      execution: new ExecutionService(),
    });

    await runner.run(job.id, decision);

    expect(stub.setOutputPath).toHaveBeenCalledWith(job.id, '/tmp/output/input (1).mp4');
    expect(invokeMock).toHaveBeenCalledWith('file_exists', {
      path: '/tmp/output/input.mp4',
    });
    expect(invokeMock).toHaveBeenCalledWith('file_exists', {
      path: '/tmp/output/input (1).mp4',
    });
  });

  it('cancels a running job via the runner client (tauri cancel mocked)', async () => {
    invokeMock.mockResolvedValueOnce(true);

    const { stub, job } = createJobsStoreStub();
    const runner = createRunnerClient({
      jobs: stub as unknown as JobsStoreInstance,
      outputDirectory: ref('/tmp/output'),
      includePresetInName: ref(false),
      includeTierInName: ref(false),
      filenameSeparator: ref('_'),
      simulate: false,
      execution: new ExecutionService(),
    });

    const cancelled = await runner.cancel(job.id);

    expect(cancelled).toBe(true);
    expect(invokeMock).toHaveBeenCalledWith('cancel_job', { jobId: job.id });
  });

  it('wires tauri event listeners and cleans them up via the runner event subscriber', async () => {
    const handlers: Record<string, (event: { payload: unknown }) => void> = {};
    const unlistenFns: Array<ReturnType<typeof vi.fn>> = [];

    listenMock.mockImplementation(
      (event: string, handler: (event: { payload: unknown }) => void) => {
        handlers[event] = handler;
        const unlisten = vi.fn();
        unlistenFns.push(unlisten);
        return Promise.resolve(unlisten);
      },
    );

    const onProgress = vi.fn();
    const onStderr = vi.fn();
    const onCompletion = vi.fn();

    const subscriber = createRunnerEventSubscriber({
      enabled: true,
      onProgress,
      onStderr,
      onCompletion,
    });

    await subscriber.start();

    expect(listenMock).toHaveBeenCalledTimes(3);
    expect(Object.keys(handlers).sort()).toEqual([
      'ffmpeg://completion',
      'ffmpeg://progress',
      'ffmpeg://stderr',
    ]);

    await handlers['ffmpeg://progress']?.({
      payload: {
        jobId: 'job-1',
        raw: 'progress-line',
        progress: { processedSeconds: 5, fps: 48, speed: 1.5 },
      },
    });
    expect(onProgress).toHaveBeenCalledWith(
      expect.objectContaining({ jobId: 'job-1', raw: 'progress-line' }),
    );

    await handlers['ffmpeg://stderr']?.({ payload: { jobId: 'job-1', line: 'stderr-line' } });
    expect(onStderr).toHaveBeenCalledWith({ jobId: 'job-1', line: 'stderr-line' });

    await handlers['ffmpeg://completion']?.({
      payload: { jobId: 'job-1', success: true, cancelled: false, logs: [] },
    });
    expect(onCompletion).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, cancelled: false }),
    );

    subscriber.stop();
    unlistenFns.forEach((fn) => expect(fn).toHaveBeenCalled());
  });
});
