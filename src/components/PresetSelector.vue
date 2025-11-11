<script setup lang="ts">
import { computed } from 'vue';

import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Preset } from '@/lib/types';

interface PresetSelectorProps {
  presetId: string;
  availablePresets: Preset[];
  editable?: boolean;
}

const props = withDefaults(defineProps<PresetSelectorProps>(), {
  editable: false,
});

const emit = defineEmits<{
  update: [presetId: string];
}>();

const selectedPreset = computed(() => props.availablePresets.find((p) => p.id === props.presetId));

function handlePresetChange(newPresetId: unknown) {
  if (typeof newPresetId === 'string') {
    const available = props.availablePresets.some((preset) => preset.id === newPresetId);
    if (!available) {
      return;
    }
    emit('update', newPresetId);
  }
}
</script>

<template>
  <div class="flex items-center gap-3">
    <span class="text-xs text-muted-foreground">Convert to:</span>
    <Select v-if="editable" :model-value="presetId" @update:model-value="handlePresetChange">
      <SelectTrigger class="h-8 w-auto min-w-[180px] text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem v-for="preset in availablePresets" :key="preset.id" :value="preset.id">
          {{ preset.label }}
        </SelectItem>
      </SelectContent>
    </Select>
    <Badge v-else-if="selectedPreset" variant="secondary" class="text-xs">
      {{ selectedPreset?.label || presetId }}
    </Badge>
    <span v-else class="text-xs text-muted-foreground">No compatible outputs</span>
  </div>
</template>
