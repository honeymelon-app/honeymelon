<script setup lang="ts">
import { File, CheckCircle2, XCircle, Clock, Loader2, AlertCircle } from 'lucide-vue-next';
import { computed } from 'vue';
import type { Component } from 'vue';

import type { JobState } from '@/lib/types';

interface JobStatusBadgeProps {
  state: JobState;
}

const props = defineProps<JobStatusBadgeProps>();

interface StatusInfo {
  label: string;
  icon: Component;
  color: string;
  bgColor: string;
  spin?: boolean;
  pulse?: boolean;
}

const statusInfo = computed<StatusInfo>(() => {
  const state = props.state;

  switch (state.status) {
    case 'queued':
      return {
        label: 'Waiting',
        icon: Clock,
        color: 'text-muted-foreground',
        bgColor: 'bg-muted',
      };
    case 'probing':
      return {
        label: 'Analyzing',
        icon: Loader2,
        color: 'text-blue-500',
        bgColor: 'bg-blue-500/10',
        spin: true,
      };
    case 'planning':
      return {
        label: 'Planning',
        icon: Loader2,
        color: 'text-blue-500',
        bgColor: 'bg-blue-500/10',
        spin: true,
      };
    case 'running':
      return {
        label: 'Converting',
        icon: Loader2,
        color: 'text-primary',
        bgColor: 'bg-primary/10',
        spin: true,
      };
    case 'completed':
      return {
        label: 'Done',
        icon: CheckCircle2,
        color: 'text-green-500',
        bgColor: 'bg-green-500/10',
        pulse: true,
      };
    case 'failed':
      return {
        label: 'Failed',
        icon: AlertCircle,
        color: 'text-red-500',
        bgColor: 'bg-red-500/10',
      };
    case 'cancelled':
      return {
        label: 'Cancelled',
        icon: XCircle,
        color: 'text-orange-500',
        bgColor: 'bg-orange-500/10',
      };
    default:
      return {
        label: 'Unknown',
        icon: File,
        color: 'text-muted-foreground',
        bgColor: 'bg-muted',
      };
  }
});
</script>

<template>
  <div
    :class="[
      'flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all duration-300',
      statusInfo.bgColor,
      statusInfo.pulse && 'animate-pulse-soft',
    ]"
  >
    <component
      :is="statusInfo.icon"
      :class="[
        'h-5 w-5 transition-all duration-200',
        statusInfo.color,
        statusInfo.spin && 'animate-spin',
      ]"
    />
  </div>
</template>
