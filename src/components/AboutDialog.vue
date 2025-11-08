<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Info } from 'lucide-vue-next';
import { getVersion } from '@tauri-apps/api/app';

const isTauriRuntime =
  typeof window !== 'undefined' &&
  '__TAURI_INTERNALS__' in window &&
  typeof getVersion === 'function';

const version = ref<string>(import.meta.env?.PACKAGE_VERSION ?? '0.0.1');
const buildDate = ref(new Date().toISOString().split('T')[0]);

onMounted(async () => {
  if (!isTauriRuntime) {
    return;
  }
  try {
    version.value = await getVersion();
  } catch (error) {
    console.warn('[AboutDialog] Failed to load app version via Tauri API', error);
  }
});

async function openWebsite() {
  try {
    const { openUrl } = await import('@tauri-apps/plugin-opener');
    await openUrl('https://github.com/honeymelon-app/honeymelon');
  } catch (error) {
    console.error('[AboutDialog] Failed to open website', error);
    window.open('https://github.com/honeymelon-app/honeymelon', '_blank');
  }
}

async function openLicense() {
  try {
    const { openUrl } = await import('@tauri-apps/plugin-opener');
    await openUrl('https://github.com/honeymelon-app/honeymelon/blob/main/LICENSE');
  } catch (error) {
    console.error('[AboutDialog] Failed to open license', error);
    window.open('https://github.com/honeymelon-app/honeymelon/blob/main/LICENSE', '_blank');
  }
}
</script>

<template>
  <div class="space-y-6 text-left">
    <div class="flex items-start gap-3">
      <div
        class="flex h-12 w-12 items-center justify-center rounded-md border border-border bg-muted"
      >
        <Info class="h-5 w-5 text-primary" aria-hidden="true" />
      </div>
      <div class="space-y-1">
        <h2 id="about-dialog-title" class="text-xl font-semibold">Honeymelon</h2>
        <p class="text-sm text-muted-foreground">Media converter for macOS</p>
        <Badge variant="secondary">Version {{ version }}</Badge>
        <p class="text-xs text-muted-foreground">Built {{ buildDate }}</p>
      </div>
    </div>

    <div class="space-y-3 text-sm text-muted-foreground">
      <p>
        Honeymelon prioritises lossless remuxing and Apple Silicon performance. Drop media files to
        transcode, remux, or prepare edits without leaving your desktop workflow.
      </p>
      <p class="text-xs leading-relaxed">
        FFmpeg runs out-of-process under the LGPL. No personal media leaves your Mac; conversions
        run locally using the bundled binaries.
      </p>
    </div>

    <dl
      class="grid grid-cols-1 gap-2 rounded-lg border border-border/70 bg-muted/40 p-4 text-sm sm:grid-cols-2"
    >
      <div class="space-y-0.5">
        <dt class="text-xs uppercase tracking-wide text-muted-foreground">Platform</dt>
        <dd class="font-medium text-foreground">macOS 13+ · Apple Silicon</dd>
      </div>
      <div class="space-y-0.5">
        <dt class="text-xs uppercase tracking-wide text-muted-foreground">Engine</dt>
        <dd class="font-medium text-foreground">FFmpeg (LGPL)</dd>
      </div>
      <div class="space-y-0.5">
        <dt class="text-xs uppercase tracking-wide text-muted-foreground">License</dt>
        <dd class="font-medium text-foreground">MIT · LGPL dependencies</dd>
      </div>
      <div class="space-y-0.5">
        <dt class="text-xs uppercase tracking-wide text-muted-foreground">Support</dt>
        <dd class="font-medium text-foreground">hello@honeymelon.app</dd>
      </div>
    </dl>

    <div class="flex items-center justify-between gap-3 border-t border-border/80 pt-4">
      <div class="text-xs text-muted-foreground">
        <p>© 2025 Honeymelon.</p>
        <p>All rights reserved.</p>
      </div>
      <div class="flex gap-2">
        <Button variant="outline" size="sm" class="cursor-pointer" @click="openLicense">
          License
        </Button>
        <Button size="sm" class="cursor-pointer" @click="openWebsite">
          <ExternalLink class="mr-2 h-4 w-4" aria-hidden="true" /> Website
        </Button>
      </div>
    </div>
  </div>
</template>
