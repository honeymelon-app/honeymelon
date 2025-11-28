import type { Page } from '@playwright/test';

import { simulateFileDrop } from '../helpers/tauri';

import { expect, test } from './fixtures';
import { loadFixtureManifest } from './global-setup';
import { withLicense } from './support/app-state';

type FixtureManifest = Record<string, Record<string, string>>;
let manifestCache: FixtureManifest | undefined;

test.use({
  initialAppData: withLicense(),
});

test.describe('Job Failure Handling', () => {
  test('surfaces generic conversion failures on the job card', async ({ page }) => {
    const job = await enqueue(page);
    const jobId = await job.getAttribute('data-job-id');

    await page.evaluate((id) => {
      const api = (window as typeof window & { __HONEYMELON_TEST_API__?: Record<string, unknown> })
        .__HONEYMELON_TEST_API__;
      const jobsStore = api?.jobsStore as {
        markFailed: (jobId: string, error: string, code?: string) => void;
      };
      jobsStore?.markFailed(id as string, 'Mock conversion error', 'job_invalid_args');
    }, jobId);

    await expect(job).toHaveAttribute('data-state', 'failed', { timeout: 10000 });
    await expect(job.locator('text=Mock conversion error')).toBeVisible();
  });

  test('shows permission guidance when output access fails', async ({ page }) => {
    const job = await enqueue(page);
    const jobId = await job.getAttribute('data-job-id');

    await page.evaluate((id) => {
      const api = (window as typeof window & { __HONEYMELON_TEST_API__?: Record<string, unknown> })
        .__HONEYMELON_TEST_API__;
      const jobsStore = api?.jobsStore as {
        markFailed: (jobId: string, error: string, code?: string) => void;
      };
      jobsStore?.markFailed(id as string, 'Permission denied', 'job_output_permission');
    }, jobId);

    await expect(job.locator('text=Permission denied')).toBeVisible({ timeout: 10000 });
    await expect(job.locator('text=Open Settings')).toBeVisible();
  });
});

async function enqueue(page: Page) {
  const manifest = getManifest();
  await page.waitForSelector('[data-test="file-dropzone"][data-media-kind="video"]', {
    state: 'visible',
    timeout: 30000,
  });
  await simulateFileDrop(page, '[data-test="file-dropzone"][data-media-kind="video"]', [
    manifest.video.h264,
  ]);
  const jobCard = page.locator('[data-test="job-card"]').last();
  await expect(jobCard).toBeVisible({ timeout: 10000 });
  return jobCard;
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
