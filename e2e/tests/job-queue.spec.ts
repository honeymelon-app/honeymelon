import type { Locator, Page } from '@playwright/test';

import { simulateFileDrop } from '../helpers/tauri';
import { loadFixtureManifest } from './global-setup';
import { expect, test } from './fixtures';
import { withLicense } from './support/app-state';

type FixtureManifest = Record<string, Record<string, string>>;
let manifestCache: FixtureManifest | undefined;

test.use({
  initialAppData: withLicense(),
});

test.describe('Job Queue Management', () => {
  test('adds files to the queue', async ({ page }) => {
    const job = await enqueue(page, getManifest().video.h264, 'video');
    await expect(job).toHaveAttribute('data-state', 'queued');
    await expect(job.locator('h3')).toContainText('video');
  });

  test('adds multiple files sequentially', async ({ page }) => {
    await enqueue(page, getManifest().video.h264, 'video');
    await enqueue(page, getManifest().video.hevc, 'video');

    await expect(page.locator('[data-test="job-card"]')).toHaveCount(2);
  });

  test('removes a queued job via cancel control', async ({ page }) => {
    const job = await enqueue(page, getManifest().video.h264, 'video');
    await job.locator('[data-test="job-cancel-button"]').click();
    await expect(page.locator('[data-test="job-card"]')).toHaveCount(0);
    await expect(page.locator('[data-test="job-queue-empty"]')).toBeVisible();
  });

  test('clears completed jobs from the queue', async ({ page }) => {
    const job = await enqueue(page, getManifest().video.h264, 'video');
    await startJob(job);
    await waitForJobState(job, 'completed');

    await page.locator('[data-test="clear-completed-button"]').click();
    await expect(page.locator('[data-test="job-card"]')).toHaveCount(0);
  });

  test('filters jobs by media type tabs', async ({ page }) => {
    await enqueue(page, getManifest().video.h264, 'video');
    await enqueue(page, getManifest().audio.aac, 'audio');

    await page.locator('[data-test="media-tab"][data-media-kind="video"]').click();
    const visibleVideoJobs = page.locator('[data-test="job-card"]:visible');
    await expect(visibleVideoJobs).toHaveCount(1);
    await expect(visibleVideoJobs.first()).toContainText('video');

    await page.locator('[data-test="media-tab"][data-media-kind="audio"]').click();
    const visibleAudioJobs = page.locator('[data-test="job-card"]:visible');
    await expect(visibleAudioJobs).toHaveCount(1);
    await expect(visibleAudioJobs.first()).toContainText('audio');
  });

  test('starts all queued jobs from the footer controls', async ({ page }) => {
    const jobOne = await enqueue(page, getManifest().video.h264, 'video');
    const jobTwo = await enqueue(page, getManifest().video.hevc, 'video');

    await page.locator('[data-test="start-all-button"]').click();

    await waitForJobState(jobOne, 'completed');
    await waitForJobState(jobTwo, 'completed');
    await expect(page.locator('[data-test="app-footer"]')).toContainText('0 files in queue');
  });
});

async function enqueue(
  page: Page,
  file: string,
  media: 'video' | 'audio' | 'image',
): Promise<Locator> {
  await page.locator(`[data-test="media-tab"][data-media-kind="${media}"]`).click();
  await page.waitForSelector(`[data-test="file-dropzone"][data-media-kind="${media}"]`, {
    state: 'visible',
  });
  await simulateFileDrop(page, `[data-test="file-dropzone"][data-media-kind="${media}"]`, [file]);
  const jobCard = page.locator('[data-test="job-card"]').last();
  await expect(jobCard).toBeVisible();
  return jobCard;
}

async function startJob(jobCard: Locator): Promise<void> {
  await jobCard.locator('[data-test="job-start-button"]').click();
}

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
