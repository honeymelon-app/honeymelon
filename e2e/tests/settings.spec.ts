import type { Page } from '@playwright/test';

import { mockTauriCommands } from '../helpers/tauri';
import { expect, test } from './fixtures';
import { withLicense } from './support/app-state';

test.use({
  initialAppData: withLicense(),
});

test.describe('Settings Controls', () => {
  test('opens the destination chooser and toggles options', async ({ page }) => {
    await waitForAppReady(page);
    await page.locator('[data-test="destination-trigger"]').click();
    const dialog = page.locator('[data-test="destination-option-source"]');
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });

  test('selects a custom output directory via system picker', async ({ page }) => {
    await waitForAppReady(page);
    await mockTauriCommands(page, {
      choose_output_directory: '/tmp/honeymelon-e2e',
    });

    await page.locator('[data-test="destination-trigger"]').click();
    await page.locator('[data-test="destination-option-custom"]').click();

    await expect(page.locator('[data-test="destination-trigger"]')).toHaveAttribute(
      'title',
      expect.stringContaining('honeymelon-e2e'),
    );
  });

  test('toggles between light and dark themes', async ({ page }) => {
    await waitForAppReady(page);
    await page.emulateMedia({ colorScheme: 'light' });
    await page.locator('[data-test="theme-toggle"]').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', /dark|light/);
  });
});

async function waitForAppReady(page: Page): Promise<void> {
  await page.waitForSelector('[data-test="file-dropzone"][data-media-kind="video"]', {
    state: 'visible',
  });
}
