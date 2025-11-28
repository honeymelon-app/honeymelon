import type { Page } from '@playwright/test';

import { mockCommandError, mockTauriCommands } from '../helpers/tauri';

import { expect, test } from './fixtures';
import { baseLicense, withLicense } from './support/app-state';

const activeLicense = withLicense().license!;

test.describe('License Activation Flow', () => {
  test.use({ initialAppData: undefined });

  test('prompts for activation on first launch', async ({ page }) => {
    await waitForDialogReady(page);
    await expect(page.locator('[data-test="license-dialog"]')).toBeVisible();
    await expect(page.locator('[data-test="license-input"]')).toBeVisible();
  });

  test('activates a license key via backend command', async ({ page }) => {
    await waitForDialogReady(page);
    await mockTauriCommands(page, {
      activate_license: activeLicense,
    });

    await activateLicenseFromDialog(page, 'ABCDE-ABCDE-ABCDE-ABCDE-ABCDE');

    await expect(page.locator('[data-test="license-dialog"]')).toBeHidden({ timeout: 10000 });
    await expect(page.locator('[data-test="file-dropzone"][data-media-kind="video"]')).toBeVisible({
      timeout: 30000,
    });
  });

  test('shows errors for invalid license keys', async ({ page }) => {
    await waitForDialogReady(page);
    await mockTauriCommands(page, {
      activate_license: mockCommandError('License key rejected', 'license_invalid'),
    });

    await activateLicenseFromDialog(page, 'INVALID-INVALID-INVALID-INVALID-INVALID');
    await expect(page.locator('[data-test="license-error"]')).toContainText('License key rejected');
  });

  test('previews license details before activation', async ({ page }) => {
    const preview = {
      ...baseLicense,
      key: 'PREVIEW-PREVIEW-PREVIEW-PREVIEW-PREVIEW',
      licenseId: 'preview-license',
      orderId: 'order-preview',
      activatedAt: null,
    };

    await waitForDialogReady(page);
    await mockTauriCommands(page, {
      current_license: null,
      verify_license_key: preview,
    });

    await page.fill('[data-test="license-input"]', preview.key);
    await page.locator('[data-test="license-verify-button"]').click();

    await expect(page.locator('text=preview-license')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Includes Honeymelon')).toBeVisible();
    await expect(page.locator('[data-test="license-error"]')).toBeHidden();
  });
});

test.describe('Licensed Startup', () => {
  test.use({ initialAppData: withLicense() });

  test('skips activation dialog when license exists', async ({ page }) => {
    await page.waitForSelector('[data-test="file-dropzone"][data-media-kind="video"]', {
      timeout: 30000,
    });
    await expect(page.locator('[data-test="license-dialog"]')).toBeHidden();
    await expect(page.locator('[data-test="file-dropzone"][data-media-kind="video"]')).toBeVisible();
  });
});

async function waitForDialogReady(page: Page): Promise<void> {
  await page.waitForSelector('[data-test="license-dialog"]', {
    state: 'visible',
    timeout: 30000,
  });
}

async function activateLicenseFromDialog(page: Page, key: string): Promise<void> {
  await page.fill('[data-test="license-input"]', key);
  await page.click('[data-test="license-activate-button"]');
}
