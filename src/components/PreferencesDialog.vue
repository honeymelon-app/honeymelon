<script setup lang="ts">
import { ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { usePrefsStore } from '@/stores/prefs';
import { Folder, Settings2 } from 'lucide-vue-next';

const prefsStore = usePrefsStore();
const { preferredConcurrency, outputDirectory, includePresetInName, includeTierInName } =
  storeToRefs(prefsStore);

const localConcurrency = ref(preferredConcurrency.value);
const localOutputDir = ref(outputDirectory.value || '');
const localIncludePreset = ref(includePresetInName.value);
const localIncludeTier = ref(includeTierInName.value);

watch(localConcurrency, (value) => {
  prefsStore.setPreferredConcurrency(value);
});

watch(localIncludePreset, (value) => {
  prefsStore.setIncludePresetInName(value);
});

watch(localIncludeTier, (value) => {
  prefsStore.setIncludeTierInName(value);
});

async function selectOutputDirectory() {
  if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const selected = await invoke<string | null>('choose_output_directory', {
        defaultPath: localOutputDir.value || null,
      });
      if (typeof selected === 'string' && selected.length > 0) {
        localOutputDir.value = selected;
        prefsStore.setOutputDirectory(selected);
      }
      return;
    } catch (error) {
      console.error('[PreferencesDialog] Failed to open directory picker', error);
    }
  }

  const path = prompt('Enter output directory path:', localOutputDir.value);
  if (path !== null) {
    localOutputDir.value = path.trim();
    prefsStore.setOutputDirectory(localOutputDir.value || null);
  }
}

function clearOutputDirectory() {
  localOutputDir.value = '';
  prefsStore.setOutputDirectory(null);
}
</script>

<template>
  <div class="space-y-6">
    <header class="space-y-1">
      <div class="flex items-center gap-3">
        <div
          class="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-muted"
        >
          <Settings2 class="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 id="preferences-dialog-title" class="text-lg font-semibold">Preferences</h2>
          <p class="text-xs text-muted-foreground">Adjust conversion defaults for this machine.</p>
        </div>
      </div>
    </header>

    <Card class="border-border/70 bg-background/95">
      <CardHeader class="pb-3">
        <CardTitle class="text-sm font-medium">Performance</CardTitle>
        <CardDescription class="text-xs">
          Limit concurrent FFmpeg jobs. Higher values increase CPU and fan usage.
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-3">
        <div class="flex items-center justify-between gap-4">
          <label class="text-sm font-medium" for="pref-concurrency">Concurrent conversions</label>
          <Badge variant="secondary">{{ localConcurrency }}</Badge>
        </div>
        <input
          id="pref-concurrency"
          v-model.number="localConcurrency"
          type="range"
          min="1"
          max="4"
          step="1"
          class="w-full accent-primary"
          :aria-valuemin="1"
          :aria-valuenow="localConcurrency"
          :aria-valuemax="4"
          :aria-valuetext="`${localConcurrency} concurrent ${localConcurrency === 1 ? 'conversion' : 'conversions'}`"
        />
        <p class="text-xs text-muted-foreground">Recommended: 2 for most MacBooks.</p>
      </CardContent>
    </Card>

    <Card class="border-border/70 bg-background/95">
      <CardHeader class="pb-3">
        <CardTitle class="text-sm font-medium">Output location</CardTitle>
        <CardDescription class="text-xs">
          Choose where converted files are written by default.
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-3">
        <div class="flex items-center gap-2">
          <div
            class="flex-1 truncate rounded-md border border-border/70 bg-muted/40 px-3 py-2 text-sm"
          >
            {{ localOutputDir || 'Same as source file' }}
          </div>
          <Button
            variant="outline"
            size="sm"
            aria-label="Select output directory"
            @click="selectOutputDirectory"
          >
            <Folder class="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
        <Button
          v-if="localOutputDir"
          variant="ghost"
          size="sm"
          class="text-xs"
          @click="clearOutputDirectory"
        >
          Reset to source directory
        </Button>
      </CardContent>
    </Card>

    <Card class="border-border/70 bg-background/95">
      <CardHeader class="pb-3">
        <CardTitle class="text-sm font-medium">File naming</CardTitle>
        <CardDescription class="text-xs">
          Keep exports organised with optional suffixes.
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <label class="flex items-center justify-between gap-4 text-sm">
          <div>
            <span class="font-medium">Include preset name</span>
            <p class="text-xs text-muted-foreground">e.g. <code>clip-mp4-h264.mp4</code></p>
          </div>
          <input v-model="localIncludePreset" type="checkbox" class="h-4 w-4" />
        </label>
        <label class="flex items-center justify-between gap-4 text-sm">
          <div>
            <span class="font-medium">Include quality tier</span>
            <p class="text-xs text-muted-foreground">e.g. <code>clip-balanced.mp4</code></p>
          </div>
          <input v-model="localIncludeTier" type="checkbox" class="h-4 w-4" />
        </label>
      </CardContent>
    </Card>

    <footer
      class="rounded-md border border-dashed border-border/70 bg-muted/20 p-3 text-xs text-muted-foreground"
    >
      Changes are saved immediately.
    </footer>
  </div>
</template>
