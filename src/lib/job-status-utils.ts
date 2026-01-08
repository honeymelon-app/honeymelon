/**
 * Job status configuration utilities.
 *
 * Provides centralized configuration for job status display including
 * labels, variants, icons, and colors. This avoids duplicating switch
 * statements across multiple components.
 */

import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  File,
  FileX,
  HardDrive,
  Loader2,
  Settings,
  X,
  XCircle,
} from 'lucide-vue-next';
import type { Component } from 'vue';

import type { JobStatus } from '@/lib/job-lifecycle';
import type { ErrorCategory } from '@/lib/types';

/**
 * Configuration for a job status display.
 */
export interface StatusDisplayConfig {
  /** Translation key for the status label */
  labelKey: string;
  /** Badge variant for styling */
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  /** Icon component to display */
  icon: Component;
  /** Tailwind text color class */
  color: string;
  /** Tailwind background color class */
  bgColor: string;
  /** Whether the icon should spin */
  spin?: boolean;
  /** Whether the element should pulse */
  pulse?: boolean;
}

/**
 * Status configuration map for all job statuses.
 */
export const STATUS_CONFIG: Record<JobStatus, StatusDisplayConfig> = {
  queued: {
    labelKey: 'job.status.queued',
    variant: 'secondary',
    icon: Clock,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
  },
  probing: {
    labelKey: 'job.status.probing',
    variant: 'secondary',
    icon: Loader2,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    spin: true,
  },
  planning: {
    labelKey: 'job.status.planning',
    variant: 'secondary',
    icon: Loader2,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    spin: true,
  },
  running: {
    labelKey: 'job.status.running',
    variant: 'secondary',
    icon: Loader2,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    spin: true,
  },
  completed: {
    labelKey: 'job.status.completed',
    variant: 'default',
    icon: CheckCircle2,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    pulse: true,
  },
  failed: {
    labelKey: 'job.status.failed',
    variant: 'destructive',
    icon: AlertCircle,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
  },
  cancelled: {
    labelKey: 'job.status.cancelled',
    variant: 'secondary',
    icon: XCircle,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
  },
};

/**
 * Default status config for unknown statuses.
 */
export const DEFAULT_STATUS_CONFIG: StatusDisplayConfig = {
  labelKey: 'job.status.unknown',
  variant: 'secondary',
  icon: File,
  color: 'text-muted-foreground',
  bgColor: 'bg-muted',
};

/**
 * Gets the display configuration for a job status.
 *
 * @param status - The job status
 * @returns The display configuration
 */
export function getStatusConfig(status: JobStatus): StatusDisplayConfig {
  return STATUS_CONFIG[status] ?? DEFAULT_STATUS_CONFIG;
}

/**
 * Configuration for error category display.
 */
export interface ErrorCategoryConfig {
  /** Translation key for help text */
  helpKey: string;
  /** Icon component for the error type */
  icon: Component;
}

/**
 * Error category configuration map.
 */
export const ERROR_CATEGORY_CONFIG: Record<ErrorCategory, ErrorCategoryConfig> = {
  INPUT_PROBLEM: {
    helpKey: 'job.errors.inputProblem',
    icon: FileX,
  },
  UNSUPPORTED_COMBINATION: {
    helpKey: 'job.errors.unsupportedCombination',
    icon: Settings,
  },
  RESOURCE_ISSUE: {
    helpKey: 'job.errors.resourceIssue',
    icon: HardDrive,
  },
  TIMEOUT: {
    helpKey: 'job.errors.timeout',
    icon: Clock,
  },
  INTERNAL_PIPELINE_ERROR: {
    helpKey: 'job.errors.internal',
    icon: AlertTriangle,
  },
  CANCELLED: {
    helpKey: 'job.errors.cancelled',
    icon: X,
  },
};

/**
 * Default error config for unknown categories.
 */
export const DEFAULT_ERROR_CONFIG: ErrorCategoryConfig = {
  helpKey: '',
  icon: AlertTriangle,
};

/**
 * Gets the display configuration for an error category.
 *
 * @param category - The error category
 * @returns The display configuration, or undefined if category is undefined
 */
export function getErrorCategoryConfig(
  category: ErrorCategory | undefined,
): ErrorCategoryConfig | undefined {
  if (!category) return undefined;
  return ERROR_CATEGORY_CONFIG[category] ?? DEFAULT_ERROR_CONFIG;
}
