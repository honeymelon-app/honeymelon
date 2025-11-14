import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ref } from 'vue';

import { useFileHandler } from '../use-file-handler';
import type { Preset } from '@/lib/types';

const discoverDroppedEntriesMock = vi.fn();
const inferContainerFromPathMock = vi.fn();
const mediaKindForContainerMock = vi.fn();
const invokeMock = vi.fn();
const useJobsStoreMock = vi.fn();

vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => invokeMock(...args),
}));

vi.mock('@/lib/media-formats', () => ({
  inferContainerFromPath: (...args: unknown[]) => inferContainerFromPathMock(...args),
  mediaKindForContainer: (...args: unknown[]) => mediaKindForContainerMock(...args),
}));

vi.mock('@/lib/file-discovery', () => ({
  discoverDroppedEntries: (...args: unknown[]) => discoverDroppedEntriesMock(...args),
}));

vi.mock('@/stores/jobs', () => ({
  useJobsStore: (...args: unknown[]) => useJobsStoreMock(...args),
}));

function buildPreset(overrides: Partial<Preset> = {}): Preset {
  return {
    id: 'preset-base',
    label: 'Preset Base',
    container: 'mp4',
    mediaKind: 'video',
    sourceContainers: [],
    video: { codec: 'h264' },
    audio: { codec: 'aac' },
    subs: { mode: 'keep' },
    ...overrides,
  };
}

