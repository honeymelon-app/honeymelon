import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { withLicense } from './support/app-state';

test.use({
  initialAppData: withLicense(),
});

test.describe('Language Selection', () => {
  test('switches the UI to Spanish when selected', async ({ page }) => {
    await waitForAppReady(page);
    await setLanguage(page, 'es');
    await expect(page.locator('[data-test="media-tab"][data-media-kind="video"]')).toContainText(
      'Vídeo',
    );
  });

  test('persists the selected language after reload', async ({ page }) => {
    await waitForAppReady(page);
    await setLanguage(page, 'fr');
    await page.reload();
    await waitForAppReady(page);
    await expect(page.locator('[data-test="media-tab"][data-media-kind="video"]')).toContainText(
      'Vidéo',
    );
  });
});

async function waitForAppReady(page: Page): Promise<void> {
  await page.waitForSelector('[data-test="language-toggle"]', {
    state: 'visible',
    timeout: 30000,
  });
}

async function setLanguage(page: Page, locale: string): Promise<void> {
  await page.click('[data-test="language-toggle"]');
  await page.click(`[data-test="language-option"][data-locale="${locale}"]`);
}
