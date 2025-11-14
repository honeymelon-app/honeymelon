import type { JobState } from '@/lib/types';

export type JobStatus = JobState['status'];

type TransitionMap = Record<JobStatus, readonly JobStatus[]>;

type LifecycleGuard = {
  canTransition: (from: JobStatus, to: JobStatus) => boolean;
  ensureTransition: (current: JobState, next: JobState, context?: string) => boolean;
};

const JOB_STATUS_SEQUENCE = [
  'queued',
  'probing',
  'planning',
  'running',
  'completed',
  'failed',
  'cancelled',
] as const satisfies readonly JobStatus[];

const TERMINAL_STATUSES = [
  'completed',
  'failed',
  'cancelled',
] as const satisfies readonly JobStatus[];
const ACTIVE_STATUSES = ['probing', 'planning', 'running'] as const satisfies readonly JobStatus[];

export const JOB_STATUS_TRANSITIONS = {
  queued: ['probing', 'cancelled'],
  probing: ['planning', 'failed', 'cancelled', 'queued'],
  planning: ['running', 'failed', 'cancelled', 'queued'],
  running: ['completed', 'failed', 'cancelled', 'queued'],
  completed: ['queued'],
  failed: ['queued'],
  cancelled: ['queued'],
} as const satisfies TransitionMap;

const ACTIVE_STATUS_SET = new Set<JobStatus>(ACTIVE_STATUSES);
const TERMINAL_STATUS_SET = new Set<JobStatus>(TERMINAL_STATUSES);
const JOB_STATUS_TRANSITION_SETS: Record<JobStatus, ReadonlySet<JobStatus>> = {
  queued: new Set<JobStatus>(JOB_STATUS_TRANSITIONS.queued),
  probing: new Set<JobStatus>(JOB_STATUS_TRANSITIONS.probing),
  planning: new Set<JobStatus>(JOB_STATUS_TRANSITIONS.planning),
  running: new Set<JobStatus>(JOB_STATUS_TRANSITIONS.running),
  completed: new Set<JobStatus>(JOB_STATUS_TRANSITIONS.completed),
  failed: new Set<JobStatus>(JOB_STATUS_TRANSITIONS.failed),
  cancelled: new Set<JobStatus>(JOB_STATUS_TRANSITIONS.cancelled),
};

const DEV_MODE = detectDevMode();

function detectDevMode(): boolean {
  if (typeof import.meta !== 'undefined' && typeof import.meta.env !== 'undefined') {
    return Boolean(import.meta.env?.DEV ?? false);
  }
  if (typeof process !== 'undefined' && typeof process.env !== 'undefined') {
    return process.env.NODE_ENV !== 'production';
  }
  return true;
}

export function isActiveStatus(status: JobStatus): boolean {
  return ACTIVE_STATUS_SET.has(status);
}

export function isTerminalStatus(status: JobStatus): boolean {
  return TERMINAL_STATUS_SET.has(status);
}

export function canTransitionStatus(from: JobStatus, to: JobStatus): boolean {
  const allowed = JOB_STATUS_TRANSITION_SETS[from];
  return allowed.has(to);
}

export function createLifecycleGuard(): LifecycleGuard {
  return {
    canTransition: canTransitionStatus,
    ensureTransition(current, next, context) {
      const allowed = canTransitionStatus(current.status, next.status);
      if (!allowed) {
        const reason = context ? ` via ${context}` : '';
        const message = `[job-lifecycle] Illegal transition ${current.status} → ${next.status}${reason}`;
        if (DEV_MODE) {
          throw new Error(message);
        }
        console.warn(message);
        return false;
      }
      return true;
    },
  };
}

export const jobLifecycle = createLifecycleGuard();

export { JOB_STATUS_SEQUENCE, ACTIVE_STATUSES, TERMINAL_STATUSES };
