<script lang="ts" setup>
import { DrawerClose } from 'vaul-vue';
import { useAttrs } from 'vue';

defineOptions({ inheritAttrs: false });

const attrs = useAttrs();
</script>

<template>
  <DrawerClose data-slot="drawer-close" v-bind="attrs">
    <slot />
  </DrawerClose>
</template>
