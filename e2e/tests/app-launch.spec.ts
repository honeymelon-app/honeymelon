import type { Page } from '@playwright/test';

import { simulateFileDrop } from '../helpers/tauri';
import { loadFixtureManifest } from './global-setup';
import { expect, test } from './fixtures';
import { withLicense } from './support/app-state';

type FixtureManifest = Record<string, Record<string, string>>;
let manifestCache: FixtureManifest | undefined;

test.use({
  initialAppData: withLicense(),
});

test.describe('App Launch', () => {
  test('renders the primary window with controls', async ({ page }) => {
    await waitForAppReady(page);

    await expect(page.locator('[data-test="app-main"]')).toBeVisible();
    await expect(page.locator('[data-test="destination-trigger"]')).toBeVisible();
    await expect(page.locator('[data-test="language-toggle"]')).toBeVisible();
    await expect(page.locator('[data-test="theme-toggle"]')).toBeVisible();

    const videoTab = page.locator('[data-test="media-tab"][data-media-kind="video"]');
    await expect(videoTab).toBeVisible();
    await expect(
      page.locator('[data-test="file-dropzone"][data-media-kind="video"]'),
    ).toBeVisible();
  });
});

test.describe('File Handling', () => {
  test('accepts dropped files and shows them in the queue', async ({ page }) => {
    await waitForAppReady(page);
    await simulateFileDrop(page, '[data-test="file-dropzone"][data-media-kind="video"]', [
      getManifest().video.h264,
    ]);

    const jobCard = page.locator('[data-test="job-card"]').first();
    await expect(jobCard).toBeVisible();
    await expect(jobCard).toHaveAttribute('data-state', 'queued');
  });
});

async function waitForAppReady(page: Page): Promise<void> {
  await page.waitForSelector('[data-test="file-dropzone"][data-media-kind="video"]', {
    state: 'visible',
  });
}

function getManifest(): FixtureManifest {
  if (!manifestCache) {
    manifestCache = loadFixtureManifest();
  }
  if (!manifestCache) {
    throw new Error('E2E fixture manifest was not generated');
  }
  return manifestCache;
}
