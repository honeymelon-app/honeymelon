import { spawn, type ChildProcess } from 'child_process';
import { platform } from 'os';
import { join } from 'path';

import type { Page } from '@playwright/test';

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

interface DevtoolsTarget {
  id?: string;
  title?: string;
  type?: string;
  url?: string;
  webSocketDebuggerUrl?: string;
  [key: string]: unknown;
}

export interface AppDataSnapshot {
  settings?: Record<string, unknown>;
  jobs?: ReadonlyArray<Record<string, unknown>>;
  license?: Record<string, unknown>;
}

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
  const args = dev
    ? ['run', 'tauri', 'dev', '--', '--remote-debugging-port', debugPort.toString()]
    : ['-a', join(projectRoot, 'src-tauri/target/release/bundle/macos/Honeymelon.app')];

  const tauriProcess = spawn(command, args, {
    cwd: projectRoot,
    detached: false,
    stdio: 'pipe',
    env: {
      ...process.env,
      ...env,
      WEBKIT_INSPECTOR_SERVER: `127.0.0.1:${debugPort}`,
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
export async function connectToTauriWebView(page: Page, app: TauriApp): Promise<void> {
  // Get list of available targets
  const response = await fetch(`${app.getDebugUrl()}/json/list`);
  const targets = (await response.json()) as DevtoolsTarget[];

  if (!Array.isArray(targets) || targets.length === 0) {
    throw new Error('No WebView targets reported by Tauri');
  }

  // Find the main WebView target (usually the first one)
  const mainTarget = targets.find((target) => target.type === 'page') ?? targets[0];

  if (!mainTarget || typeof mainTarget.webSocketDebuggerUrl !== 'string') {
    throw new Error('No WebView target with a debugger URL found');
  }

  // Connect to the WebView using Chrome DevTools Protocol
  await page.goto(mainTarget.webSocketDebuggerUrl);
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
  // On macOS, Tauri stores data in ~/Library/Application Support/com.honeymelon.app
  // This would need to be implemented based on actual app identifier
  // For now, this is a placeholder
  // In a real implementation:
  // 1. Determine app data directory
  // 2. Remove settings files
  // 3. Remove job queue storage
  // 4. Remove license data
  // 5. Remove logs (optional)
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
  // Placeholder: Would write data to app's storage location
  // Implementation depends on where Tauri stores app data
  void data;
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
export async function simulateFileDrop(page: Page, filePaths: string[]): Promise<void> {
  // Placeholder: Would simulate drag-and-drop of files into the app
  // This requires injecting JavaScript into the WebView to trigger drop events
  // Implementation depends on how the app handles file drops (HTML5 DnD API vs Tauri's file-drop plugin)
  void page;
  void filePaths;
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
  // Placeholder: Would inject code to intercept Tauri invoke calls
  // This would require understanding Tauri's IPC mechanism and injecting
  // JavaScript to override the __TAURI__ global object
  void page;
  void commandMocks;
}
