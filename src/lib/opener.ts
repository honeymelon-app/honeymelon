/**
 * External URL and file system opener utilities.
 *
 * Provides cross-platform helpers for opening URLs in the browser
 * and revealing files in the native file manager (Finder on macOS).
 */

import { isTauriRuntime } from '@/lib/runtime';

/**
 * Opens an external URL in the system's default browser.
 *
 * Uses Tauri's opener plugin when available, falling back to
 * window.open for web environments.
 *
 * @param url - The URL to open
 */
export async function openExternalUrl(url: string): Promise<void> {
  if (isTauriRuntime()) {
    try {
      const { openUrl } = await import('@tauri-apps/plugin-opener');
      await openUrl(url);
      return;
    } catch (error) {
      console.error('[opener] Failed to open URL via Tauri:', error);
    }
  }
  // Fallback for web or if Tauri fails
  window.open(url, '_blank');
}

/**
 * Reveals a file or directory in the system's native file manager.
 *
 * On macOS this opens Finder with the item selected.
 * Only available in Tauri runtime.
 *
 * @param path - The file system path to reveal
 */
export async function revealInFinder(path: string): Promise<void> {
  if (!isTauriRuntime()) {
    console.warn('[opener] revealInFinder is only available in Tauri runtime');
    return;
  }

  try {
    const { revealItemInDir } = await import('@tauri-apps/plugin-opener');
    await revealItemInDir(path);
  } catch (error) {
    console.error('[opener] Failed to reveal in Finder:', error);
  }
}

/**
 * Opens the macOS System Preferences to a specific pane.
 *
 * @param paneUrl - The x-apple.systempreferences URL
 */
export async function openSystemPreferences(paneUrl: string): Promise<void> {
  await openExternalUrl(paneUrl);
}
