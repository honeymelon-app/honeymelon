/**
 * Observer Pattern for Job State Changes
 *
 * Implements the Observer design pattern to decouple job state change reactions
 * from the core state management logic. This allows for extensible handling of
 * state transitions without modifying the store.
 */

import type { JobState } from '@/lib/types';

/**
 * Observer interface for job state changes
 */
export interface JobStateObserver {
  /**
   * Called when a job's state changes
   *
   * @param jobId - Unique identifier of the job
   * @param oldState - Previous state
   * @param newState - New state
   */
  onStateChange(jobId: string, oldState: JobState, newState: JobState): void;
}

/**
 * Job metrics observer - Tracks job statistics and performance
 *
 * This observer monitors job state transitions to collect metrics like:
 * - Job completion rates
 * - Average processing time
 * - Failure rates
 */
export class JobMetricsObserver implements JobStateObserver {
  private completionCount = 0;
  private failureCount = 0;
  private cancellationCount = 0;
  private totalProcessingTime = 0;

  onStateChange(_jobId: string, oldState: JobState, newState: JobState): void {
    // Track terminal states
    if (newState.status === 'completed') {
      this.completionCount++;
      if ('enqueuedAt' in oldState) {
        this.totalProcessingTime += Date.now() - oldState.enqueuedAt;
      }
      // console.debug(`[metrics] Job ${_jobId} completed. Total completions: ${this.completionCount}`);
    } else if (newState.status === 'failed') {
      this.failureCount++;
      // console.debug(`[metrics] Job ${_jobId} failed. Total failures: ${this.failureCount}`);
    } else if (newState.status === 'cancelled') {
      this.cancellationCount++;
      // console.debug(
      //   `[metrics] Job ${_jobId} cancelled. Total cancellations: ${this.cancellationCount}`,
      // );
    }

    // Track state transitions
    // console.debug(`[metrics] Job ${_jobId} transitioned: ${oldState.status} → ${newState.status}`);
  }

  /**
   * Gets current metrics
   */
  getMetrics() {
    return {
      completions: this.completionCount,
      failures: this.failureCount,
      cancellations: this.cancellationCount,
      averageProcessingTime:
        this.completionCount > 0 ? this.totalProcessingTime / this.completionCount : 0,
    };
  }

  /**
   * Resets all metrics
   */
  reset(): void {
    this.completionCount = 0;
    this.failureCount = 0;
    this.cancellationCount = 0;
    this.totalProcessingTime = 0;
  }
}

/**
 * Job notification observer - Handles desktop notifications for state changes
 *
 * This observer shows system notifications for important job events like
 * completions and failures, providing user feedback even when the app
 * is in the background.
 */
export class JobNotificationObserver implements JobStateObserver {
  private notificationsEnabled: boolean;

  constructor(enabled = true) {
    this.notificationsEnabled = enabled;
  }

  onStateChange(jobId: string, _oldState: JobState, newState: JobState): void {
    if (!this.notificationsEnabled) {
      return;
    }

    // Only notify on terminal states
    if (newState.status === 'completed') {
      this.notifyCompletion(jobId);
    } else if (newState.status === 'failed') {
      const message = 'message' in newState ? (newState.message as string | undefined) : undefined;
      this.notifyFailure(jobId, message);
    }
  }

  private notifyCompletion(_jobId: string): void {
    // console.info(`[notification] Job ${_jobId} completed successfully`);
    // In real implementation, this would use Tauri's notification API
    // sendNotification({ title: 'Conversion Complete', body: `Job ${_jobId} finished` });
  }

  private notifyFailure(jobId: string, message?: string): void {
    console.warn(`[notification] Job ${jobId} failed: ${message ?? 'Unknown error'}`);
    // In real implementation, this would use Tauri's notification API
    // sendNotification({ title: 'Conversion Failed', body: message });
  }

  /**
   * Enables or disables notifications
   */
  setEnabled(enabled: boolean): void {
    this.notificationsEnabled = enabled;
  }
}

/**
 * Composite observer - Manages multiple observers
 *
 * This class implements the Composite pattern to allow multiple observers
 * to be notified of state changes simultaneously.
 */
export class CompositeJobObserver implements JobStateObserver {
  private observers: JobStateObserver[] = [];

  /**
   * Adds an observer
   */
  addObserver(observer: JobStateObserver): void {
    this.observers.push(observer);
  }

  /**
   * Removes an observer
   */
  removeObserver(observer: JobStateObserver): void {
    const index = this.observers.indexOf(observer);
    if (index > -1) {
      this.observers.splice(index, 1);
    }
  }

  /**
   * Notifies all registered observers
   */
  onStateChange(jobId: string, oldState: JobState, newState: JobState): void {
    for (const observer of this.observers) {
      try {
        observer.onStateChange(jobId, oldState, newState);
      } catch (error) {
        console.error('[observer] Error in observer:', error);
      }
    }
  }

  /**
   * Clears all observers
   */
  clear(): void {
    this.observers = [];
  }
}

/**
 * Global composite observer instance
 */
export const globalJobObserver = new CompositeJobObserver();

// Register default observers
globalJobObserver.addObserver(new JobMetricsObserver());
globalJobObserver.addObserver(new JobNotificationObserver());
