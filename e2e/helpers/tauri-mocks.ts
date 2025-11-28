/**
 * Shared Tauri mock implementation for E2E testing.
 *
 * This module provides the mock Tauri API implementation that can be used
 * both via addInitScript (for fixtures) and page.evaluate (for runtime injection).
 */

import type { AppDataSnapshot, JobSnapshot, LicenseSnapshot } from './tauri';

export interface MockState {
  license: LicenseSnapshot | null;
  preferences?: unknown;
  jobs: JobSnapshot[];
  eventListeners: Map<string, Set<(payload: unknown) => void>>;
  jobIdCounter: number;
}

/**
 * Creates the mock state object for Tauri mocks
 */
export function createMockState(initialAppData?: AppDataSnapshot): MockState {
  return {
    license: initialAppData?.license ?? null,
    preferences: initialAppData?.preferences ?? null,
    jobs: initialAppData?.jobs ? [...initialAppData.jobs] : [],
    eventListeners: new Map<string, Set<(payload: unknown) => void>>(),
    jobIdCounter: initialAppData?.jobs?.length ?? 0,
  };
}

/**
 * Gets the serializable mock script function as a string.
 * This returns the implementation that can be injected into the browser.
 *
 * Note: This function returns a string representation that can be used
 * with page.addInitScript or page.evaluate.
 */
export function getTauriMockImplementation(): string {
  return `
    (function setupTauriMocks(config) {
      var license = config.license;
      var jobs = config.jobs || [];
      
      // Store for mock state
      var mockState = {
        license: license,
        jobs: jobs.slice(),
        eventListeners: new Map(),
        jobIdCounter: jobs.length,
      };

      // Mock Tauri internals - must be available before Vue app loads
      window.__TAURI_INTERNALS__ = {
        invoke: async function(cmd, args) {
          console.log('[TauriMock] invoke: ' + cmd, args);

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
              return (args && args.paths) ? args.paths : [];

            case 'pick_media_files':
              return [];

            case 'choose_output_directory':
              return '/tmp/honeymelon-output';

            case 'start_job': {
              var jobId = args ? args.jobId : null;
              var job = mockState.jobs.find(function(j) { return j.id === jobId; });
              if (job) {
                job.state = { running: { startedAt: Date.now() } };
                // Emit progress and completion events
                setTimeout(function() {
                  var emitProgress = function(payload) {
                    var listeners = mockState.eventListeners.get('job:progress');
                    if (listeners) {
                      listeners.forEach(function(cb) { cb(payload); });
                    }
                  };
                  emitProgress({ jobId: jobId, percent: 50, eta: 5 });
                  setTimeout(function() {
                    job.state = { completed: { finishedAt: Date.now() } };
                    var completionListeners = mockState.eventListeners.get('job:completed');
                    if (completionListeners) {
                      completionListeners.forEach(function(cb) {
                        cb({ jobId: jobId, outputPath: '/tmp/output.mp4' });
                      });
                    }
                  }, 200);
                }, 100);
              }
              return;
            }

            case 'cancel_job': {
              var jobId = args ? args.jobId : null;
              var job = mockState.jobs.find(function(j) { return j.id === jobId; });
              if (job) {
                job.state = { cancelled: { cancelledAt: Date.now() } };
                var listeners = mockState.eventListeners.get('job:cancelled');
                if (listeners) {
                  listeners.forEach(function(cb) { cb({ jobId: jobId }); });
                }
              }
              return;
            }

            case 'set_max_concurrency':
              return;

            default:
              console.warn('[TauriMock] Unhandled command: ' + cmd);
              return null;
          }
        },
        metadata: {
          currentWindow: { label: 'main' },
          currentWebview: { windowLabel: 'main', label: 'main' },
        },
        convertFileSrc: function(path) { return 'asset://' + path; },
      };

      // Mock event API
      window.__TAURI__ = {
        event: {
          listen: function(event, callback) {
            if (!mockState.eventListeners.has(event)) {
              mockState.eventListeners.set(event, new Set());
            }
            mockState.eventListeners.get(event).add(callback);
            return Promise.resolve(function() {
              var listeners = mockState.eventListeners.get(event);
              if (listeners) {
                listeners.delete(callback);
              }
            });
          },
          emit: function(event, payload) {
            var listeners = mockState.eventListeners.get(event);
            if (listeners) {
              listeners.forEach(function(cb) { cb(payload); });
            }
            return Promise.resolve();
          },
        },
      };

      // Expose test API for test manipulation
      window.__HONEYMELON_TEST_API__ = {
        mockState: mockState,
        jobsStore: {
          markFailed: function(jobId, message, code) {
            var job = mockState.jobs.find(function(j) { return j.id === jobId; });
            if (job) {
              job.state = { failed: { error: message, code: code, failedAt: Date.now() } };
              var listeners = mockState.eventListeners.get('job:failed');
              if (listeners) {
                listeners.forEach(function(cb) { cb({ jobId: jobId, error: message, code: code }); });
              }
            }
          },
        },
      };
    })
  `;
}

/**
 * Creates the configuration object for the mock script
 */
export function createMockConfig(initialAppData?: AppDataSnapshot): {
  license: LicenseSnapshot | null;
  jobs: JobSnapshot[];
} {
  return {
    license: initialAppData?.license ?? null,
    jobs: initialAppData?.jobs ? [...initialAppData.jobs] : [],
  };
}
