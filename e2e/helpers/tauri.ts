import { spawn, type ChildProcess } from 'child_process';
import { existsSync } from 'fs';
import { mkdir, readFile, rm, writeFile } from 'fs/promises';
import { platform, tmpdir } from 'os';
import { basename, dirname, extname, join } from 'path';
import { fileURLToPath } from 'url';

import { chromium, type Page } from '@playwright/test';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..', '..');
const E2E_TAURI_CONFIG = join(PROJECT_ROOT, 'e2e', 'tauri.e2e.conf.json');
const DEBUG_APP_PATH = join(
  PROJECT_ROOT,
  'src-tauri',
  'target',
  'debug',
  'bundle',
  'macos',
  'Honeymelon.app',
);

/**
 * Helper utilities for launching and controlling Tauri app during E2E tests
 */

export interface TauriAppOptions {
  /**
   * Whether to run in development mode (default: true)
   */
  dev?: boolean;

  /**
   * Port for WebView debugging (default: 9222)
   */
  debugPort?: number;

  /**
   * Timeout for app to be ready in milliseconds (default: 30000)
   */
  timeout?: number;

  /**
   * Additional environment variables to pass to the app
   */
  env?: Record<string, string>;
}

export interface TauriApp {
  /**
   * The spawned Tauri process
   */
  process: ChildProcess;

  /**
   * Stop the Tauri app and clean up
   */
  stop: () => Promise<void>;

  /**
   * Get the debug URL for connecting Playwright
   */
  getDebugUrl: () => string;
}

export interface PreferencesSnapshot {
  preferredConcurrency?: number;
  outputDirectory?: string | null;
  includePresetInName?: boolean;
  includeTierInName?: boolean;
  filenameSeparator?: string;
}

export interface JobSnapshot {
  id: string;
  path: string;
  presetId: string;
  tier?: string;
  exclusive?: boolean;
  outputPath?: string;
  summary?: Record<string, unknown>;
  state: Record<string, unknown>;
  createdAt?: number;
  updatedAt?: number;
  logs?: string[];
}

export interface LicenseSnapshot {
  key: string;
  licenseId: string;
  orderId: string;
  maxMajorVersion: number;
  issuedAt: number;
  payload: string;
  signature: string;
  activatedAt?: number | null;
}

export interface AppDataSnapshot {
  preferences?: PreferencesSnapshot;
  jobs?: ReadonlyArray<JobSnapshot>;
  license?: LicenseSnapshot;
}

export interface MockedCommandError {
  __mockError: true;
  message: string;
  code?: string;
}

type CommandMockValue = unknown | MockedCommandError;

const APP_IDENTIFIER = 'com.honeymelon.desktop';
const TEST_HOME_DIR = join(tmpdir(), 'honeymelon-playwright-home');
const APP_DATA_DIR =
  platform() === 'darwin'
    ? join(TEST_HOME_DIR, 'Library', 'Application Support', APP_IDENTIFIER)
    : join(TEST_HOME_DIR, '.tauri', APP_IDENTIFIER);
const APP_SETTINGS_FILE = 'settings.json';
const APP_JOBS_FILE = 'jobs.json';
const APP_LICENSE_FILE = 'license.json';

let frontendBuildPromise: Promise<void> | null = null;
let appBundlePromise: Promise<void> | null = null;

/**
 * Launch the Tauri application for testing
 *
 * @param options Configuration options for launching the app
 * @returns Promise that resolves with app control interface
 *
 * @example
 * ```typescript
 * const app = await launchTauriApp({ dev: true });
 * await page.goto(app.getDebugUrl());
 * // ... run tests ...
 * await app.stop();
 * ```
 */
