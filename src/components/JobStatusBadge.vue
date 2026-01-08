<script setup lang="ts">
import { computed } from 'vue';

import type { JobStatus } from '@/lib/job-lifecycle';
import { getStatusConfig, DEFAULT_STATUS_CONFIG } from '@/lib/job-status-utils';
import type { JobState } from '@/lib/types';

interface JobStatusBadgeProps {
  state: JobState;
}

const props = defineProps<JobStatusBadgeProps>();

const statusInfo = computed(() => {
  return getStatusConfig(props.state.status as JobStatus) ?? DEFAULT_STATUS_CONFIG;
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