describe('useFileHandler', () => {
  const jobsStore = {
    enqueue: vi.fn(),
  };

  beforeEach(() => {
    discoverDroppedEntriesMock.mockReset();
    inferContainerFromPathMock.mockReset();
    mediaKindForContainerMock.mockReset();
    invokeMock.mockReset();
    jobsStore.enqueue.mockReset();
    useJobsStoreMock.mockReturnValue(jobsStore);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('detects tauri runtime when internals are present', () => {
    const options = {
      presetOptions: ref<Preset[]>([buildPreset()]),
      defaultPresetId: ref('preset-base'),
      presetsReady: ref(true),
    };
    const handler = useFileHandler(options);
    expect(handler.isTauriRuntime()).toBe(false);

    (window as unknown as { __TAURI_INTERNALS__?: Record<string, unknown> }).__TAURI_INTERNALS__ =
      {};
    expect(handler.isTauriRuntime()).toBe(true);
    delete (window as unknown as { __TAURI_INTERNALS__?: Record<string, unknown> })
      .__TAURI_INTERNALS__;
  });

  it('filters presets by detected container and media kind', () => {
    const audioPreset = buildPreset({
      id: 'audio',
      container: 'mp3',
      mediaKind: 'audio',
      sourceContainers: ['mp3'],
      video: { codec: 'none' },
    });
    const videoPreset = buildPreset({
      id: 'video',
      container: 'mp4',
      mediaKind: 'video',
      sourceContainers: ['mp4'],
    });
    const options = {
      presetOptions: ref<Preset[]>([audioPreset, videoPreset]),
      defaultPresetId: ref('video'),
      presetsReady: ref(true),
    };

    inferContainerFromPathMock.mockReturnValue('mp3');
    mediaKindForContainerMock.mockReturnValue('audio');

    const handler = useFileHandler(options);
    const presets = handler.presetsForPath('track.mp3');
    expect(presets).toEqual([audioPreset]);
  });

  it('adds files using discovered entries and enqueues jobs with default preset fallback', async () => {
    const audioPreset = buildPreset({
      id: 'audio',
      container: 'mp3',
      mediaKind: 'audio',
      sourceContainers: ['mp3'],
      video: { codec: 'none' },
    });
    const fallbackPreset = buildPreset({
      id: 'fallback',
      mediaKind: 'audio',
      container: 'mp3',
      sourceContainers: [],
    });
    const options = {
      presetOptions: ref<Preset[]>([audioPreset, fallbackPreset]),
      defaultPresetId: ref('fallback'),
      presetsReady: ref(true),
    };

    discoverDroppedEntriesMock.mockResolvedValue([
      { path: 'song-one.mp3' },
      { path: '  ' },
      { path: 'song-two.mp3' },
    ]);
    inferContainerFromPathMock.mockReturnValue('mp3');
    mediaKindForContainerMock.mockReturnValue('audio');
    jobsStore.enqueue.mockImplementation(() => 'job-id');

    const handler = useFileHandler(options);
    await handler.addFiles({} as FileList);

    expect(discoverDroppedEntriesMock).toHaveBeenCalled();
    expect(jobsStore.enqueue).toHaveBeenCalledTimes(2);
    expect(jobsStore.enqueue).toHaveBeenCalledWith('song-one.mp3', 'audio');
    expect(jobsStore.enqueue).toHaveBeenCalledWith('song-two.mp3', 'audio');
  });

  it('logs when presets are not ready during addFiles', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const options = {
      presetOptions: ref<Preset[]>([]),
      defaultPresetId: ref('any'),
      presetsReady: ref(false),
    };

    const handler = useFileHandler(options);
    await handler.addFiles({} as FileList);
    expect(discoverDroppedEntriesMock).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      '[file-handler] Presets not ready yet; ignoring file input right now.',
    );
    warnSpy.mockRestore();
  });

  it('expands paths when browsing via tauri runtime', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const options = {
      presetOptions: ref<Preset[]>([buildPreset({ id: 'preset', container: 'mp4' })]),
      defaultPresetId: ref('preset'),
      presetsReady: ref(true),
    };

    discoverDroppedEntriesMock.mockResolvedValue([]);
    inferContainerFromPathMock.mockReturnValue('mp4');
    mediaKindForContainerMock.mockReturnValue('video');

    invokeMock.mockImplementation(async (command: string, payload?: { paths?: string[] }) => {
      if (command === 'pick_media_files') {
        return ['clip-one.mp4'];
      }
      if (command === 'expand_media_paths') {
        return payload?.paths ?? [];
      }
      return [];
    });

    jobsStore.enqueue.mockImplementation(() => 'job-id');

    (window as unknown as { __TAURI_INTERNALS__?: Record<string, unknown> }).__TAURI_INTERNALS__ =
      {};

    const handler = useFileHandler(options);
    await handler.browseForFiles('video');

    expect(invokeMock).toHaveBeenCalledWith('pick_media_files', { mediaKind: 'video' });
    expect(invokeMock).toHaveBeenCalledWith('expand_media_paths', { paths: ['clip-one.mp4'] });
    expect(jobsStore.enqueue).toHaveBeenCalledWith('clip-one.mp4', 'preset');

    delete (window as unknown as { __TAURI_INTERNALS__?: Record<string, unknown> })
      .__TAURI_INTERNALS__;
    warnSpy.mockRestore();
  });

  it('skips empty path arrays in addFilesFromPaths', async () => {
    const options = {
      presetOptions: ref<Preset[]>([
        buildPreset({ id: 'preset', mediaKind: 'audio', container: 'mp3', sourceContainers: [] }),
      ]),
      defaultPresetId: ref('preset'),
      presetsReady: ref(true),
    };

    const handler = useFileHandler(options);
    await handler.addFilesFromPaths(['', '   ']);
    expect(invokeMock).not.toHaveBeenCalled();
    expect(jobsStore.enqueue).not.toHaveBeenCalled();
  });

  it('falls back to first available preset when preferred id is unavailable', () => {
    const options = {
      presetOptions: ref<Preset[]>([
        buildPreset({ id: 'first', container: 'mp4', sourceContainers: [] }),
        buildPreset({ id: 'second', container: 'mp4', sourceContainers: [] }),
      ]),
      defaultPresetId: ref('missing'),
      presetsReady: ref(true),
    };

    const handler = useFileHandler(options);
    expect(handler.ensureUsablePresetId('missing')).toBe('first');

    options.presetsReady.value = false;
    expect(handler.ensureUsablePresetId('second')).toBeNull();
  });

  it('selects the global fallback preset when no presets match a path', () => {
    const audioPreset = buildPreset({
      id: 'audio-only',
      mediaKind: 'audio',
      container: 'mp3',
      sourceContainers: ['mp3'],
      video: { codec: 'none' },
    });
    const options = {
      presetOptions: ref<Preset[]>([audioPreset]),
      defaultPresetId: ref('audio-only'),
      presetsReady: ref(true),
    };

    inferContainerFromPathMock.mockReturnValue('gif');
    mediaKindForContainerMock.mockReturnValue('video');

    const handler = useFileHandler(options);
    const presetId = handler.selectDefaultPresetForPath('animation.gif');
    expect(presetId).toBe('audio-only');
  });

  it('deduplicates expanded paths when alreadyExpanded is true', async () => {
    const options = {
      presetOptions: ref<Preset[]>([
        buildPreset({ id: 'video', container: 'mp4', mediaKind: 'video', sourceContainers: [] }),
      ]),
      defaultPresetId: ref('video'),
      presetsReady: ref(true),
    };

    inferContainerFromPathMock.mockReturnValue('mp4');
    mediaKindForContainerMock.mockReturnValue('video');
    jobsStore.enqueue.mockImplementation(() => 'job-id');

    const handler = useFileHandler(options);
    await handler.addFilesFromPaths(['clip.mp4', 'clip.mp4'], { alreadyExpanded: true });

    expect(invokeMock).not.toHaveBeenCalledWith('expand_media_paths', expect.anything());
    expect(jobsStore.enqueue).toHaveBeenCalledTimes(1);
    expect(jobsStore.enqueue).toHaveBeenCalledWith('clip.mp4', 'video');
  });
});