export async function launchTauriApp(options: TauriAppOptions = {}): Promise<TauriApp> {
  const { dev = true, debugPort = 9222, timeout = 30000, env = {} } = options;
  await mkdir(TEST_HOME_DIR, { recursive: true });
  const devHost = '127.0.0.1';

  // Only run on macOS
  if (platform() !== 'darwin') {
    throw new Error('Tauri app can only be tested on macOS');
  }

  const projectRoot = PROJECT_ROOT;

  if (dev) {
    await ensureFrontendBuild(projectRoot);
  } else {
    await ensureAppBundle(projectRoot);
  }
  const command = dev ? 'npm' : 'open';
  const debugArgs = ['--remote-debugging-port', debugPort.toString()];
  const args = dev
    ? ['run', 'tauri', 'dev', '--', '--config', E2E_TAURI_CONFIG, '--', ...debugArgs]
    : ['-a', DEBUG_APP_PATH, '--args', debugArgs.join(' ')];

  const tauriProcess = spawn(command, args, {
    cwd: projectRoot,
    detached: false,
    stdio: 'pipe',
    env: {
      ...process.env,
      WEBKIT_INSPECTOR_SERVER: `127.0.0.1:${debugPort}`,
      PLAYWRIGHT_E2E: 'true',
      VITE_E2E_SIMULATION: 'true',
      HOME: TEST_HOME_DIR,
      XDG_CONFIG_HOME: join(TEST_HOME_DIR, '.config'),
      HOST: devHost,
      VITE_DEV_SERVER_HOST: devHost,
      TAURI_DEV_HOST: devHost,
      ...env,
    },
  });

  // Capture stdout/stderr for debugging
  let output = '';
  tauriProcess.stdout?.on('data', (data) => {
    output += data.toString();
    if (process.env.DEBUG) {
      console.warn('[Tauri stdout]:', data.toString());
    }
  });

  tauriProcess.stderr?.on('data', (data) => {
    output += data.toString();
    if (process.env.DEBUG) {
      console.error('[Tauri stderr]:', data.toString());
    }
  });

  tauriProcess.on('error', (error) => {
    console.error('[Tauri process error]:', error);
  });

  // Wait for app to be ready
  const ready = await waitForTauriReady(debugPort, timeout);
  if (!ready) {
    tauriProcess.kill();
    throw new Error(
      `Tauri app failed to start within ${timeout}ms. Output:\n${output.slice(-1000)}`,
    );
  }

  return {
    process: tauriProcess,
    stop: async () => {
      return new Promise((resolve) => {
        if (tauriProcess.killed) {
          resolve();
          return;
        }

        tauriProcess.on('exit', () => resolve());
        tauriProcess.kill('SIGTERM');

        // Force kill if not stopped within 5 seconds
        setTimeout(() => {
          if (!tauriProcess.killed) {
            tauriProcess.kill('SIGKILL');
            resolve();
          }
        }, 5000);
      });
    },
    getDebugUrl: () => `http://localhost:${debugPort}`,
  };
}

/**
 * Wait for Tauri app to be ready by polling the debug port
 *
 * @param debugPort Port to check for readiness
 * @param timeout Maximum time to wait in milliseconds
 * @returns Promise that resolves to true if ready, false if timeout
 */
async function waitForTauriReady(debugPort: number, timeout: number): Promise<boolean> {
  const startTime = Date.now();
  const checkInterval = 500; // Check every 500ms

  while (Date.now() - startTime < timeout) {
    const controller = new globalThis.AbortController();
    const abortTimeout = setTimeout(() => controller.abort(), 1000);

    try {
      // Try to fetch the debug endpoint
      const response = await fetch(`http://localhost:${debugPort}/json/version`, {
        signal: controller.signal,
      });

      if (response.ok) {
        // Additional delay to ensure WebView is fully initialized
        await sleep(1000);
        return true;
      }
    } catch {
      // Expected during startup, continue polling
    } finally {
      clearTimeout(abortTimeout);
    }

    await sleep(checkInterval);
  }

  return false;
}

/**
 * Connect Playwright page to Tauri WebView
 *
 * @param page Playwright page instance
 * @param app Tauri app instance from launchTauriApp
 *
 * @example
 * ```typescript
 * const app = await launchTauriApp();
 * await connectToTauriWebView(page, app);
 * await expect(page.locator('h1')).toContainText('Honeymelon');
 * ```
 */
