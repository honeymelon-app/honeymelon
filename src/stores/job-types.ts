import type { PlannerDecision } from '@/lib/ffmpeg-plan';
import { isActiveStatus, isTerminalStatus } from '@/lib/job-lifecycle';
import type { JobState, ProbeSummary, Tier } from '@/lib/types';

export interface JobRecord {
  id: string;
  path: string;
  presetId: string;
  tier: Tier;
  state: JobState;
  summary?: ProbeSummary;
  decision?: PlannerDecision;
  exclusive?: boolean;
  outputPath?: string;
  logs?: string[];
  createdAt: number;
  updatedAt: number;
}

export type JobId = string;

export const MAX_TERMINAL_JOBS = 50;

export function isActiveState(state: JobState): boolean {
  return isActiveStatus(state.status);
}

export function isTerminalState(state: JobState): boolean {
  return isTerminalStatus(state.status);
}

export function now(): number {
  return Date.now();
}

export function createJobId(): JobId {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `job-${Math.random().toString(36).slice(2, 10)}`;
}

export function readEnqueuedAt(state: JobState): number {
  return state.enqueuedAt;
}
