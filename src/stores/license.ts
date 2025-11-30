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

/**
 * Activation error codes returned from the backend.
 */
export const ActivationErrorCodes = {
  LICENSE_NOT_FOUND: 'license_not_found',
  LICENSE_REFUNDED: 'license_refunded',
  LICENSE_REVOKED: 'license_revoked',
  LICENSE_ALREADY_ACTIVATED: 'license_already_activated',
  NETWORK_ERROR: 'network_error',
  ACTIVATION_SERVER_ERROR: 'activation_server_error',
} as const;

export type ActivationErrorCode = (typeof ActivationErrorCodes)[keyof typeof ActivationErrorCodes];

/**
 * Get a user-friendly error message for an activation error.
 */
export function getActivationErrorMessage(error: string): string {
  if (error.includes('license_not_found') || error.includes('not found')) {
    return 'License key not found. Please check your key and try again.';
  }
  if (error.includes('license_refunded') || error.includes('refunded')) {
    return 'This license has been refunded and cannot be activated.';
  }
  if (error.includes('license_revoked') || error.includes('revoked')) {
    return 'This license has been revoked.';
  }
  if (error.includes('license_already_activated') || error.includes('already been activated')) {
    return 'This license has already been activated on another device.';
  }
  if (error.includes('network_error') || error.includes('Network')) {
    return 'Unable to connect to the activation server. Please check your internet connection.';
  }
  return error;
}

export const useLicenseStore = defineStore('license', () => {
  const bypassLicensing = import.meta.env.VITE_BYPASS_LICENSING === 'true';
  const isE2E = import.meta.env.VITE_E2E_SIMULATION === 'true';

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
  const lastErrorCode = ref<string | null>(null);
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
      if (bypassLicensing || isE2E) {
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
      lastErrorCode.value = null;
      if (bypassLicensing || isE2E) {
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

  /**
   * Activate a license via the platform API.
   * This performs a one-time online activation and stores the result locally.
   * After successful activation, the app runs fully offline.
   */
  async function activate(key: string) {
    if (!key.trim().length) {
      lastError.value = 'License key cannot be empty';
      return null;
    }

    try {
      isActivating.value = true;
      lastError.value = null;
      lastErrorCode.value = null;

      if (bypassLicensing || isE2E) {
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
      const errorMessage = (error as Error).message;
      lastError.value = getActivationErrorMessage(errorMessage);

      // Extract error code if present
      for (const code of Object.values(ActivationErrorCodes)) {
        if (errorMessage.includes(code)) {
          lastErrorCode.value = code;
          break;
        }
      }

      return null;
    } finally {
      isActivating.value = false;
    }
  }

  async function remove() {
    try {
      if (bypassLicensing || isE2E) {
        current.value = devLicense;
        preview.value = null;
        lastError.value = null;
        lastErrorCode.value = null;
        promptOnInit.value = false;
        return;
      }

      await invoke('remove_license');
      current.value = null;
      preview.value = null;
      lastError.value = null;
      lastErrorCode.value = null;
      promptOnInit.value = true;
    } catch (error) {
      console.error('[licenseStore] Remove failed', error);
      lastError.value = (error as Error).message;
    }
  }

  function clearError() {
    lastError.value = null;
    lastErrorCode.value = null;
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

  /**
   * Check if the activation error is recoverable (user can retry with a different key).
   */
  const isRecoverableError = computed(() => {
    if (!lastErrorCode.value) return true;
    return lastErrorCode.value === ActivationErrorCodes.LICENSE_NOT_FOUND ||
           lastErrorCode.value === ActivationErrorCodes.NETWORK_ERROR;
  });

  return {
    current,
    preview,
    isLoading,
    isVerifying,
    isActivating,
    lastError,
    lastErrorCode,
    initialized,
    needsActivation,
    shouldPrompt,
    forcedDialogOpen,
    isRecoverableError,
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
