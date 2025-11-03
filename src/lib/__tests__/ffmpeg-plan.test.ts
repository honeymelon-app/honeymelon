import { describe, it, expect } from 'vitest';

import { listSupportedPresets, planJob, resolvePreset, type PlannerContext } from '../ffmpeg-plan';
import { PRESETS } from '../presets';
import type { CapabilitySnapshot, ProbeSummary } from '../types';

const baseSummary: ProbeSummary = {
  durationSec: 120,
  width: 1920,
  height: 1080,
  fps: 30,
  vcodec: 'h264',
  acodec: 'aac',
};

const emptyCapabilities: CapabilitySnapshot = {
  videoEncoders: new Set(),
  audioEncoders: new Set(),
  formats: new Set(),
  filters: new Set(),
};

describe('ffmpeg-plan', () => {
  it('resolves presets by ID', () => {
    const preset = resolvePreset('video-to-mkv');
    expect(preset).toBeDefined();
    expect(preset?.mediaKind).toBe('video');
  });

  it('lists supported presets when capabilities are unrestricted', () => {
    const presets = listSupportedPresets(emptyCapabilities);
    expect(presets.length).toBeGreaterThan(0);
  });

  it('returns the same presets regardless of reported encoders', () => {
    const capabilities: CapabilitySnapshot = {
      ...emptyCapabilities,
      videoEncoders: new Set(['h264_videotoolbox']),
      audioEncoders: new Set(['aac']),
    };
    const presets = listSupportedPresets(capabilities);
    expect(presets.length).toBe(PRESETS.length);
  });

  it('plans a remux when source and target codecs align', () => {
    const context: PlannerContext = {
      presetId: 'video-to-mkv',
      summary: baseSummary,
    };
    const decision = planJob(context);
    expect(decision.remuxOnly).toBe(true);
    expect(decision.ffmpegArgs).toContain('-c:v');
    expect(decision.ffmpegArgs).toContain('copy');
  });

  it('plans a transcode when target container requires different codecs', () => {
    const context: PlannerContext = {
      presetId: 'video-to-mp4',
      summary: { ...baseSummary, vcodec: 'vp9', acodec: 'opus' },
    };
    const decision = planJob(context);
    expect(decision.ffmpegArgs).toContain('-c:v');
    expect(decision.ffmpegArgs).toContain('libx264');
    expect(decision.ffmpegArgs).toContain('-c:a');
    expect(decision.ffmpegArgs).toContain('aac');
  });

  it('builds the GIF pipeline for gif outputs', () => {
    const context: PlannerContext = {
      presetId: 'video-to-gif',
      summary: baseSummary,
    };
    const decision = planJob(context);
    expect(decision.ffmpegArgs).toContain('-filter_complex');
    expect(decision.ffmpegArgs.some((arg) => arg.includes('palettegen'))).toBe(true);
    expect(decision.ffmpegArgs).toContain('-loop');
    expect(decision.ffmpegArgs).toContain('0');
  });

  it('handles audio conversions', () => {
    const context: PlannerContext = {
      presetId: 'audio-to-mp3',
      summary: {
        durationSec: 180,
        acodec: 'flac',
      },
    };
    const decision = planJob(context);
    expect(decision.ffmpegArgs).toContain('-c:a');
    expect(decision.ffmpegArgs).toContain('libmp3lame');
  });

  it('falls back to default preset when unknown id is supplied', () => {
    const fallback = PRESETS[0];
    expect(fallback).toBeDefined();

    const decision = planJob({
      presetId: 'unknown-preset',
      summary: baseSummary,
    });
    expect(decision.preset.id).toBe(fallback.id);
  });

  it('builds image conversion plans', () => {
    const context: PlannerContext = {
      presetId: 'image-to-png',
      summary: { ...baseSummary, vcodec: 'jpg', acodec: undefined },
      capabilities: {
        ...emptyCapabilities,
        videoEncoders: new Set(['png']),
      },
    };
    const decision = planJob(context);
    expect(decision.preset.mediaKind).toBe('image');
    expect(decision.ffmpegArgs).toContain('-c:v');
    expect(decision.ffmpegArgs).toContain('png');
    expect(decision.ffmpegArgs).toContain('-frames:v');
    expect(decision.ffmpegArgs).toContain('1');
  });
});
