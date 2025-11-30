<script setup lang="ts">
import { VisuallyHidden } from 'reka-ui';
</script>

<template>
  <VisuallyHidden data-slot="visually-hidden">
    <slot />
  </VisuallyHidden>
</template>
