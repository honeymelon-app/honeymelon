import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

interface LicenseInfo {
  key: string;
  licenseId: string;
  orderId: string;
  maxMajorVersion: number;
  issuedAt: number;
  payload: string;
  signature: string;
  activatedAt: number | null;
}

export const useLicenseStore = defineStore('license', () => {
  const isDev = import.meta.env.DEV;

  const devLicense: LicenseInfo = {
    key: 'DEV-BYPASS',
    licenseId: 'dev-license',
    orderId: 'dev-order',
    maxMajorVersion: Number.MAX_SAFE_INTEGER,
    issuedAt: Date.now(),
    payload: 'dev-mode-license',
    signature: 'dev-mode-license',
    activatedAt: Date.now(),
  };

  const current = ref<LicenseInfo | null>(null);
  const preview = ref<LicenseInfo | null>(null);
  const isLoading = ref(false);
  const isVerifying = ref(false);
  const isActivating = ref(false);
  const lastError = ref<string | null>(null);
  const initialized = ref(false);
  const promptOnInit = ref(false);
  const forcedDialogOpen = ref(false);

  let stopListeners: (() => void) | null = null;

  async function ensureListeners() {
    if (stopListeners || typeof window === 'undefined' || !('__TAURI_INTERNALS__' in window)) {
      return;
    }

    const unlistenActivated = await listen<LicenseInfo>('license://activated', (event) => {
      current.value = event.payload;
      promptOnInit.value = false;
    });

    const unlistenRemoved = await listen('license://removed', () => {
      current.value = null;
      promptOnInit.value = true;
    });

    stopListeners = () => {
      unlistenActivated();
      unlistenRemoved();
    };
  }

  async function refresh() {
    if (typeof window === 'undefined' || !('__TAURI_INTERNALS__' in window)) {
      return;
    }

    try {
      isLoading.value = true;
      if (isDev) {
        current.value = devLicense;
        promptOnInit.value = false;
        return;
      }

      current.value = await invoke<LicenseInfo | null>('current_license');
      promptOnInit.value = !current.value;
    } catch (error) {
      console.error('[licenseStore] Failed to load license', error);
      lastError.value = (error as Error).message;
    } finally {
      isLoading.value = false;
      initialized.value = true;
    }
  }

  async function init() {
    await ensureListeners();
    await refresh();
  }

  async function verify(key: string) {
    if (!key.trim().length) {
      preview.value = null;
      return null;
    }

    try {
      isVerifying.value = true;
      lastError.value = null;
      if (isDev) {
        preview.value = devLicense;
        return preview.value;
      }

      preview.value = await invoke<LicenseInfo>('verify_license_key', { key });
      return preview.value;
    } catch (error) {
      console.error('[licenseStore] Verification failed', error);
      lastError.value = (error as Error).message;
      return null;
    } finally {
      isVerifying.value = false;
    }
  }

  async function activate(key: string) {
    if (!key.trim().length) {
      lastError.value = 'License key cannot be empty';
      return null;
    }

    try {
      isActivating.value = true;
      lastError.value = null;
      if (isDev) {
        current.value = devLicense;
        preview.value = null;
        promptOnInit.value = false;
        return current.value;
      }

      const license = await invoke<LicenseInfo>('activate_license', { key });
      current.value = license;
      preview.value = null;
      promptOnInit.value = false;
      return license;
    } catch (error) {
      console.error('[licenseStore] Activation failed', error);
      lastError.value = (error as Error).message;
      return null;
    } finally {
      isActivating.value = false;
    }
  }

  async function remove() {
    try {
      if (isDev) {
        current.value = devLicense;
        preview.value = null;
        lastError.value = null;
        promptOnInit.value = false;
        return;
      }

      await invoke('remove_license');
      current.value = null;
      preview.value = null;
      lastError.value = null;
      promptOnInit.value = true;
    } catch (error) {
      console.error('[licenseStore] Remove failed', error);
      lastError.value = (error as Error).message;
    }
  }

  function clearError() {
    lastError.value = null;
  }

  function clearPrompt() {
    promptOnInit.value = false;
  }

  function requestActivationDialog() {
    forcedDialogOpen.value = true;
  }

  function clearForcedDialog() {
    forcedDialogOpen.value = false;
  }

  const needsActivation = computed(() => initialized.value && !current.value);
  const shouldPrompt = computed(() => promptOnInit.value && needsActivation.value);

  return {
    current,
    preview,
    isLoading,
    isVerifying,
    isActivating,
    lastError,
    initialized,
    needsActivation,
    shouldPrompt,
    forcedDialogOpen,
    init,
    refresh,
    verify,
    activate,
    remove,
    clearError,
    clearPrompt,
    requestActivationDialog,
    clearForcedDialog,
  };
});

export type { LicenseInfo };
