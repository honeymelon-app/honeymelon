import type { Locator } from '@playwright/test';

import { mockTauriCommands, simulateFileDrop } from '../helpers/tauri';

import { expect, test } from './fixtures';
import { loadFixtureManifest } from './global-setup';
import { withLicense } from './support/app-state';

type FixtureManifest = Record<string, Record<string, string>>;
let manifestCache: FixtureManifest | undefined;

test.use({
  initialAppData: withLicense(),
});

test.describe('Media Browsing & Images', () => {
  test('enqueues audio via the browse picker and keeps it scoped to the audio tab', async ({
    page,
  }) => {
    await page.locator('[data-test="media-tab"][data-media-kind="audio"]').click();
    await mockTauriCommands(page, {
      pick_media_files: [getManifest().audio.mp3],
    });

    await page.locator('[data-test="file-browse-button"][data-media-kind="audio"]').click();

    const jobCard = page.locator('[data-test="job-card"]').first();
    await expect(jobCard).toBeVisible();
    await expect(jobCard).toHaveAttribute('data-state', 'queued');

    // Ensure the audio job does not leak into other tabs
    await page.locator('[data-test="media-tab"][data-media-kind="video"]').click();
    await expect(page.locator('[data-test="job-card"]:visible')).toHaveCount(0);
    await expect(page.locator('[data-test="job-queue-empty"]')).toBeVisible();

    // Switching back restores the queued audio job
    await page.locator('[data-test="media-tab"][data-media-kind="audio"]').click();
    await expect(jobCard).toBeVisible();
  });

  test('runs an image conversion end-to-end', async ({ page }) => {
    await page.locator('[data-test="media-tab"][data-media-kind="image"]').click();
    await simulateFileDrop(page, '[data-test="file-dropzone"][data-media-kind="image"]', [
      getManifest().image.png,
    ]);

    const jobCard = page.locator('[data-test="job-card"]').last();
    await expect(jobCard).toBeVisible();
    await expect(jobCard).toHaveAttribute('data-state', 'queued');

    await jobCard.locator('[data-test="job-start-button"]').click();
    await waitForJobState(jobCard, 'running');

    // Image presets should surface image-specific labels (e.g., PNG/JPEG/WebP)
    await expect(jobCard.locator('[data-test="preset-selector"]')).toContainText(/png|jpeg|webp/i);
    await waitForJobState(jobCard, 'completed');
  });
});

async function waitForJobState(jobCard: Locator, state: string): Promise<void> {
  await expect(jobCard).toHaveAttribute('data-state', state, { timeout: 20000 });
}

function getManifest(): FixtureManifest {
  if (!manifestCache) {
    manifestCache = loadFixtureManifest();
  }
  if (!manifestCache) {
    throw new Error('E2E fixture manifest missing');
  }
  return manifestCache;
}
