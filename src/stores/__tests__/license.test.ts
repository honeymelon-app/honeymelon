import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ActivationErrorCodes,
  getActivationErrorMessage,
  useLicenseStore,
} from '@/stores/license';

// Mock Tauri APIs
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(() => Promise.resolve(() => {})),
}));

describe('license store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  describe('getActivationErrorMessage', () => {
    it('returns user-friendly message for license_not_found', () => {
      const message = getActivationErrorMessage('license_not_found');
      expect(message).toBe('License key not found. Please check your key and try again.');
    });

    it('returns user-friendly message for "not found" variant', () => {
      const message = getActivationErrorMessage('License not found in database');
      expect(message).toBe('License key not found. Please check your key and try again.');
    });

    it('returns user-friendly message for license_refunded', () => {
      const message = getActivationErrorMessage('license_refunded');
      expect(message).toBe('This license has been refunded and cannot be activated.');
    });

    it('returns user-friendly message for "refunded" variant', () => {
      const message = getActivationErrorMessage('Order was refunded');
      expect(message).toBe('This license has been refunded and cannot be activated.');
    });

    it('returns user-friendly message for license_revoked', () => {
      const message = getActivationErrorMessage('license_revoked');
      expect(message).toBe('This license has been revoked.');
    });

    it('returns user-friendly message for "revoked" variant', () => {
      const message = getActivationErrorMessage('License revoked by admin');
      expect(message).toBe('This license has been revoked.');
    });

    it('returns user-friendly message for license_already_activated', () => {
      const message = getActivationErrorMessage('license_already_activated');
      expect(message).toBe('This license has already been activated on another device.');
    });

    it('returns user-friendly message for "already been activated" variant', () => {
      const message = getActivationErrorMessage('This key has already been activated');
      expect(message).toBe('This license has already been activated on another device.');
    });

    it('returns user-friendly message for license_version_not_allowed', () => {
      const message = getActivationErrorMessage('license_version_not_allowed');
      expect(message).toBe('This license does not cover this version of Honeymelon.');
    });

    it('returns user-friendly message for "valid up to Honeymelon" variant', () => {
      const message = getActivationErrorMessage('License valid up to Honeymelon 1.x');
      expect(message).toBe('This license does not cover this version of Honeymelon.');
    });

    it('returns user-friendly message for network_error', () => {
      const message = getActivationErrorMessage('network_error');
      expect(message).toBe(
        'Unable to connect to the activation server. Please check your internet connection.',
      );
    });

    it('returns user-friendly message for "Network" variant', () => {
      const message = getActivationErrorMessage('Network request failed');
      expect(message).toBe(
        'Unable to connect to the activation server. Please check your internet connection.',
      );
    });

    it('returns original message for unknown errors', () => {
      const message = getActivationErrorMessage('Some unknown error occurred');
      expect(message).toBe('Some unknown error occurred');
    });
  });

  describe('ActivationErrorCodes', () => {
    it('defines all expected error codes', () => {
      expect(ActivationErrorCodes.LICENSE_NOT_FOUND).toBe('license_not_found');
      expect(ActivationErrorCodes.LICENSE_REFUNDED).toBe('license_refunded');
      expect(ActivationErrorCodes.LICENSE_REVOKED).toBe('license_revoked');
      expect(ActivationErrorCodes.LICENSE_ALREADY_ACTIVATED).toBe('license_already_activated');
      expect(ActivationErrorCodes.LICENSE_VERSION_NOT_ALLOWED).toBe('license_version_not_allowed');
      expect(ActivationErrorCodes.NETWORK_ERROR).toBe('network_error');
      expect(ActivationErrorCodes.ACTIVATION_SERVER_ERROR).toBe('activation_server_error');
    });

    it('has exactly 7 error codes', () => {
      expect(Object.keys(ActivationErrorCodes)).toHaveLength(7);
    });
  });

  describe('useLicenseStore', () => {
    it('initializes with correct default state', () => {
      const store = useLicenseStore();

      expect(store.current).toBeNull();
      expect(store.preview).toBeNull();
      expect(store.isLoading).toBe(false);
      expect(store.isVerifying).toBe(false);
      expect(store.isActivating).toBe(false);
      expect(store.lastError).toBeNull();
      expect(store.lastErrorCode).toBeNull();
      expect(store.initialized).toBe(false);
      expect(store.forcedDialogOpen).toBe(false);
    });

    it('needsActivation is false when not initialized', () => {
      const store = useLicenseStore();
      expect(store.needsActivation).toBe(false);
    });

    it('clearError resets error state', () => {
      const store = useLicenseStore();
      // @ts-expect-error - accessing internal ref for testing
      store.lastError = 'Some error';
      // @ts-expect-error - accessing internal ref for testing
      store.lastErrorCode = 'some_code';

      store.clearError();

      expect(store.lastError).toBeNull();
      expect(store.lastErrorCode).toBeNull();
    });

    it('requestActivationDialog sets forcedDialogOpen to true', () => {
      const store = useLicenseStore();
      expect(store.forcedDialogOpen).toBe(false);

      store.requestActivationDialog();

      expect(store.forcedDialogOpen).toBe(true);
    });

    it('clearForcedDialog sets forcedDialogOpen to false', () => {
      const store = useLicenseStore();
      store.requestActivationDialog();
      expect(store.forcedDialogOpen).toBe(true);

      store.clearForcedDialog();

      expect(store.forcedDialogOpen).toBe(false);
    });

    it('clearPrompt sets promptOnInit to false', () => {
      const store = useLicenseStore();
      store.clearPrompt();
      expect(store.shouldPrompt).toBe(false);
    });

    it('isRecoverableError returns true for LICENSE_NOT_FOUND', () => {
      const store = useLicenseStore();
      // @ts-expect-error - accessing internal ref for testing
      store.lastErrorCode = ActivationErrorCodes.LICENSE_NOT_FOUND;
      expect(store.isRecoverableError).toBe(true);
    });

    it('isRecoverableError returns true for NETWORK_ERROR', () => {
      const store = useLicenseStore();
      // @ts-expect-error - accessing internal ref for testing
      store.lastErrorCode = ActivationErrorCodes.NETWORK_ERROR;
      expect(store.isRecoverableError).toBe(true);
    });

    it('isRecoverableError returns false for LICENSE_REVOKED', () => {
      const store = useLicenseStore();
      // @ts-expect-error - accessing internal ref for testing
      store.lastErrorCode = ActivationErrorCodes.LICENSE_REVOKED;
      expect(store.isRecoverableError).toBe(false);
    });

    it('isRecoverableError returns false for LICENSE_ALREADY_ACTIVATED', () => {
      const store = useLicenseStore();
      // @ts-expect-error - accessing internal ref for testing
      store.lastErrorCode = ActivationErrorCodes.LICENSE_ALREADY_ACTIVATED;
      expect(store.isRecoverableError).toBe(false);
    });

    it('isRecoverableError returns true when no error code is set', () => {
      const store = useLicenseStore();
      expect(store.lastErrorCode).toBeNull();
      expect(store.isRecoverableError).toBe(true);
    });

    it('activate returns null for empty key', async () => {
      const store = useLicenseStore();

      const result = await store.activate('');

      expect(result).toBeNull();
      expect(store.lastError).toBe('License key cannot be empty');
    });

    it('activate returns null for whitespace-only key', async () => {
      const store = useLicenseStore();

      const result = await store.activate('   ');

      expect(result).toBeNull();
      expect(store.lastError).toBe('License key cannot be empty');
    });

    it('verify returns null for empty key', async () => {
      const store = useLicenseStore();

      const result = await store.verify('');

      expect(result).toBeNull();
      expect(store.preview).toBeNull();
    });

    it('verify returns null for whitespace-only key', async () => {
      const store = useLicenseStore();

      const result = await store.verify('   ');

      expect(result).toBeNull();
      expect(store.preview).toBeNull();
    });
  });
});
