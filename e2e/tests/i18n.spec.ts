import { expect, test } from './fixtures';
import { withLicense } from './support/app-state';

test.use({
  initialAppData: withLicense(),
});

test.describe('Language Selection', () => {
  test('switches the UI to Spanish when selected', async ({ page }) => {
    await setLanguage(page, 'es');
    await expect(page.locator('[data-test="media-tab"][data-media-kind="video"]')).toContainText(
      'Vídeo',
    );
  });

  test('persists the selected language after reload', async ({ page }) => {
    await setLanguage(page, 'fr');
    await page.reload();
    await expect(page.locator('[data-test="media-tab"][data-media-kind="video"]')).toContainText(
      'Vidéo',
    );
  });
});

async function setLanguage(page, locale: string): Promise<void> {
  await page.waitForSelector('[data-test="language-toggle"]', { state: 'visible' });
  await page.click('[data-test="language-toggle"]');
  await page.click(`[data-test="language-option"][data-locale="${locale}"]`);
}
