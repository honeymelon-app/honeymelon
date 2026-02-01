<script setup lang="ts">
import { getVersion } from '@tauri-apps/api/app';
import { ExternalLink } from 'lucide-vue-next';
import { onMounted, ref } from 'vue';

import appIcon from '@/assets/app-icon.png';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { openExternalUrl } from '@/lib/opener';
import { isTauriRuntime } from '@/lib/runtime';

const canUseTauriApi = isTauriRuntime() && typeof getVersion === 'function';

const version = ref<string>(import.meta.env?.PACKAGE_VERSION ?? '2.0.0');
const buildDate = ref(new Date().toISOString().split('T')[0]);

onMounted(async () => {
  if (!canUseTauriApi) {
    return;
  }
  try {
    version.value = await getVersion();
  } catch (error) {
    console.warn('[AboutDialog] Failed to load app version via Tauri API', error);
  }
});

async function openWebsite() {
  await openExternalUrl('https://honeymelon.app');
}

async function openLicense() {
  await openExternalUrl('https://www.gnu.org/licenses/gpl-3.0.html');
}
</script>

<template>
  <div class="space-y-6 text-left">
    <div class="flex items-start gap-3">
      <img :src="appIcon" alt="Honeymelon" class="size-12 rounded-xl" />
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
      <p class="text-xs leading-relaxed">
        Honeymelon is free and open-source software licensed under the GNU GPLv3. You are free to
        use, study, share, and modify it.
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
        <dd class="font-medium text-foreground">GPL-3.0-or-later · LGPL dependencies</dd>
      </div>
      <div class="space-y-0.5">
        <dt class="text-xs uppercase tracking-wide text-muted-foreground">Support</dt>
        <dd class="font-medium text-foreground">hello@honeymelon.app</dd>
      </div>
    </dl>

    <div class="flex items-center justify-between gap-3 border-t border-border/80 pt-4">
      <div class="text-xs text-muted-foreground">
        <p>© 2025 Jerome Thayananthajothy.</p>
        <p>Licensed under GPLv3.</p>
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
