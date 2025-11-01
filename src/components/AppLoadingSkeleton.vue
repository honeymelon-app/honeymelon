<script setup lang="ts">
import { Skeleton } from '@/components/ui/skeleton';
import WindowDragRegion from '@/components/WindowDragRegion.vue';
</script>

<template>
  <div class="flex h-screen flex-col bg-background text-foreground">
    <!-- Drag Region -->
    <WindowDragRegion />

    <!-- Main Content -->
    <div class="flex-1 w-full min-h-0">
      <main class="flex h-full min-h-0 flex-col gap-6 p-6 pt-10">
        <!-- Drop Zone Skeleton -->
        <div class="rounded-xl border-2 border-dashed border-border p-12">
          <div class="flex flex-col items-center justify-center gap-4">
            <Skeleton class="h-16 w-16 rounded-full" />
            <Skeleton class="h-6 w-48" />
            <Skeleton class="h-4 w-64" />
            <Skeleton class="h-10 w-32 rounded-md" />
          </div>
        </div>

        <!-- Job Queue Section Skeleton -->
        <div class="space-y-4">
          <Skeleton class="h-8 w-32" />

          <!-- Job Item Skeletons -->
          <div v-for="i in 2" :key="i" class="rounded-lg border border-border/50 bg-card p-4">
            <div class="flex items-start gap-4">
              <!-- Status Icon Skeleton -->
              <Skeleton class="h-10 w-10 shrink-0 rounded-full" />

              <!-- Content Skeleton -->
              <div class="flex-1 space-y-3">
                <!-- Header -->
                <div class="flex items-start justify-between gap-4">
                  <div class="flex-1 space-y-2">
                    <Skeleton class="h-5 w-48" />
                    <div class="flex gap-2">
                      <Skeleton class="h-4 w-12" />
                      <Skeleton class="h-4 w-16" />
                      <Skeleton class="h-4 w-20" />
                    </div>
                  </div>
                  <Skeleton class="h-8 w-8 rounded-md" />
                </div>

                <!-- Preset Selector Skeleton -->
                <div class="flex items-center gap-3">
                  <Skeleton class="h-4 w-20" />
                  <Skeleton class="h-8 w-48 rounded-md" />
                </div>

                <!-- Status Badge Skeleton -->
                <Skeleton class="h-6 w-20 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>
