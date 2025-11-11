<script lang="ts" setup>
import { DrawerTrigger } from 'vaul-vue';
import { useAttrs } from 'vue';

defineOptions({ inheritAttrs: false });

const attrs = useAttrs();
</script>

<template>
  <DrawerTrigger data-slot="drawer-trigger" v-bind="attrs">
    <slot />
  </DrawerTrigger>
</template>
