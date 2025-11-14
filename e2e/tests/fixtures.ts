import base from '@playwright/test';

import {
  clearAppData,
  connectToTauriWebView,
  launchTauriApp,
  type TauriApp,
} from '../helpers/tauri';

type Fixtures = {
  app: TauriApp;
};

export const test = base.extend<Fixtures>({
  app: async (_context, use) => {
    await clearAppData();
    const app = await launchTauriApp();
    await use(app);
    await app.stop();
  },
  page: async ({ app }, use) => {
    const { page, close } = await connectToTauriWebView(app);
    await use(page);
    await close();
  },
});

export const expect = test.expect;
