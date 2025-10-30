<script setup lang="ts">
import { ref } from 'vue';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink } from 'lucide-vue-next';

const version = ref('0.1.0');
const buildDate = ref(new Date().toISOString().split('T')[0]);

function openWebsite() {
  window.open('https://github.com/yourusername/honeymelon', '_blank');
}

function openLicense() {
  window.open('https://github.com/yourusername/honeymelon/blob/main/LICENSE', '_blank');
}
</script>

<template>
  <div class="flex min-h-screen flex-col items-center justify-center bg-background p-8">
    <div class="w-full max-w-md space-y-6 text-center">
      <!-- App Icon -->
      <div
        class="mx-auto flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg"
      >
        <span class="text-5xl">🍈</span>
      </div>

      <!-- App Name & Version -->
      <div class="space-y-2">
        <h1 class="text-3xl font-bold">Honeymelon</h1>
        <p class="text-sm text-muted-foreground">Media Converter for macOS</p>
        <Badge variant="secondary" class="mt-2"> Version {{ version }} </Badge>
      </div>

      <!-- Description -->
      <div class="space-y-3 text-sm text-muted-foreground">
        <p>
          A simple, fast media converter designed for Apple Silicon Macs. Convert videos and audio
          with just a drag and drop.
        </p>
        <p class="text-xs">
          Honeymelon uses FFmpeg under the LGPL license, running out-of-process for clean, efficient
          conversions.
        </p>
      </div>

      <!-- Info Grid -->
      <div class="rounded-lg border border-border bg-muted/30 p-4 text-left text-sm">
        <div class="space-y-2">
          <div class="flex justify-between">
            <span class="text-muted-foreground">Platform:</span>
            <span class="font-medium">macOS 13+ (Apple Silicon)</span>
          </div>
          <div class="flex justify-between">
            <span class="text-muted-foreground">Build Date:</span>
            <span class="font-medium">{{ buildDate }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-muted-foreground">Engine:</span>
            <span class="font-medium">FFmpeg (LGPL)</span>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex flex-col gap-2">
        <Button variant="outline" class="w-full" @click="openWebsite">
          <ExternalLink class="mr-2 h-4 w-4" />
          Visit Website
        </Button>
        <Button variant="ghost" class="w-full text-xs" @click="openLicense"> View License </Button>
      </div>

      <!-- Copyright -->
      <div class="border-t border-border pt-4 text-xs text-muted-foreground">
        <p>© 2025 Honeymelon. All rights reserved.</p>
        <p class="mt-1">
          This app uses FFmpeg via out-of-process execution.<br />
          We do not statically link FFmpeg nor enable GPL/non-free components.
        </p>
      </div>
    </div>
  </div>
</template>