export async function connectToTauriWebView(app: TauriApp): Promise<{
  page: Page;
  close: () => Promise<void>;
}> {
  const browser = await chromium.connectOverCDP(app.getDebugUrl());
  const [context] = browser.contexts();
  if (!context) {
    await browser.close();
    throw new Error('Unable to create CDP context for Tauri WebView');
  }

  const page = context.pages()[0] ?? (await context.newPage());
  await page.bringToFront();

  return {
    page,
    close: async () => {
      await browser.close();
    },
  };
}

/**
 * Helper to sleep for a given duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Clear app data (settings, jobs, licenses) for clean test state
 *
 * This removes stored data from the app's data directory to ensure
 * tests start with a clean state.
 */
export async function clearAppData(): Promise<void> {
  if (existsSync(APP_DATA_DIR)) {
    await rm(APP_DATA_DIR, { recursive: true, force: true });
  }
}

/**
 * Set app data for testing specific scenarios
 *
 * Allows pre-populating the app with specific settings, jobs, or license data
 * before launching for tests.
 *
 * @param data Object containing data to set
 */
export async function setAppData(data: AppDataSnapshot): Promise<void> {
  await mkdir(APP_DATA_DIR, { recursive: true });

  const writes: Array<Promise<void>> = [];
  if (data.preferences) {
    writes.push(writeJson(APP_SETTINGS_FILE, data.preferences));
  }

  if (data.jobs) {
    writes.push(writeJson(APP_JOBS_FILE, data.jobs));
  }

  if (data.license) {
    writes.push(writeJson(APP_LICENSE_FILE, data.license));
  }

  await Promise.all(writes);
}

export async function seedPreferences(preferences: PreferencesSnapshot): Promise<void> {
  await setAppData({ preferences });
}

export async function seedJobs(jobs: ReadonlyArray<JobSnapshot>): Promise<void> {
  await setAppData({ jobs });
}

export async function seedLicense(license: LicenseSnapshot): Promise<void> {
  await setAppData({ license });
}

async function writeJson(fileName: string, payload: unknown): Promise<void> {
  const path = join(APP_DATA_DIR, fileName);
  await mkdir(APP_DATA_DIR, { recursive: true });
  await writeFile(path, JSON.stringify(payload, null, 2), 'utf8');
}

/**
 * Wait for a specific condition to be true
 *
 * @param condition Function that returns true when condition is met
 * @param options Timeout and check interval options
 * @returns Promise that resolves when condition is true, or rejects on timeout
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  options: { timeout?: number; interval?: number } = {},
): Promise<void> {
  const { timeout = 5000, interval = 100 } = options;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const result = await condition();
    if (result) {
      return;
    }
    await sleep(interval);
  }

  throw new Error(`Condition not met within ${timeout}ms`);
}

/**
 * Simulate file drop event in the Tauri WebView
 *
 * @param page Playwright page instance
 * @param filePaths Array of file paths to drop
 */
export async function simulateFileDrop(
  page: Page,
  selector: string,
  filePaths: string[],
): Promise<void> {
  const files = await Promise.all(
    filePaths.map(async (filePath) => {
      const buffer = await readFile(filePath);
      return {
        name: basename(filePath),
        type: resolveMimeType(filePath),
        data: buffer.toString('base64'),
      };
    }),
  );

  await page.evaluate(
    async ({ files, selector }) => {
      const target = document.querySelector(selector) ?? document.body;
      if (!target) {
        console.error(`[simulateFileDrop] target ${selector} not found`);
        throw new Error(`simulateFileDrop: target ${selector} not found`);
      }

      const dataTransfer = new window.DataTransfer();
      for (const file of files) {
        const blob = await fetch(`data:${file.type};base64,${file.data}`).then((res) => res.blob());
        const fileObj = new window.File([blob], file.name, { type: file.type });
        dataTransfer.items.add(fileObj);
      }

      target.dispatchEvent(
        new window.DragEvent('dragenter', { bubbles: true, cancelable: true, dataTransfer }),
      );
      target.dispatchEvent(
        new window.DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer }),
      );
      target.dispatchEvent(
        new window.DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer }),
      );
    },
    { files, selector },
  );
}

