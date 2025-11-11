<script lang="ts" setup>
import { DrawerRoot } from 'vaul-vue';
import { useAttrs } from 'vue';

defineOptions({ inheritAttrs: false });

const attrs = useAttrs();
</script>

<template>
  <DrawerRoot data-slot="drawer" v-bind="attrs">
    <slot />
  </DrawerRoot>
</template>
