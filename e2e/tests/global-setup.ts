import { existsSync, readFileSync } from 'fs';
import { copyFile, mkdir, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { basename, join } from 'path';

import { createTestFixtureSet } from '../helpers/media-fixtures';

const FIXTURE_ENV_KEY = 'E2E_FIXTURE_MANIFEST';

export default async function globalSetup(): Promise<void> {
  const fixtureSet = await createTestFixtureSet();
  const cacheDir = join(tmpdir(), 'honeymelon-playwright-fixtures');
  await mkdir(cacheDir, { recursive: true });

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
