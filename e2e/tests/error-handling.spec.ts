import { expect, test } from './fixtures';
import { withLicense } from './support/app-state';
import { simulateFileDrop } from '../helpers/tauri';
import { loadFixtureManifest } from './global-setup';

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

    await expect(job).toHaveAttribute('data-state', 'failed');
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

    await expect(job.locator('text=Permission denied')).toBeVisible();
    await expect(job.locator('text=Open Settings')).toBeVisible();
  });
});

async function enqueue(page) {
  await page.waitForSelector('[data-test="file-dropzone"][data-media-kind="video"]', {
    state: 'visible',
  });
  await simulateFileDrop(page, '[data-test="file-dropzone"][data-media-kind="video"]', [
    getManifest().video.h264,
  ]);
  const jobCard = page.locator('[data-test="job-card"]').last();
  await expect(jobCard).toBeVisible();
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
