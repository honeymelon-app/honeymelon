<script lang="ts" setup>
import { useAttrs } from 'vue';
import { DrawerRoot } from 'vaul-vue';

defineOptions({ inheritAttrs: false });

const attrs = useAttrs();
</script>

<template>
  <DrawerRoot data-slot="drawer" v-bind="attrs">
    <slot />
  </DrawerRoot>
</template>
