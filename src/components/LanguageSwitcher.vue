<script setup lang="ts">
import { type HTMLAttributes } from 'vue';
import { cn } from '@/lib/utils';
import { Earth } from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import { useLanguagePreferences } from '@/composables/use-language-preferences';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const { currentLocale, setLocale } = useLanguagePreferences();

const props = defineProps<{
  class?: HTMLAttributes['class'];
}>();
</script>

<template>
  <div :class="cn(props.class)">
    <DropdownMenu>
      <DropdownMenuTrigger as-child>
        <Button variant="outline" @click.stop class="capitalize">
          <Earth class="size-4 mr-2" />
          {{ currentLocale }}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem @click="setLocale('en')">English</DropdownMenuItem>
        <DropdownMenuItem @click="setLocale('es')">Spanish</DropdownMenuItem>
        <DropdownMenuItem @click="setLocale('fr')">French</DropdownMenuItem>
        <DropdownMenuItem @click="setLocale('de')">German</DropdownMenuItem>
        <DropdownMenuItem @click="setLocale('ru')">Russian</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
</template>
