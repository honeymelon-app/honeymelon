<script setup lang="ts">
import { Earth } from 'lucide-vue-next';
import { type HTMLAttributes } from 'vue';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLanguagePreferences } from '@/composables/use-language-preferences';
import { cn } from '@/lib/utils';

const { currentLocale, setLocale } = useLanguagePreferences();

const props = defineProps<{
  class?: HTMLAttributes['class'];
}>();
</script>

<template>
  <div :class="cn(props.class)">
    <DropdownMenu>
      <DropdownMenuTrigger as-child>
        <Button variant="outline" @click.stop class="capitalize cursor-pointer">
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
