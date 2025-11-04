<script setup lang="ts">
import { useAttrs } from 'vue';

interface InputProps {
  modelValue?: string | number | null;
  type?: string;
}

const props = withDefaults(defineProps<InputProps>(), {
  modelValue: '',
  type: 'text',
});

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const attrs = useAttrs();

function onInput(event: Event) {
  const target = event.target as HTMLInputElement;
  emit('update:modelValue', target.value);
}
</script>

<template>
  <input
    v-bind="attrs"
    :type="props.type"
    :value="props.modelValue ?? ''"
    class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
    @input="onInput"
  />
</template>
