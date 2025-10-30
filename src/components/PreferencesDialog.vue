<script setup lang="ts">
import { ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

function selectOutputDirectory() {
  // This would use Tauri dialog in production
  const path = prompt('Enter output directory path:', localOutputDir.value);
  if (path !== null) {
    localOutputDir.value = path;
    prefsStore.setOutputDirectory(path);
  }
}

function clearOutputDirectory() {
  localOutputDir.value = '';
  prefsStore.setOutputDirectory(null);
}
</script>

<template>
  <div class="min-h-screen bg-background p-6">
    <div class="mx-auto max-w-2xl space-y-6">
      <!-- Header -->
      <div class="flex items-center gap-3">
        <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
          <Settings2 class="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 class="text-2xl font-bold">Preferences</h1>
          <p class="text-sm text-muted-foreground">Customize your conversion settings</p>
        </div>
      </div>

      <!-- Performance Settings -->
      <Card>
        <CardHeader>
          <CardTitle>Performance</CardTitle>
          <CardDescription> Control how many files convert simultaneously </CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <label class="text-sm font-medium"> Concurrent Conversions </label>
              <Badge variant="secondary">{{ localConcurrency }}</Badge>
            </div>
            <input
              v-model.number="localConcurrency"
              type="range"
              min="1"
              max="4"
              step="1"
              class="w-full"
            />
            <p class="text-xs text-muted-foreground">
              Higher values use more CPU and memory. Recommended: 2 for most systems.
            </p>
          </div>
        </CardContent>
      </Card>

      <!-- Output Settings -->
      <Card>
        <CardHeader>
          <CardTitle>Output Location</CardTitle>
          <CardDescription> Choose where converted files are saved </CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="space-y-2">
            <label class="text-sm font-medium"> Default Output Directory </label>
            <div class="flex gap-2">
              <div class="flex-1 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
                {{ localOutputDir || 'Same as source file' }}
              </div>
              <Button variant="outline" size="sm" @click="selectOutputDirectory">
                <Folder class="h-4 w-4" />
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
          </div>
        </CardContent>
      </Card>

      <!-- Filename Settings -->
      <Card>
        <CardHeader>
          <CardTitle>File Naming</CardTitle>
          <CardDescription> Customize how converted files are named </CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="flex items-center justify-between">
            <div class="space-y-1">
              <label class="text-sm font-medium"> Include format in filename </label>
              <p class="text-xs text-muted-foreground">Example: video-mp4-h264.mp4</p>
            </div>
            <input v-model="localIncludePreset" type="checkbox" class="h-5 w-5" />
          </div>

          <div class="flex items-center justify-between">
            <div class="space-y-1">
              <label class="text-sm font-medium"> Include quality tier in filename </label>
              <p class="text-xs text-muted-foreground">Example: video-balanced.mp4</p>
            </div>
            <input v-model="localIncludeTier" type="checkbox" class="h-5 w-5" />
          </div>
        </CardContent>
      </Card>

      <!-- About Section -->
      <div
        class="rounded-lg border border-border bg-muted/20 p-4 text-center text-xs text-muted-foreground"
      >
        <p>Changes are saved automatically</p>
      </div>
    </div>
  </div>
</template>
