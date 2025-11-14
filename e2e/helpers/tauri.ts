import { spawn, type ChildProcess } from 'child_process';
import { existsSync } from 'fs';
import { mkdir, readFile, rm, writeFile } from 'fs/promises';
import { homedir, platform } from 'os';
import { basename, join } from 'path';

import { chromium, type Page } from '@playwright/test';
import mime from 'mime-types';

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

export interface AppDataSnapshot {
  settings?: Record<string, unknown>;
  jobs?: ReadonlyArray<Record<string, unknown>>;
  license?: Record<string, unknown>;
}

const APP_IDENTIFIER = 'com.honeymelon.desktop';
const APP_DATA_DIR = join(
  homedir(),
  platform() === 'darwin' ? 'Library/Application Support' : '.tauri',
  APP_IDENTIFIER,
);

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

  // Only run on macOS
  if (platform() !== 'darwin') {
    throw new Error('Tauri app can only be tested on macOS');
  }

  const projectRoot = join(__dirname, '..', '..');
  const command = dev ? 'npm' : 'open';
  const debugArgs = ['--remote-debugging-port', debugPort.toString()];
  const args = dev
    ? ['run', 'tauri', 'dev', '--', ...debugArgs]
    : [
        '-a',
        join(projectRoot, 'src-tauri/target/release/bundle/macos/Honeymelon.app'),
        '--args',
        debugArgs.join(' '),
      ];

  const tauriProcess = spawn(command, args, {
    cwd: projectRoot,
    detached: false,
    stdio: 'pipe',
    env: {
      ...process.env,
      WEBKIT_INSPECTOR_SERVER: `127.0.0.1:${debugPort}`,
      PLAYWRIGHT_E2E: 'true',
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
  if (data.settings) {
    writes.push(writeFile(join(APP_DATA_DIR, 'preferences.json'), JSON.stringify(data.settings)));
  }

  if (data.jobs) {
    writes.push(writeFile(join(APP_DATA_DIR, 'jobs.json'), JSON.stringify(data.jobs)));
  }

  if (data.license) {
    writes.push(writeFile(join(APP_DATA_DIR, 'license.json'), JSON.stringify(data.license)));
  }

  await Promise.all(writes);
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
        type: mime.lookup(filePath) || 'application/octet-stream',
        data: buffer.toString('base64'),
      };
    }),
  );

  await page.evaluate(
    async ({ files, selector }) => {
      const target = document.querySelector(selector) ?? document.body;
      if (!target) {
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
export async function mockTauriCommands(
  page: Page,
  commandMocks: Record<string, unknown>,
): Promise<void> {
  await page.addInitScript(
    ({ commandMocks }) => {
      const pendingMocks = { ...commandMocks };
      const originalInvoke = window.__TAURI_INTERNALS__?.invoke;
      if (!originalInvoke) {
        console.warn('[mockTauriCommands] __TAURI_INTERNALS__.invoke not available');
        return;
      }

      window.__TAURI_INTERNALS__.invoke = (cmd, args) => {
        if (Object.prototype.hasOwnProperty.call(pendingMocks, cmd)) {
          return Promise.resolve(pendingMocks[cmd as keyof typeof pendingMocks]);
        }
        return originalInvoke(cmd, args);
      };
    },
    { commandMocks },
  );
}
