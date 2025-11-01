import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useJobsStore } from '../jobs';

describe('jobs store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.useFakeTimers();
  });

  describe('initial state', () => {
    it('should have empty jobs array', () => {
      const store = useJobsStore();
      expect(store.jobs).toEqual([]);
    });

    it('should have default maxConcurrency of 2', () => {
      const store = useJobsStore();
      expect(store.maxConcurrency).toBe(2);
    });

    it('should have no queued jobs', () => {
      const store = useJobsStore();
      expect(store.queuedJobs).toEqual([]);
    });

    it('should have no active jobs', () => {
      const store = useJobsStore();
      expect(store.activeJobs).toEqual([]);
    });

    it('should have no terminal jobs', () => {
      const store = useJobsStore();
      expect(store.terminalJobs).toEqual([]);
    });

    it('should have no exclusive active jobs', () => {
      const store = useJobsStore();
      expect(store.hasExclusiveActive).toBe(false);
    });

    it('should have null runningEtaSeconds', () => {
      const store = useJobsStore();
      expect(store.runningEtaSeconds).toBeNull();
    });
  });

  describe('enqueue', () => {
    it('should add job to queue', () => {
      const store = useJobsStore();
      const jobId = store.enqueue('/path/to/video.mp4', 'mp4-h264');

      expect(jobId).toBeTruthy();
      expect(store.jobs.length).toBe(1);
      expect(store.jobs[0].path).toBe('/path/to/video.mp4');
      expect(store.jobs[0].presetId).toBe('mp4-h264');
      expect(store.jobs[0].state.status).toBe('queued');
    });

    it('should assign unique job IDs', () => {
      const store = useJobsStore();
      const id1 = store.enqueue('/path1.mp4', 'preset1');
      const id2 = store.enqueue('/path2.mp4', 'preset2');

      expect(id1).not.toBe(id2);
    });

    it('should return null for duplicate paths', () => {
      const store = useJobsStore();
      const id1 = store.enqueue('/path/to/video.mp4', 'mp4-h264');
      const duplicate = store.enqueue('/path/to/video.mp4', 'mp4-h265');

      expect(id1).toBeTruthy();
      expect(duplicate).toBeNull();
      expect(store.jobs.length).toBe(1);
    });

    it('should use default tier if not specified', () => {
      const store = useJobsStore();
      const jobId = store.enqueue('/path/to/video.mp4', 'mp4-h264');
      const job = store.getJob(jobId!);

      expect(job?.tier).toBe('balanced');
    });

    it('should accept custom tier', () => {
      const store = useJobsStore();
      const jobId = store.enqueue('/path/to/video.mp4', 'mp4-h264', 'high');
      const job = store.getJob(jobId!);

      expect(job?.tier).toBe('high');
    });

    it('should initialize empty logs array', () => {
      const store = useJobsStore();
      const jobId = store.enqueue('/path/to/video.mp4', 'mp4-h264');
      const job = store.getJob(jobId!);

      expect(job?.logs).toEqual([]);
    });
  });

  describe('enqueueMany', () => {
    it('should enqueue multiple jobs', () => {
      const store = useJobsStore();
      const paths = ['/path1.mp4', '/path2.mkv', '/path3.webm'];
      const jobIds = store.enqueueMany(paths, 'mp4-h264');

      expect(jobIds.length).toBe(3);
      expect(store.jobs.length).toBe(3);
    });

    it('should filter out duplicate paths', () => {
      const store = useJobsStore();
      const paths = ['/path1.mp4', '/path1.mp4', '/path2.mp4'];
      const jobIds = store.enqueueMany(paths, 'mp4-h264');

      expect(jobIds.length).toBe(2);
      expect(store.jobs.length).toBe(2);
    });

    it('should return empty array for empty input', () => {
      const store = useJobsStore();
      const jobIds = store.enqueueMany([], 'mp4-h264');

      expect(jobIds).toEqual([]);
    });
  });

  describe('job state transitions', () => {
    it('should transition from queued to probing', () => {
      const store = useJobsStore();
      const jobId = store.enqueue('/path.mp4', 'preset');
      store.markProbing(jobId!);

      const job = store.getJob(jobId!);
      expect(job?.state.status).toBe('probing');
    });

    it('should transition from probing to planning', () => {
      const store = useJobsStore();
      const jobId = store.enqueue('/path.mp4', 'preset');
      store.markProbing(jobId!);
      store.markPlanning(jobId!, {
        durationSec: 120,
        fps: 30,
        width: 1920,
        height: 1080,
      });

      const job = store.getJob(jobId!);
      expect(job?.state.status).toBe('planning');
      expect(job?.summary?.durationSec).toBe(120);
    });

    it('should transition from planning to running', () => {
      const store = useJobsStore();
      const jobId = store.enqueue('/path.mp4', 'preset');
      store.markProbing(jobId!);
      store.markPlanning(jobId!, { durationSec: 120 });
      store.markRunning(jobId!, {
        remuxOnly: false,
        preset: {} as any,
        ffmpegArgs: [],
        notes: [],
        warnings: [],
      });

      const job = store.getJob(jobId!);
      expect(job?.state.status).toBe('running');
    });

    it('should transition from running to completed', () => {
      const store = useJobsStore();
      const jobId = store.enqueue('/path.mp4', 'preset');
      store.markRunning(jobId!, {} as any);
      store.markCompleted(jobId!, '/output/path.mp4');

      const job = store.getJob(jobId!);
      expect(job?.state.status).toBe('completed');
      expect(job?.outputPath).toBe('/output/path.mp4');
    });

    it('should transition from running to failed', () => {
      const store = useJobsStore();
      const jobId = store.enqueue('/path.mp4', 'preset');
      store.markRunning(jobId!, {} as any);
      store.markFailed(jobId!, 'Error message', 'error_code');

      const job = store.getJob(jobId!);
      expect(job?.state.status).toBe('failed');
      if (job?.state.status === 'failed') {
        expect(job.state.error).toBe('Error message');
        expect(job.state.code).toBe('error_code');
      }
    });

    it('should handle cancel from queued state', () => {
      const store = useJobsStore();
      const jobId = store.enqueue('/path.mp4', 'preset');
      store.cancelJob(jobId!);

      const job = store.getJob(jobId!);
      expect(job?.state.status).toBe('cancelled');
    });

    it('should handle requeue from terminal state', () => {
      const store = useJobsStore();
      const jobId = store.enqueue('/path.mp4', 'preset');
      store.markCompleted(jobId!, '/output.mp4');
      store.requeue(jobId!);

      const job = store.getJob(jobId!);
      expect(job?.state.status).toBe('queued');
    });
  });

  describe('logs management', () => {
    it('should append log lines', () => {
      const store = useJobsStore();
      const jobId = store.enqueue('/path.mp4', 'preset');

      store.appendLog(jobId!, 'Log line 1');
      store.appendLog(jobId!, 'Log line 2');

      const job = store.getJob(jobId!);
      expect(job?.logs).toEqual(['Log line 1', 'Log line 2']);
    });

    it('should limit logs to 500 lines', () => {
      const store = useJobsStore();
      const jobId = store.enqueue('/path.mp4', 'preset');

      for (let i = 0; i < 600; i++) {
        store.appendLog(jobId!, `Log line ${i}`);
      }

      const job = store.getJob(jobId!);
      expect(job?.logs?.length).toBe(500);
      expect(job?.logs?.[0]).toBe('Log line 100');
      expect(job?.logs?.[499]).toBe('Log line 599');
    });

    it('should clear logs', () => {
      const store = useJobsStore();
      const jobId = store.enqueue('/path.mp4', 'preset');

      store.appendLog(jobId!, 'Log 1');
      store.appendLog(jobId!, 'Log 2');
      store.clearLogs(jobId!);

      const job = store.getJob(jobId!);
      expect(job?.logs).toEqual([]);
    });

    it('should set logs replacing existing', () => {
      const store = useJobsStore();
      const jobId = store.enqueue('/path.mp4', 'preset');

      store.appendLog(jobId!, 'Old log');
      store.setLogs(jobId!, ['New log 1', 'New log 2']);

      const job = store.getJob(jobId!);
      expect(job?.logs).toEqual(['New log 1', 'New log 2']);
    });
  });

  describe('progress tracking', () => {
    it('should update progress for running job', () => {
      const store = useJobsStore();
      const jobId = store.enqueue('/path.mp4', 'preset');
      store.markRunning(jobId!, {} as any);
      store.updateProgress(jobId!, {
        processedSeconds: 30,
        speed: 2.5,
      });

      const job = store.getJob(jobId!);
      if (job?.state.status === 'running') {
        expect(job.state.progress.processedSeconds).toBe(30);
        expect(job.state.progress.speed).toBe(2.5);
      }
    });

    it('should calculate ratio from processedSeconds and duration', () => {
      const store = useJobsStore();
      const jobId = store.enqueue('/path.mp4', 'preset');
      store.markPlanning(jobId!, { durationSec: 100 });
      store.markRunning(jobId!, {} as any);
      store.updateProgress(jobId!, { processedSeconds: 50 });

      const job = store.getJob(jobId!);
      if (job?.state.status === 'running') {
        expect(job.state.progress.ratio).toBe(0.5);
      }
    });

    it('should not update progress for non-running jobs', () => {
      const store = useJobsStore();
      const jobId = store.enqueue('/path.mp4', 'preset');
      store.updateProgress(jobId!, { processedSeconds: 50 });

      const job = store.getJob(jobId!);
      expect(job?.state.status).toBe('queued');
    });
  });

  describe('removeJob', () => {
    it('should remove job from store', () => {
      const store = useJobsStore();
      const jobId = store.enqueue('/path.mp4', 'preset');

      expect(store.jobs.length).toBe(1);
      store.removeJob(jobId!);
      expect(store.jobs.length).toBe(0);
    });

    it('should not throw for non-existent job ID', () => {
      const store = useJobsStore();
      expect(() => store.removeJob('non-existent')).not.toThrow();
    });
  });

  describe('updateJobPreset', () => {
    it('should update job preset', () => {
      const store = useJobsStore();
      const jobId = store.enqueue('/path.mp4', 'preset1');
      store.updateJobPreset(jobId!, 'preset2');

      const job = store.getJob(jobId!);
      expect(job?.presetId).toBe('preset2');
    });
  });

  describe('clearCompleted', () => {
    it('should remove completed jobs', () => {
      const store = useJobsStore();
      const id1 = store.enqueue('/path1.mp4', 'preset');
      const id2 = store.enqueue('/path2.mp4', 'preset');
      const id3 = store.enqueue('/path3.mp4', 'preset');

      store.markCompleted(id1!, '/output1.mp4');
      store.markFailed(id2!, 'error');
      // id3 stays queued

      expect(store.jobs.length).toBe(3);
      store.clearCompleted();
      expect(store.jobs.length).toBe(1);
      expect(store.jobs[0].id).toBe(id3);
    });
  });

  describe('startNext', () => {
    it('should start next queued job if under concurrency limit', () => {
      const store = useJobsStore();
      store.setConcurrency(2);

      const id1 = store.enqueue('/path1.mp4', 'preset');
      store.enqueue('/path2.mp4', 'preset');

      const started = store.startNext();
      expect(started).toBeDefined();
      expect(started?.id).toBe(id1);
      expect(started?.state.status).toBe('probing');
    });

    it('should return undefined if at concurrency limit', () => {
      const store = useJobsStore();
      store.setConcurrency(1);

      const id1 = store.enqueue('/path1.mp4', 'preset');
      store.enqueue('/path2.mp4', 'preset');

      store.markRunning(id1!, {} as any);

      const started = store.startNext();
      expect(started).toBeUndefined();
    });

    it('should return undefined if no queued jobs', () => {
      const store = useJobsStore();
      const started = store.startNext();
      expect(started).toBeUndefined();
    });
  });

  describe('peekNext', () => {
    it('should return next queued job without starting', () => {
      const store = useJobsStore();
      const id1 = store.enqueue('/path1.mp4', 'preset');

      const peeked = store.peekNext();
      expect(peeked?.id).toBe(id1);
      expect(peeked?.state.status).toBe('queued');
    });

    it('should return undefined if no queued jobs', () => {
      const store = useJobsStore();
      const peeked = store.peekNext();
      expect(peeked).toBeUndefined();
    });
  });

  describe('computed properties', () => {
    it('should track active jobs', () => {
      const store = useJobsStore();
      const id1 = store.enqueue('/path1.mp4', 'preset');
      const id2 = store.enqueue('/path2.mp4', 'preset');
      const id3 = store.enqueue('/path3.mp4', 'preset');

      store.markRunning(id1!, {} as any);
      store.markProbing(id2!);
      store.markCompleted(id3!, '/output.mp4');

      expect(store.activeJobs.length).toBe(2);
      expect(store.queuedJobs.length).toBe(0);
      expect(store.terminalJobs.length).toBe(1);
    });

    it('should calculate running ETA', () => {
      const store = useJobsStore();
      const jobId = store.enqueue('/path.mp4', 'preset');
      store.markPlanning(jobId!, { durationSec: 100 });
      store.markRunning(jobId!, {} as any);
      store.updateProgress(jobId!, { processedSeconds: 25 });

      expect(store.runningEtaSeconds).toBe(75);
    });

    it('should return null ETA when no running jobs', () => {
      const store = useJobsStore();
      store.enqueue('/path.mp4', 'preset');
      expect(store.runningEtaSeconds).toBeNull();
    });
  });

  describe('exclusive jobs', () => {
    it('should mark job as exclusive', () => {
      const store = useJobsStore();
      const jobId = store.enqueue('/path.mp4', 'preset');
      store.setExclusive(jobId!, true);

      const job = store.getJob(jobId!);
      expect(job?.exclusive).toBe(true);
    });

    it('should track hasExclusiveActive', () => {
      const store = useJobsStore();
      const jobId = store.enqueue('/path.mp4', 'preset');
      store.setExclusive(jobId!, true);
      store.markRunning(jobId!, {} as any);

      expect(store.hasExclusiveActive).toBe(true);
    });

    it('should clear exclusive flag on completion', () => {
      const store = useJobsStore();
      const jobId = store.enqueue('/path.mp4', 'preset');
      store.setExclusive(jobId!, true);
      store.markRunning(jobId!, {} as any);
      store.markCompleted(jobId!, '/output.mp4');

      const job = store.getJob(jobId!);
      expect(job?.exclusive).toBe(false);
    });
  });

  describe('concurrency management', () => {
    it('should update max concurrency', () => {
      const store = useJobsStore();
      store.setConcurrency(5);
      expect(store.maxConcurrency).toBe(5);
    });

    it('should enforce minimum concurrency of 1', () => {
      const store = useJobsStore();
      store.setConcurrency(0);
      expect(store.maxConcurrency).toBe(1);
    });

    it('should floor decimal values', () => {
      const store = useJobsStore();
      store.setConcurrency(3.7);
      expect(store.maxConcurrency).toBe(3);
    });
  });
});
