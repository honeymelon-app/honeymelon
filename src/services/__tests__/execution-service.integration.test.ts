import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ExecutionService } from '@/services/execution-service';
import type { PlannerDecision } from '@/lib/ffmpeg-plan';

const invokeMock = vi.fn();

vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => invokeMock(...args),
}));

describe('ExecutionService ↔ Tauri bridge', () => {
  let service: ExecutionService;

  beforeEach(() => {
    service = new ExecutionService();
    invokeMock.mockReset();
  });

  it('sends job metadata to start_job command', async () => {
    const decision = {
      ffmpegArgs: ['-i', 'input.mp4', '-c:v', 'libx264', 'output.mp4'],
    } as PlannerDecision;

    const result = await service.start({
      jobId: 'job-123',
      decision,
      outputPath: '/tmp/output.mp4',
      exclusive: true,
    });

    expect(result.success).toBe(true);
    expect(invokeMock).toHaveBeenCalledWith('start_job', {
      jobId: 'job-123',
      args: decision.ffmpegArgs,
      outputPath: '/tmp/output.mp4',
      exclusive: true,
    });
  });

  it('surfaces backend errors (e.g., duplicates or exclusivity)', async () => {
    invokeMock.mockRejectedValueOnce({
      code: 'job_already_running',
      message: 'duplicate job id',
    });

    const decision = { ffmpegArgs: ['-i', 'input.mp4'] } as PlannerDecision;

    const result = await service.start({
      jobId: 'job-duplicate',
      decision,
      outputPath: '/tmp/output.mp4',
    });

    expect(result.success).toBe(false);
    expect(result.code).toBe('job_already_running');
    expect(result.error).toBe('duplicate job id');
  });

  it('passes cancellation and concurrency changes to Tauri', async () => {
    invokeMock.mockResolvedValueOnce(true); // cancel
    await service.cancel('job-999');
    expect(invokeMock).toHaveBeenCalledWith('cancel_job', { jobId: 'job-999' });

    invokeMock.mockResolvedValueOnce(undefined); // set concurrency
    await service.setConcurrency(0);
    expect(invokeMock).toHaveBeenCalledWith('set_max_concurrency', { limit: 1 });
  });
});
