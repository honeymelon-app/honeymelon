import base from '@playwright/test';

import { clearAppData, setAppData, type AppDataSnapshot } from '../helpers/tauri';

type Fixtures = {
  initialAppData: AppDataSnapshot | undefined;
};

/**
 * Custom Playwright test fixture for Honeymelon E2E tests.
 *
 * This fixture handles:
 * - Setting up initial app data (license, preferences, jobs)
 * - Injecting Tauri API mocks when running in browser-only mode
 * - Navigating to the app URL
 */
export const test = base.extend<Fixtures>({
  initialAppData: [undefined, { option: true }],

  page: async ({ page, initialAppData, baseURL }, use) => {
    // Clear any previous app data for clean state
    await clearAppData();

    // Set up initial app data if provided
    if (initialAppData) {
      await setAppData(initialAppData);
    }

    // Inject Tauri mocks BEFORE navigating - this ensures mocks are available
    // before Vue app initializes
    const isRemoteUiMode = process.env.TAURI_REMOTE_UI === 'true';
    if (!isRemoteUiMode) {
      const license = initialAppData?.license ?? null;
      const jobs = initialAppData?.jobs ?? [];

      await page.addInitScript(
        ({ license, jobs }) => {
          // Store for mock state
          const mockState = {
            license,
            jobs: [...jobs],
            eventListeners: new Map<string, Set<(payload: unknown) => void>>(),
          };

          // Mock Tauri internals - must be available before Vue app loads
          (window as unknown as { __TAURI_INTERNALS__: unknown }).__TAURI_INTERNALS__ = {
            invoke: async (cmd: string, args?: Record<string, unknown>) => {
              console.log(`[TauriMock] invoke: ${cmd}`, args);

              switch (cmd) {
                case 'current_license':
                  return mockState.license;

                case 'verify_license_key':
                case 'activate_license':
                  if (mockState.license) {
                    return mockState.license;
                  }
                  throw { code: 'license_invalid', message: 'Invalid license key' };

                case 'load_capabilities':
                  return {
                    videoCodecs: ['h264', 'hevc', 'av1'],
                    audioCodecs: ['aac', 'mp3', 'flac'],
                    imageFormats: ['png', 'jpeg', 'webp'],
                    hardwareAcceleration: ['videotoolbox'],
                  };

                case 'probe_media':
                  return {
                    format: { duration: 10, size: 1024000 },
                    video: { codec: 'h264', width: 1920, height: 1080 },
                    audio: { codec: 'aac', channels: 2, sampleRate: 48000 },
                  };

                case 'file_exists':
                  return true;

                case 'expand_media_paths':
                  return args?.paths ?? [];

                case 'pick_media_files':
                  return [];

                case 'choose_output_directory':
                  return '/tmp/honeymelon-output';

                case 'start_job': {
                  const jobId = args?.jobId as string;
                  const job = mockState.jobs.find((j: { id: string }) => j.id === jobId);
                  if (job) {
                    (job as { state: unknown }).state = {
                      running: { startedAt: Date.now() },
                    };
                    // Emit progress and completion events
                    setTimeout(() => {
                      const emitProgress = (payload: unknown) => {
                        const listeners = mockState.eventListeners.get('job:progress');
                        listeners?.forEach((cb) => cb(payload));
                      };
                      emitProgress({ jobId, percent: 50, eta: 5 });
                      setTimeout(() => {
                        (job as { state: unknown }).state = {
                          completed: { finishedAt: Date.now() },
                        };
                        const completionListeners = mockState.eventListeners.get('job:completed');
                        completionListeners?.forEach((cb) =>
                          cb({ jobId, outputPath: '/tmp/output.mp4' }),
                        );
                      }, 200);
                    }, 100);
                  }
                  return;
                }

                case 'cancel_job': {
                  const jobId = args?.jobId as string;
                  const job = mockState.jobs.find((j: { id: string }) => j.id === jobId);
                  if (job) {
                    (job as { state: unknown }).state = {
                      cancelled: { cancelledAt: Date.now() },
                    };
                    const listeners = mockState.eventListeners.get('job:cancelled');
                    listeners?.forEach((cb) => cb({ jobId }));
                  }
                  return;
                }

                case 'set_max_concurrency':
                  return;

                default:
                  console.warn(`[TauriMock] Unhandled command: ${cmd}`);
                  return null;
              }
            },
            metadata: {
              currentWindow: { label: 'main' },
              currentWebview: { windowLabel: 'main', label: 'main' },
            },
            convertFileSrc: (path: string) => `asset://${path}`,
          };

          // Mock event API
          (window as unknown as { __TAURI__: unknown }).__TAURI__ = {
            event: {
              listen: (event: string, callback: (payload: unknown) => void) => {
                if (!mockState.eventListeners.has(event)) {
                  mockState.eventListeners.set(event, new Set());
                }
                mockState.eventListeners.get(event)!.add(callback);
                return Promise.resolve(() => {
                  mockState.eventListeners.get(event)?.delete(callback);
                });
              },
              emit: (event: string, payload: unknown) => {
                const listeners = mockState.eventListeners.get(event);
                listeners?.forEach((cb) => cb(payload));
                return Promise.resolve();
              },
            },
          };

          // Expose test API for test manipulation
          (
            window as unknown as {
              __HONEYMELON_TEST_API__: {
                mockState: typeof mockState;
                jobsStore?: {
                  markFailed: (jobId: string, message: string, code?: string) => void;
                };
              };
            }
          ).__HONEYMELON_TEST_API__ = {
            mockState,
            jobsStore: {
              markFailed: (jobId: string, message: string, code?: string) => {
                const job = mockState.jobs.find((j: { id: string }) => j.id === jobId);
                if (job) {
                  (job as { state: unknown }).state = {
                    failed: { error: message, code, failedAt: Date.now() },
                  };
                  const listeners = mockState.eventListeners.get('job:failed');
                  listeners?.forEach((cb) => cb({ jobId, error: message, code }));
                }
              },
            },
          };
        },
        { license, jobs },
      );
    }

    // Navigate to the app
    await page.goto(baseURL ?? 'http://localhost:1420');

    // Wait for the app to be ready
    await page.waitForLoadState('domcontentloaded');

    await use(page);
  },
});

export const expect = test.expect;
