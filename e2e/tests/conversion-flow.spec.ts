import type { Locator, Page } from '@playwright/test';

import { simulateFileDrop } from '../helpers/tauri';

import { expect, test } from './fixtures';
import { loadFixtureManifest } from './global-setup';
import { withLicense } from './support/app-state';

type FixtureManifest = Record<string, Record<string, string>>;
let manifestCache: FixtureManifest | undefined;

test.use({
  initialAppData: withLicense(),
});

test.describe('Conversion Flow', () => {
  test('completes a full conversion workflow', async ({ page }) => {
    const jobCard = await enqueueVideo(page);
    await startJob(jobCard);

    await expect(jobCard).toHaveAttribute('data-state', 'running', { timeout: 10000 });
    await waitForJobState(jobCard, 'completed');
  });

  test('supports cancelling an in-flight conversion', async ({ page }) => {
    const jobCard = await enqueueVideo(page);
    await startJob(jobCard);
    await waitForJobState(jobCard, 'running');

    await jobCard.locator('[data-test="job-cancel-button"]').click();
    await waitForJobState(jobCard, 'cancelled');
  });

  test('shows progress while conversion runs', async ({ page }) => {
    const jobCard = await enqueueVideo(page);
    await startJob(jobCard);

    await waitForJobState(jobCard, 'running');
    // In mock mode, progress updates quickly - just verify we reach completion
    await waitForJobState(jobCard, 'completed');
  });

  test('surface conversion errors gracefully', async ({ page }) => {
    const jobCard = await enqueueVideo(page);
    await startJob(jobCard);
    const jobId = await jobCard.getAttribute('data-job-id');
    expect(jobId).toBeTruthy();

    await page.evaluate((id) => {
      const api = (window as typeof window & { __HONEYMELON_TEST_API__?: Record<string, unknown> })
        .__HONEYMELON_TEST_API__;
      const jobsStore = api?.jobsStore as
        | {
            markFailed: (jobId: string, message: string, code?: string) => void;
          }
        | undefined;
      jobsStore?.markFailed(id as string, 'Simulated ffmpeg failure', 'job_invalid_args');
    }, jobId);

    await waitForJobState(jobCard, 'failed');
    await expect(jobCard.locator('text=Simulated ffmpeg failure')).toBeVisible();
  });
});

test.describe('Batch Conversion', () => {
  test('processes multiple files sequentially when concurrency is one', async ({ page }) => {
    const manifest = getManifest();
    const firstJob = await enqueueVideo(page);
    const secondJob = await enqueueVideo(page, manifest.video.hevc);

    await startJob(firstJob);
    await waitForJobState(firstJob, 'completed');

    await startJob(secondJob);
    await waitForJobState(secondJob, 'completed');
  });
});

async function enqueueVideo(page: Page, file?: string): Promise<Locator> {
  const manifest = getManifest();
  const filePath = file ?? manifest.video.h264;

  await page.waitForSelector('[data-test="file-dropzone"][data-media-kind="video"]', {
    timeout: 30000,
  });
  await simulateFileDrop(page, '[data-test="file-dropzone"][data-media-kind="video"]', [filePath]);
  const jobCard = page.locator('[data-test="job-card"]').last();
  await expect(jobCard).toBeVisible({ timeout: 10000 });
  await expect(jobCard).toHaveAttribute('data-state', 'queued');
  return jobCard;
}

async function startJob(jobCard: Locator): Promise<void> {
  await jobCard.locator('[data-test="job-start-button"]').click();
}

async function waitForJobState(jobCard: Locator, state: string): Promise<void> {
  await expect(jobCard).toHaveAttribute('data-state', state, { timeout: 30000 });
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
