<script setup lang="ts">
import { getVersion } from '@tauri-apps/api/app';
import { AlertTriangle, ExternalLink, Key, Trash2 } from 'lucide-vue-next';
import { computed, onMounted, ref } from 'vue';

import appIcon from '@/assets/app-icon.png';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { openExternalUrl } from '@/lib/opener';
import { isTauriRuntime } from '@/lib/runtime';
import { useLicenseStore } from '@/stores/license';

const emit = defineEmits<{
  close: [];
}>();

const licenseStore = useLicenseStore();

const canUseTauriApi = isTauriRuntime() && typeof getVersion === 'function';

const version = ref<string>(import.meta.env?.PACKAGE_VERSION ?? '1.0.0');
const buildDate = ref(new Date().toISOString().split('T')[0]);
const showDeactivateDialog = ref(false);
const isDeactivating = ref(false);

const hasLicense = computed(() => !!licenseStore.current);
const licenseKey = computed(() => {
  if (!licenseStore.current?.key) return null;
  const key = licenseStore.current.key;
  // Show only last 8 characters for privacy
  return key.length > 12 ? `•••${key.slice(-8)}` : key;
});
const isActivated = computed(() => !!licenseStore.current?.activatedAt);

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
  await openExternalUrl('https://honeymelon.app/terms');
}

async function deactivateLicense() {
  isDeactivating.value = true;
  try {
    await licenseStore.remove();
    showDeactivateDialog.value = false;
    // Close the parent About dialog after license removal
    emit('close');
  } catch (error) {
    console.error('[AboutDialog] Failed to deactivate license', error);
  } finally {
    isDeactivating.value = false;
  }
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
    </div>

    <!-- License Section -->
    <div v-if="hasLicense" class="space-y-3">
      <Separator />
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <Key class="h-4 w-4 text-muted-foreground" />
          <span class="text-sm font-medium">License</span>
        </div>
        <div class="flex items-center gap-2">
          <Badge
            v-if="isActivated"
            variant="default"
            class="text-xs bg-transparent border border-green-700 text-green-700"
          >
            Activated
          </Badge>
          <Badge v-else variant="secondary" class="text-xs"> Not Activated </Badge>
        </div>
      </div>
      <div
        class="flex items-center justify-between rounded-lg border border-border/70 bg-muted/40 px-3 py-2"
      >
        <code class="text-xs font-medium text-foreground">{{ licenseKey }}</code>
        <AlertDialog v-model:open="showDeactivateDialog">
          <AlertDialogTrigger as-child>
            <Button variant="ghost" size="sm" class="h-7 text-destructive hover:text-destructive">
              <Trash2 class="mr-1 h-3 w-3" />
              Remove
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle class="flex items-center gap-2">
                <AlertTriangle class="h-5 w-5 text-destructive" />
                Remove License?
              </AlertDialogTitle>
              <AlertDialogDescription class="space-y-3">
                <p>
                  Are you sure you want to remove your license from this device? This will
                  deactivate Honeymelon on this Mac.
                </p>
                <p class="text-sm font-medium text-destructive">
                  Note: Each license can only be activated once. If you remove this license, you
                  will not be able to re-activate it on another device.
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel :disabled="isDeactivating">Cancel</AlertDialogCancel>
              <AlertDialogAction :disabled="isDeactivating" @click.prevent="deactivateLicense">
                {{ isDeactivating ? 'Removing...' : 'Remove License' }}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
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
        <dd class="font-medium text-foreground">Proprietary · LGPL dependencies</dd>
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
          Terms
        </Button>
        <Button size="sm" class="cursor-pointer" @click="openWebsite">
          <ExternalLink class="mr-2 h-4 w-4" aria-hidden="true" /> Website
        </Button>
      </div>
    </div>
  </div>
</template>
