import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Preset } from '@/lib/types';

const FIXED_TIMESTAMP = 1_700_000_000_000;
let idCounter = 0;

vi.mock('@/stores/job-types', () => ({
  createJobId: vi.fn(() => `job-${++idCounter}`),
  now: vi.fn(() => FIXED_TIMESTAMP),
}));

import { JobFactory } from '@/factories/job-factory';
import { createJobId, now } from '@/stores/job-types';

function buildPreset(overrides: Partial<Preset> = {}): Preset {
  const base: Preset = {
    id: 'preset-h264',
    label: 'H.264 Balanced',
    container: 'mp4',
    mediaKind: 'video',
    sourceContainers: ['mp4', 'mkv'],
    video: { codec: 'h264' },
    audio: { codec: 'aac' },
  };

  return {
    ...base,
    ...overrides,
    video: {
      ...base.video,
      ...overrides.video,
    },
    audio: {
      ...base.audio,
      ...overrides.audio,
    },
  };
}

beforeEach(() => {
  idCounter = 0;
  vi.mocked(createJobId).mockClear();
  vi.mocked(now).mockClear();
});

describe('JobFactory.create', () => {
  it('initializes queue metadata and respects explicit tier', () => {
    const preset = buildPreset();

    const record = JobFactory.create('/tmp/input.mp4', preset, 'high');

    expect(record).toEqual({
      id: 'job-1',
      path: '/tmp/input.mp4',
      presetId: 'preset-h264',
      tier: 'high',
      state: {
        status: 'queued',
        enqueuedAt: FIXED_TIMESTAMP,
      },
      exclusive: false,
      createdAt: FIXED_TIMESTAMP,
      updatedAt: FIXED_TIMESTAMP,
    });
    expect(createJobId).toHaveBeenCalledTimes(1);
    expect(now).toHaveBeenCalledTimes(1);
  });

  it('defaults to balanced tier when none is provided', () => {
    const preset = buildPreset();

    const record = JobFactory.create('/tmp/default.mp4', preset);

    expect(record.tier).toBe('balanced');
  });

  it.each([['av1'], ['prores']])('marks %s presets as exclusive', (codec) => {
    const preset = buildPreset({
      id: `preset-${codec}`,
      video: { codec: codec as Preset['video']['codec'] },
    });

    const record = JobFactory.create('/tmp/exclusive.mov', preset);

    expect(record.exclusive).toBe(true);
  });
});

describe('JobFactory.createMany', () => {
  it('creates a job per path and preserves tier', () => {
    const preset = buildPreset({ id: 'preset-hevc', video: { codec: 'hevc' } });

    const records = JobFactory.createMany(['/tmp/a.mov', '/tmp/b.mov'], preset, 'fast');

    expect(records).toHaveLength(2);
    expect(records.map((record) => record.id)).toEqual(['job-1', 'job-2']);
    expect(records.map((record) => record.path)).toEqual(['/tmp/a.mov', '/tmp/b.mov']);
    expect(records.every((record) => record.tier === 'fast')).toBe(true);
  });
});
