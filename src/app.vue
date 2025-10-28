<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { availablePresets, loadCapabilities } from "@/lib/capability";
import { DEFAULT_PRESET_ID, PRESETS } from "@/lib/presets";
import type { CapabilitySnapshot, Preset } from "@/lib/types";

const capabilities = ref<CapabilitySnapshot>();
const presetId = ref(DEFAULT_PRESET_ID);

const presetOptions = computed(() => availablePresets(capabilities.value));

const selectedPreset = computed<Preset | undefined>(() =>
  presetOptions.value.find((preset) => preset.id === presetId.value),
);

watch(
  presetOptions,
  (options) => {
    if (!options.length) {
      return;
    }
    if (!options.some((preset) => preset.id === presetId.value)) {
      presetId.value = options[0]?.id ?? DEFAULT_PRESET_ID;
    }
  },
  { immediate: true },
);

const isDragOver = ref(false);
const queuedItems = ref<{ path: string; name: string }[]>([]);
const fileInput = ref<HTMLInputElement>();
const queuedPathSet = computed(() => new Set(queuedItems.value.map((item) => item.path)));

async function appendDiscoveredEntries(fileList: FileList | File[]) {
  try {
    const { discoverDroppedEntries } = await import("@/lib/file-discovery");
    const entries = await discoverDroppedEntries(fileList);
    if (!entries.length) {
      return;
    }

    const seen = new Set(queuedPathSet.value);
    const additions = entries.filter((entry) => {
      if (!entry.path) {
        return false;
      }
      if (seen.has(entry.path)) {
        return false;
      }
      seen.add(entry.path);
      return true;
    });

    if (!additions.length) {
      return;
    }

    queuedItems.value = [...queuedItems.value, ...additions];
  } catch (error) {
    console.error("[queue] Failed to expand dropped files", error);
  }
}

async function handleDrop(event: DragEvent) {
  event.preventDefault();
  isDragOver.value = false;

  const files = event.dataTransfer?.files;
  if (!files?.length) {
    return;
  }
  await appendDiscoveredEntries(files);
}

function handleDragOver(event: DragEvent) {
  event.preventDefault();
  isDragOver.value = true;
}

function handleDragLeave() {
  isDragOver.value = false;
}

function browseForFiles() {
  fileInput.value?.click();
}

async function handleFileInput(event: Event) {
  const target = event.target as HTMLInputElement | null;
  if (target?.files) {
    await appendDiscoveredEntries(target.files);
    target.value = "";
  }
}

function clearQueue() {
  queuedItems.value = [];
}

onMounted(async () => {
  capabilities.value = await loadCapabilities();
});
</script>

<template>
  <div class="min-h-screen bg-background text-foreground">
    <div class="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-10">
      <header class="flex flex-col gap-2">
        <h1 class="text-3xl font-semibold tracking-tight">
          Honeymelon
        </h1>
        <p class="text-muted-foreground">
          Drop media, pick a preset, and let the remux-first workflow do the rest.
        </p>
      </header>

      <main class="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <Card
          class="relative flex flex-col overflow-hidden border-dashed transition-colors"
          :class="[
            isDragOver ? 'border-primary bg-primary/5' : 'border-border',
          ]"
          @dragover="handleDragOver"
          @dragleave="handleDragLeave"
          @drop="handleDrop"
        >
          <CardHeader class="gap-2">
            <CardTitle>Drop files or folders</CardTitle>
            <CardDescription>
              Honeymelon will expand folders, queue jobs, and probe each item with
              ffprobe before planning.
            </CardDescription>
          </CardHeader>
          <CardContent class="flex flex-1 flex-col justify-between gap-6">
            <div
              class="flex flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-muted/30 py-12 text-center"
            >
              <p class="text-sm text-muted-foreground">
                Drag &amp; drop media here, or browse your disk.
              </p>
              <div class="flex gap-3">
                <Button variant="default" size="sm" @click="browseForFiles">
                  Browse…
                </Button>
                <Button variant="outline" size="sm" @click="clearQueue">
                  Clear queue
                </Button>
              </div>
            </div>

            <section class="space-y-3">
              <div class="flex items-center justify-between">
                <h2 class="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                  Pending items
                </h2>
                <Badge v-if="queuedItems.length" variant="secondary">
                  {{ queuedItems.length }} queued
                </Badge>
              </div>
              <ul
                v-if="queuedItems.length"
                class="space-y-2 text-sm"
              >
                <li
                  v-for="(item, index) in queuedItems"
                  :key="item.path || `${index}`"
                  class="rounded-md border border-border bg-card px-3 py-2 text-left"
                >
                  {{ item.name }}
                </li>
              </ul>
              <p v-else class="text-sm text-muted-foreground">
                Queue is empty. Drop media to get started.
              </p>
            </section>
            <input
              ref="fileInput"
              class="hidden"
              multiple
              type="file"
              @change="handleFileInput"
            >
          </CardContent>
          <CardFooter class="flex justify-end border-t border-border/80 bg-muted/30">
            <p class="text-xs text-muted-foreground">
              Planner, progress, and job queue wiring coming next.
            </p>
          </CardFooter>
        </Card>

        <Card class="flex flex-col">
          <CardHeader class="gap-2">
            <CardTitle>Preset</CardTitle>
            <CardDescription>
              Presets guard container rules and capabilities; unavailable options hide automatically.
            </CardDescription>
          </CardHeader>
          <CardContent class="space-y-4">
            <Select v-model="presetId">
              <SelectTrigger class="w-full">
                <SelectValue placeholder="Choose a preset" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="preset in PRESETS"
                  :key="preset.id"
                  :value="preset.id"
                  :disabled="!presetOptions.some((allowed) => allowed.id === preset.id)"
                >
                  <div class="flex flex-col items-start">
                    <span class="font-medium">{{ preset.label }}</span>
                    <span class="text-xs text-muted-foreground">{{ preset.description }}</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            <section
              v-if="selectedPreset"
              class="rounded-md border border-border bg-muted/20 p-4 text-sm leading-relaxed"
            >
              <h3 class="font-medium">
                {{ selectedPreset.label }}
              </h3>
              <p class="text-muted-foreground">
                {{ selectedPreset.description }}
              </p>
              <ul class="mt-3 space-y-1 text-xs text-muted-foreground">
                <li>
                  Video: {{ selectedPreset.video.codec.toUpperCase() }}
                </li>
                <li>
                  Audio: {{ selectedPreset.audio.codec.toUpperCase() }}
                </li>
                <li v-if="selectedPreset.experimental">
                  Experimental — enable in Settings.
                </li>
              </ul>
            </section>
            <section v-else class="rounded-md border border-dashed border-border p-4 text-sm">
              No matching preset available with the current FFmpeg capabilities.
            </section>
          </CardContent>
          <CardFooter class="flex items-center justify-between border-t border-border/80 bg-muted/30 px-6 py-4">
            <p class="text-xs text-muted-foreground">
              Defaults to Balanced tier; tiers and planner logic pending.
            </p>
            <Button size="sm" disabled>
              Convert (soon)
            </Button>
          </CardFooter>
        </Card>
      </main>
    </div>
  </div>
</template>
