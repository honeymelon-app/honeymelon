/**
 * Runtime environment detection utilities.
 *
 * Provides centralized checks for the execution environment to avoid
 * duplicating these checks across multiple files.
 */

/**
 * Checks if running in a Tauri desktop environment.
 *
 * @returns true if the Tauri runtime internals are available
 */
export function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

/**
 * Checks if running in E2E simulation mode.
 *
 * @returns true if the VITE_E2E_SIMULATION env var is set to 'true'
 */
export function isE2ESimulation(): boolean {
  return import.meta.env.VITE_E2E_SIMULATION === 'true';
}

/**
 * Checks if development mode is enabled.
 *
 * @returns true if running in development mode
 */
export function isDevelopmentMode(): boolean {
  return import.meta.env.DEV === true;
}
