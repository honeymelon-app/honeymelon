<script lang="ts" setup>
import { useAttrs } from 'vue';
import { DrawerClose } from 'vaul-vue';

defineOptions({ inheritAttrs: false });

const attrs = useAttrs();
</script>

<template>
  <DrawerClose data-slot="drawer-close" v-bind="attrs">
    <slot />
  </DrawerClose>
</template>
