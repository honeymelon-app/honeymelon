/**
 * Semantic Release Plugin for version synchronization
 *
 * This plugin is a custom prepare step that synchronizes versions across
 * all project manifests (package.json, Cargo.toml, tauri.conf.json) before
 * the release is created.
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Prepare step: Synchronize versions across all files
 */
export async function prepare(pluginConfig, context) {
  const { nextRelease } = context;
  const { versionScript = 'scripts/update-version.js' } = pluginConfig;

  return new Promise((resolve, reject) => {
    const scriptPath = path.resolve(__dirname, '..', versionScript);
    const version = nextRelease.version;

    // Run the version update script
    const proc = spawn('node', [scriptPath, version], {
      stdio: 'inherit',
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Version update script exited with code ${code}`));
      }
    });

    proc.on('error', (err) => {
      reject(err);
    });
  });
}
