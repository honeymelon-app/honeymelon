import { simulateFileDrop } from '../helpers/tauri';
import { loadFixtureManifest } from './global-setup';
import { expect, test } from './fixtures';
import { withLicense } from './support/app-state';

type FixtureManifest = Record<string, Record<string, string>>;
let manifestCache: FixtureManifest | undefined;

test.use({
  initialAppData: withLicense(),
});

test.describe('Preset Selection', () => {
  test('lists available presets for a queued video job', async ({ page }) => {
    await enqueue(page, getManifest().video.h264, 'video');
    await page.locator('[data-test="preset-selector-trigger"]').click();

    const options = page.locator('[data-test="preset-option"]');
    expect(await options.count()).toBeGreaterThan(1);
  });

  test('updates the preset label after selecting a different option', async ({ page }) => {
    await enqueue(page, getManifest().video.h264, 'video');
    await page.locator('[data-test="preset-selector-trigger"]').click();

    const secondOption = page.locator('[data-test="preset-option"]').nth(1);
    const optionText = await secondOption.textContent();
    await secondOption.click();

    await expect(page.locator('[data-test="preset-selector"]')).toContainText(
      optionText?.trim() ?? '',
    );
  });

  test('only shows audio presets for audio jobs', async ({ page }) => {
    await enqueue(page, getManifest().audio.aac, 'audio');
    await page.locator('[data-test="preset-selector-trigger"]').click();

    const allOptions = await page.locator('[data-test="preset-option"]').allTextContents();
    expect(allOptions.every((text) => /M4A|MP3|FLAC|WAV/i.test(text))).toBe(true);
  });
});

async function enqueue(page, file: string, media: 'video' | 'audio'): Promise<void> {
  if (media !== 'video') {
    await page.locator(`[data-test="media-tab"][data-media-kind="${media}"]`).click();
  }
  await page.waitForSelector(`[data-test="file-dropzone"][data-media-kind="${media}"]`, {
    state: 'visible',
  });
  await simulateFileDrop(page, `[data-test="file-dropzone"][data-media-kind="${media}"]`, [file]);
  await expect(page.locator('[data-test="job-card"]').first()).toBeVisible();
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
