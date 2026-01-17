import { describe, expect, it } from 'vitest';

import {
  canTransitionStatus,
  isActiveStatus,
  isTerminalStatus,
  jobLifecycle,
} from '@/lib/job-lifecycle';
import type { JobState } from '@/lib/types';

function buildState<T extends JobState>(state: T): T {
  return state;
}

describe('jobLifecycle', () => {
  it('enumerates allowed transitions', () => {
    expect(canTransitionStatus('queued', 'probing')).toBe(true);
    expect(canTransitionStatus('planning', 'running')).toBe(true);
    expect(canTransitionStatus('running', 'completed')).toBe(true);
    expect(canTransitionStatus('queued', 'running')).toBe(false);
  });

  it('identifies active and terminal statuses', () => {
    expect(isActiveStatus('running')).toBe(true);
    expect(isActiveStatus('queued')).toBe(false);
    expect(isTerminalStatus('completed')).toBe(true);
    expect(isTerminalStatus('planning')).toBe(false);
  });

  it('ensures valid transitions and throws in dev for invalid ones', () => {
    const queued = buildState<JobState>({
      status: 'queued',
      enqueuedAt: 100,
    });
    const probing = buildState<JobState>({
      status: 'probing',
      enqueuedAt: 100,
      startedAt: 200,
    });

    expect(jobLifecycle.ensureTransition(queued, probing, 'unit-test')).toBe(true);

    const illegalRunning = buildState<JobState>({
      status: 'running',
      enqueuedAt: 100,
      startedAt: 200,
      progress: {},
    });

    expect(() => jobLifecycle.ensureTransition(queued, illegalRunning, 'unit-test')).toThrow(
      /Illegal transition queued > running via unit-test/,
    );
  });

  it('allows re-queue from terminal states', () => {
    expect(canTransitionStatus('completed', 'queued')).toBe(true);
    expect(canTransitionStatus('failed', 'queued')).toBe(true);
    expect(canTransitionStatus('cancelled', 'queued')).toBe(true);
  });

  it('allows cancellation from active states', () => {
    expect(canTransitionStatus('probing', 'cancelled')).toBe(true);
    expect(canTransitionStatus('planning', 'cancelled')).toBe(true);
    expect(canTransitionStatus('running', 'cancelled')).toBe(true);
    expect(canTransitionStatus('queued', 'cancelled')).toBe(true);
  });

  it('prevents transitions from terminal to non-queued states', () => {
    expect(canTransitionStatus('completed', 'running')).toBe(false);
    expect(canTransitionStatus('failed', 'probing')).toBe(false);
    expect(canTransitionStatus('cancelled', 'planning')).toBe(false);
  });

  it('correctly classifies all terminal statuses', () => {
    expect(isTerminalStatus('completed')).toBe(true);
    expect(isTerminalStatus('failed')).toBe(true);
    expect(isTerminalStatus('cancelled')).toBe(true);
    expect(isTerminalStatus('queued')).toBe(false);
    expect(isTerminalStatus('probing')).toBe(false);
    expect(isTerminalStatus('planning')).toBe(false);
    expect(isTerminalStatus('running')).toBe(false);
  });
});
