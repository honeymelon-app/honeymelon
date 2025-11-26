import { invoke } from '@tauri-apps/api/core';
import type { Ref } from 'vue';

import { ErrorHandler } from '@/lib/error-handler';
import type { PlannerDecision } from '@/lib/ffmpeg-plan';
import { JobError, type Tier } from '@/lib/types';
import { joinPath, pathBasename, pathDirname, stripExtension } from '@/lib/utils';
import type { ExecutionService } from '@/services/execution-service';
import type { useJobsStore } from '@/stores/jobs';

interface RunnerClientOptions {
  jobs: ReturnType<typeof useJobsStore>;
  outputDirectory: Ref<string | undefined | null>;
  includePresetInName: Ref<boolean>;
  includeTierInName: Ref<boolean>;
  filenameSeparator: Ref<string>;
  simulate: boolean;
  execution: ExecutionService;
}

export interface RunnerClient {
  run(jobId: string, decision: PlannerDecision): Promise<boolean>;
  cancel(jobId: string): Promise<boolean>;
  shutdown(): void;
}

export function createRunnerClient(options: RunnerClientOptions): RunnerClient {
  const {
    jobs,
    outputDirectory,
    includePresetInName,
    includeTierInName,
    filenameSeparator,
    simulate,
    execution,
  } = options;

  const simulatedJobs = new Map<string, number>();

  /**
   * Checks if a file exists at the given path (via Tauri backend)
   */
  async function checkFileExists(path: string): Promise<boolean> {
    try {
      return await invoke<boolean>('file_exists', { path });
    } catch {
      // On error, assume file doesn't exist to avoid blocking conversions
      return false;
    }
  }

  /**
   * Finds a unique output path by appending a numeric suffix if needed.
   * E.g., if "video.mp4" exists, tries "video (1).mp4", "video (2).mp4", etc.
   */
  async function findUniqueOutputPath(basePath: string): Promise<string> {
    // First check if the base path is available
    const exists = await checkFileExists(basePath);
    if (!exists) {
      return basePath;
    }

    // Parse the path into components
    const dir = pathDirname(basePath);
    const fullName = pathBasename(basePath);
    const lastDotIndex = fullName.lastIndexOf('.');
    const nameWithoutExt = lastDotIndex > 0 ? fullName.slice(0, lastDotIndex) : fullName;
    const ext = lastDotIndex > 0 ? fullName.slice(lastDotIndex) : '';

    // Try numbered suffixes up to a reasonable limit
    const maxAttempts = 100;
    for (let i = 1; i <= maxAttempts; i++) {
      const candidateName = `${nameWithoutExt} (${i})${ext}`;
      const candidatePath = dir ? joinPath(dir, candidateName) : candidateName;
      const candidateExists = await checkFileExists(candidatePath);
      if (!candidateExists) {
        return candidatePath;
      }
    }

    // If we've exhausted attempts, use timestamp as fallback
    const timestamp = Date.now();
    const fallbackName = `${nameWithoutExt} (${timestamp})${ext}`;
    return dir ? joinPath(dir, fallbackName) : fallbackName;
  }

  async function run(jobId: string, decision: PlannerDecision): Promise<boolean> {
    if (simulate) {
      const simulatedJob = jobs.getJob(jobId);
      const outputPath = buildOutputPath(simulatedJob, decision);
      jobs.setOutputPath(jobId, outputPath);
      simulateProgress(jobId, outputPath);
      return true;
    }

    const job = jobs.getJob(jobId);
    if (!job) {
      throw new JobError('Job not found', 'job_missing');
    }

    // Build initial output path, then find a unique one if needed
    const baseOutputPath = buildOutputPath(job, decision);
    const outputPath = await findUniqueOutputPath(baseOutputPath);
    jobs.setOutputPath(jobId, outputPath);

    if (!decision.ffmpegArgs || decision.ffmpegArgs.length === 0) {
      throw new JobError('FFmpeg arguments cannot be empty', 'job_invalid_args');
    }

    try {
      const startResult = await execution.start({
        jobId,
        decision,
        outputPath,
        exclusive: job.exclusive ?? false,
      });

      if (!startResult.success) {
        const message = startResult.error ?? 'Failed to start FFmpeg job';
        jobs.markFailed(jobId, message, startResult.code);
        return false;
      }

      return true;
    } catch (error) {
      const details = ErrorHandler.parseErrorDetails(error);
      jobs.markFailed(jobId, details.message, details.code);
      return false;
    }
  }

  async function cancel(jobId: string): Promise<boolean> {
    if (simulate) {
      const timer = simulatedJobs.get(jobId);
      if (timer !== undefined) {
        window.clearInterval(timer);
        simulatedJobs.delete(jobId);
        jobs.cancelJob(jobId);
        return true;
      }
      return false;
    }

    const result = await execution.cancel(jobId);
    if (!result.success && result.error) {
      console.warn('[runner-client] Failed to cancel job:', result.error);
      return false;
    }

    return result.cancelled;
  }

  function simulateProgress(jobId: string, outputPath: string) {
    const job = jobs.getJob(jobId);
    const duration = job?.summary?.durationSec ?? 120;
    const interval = 500;
    const totalDuration = Math.max(duration, 1);
    const increments = Math.max(Math.ceil((totalDuration * 1000) / interval), 1);
    const step = totalDuration / increments;
    let elapsed = 0;

    jobs.updateProgress(jobId, {
      processedSeconds: 0,
      fps: 30,
      speed: 1,
    });
    jobs.appendLog(jobId, 'Simulation started');

    const timer = window.setInterval(() => {
      elapsed += step;
      jobs.updateProgress(jobId, {
        processedSeconds: elapsed,
        fps: 30,
        speed: 1,
      });

      if (elapsed >= totalDuration) {
        simulatedJobs.delete(jobId);
        window.clearInterval(timer);
        jobs.markCompleted(jobId, outputPath);
        jobs.appendLog(jobId, 'Simulation completed');
      }
    }, interval);

    simulatedJobs.set(jobId, timer);
  }

  function buildOutputPath(
    job: { path?: string; tier?: Tier } | undefined,
    decision: PlannerDecision,
  ) {
    const sourcePath = job?.path ?? '';
    const preset = decision.preset;
    const extension = preset.outputExtension ?? preset.container;

    const baseDirCandidate = outputDirectory.value ?? '';
    const sanitizedBaseDirCandidate = sanitizePath(baseDirCandidate);
    const fallbackBaseDir = sourcePath ? sanitizePath(pathDirname(sourcePath)) : '';
    const baseDir =
      sanitizedBaseDirCandidate && sanitizedBaseDirCandidate.length
        ? sanitizedBaseDirCandidate
        : fallbackBaseDir;

    const rawBaseName = sourcePath ? stripExtension(pathBasename(sourcePath)) : preset.id;
    const safeBaseName = sanitizePathComponent(rawBaseName || 'output').trim() || 'output';
    const safeExtension = sanitizePathComponent(extension || preset.container).trim() || 'mp4';

    let fileName = `${safeBaseName}.${safeExtension}`;

    if (includePresetInName.value || includeTierInName.value) {
      const segments: string[] = [safeBaseName];
      const separatorRaw = filenameSeparator.value || '-';
      const separator = sanitizePathComponent(separatorRaw) || '-';

      if (includePresetInName.value) {
        segments.push(sanitizePathComponent(slugify(preset.id)));
      }
      if (includeTierInName.value && job?.tier) {
        segments.push(sanitizePathComponent(job.tier));
      }

      const compositeName = segments
        .map((segment) => segment.trim())
        .filter(Boolean)
        .join(separator);
      fileName = `${sanitizePathComponent(compositeName) || safeBaseName}.${safeExtension}`;
    }

    const sanitizedFileName = sanitizePathComponent(fileName) || `${safeBaseName}.${safeExtension}`;

    return baseDir ? joinPath(baseDir, sanitizedFileName) : sanitizedFileName;
  }

  function slugify(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function sanitizePathComponent(value: string): string {
    if (!value) {
      return '';
    }
    return value.replace(/\.{2}/g, '').replace(/[<>:"|?*\\/]/g, '_');
  }

  function sanitizePath(value?: string | null): string {
    if (!value) {
      return '';
    }
    const normalized = value.replace(/\\/g, '/');
    const leadingSlash = normalized.startsWith('/');
    const segments = normalized
      .split('/')
      .map((segment) => sanitizePathComponent(segment))
      .filter((segment) => segment.length > 0);
    if (!segments.length) {
      return '';
    }
    const sanitized = segments.join('/');
    return leadingSlash ? `/${sanitized}` : sanitized;
  }

  function shutdown() {
    Array.from(simulatedJobs.values()).forEach((timer) => {
      window.clearInterval(timer);
    });
    simulatedJobs.clear();
  }

  return {
    run,
    cancel,
    shutdown,
  };
}