/**
 * Mock Tauri command responses for testing
 *
 * Allows intercepting Tauri commands and providing mock responses
 * without executing actual backend logic.
 *
 * @param page Playwright page instance
 * @param commandMocks Object mapping command names to mock responses
 */
export function mockCommandError(message: string, code?: string): MockedCommandError {
  return {
    __mockError: true,
    message,
    code,
  };
}

export async function mockTauriCommands(
  page: Page,
  commandMocks: Record<string, CommandMockValue>,
): Promise<void> {
  await page.evaluate(
    ({ commandMocks }) =>
      new Promise<void>((resolve, reject) => {
        const pendingMocks = { ...commandMocks };
        const install = () => {
          const originalInvoke = window.__TAURI_INTERNALS__?.invoke;
          if (typeof originalInvoke !== 'function') {
            console.error('[mockTauriCommands] __TAURI_INTERNALS__.invoke not available');
            reject(new Error('mockTauriCommands: Tauri internals missing'));
            return;
          }

          window.__TAURI_INTERNALS__.invoke = (cmd, args) => {
            if (Object.prototype.hasOwnProperty.call(pendingMocks, cmd)) {
              console.info(`[mockTauriCommands] intercepted ${cmd}`);
              const mockValue = pendingMocks[cmd as keyof typeof pendingMocks];
              if (isMockError(mockValue)) {
                const payload = mockValue;
                return Promise.reject({ code: payload.code, message: payload.message });
              }
              return Promise.resolve(mockValue);
            }
            return originalInvoke(cmd, args);
          };
          resolve();
        };

        if (window.__TAURI_INTERNALS__?.invoke) {
          install();
          return;
        }

        let attempts = 0;
        const maxAttempts = 50;
        const timer = window.setInterval(() => {
          attempts += 1;
          if (window.__TAURI_INTERNALS__?.invoke) {
            window.clearInterval(timer);
            install();
          } else if (attempts >= maxAttempts) {
            window.clearInterval(timer);
            console.error('[mockTauriCommands] __TAURI_INTERNALS__.invoke never appeared');
            reject(new Error('mockTauriCommands: failed to patch invoke'));
          }
        }, 50);
      }),
    { commandMocks },
  );
}

function isMockError(value: CommandMockValue): value is MockedCommandError {
  return Boolean(value && typeof value === 'object' && '__mockError' in value);
}

function resolveMimeType(filePath: string): string {
  const extension = extname(filePath).toLowerCase();
  switch (extension) {
    case '.mp4':
    case '.m4v':
      return 'video/mp4';
    case '.mkv':
      return 'video/x-matroska';
    case '.webm':
      return 'video/webm';
    case '.mp3':
      return 'audio/mpeg';
    case '.m4a':
      return 'audio/mp4';
    case '.aac':
      return 'audio/aac';
    case '.flac':
      return 'audio/flac';
    case '.wav':
      return 'audio/wav';
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.gif':
      return 'image/gif';
    default:
      return 'application/octet-stream';
  }
}

async function ensureFrontendBuild(projectRoot: string): Promise<void> {
  if (!frontendBuildPromise) {
    frontendBuildPromise = new Promise((resolve, reject) => {
      const build = spawn('npm', ['run', 'build'], {
        cwd: projectRoot,
        stdio: 'inherit',
      });
      build.on('exit', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Frontend build failed with code ${code ?? -1}`));
        }
      });
      build.on('error', (error) => {
        reject(error);
      });
    });
  }
  return frontendBuildPromise;
}

async function ensureAppBundle(projectRoot: string): Promise<void> {
  if (!appBundlePromise && !existsSync(DEBUG_APP_PATH)) {
    appBundlePromise = new Promise((resolve, reject) => {
      const build = spawn(
        'npm',
        ['run', 'tauri', 'build', '--', '--debug', '--config', E2E_TAURI_CONFIG],
        {
          cwd: projectRoot,
          stdio: 'inherit',
        },
      );
      build.on('exit', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Tauri debug build failed with code ${code ?? -1}`));
        }
      });
      build.on('error', (error) => {
        reject(error);
      });
    });
  }
  return appBundlePromise ?? Promise.resolve();
}
