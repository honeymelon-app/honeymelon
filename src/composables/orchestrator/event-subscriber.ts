import { listen, type UnlistenFn } from '@tauri-apps/api/event';

const PROGRESS_EVENT = 'ffmpeg://progress';
const COMPLETION_EVENT = 'ffmpeg://completion';
const STDERR_EVENT = 'ffmpeg://stderr';

export interface ProgressEventPayload {
  jobId: string;
  progress?: {
    processedSeconds?: number;
    fps?: number;
    speed?: number;
  };
  raw: string;
}

export interface CompletionEventPayload {
  jobId: string;
  success: boolean;
  cancelled: boolean;
  exitCode?: number | null;
  signal?: number | null;
  code?: string | null;
  message?: string | null;
  logs?: string[];
}

export interface RunnerEventSubscriberOptions {
  enabled: boolean;
  onProgress?: (payload: ProgressEventPayload | undefined) => void;
  onCompletion?: (payload: CompletionEventPayload | undefined) => void;
  onStderr?: (payload: { jobId?: string; line?: string } | undefined) => void;
}

export interface RunnerEventSubscriber {
  start: () => Promise<void>;
  stop: () => void;
}

export function createRunnerEventSubscriber(
  options: RunnerEventSubscriberOptions,
): RunnerEventSubscriber {
  let started = false;
  const unlistenFns: UnlistenFn[] = [];

  async function start() {
    if (!options.enabled || started) {
      return;
    }
    started = true;

    if (options.onProgress) {
      try {
        const unlistenProgress = await listen<ProgressEventPayload>(PROGRESS_EVENT, (event) => {
          options.onProgress?.(event.payload);
        });
        unlistenFns.push(unlistenProgress);
      } catch (error) {
        console.error('[orchestrator] Failed to setup progress listener:', error);
      }
    }

    if (options.onStderr) {
      try {
        const unlistenStderr = await listen<{ jobId: string; line: string }>(
          STDERR_EVENT,
          (event) => {
            options.onStderr?.(event.payload);
          },
        );
        unlistenFns.push(unlistenStderr);
      } catch (error) {
        console.error('[orchestrator] Failed to setup stderr listener:', error);
      }
    }

    if (options.onCompletion) {
      try {
        const unlistenCompletion = await listen<CompletionEventPayload>(
          COMPLETION_EVENT,
          (event) => {
            options.onCompletion?.(event.payload);
          },
        );
        unlistenFns.push(unlistenCompletion);
      } catch (error) {
        console.error('[orchestrator] Failed to setup completion listener:', error);
      }
    }
  }

  function stop() {
    unlistenFns.forEach((unlisten) => unlisten?.());
    unlistenFns.length = 0;
    started = false;
  }

  return {
    start,
    stop,
  };
}
