import base from '@playwright/test';

import {
  clearAppData,
  connectToTauriWebView,
  launchTauriApp,
  setAppData,
  type AppDataSnapshot,
  type TauriApp,
} from '../helpers/tauri';

type Fixtures = {
  app: TauriApp;
};
type Options = {
  initialAppData?: AppDataSnapshot;
};

export const test = base.extend<Fixtures, Options>({
  initialAppData: [undefined, { option: true }],
  app: async ({ initialAppData }, use) => {
    await clearAppData();
    if (initialAppData) {
      await setAppData(initialAppData);
    }
    const app = await launchTauriApp({ dev: false });
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
