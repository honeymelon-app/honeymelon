<script lang="ts" setup>
import { useAttrs } from 'vue';
import { DrawerTrigger } from 'vaul-vue';

defineOptions({ inheritAttrs: false });

const attrs = useAttrs();
</script>

<template>
  <DrawerTrigger data-slot="drawer-trigger" v-bind="attrs">
    <slot />
  </DrawerTrigger>
</template>
