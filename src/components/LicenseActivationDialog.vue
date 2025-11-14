<script setup lang="ts">
import { ShieldCheck, Loader2, Trash2, CircleAlert, KeySquare } from 'lucide-vue-next';
import { storeToRefs } from 'pinia';
import { computed, ref, watch } from 'vue';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLicenseStore } from '@/stores/license';

const licenseStore = useLicenseStore();
const {
  current,
  preview,
  isVerifying,
  isActivating,
  lastError,
  needsActivation,
  shouldPrompt,
  initialized,
  forcedDialogOpen,
} = storeToRefs(licenseStore);

const dialogOpen = ref(false);
const manualOpen = ref(false);
const keyInput = ref('');

const canSubmit = computed(() => keyInput.value.replace(/[^A-Z0-9]/gi, '').length >= 10);
const verificationDetails = computed(() => preview.value ?? current.value ?? null);

const majorVersionLabel = computed(() => {
  const details = verificationDetails.value;
  if (!details) {
    return null;
  }

  return `Includes Honeymelon ${details.maxMajorVersion}.x`; // communicates scope succinctly
});

const issuedAtLabel = computed(() => {
  const details = verificationDetails.value;
  if (!details) {
    return null;
  }

  const date = new Date(details.issuedAt * 1000);
  return `Issued ${date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })}`;
});

watch(
  [initialized, needsActivation, shouldPrompt],
  ([isReady, activationRequired, prompt]) => {
    if (!isReady) {
      return;
    }

    if (activationRequired) {
      manualOpen.value = false;
      dialogOpen.value = true;
      return;
    }

    if (prompt) {
      manualOpen.value = false;
      dialogOpen.value = true;
      return;
    }

    if (!manualOpen.value) {
      dialogOpen.value = false;
    }
  },
  { immediate: true },
);

watch(forcedDialogOpen, (forced) => {
  if (forced) {
    manualOpen.value = true;
    dialogOpen.value = true;
    licenseStore.clearForcedDialog();
  }
});

watch(dialogOpen, (open) => {
  if (!open) {
    keyInput.value = '';
    preview.value = null;
    licenseStore.clearError();
    licenseStore.clearPrompt();
    manualOpen.value = false;
  } else {
    licenseStore.refresh();
  }
});

watch(
  () => keyInput.value,
  (value, previous) => {
    if (value === previous) {
      return;
    }

    const formatted = formatInput(value);
    if (formatted !== value) {
      keyInput.value = formatted;
      return;
    }

    preview.value = null;
    if (lastError.value) {
      licenseStore.clearError();
    }
  },
);

watch(
  () => current.value,
  (license) => {
    if (license) {
      keyInput.value = '';
      dialogOpen.value = false;
      manualOpen.value = false;
    }
  },
);

function formatInput(value: string): string {
  const normalized = value.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  if (!normalized.length) {
    return '';
  }

  return normalized.match(/.{1,5}/g)?.join('-') ?? normalized;
}

function handleOpenChange(next: boolean) {
  if (!next && needsActivation.value) {
    dialogOpen.value = true;
    return;
  }

  manualOpen.value = next;
  dialogOpen.value = next;
}

async function handleVerify() {
  if (!canSubmit.value) {
    return;
  }

  await licenseStore.verify(keyInput.value);
}

async function handleActivate() {
  if (!canSubmit.value) {
    return;
  }

  await licenseStore.activate(keyInput.value);
}

async function handleDeactivate() {
  await licenseStore.remove();
  dialogOpen.value = true;
}
</script>

<template>
  <Dialog :open="dialogOpen" modal @update:open="handleOpenChange">
    <DialogContent
      class="sm:max-w-lg"
      aria-labelledby="license-dialog-title"
      data-test="license-dialog"
    >
      <DialogHeader class="space-y-2">
        <DialogTitle id="license-dialog-title">
          <span class="inline-flex items-center gap-2">
            <KeySquare class="h-5 w-5 text-primary" aria-hidden="true" />
            {{ current ? 'Manage License' : 'Activate Honeymelon' }}
          </span>
        </DialogTitle>
        <DialogDescription>
          Enter the license key issued from the Honeymelon portal. Keys are verified locally with
          the bundled public key—no data leaves your Mac.
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-5">
        <div class="space-y-2">
          <Label for="license-key-input" class="text-xs">License Key</Label>
          <div class="flex gap-2">
            <Input
              id="license-key-input"
              v-model="keyInput"
              type="text"
              autocomplete="one-time-code"
              placeholder="XXXXX-XXXXX-XXXXX-XXXXX-XXXXX"
              data-test="license-input"
            />
            <Button
              variant="secondary"
              size="sm"
              class="shrink-0"
              :disabled="!canSubmit || isVerifying"
              @click="handleVerify"
              data-test="license-verify-button"
            >
              <Loader2 v-if="isVerifying" class="h-4 w-4 animate-spin" aria-hidden="true" />
              <span v-else>Check</span>
            </Button>
          </div>
        </div>

        <p
          v-if="lastError"
          role="alert"
          class="flex items-center gap-2 text-sm text-destructive"
          data-test="license-error"
        >
          <CircleAlert class="h-4 w-4" aria-hidden="true" />
          <span>{{ lastError }}</span>
        </p>

        <div
          v-if="verificationDetails"
          class="rounded-lg border border-border/70 bg-muted/30 p-4 text-sm space-y-3"
        >
          <div class="flex items-center justify-between gap-2">
            <div>
              <p class="text-xs uppercase tracking-wide text-muted-foreground">Key</p>
              <p class="font-mono text-xs tracking-widest">{{ verificationDetails.key }}</p>
            </div>
            <Badge v-if="majorVersionLabel" variant="secondary">{{ majorVersionLabel }}</Badge>
          </div>

          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <p class="text-xs uppercase tracking-wide text-muted-foreground">License ID</p>
              <p class="font-mono text-xs">{{ verificationDetails.licenseId }}</p>
            </div>
            <div>
              <p class="text-xs uppercase tracking-wide text-muted-foreground">Order ID</p>
              <p class="font-mono text-xs">{{ verificationDetails.orderId }}</p>
            </div>
          </div>

          <div class="text-xs text-muted-foreground space-y-1">
            <p v-if="issuedAtLabel">{{ issuedAtLabel }}</p>
          </div>
        </div>
      </div>

      <DialogFooter class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck class="h-4 w-4 text-primary" aria-hidden="true" />
          <span>Signatures verified with Ed25519. Keys never leave this device.</span>
        </div>

        <div class="flex gap-2">
          <Button
            v-if="current"
            variant="outline"
            size="sm"
            class="cursor-pointer"
            :disabled="isActivating"
            @click="handleDeactivate"
            data-test="license-deactivate-button"
          >
            <Trash2 class="mr-1 h-4 w-4" aria-hidden="true" />
            Deactivate
          </Button>
          <Button
            size="sm"
            class="cursor-pointer"
            :disabled="isActivating || !canSubmit"
            @click="handleActivate"
            data-test="license-activate-button"
          >
            <Loader2 v-if="isActivating" class="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            <span v-else>{{ current ? 'Replace License' : 'Activate License' }}</span>
          </Button>
        </div>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
