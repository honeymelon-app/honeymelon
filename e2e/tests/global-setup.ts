import { existsSync, readFileSync } from 'fs';
import { copyFile, mkdir, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { basename, join } from 'path';

import { createTestFixtureSet } from '../helpers/media-fixtures';

const FIXTURE_ENV_KEY = 'E2E_FIXTURE_MANIFEST';

/**
 * Global setup for Playwright E2E tests.
 *
 * This function runs before all tests and creates test media fixtures
 * using FFmpeg. The fixtures are stored in a temporary directory and
 * their paths are written to a manifest file for tests to use.
 *
 * In CI environments without FFmpeg, the setup will skip fixture creation
 * and tests that require media files will use placeholder data.
 */
export default async function globalSetup(): Promise<void> {
  const cacheDir = join(tmpdir(), 'honeymelon-playwright-fixtures');
  await mkdir(cacheDir, { recursive: true });

  // Check if FFmpeg is available
  const ffmpegAvailable = await checkFfmpegAvailable();

  if (!ffmpegAvailable) {
    console.log('[Global Setup] FFmpeg not available, creating placeholder fixtures');
    const manifest = await createPlaceholderFixtures(cacheDir);
    const manifestPath = join(cacheDir, 'manifest.json');
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
    process.env[FIXTURE_ENV_KEY] = manifestPath;
    return;
  }

  try {
    const fixtureSet = await createTestFixtureSet();
    const manifest: Record<string, Record<string, string>> = {
      video: {},
      audio: {},
      image: {},
      invalid: {},
    };

    const copy = async (category: keyof typeof fixtureSet, key: string, source: string) => {
      const fileName = `${category}-${key}-${basename(source)}`;
      const destination = join(cacheDir, fileName);
      await copyFile(source, destination);
      manifest[category][key] = destination;
    };

    await Promise.all([
      copy('video', 'h264', fixtureSet.video.h264),
      copy('video', 'hevc', fixtureSet.video.hevc),
      copy('video', 'noAudio', fixtureSet.video.noAudio),
      copy('video', 'multiAudio', fixtureSet.video.multiAudio),
      copy('video', 'withSubtitles', fixtureSet.video.withSubtitles),
      copy('audio', 'aac', fixtureSet.audio.aac),
      copy('audio', 'mp3', fixtureSet.audio.mp3),
      copy('image', 'png', fixtureSet.image.png),
      copy('image', 'jpeg', fixtureSet.image.jpeg),
      copy('invalid', 'corrupted', fixtureSet.invalid.corrupted),
      copy('invalid', 'empty', fixtureSet.invalid.empty),
    ]);

    const manifestPath = join(cacheDir, 'manifest.json');
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
    process.env[FIXTURE_ENV_KEY] = manifestPath;
  } catch (error) {
    console.log('[Global Setup] Error creating fixtures, using placeholders:', error);
    const manifest = await createPlaceholderFixtures(cacheDir);
    const manifestPath = join(cacheDir, 'manifest.json');
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
    process.env[FIXTURE_ENV_KEY] = manifestPath;
  }
}

export function loadFixtureManifest(): Record<string, Record<string, string>> | undefined {
  const manifestPath = process.env[FIXTURE_ENV_KEY];
  if (!manifestPath) {
    return undefined;
  }
  if (!existsSync(manifestPath)) {
    return undefined;
  }
  return JSON.parse(readFileSync(manifestPath, 'utf8'));
}

/**
 * Check if FFmpeg is available in the system
 */
async function checkFfmpegAvailable(): Promise<boolean> {
  const { spawn } = await import('child_process');
  return new Promise((resolve) => {
    const proc = spawn('ffmpeg', ['-version']);
    let settled = false;
    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        try {
          proc.kill();
        } catch {
          // Process may already be dead, ignore error
        }
        resolve(false);
      }
    }, 5000);
    proc.on('error', () => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        resolve(false);
      }
    });
    proc.on('close', (code) => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        resolve(code === 0);
      }
    });
  });
}

/**
 * Create placeholder fixture files for environments without FFmpeg
 */
async function createPlaceholderFixtures(
  cacheDir: string,
): Promise<Record<string, Record<string, string>>> {
  const manifest: Record<string, Record<string, string>> = {
    video: {},
    audio: {},
    image: {},
    invalid: {},
  };

  // Create simple placeholder files
  const createPlaceholder = async (category: string, key: string, ext: string) => {
    const fileName = `${category}-${key}-placeholder.${ext}`;
    const filePath = join(cacheDir, fileName);
    // Create a minimal file with some content
    await writeFile(filePath, `placeholder-${category}-${key}`);
    manifest[category][key] = filePath;
  };

  await Promise.all([
    createPlaceholder('video', 'h264', 'mp4'),
    createPlaceholder('video', 'hevc', 'mp4'),
    createPlaceholder('video', 'noAudio', 'mp4'),
    createPlaceholder('video', 'multiAudio', 'mp4'),
    createPlaceholder('video', 'withSubtitles', 'mp4'),
    createPlaceholder('audio', 'aac', 'm4a'),
    createPlaceholder('audio', 'mp3', 'mp3'),
    createPlaceholder('image', 'png', 'png'),
    createPlaceholder('image', 'jpeg', 'jpg'),
    createPlaceholder('invalid', 'corrupted', 'mp4'),
    createPlaceholder('invalid', 'empty', 'mp4'),
  ]);

  return manifest;
}
