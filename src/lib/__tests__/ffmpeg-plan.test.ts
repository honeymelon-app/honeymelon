import { describe, it, expect } from 'vitest';

import { listSupportedPresets, planJob, resolvePreset, type PlannerContext } from '../ffmpeg-plan';
import { CONTAINER_RULES } from '../container-rules';
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
    expect(decision.ffmpegArgs).toContain('-progress');
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
    expect(decision.ffmpegArgs).toContain('-progress');
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
    expect(decision.ffmpegArgs).toContain('-progress');
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

  it('warns when expected video streams are missing', () => {
    const decision = planJob({
      presetId: 'video-to-mp4',
      summary: { durationSec: 45, acodec: 'aac' },
    });

    expect(decision.remuxOnly).toBe(false);
    expect(decision.warnings).toContain('Input contains no video stream; output will omit video.');
  });

  it('warns when container rules reject preset codecs', () => {
    const mp4Rules = CONTAINER_RULES.mp4;
    const originalVideo = mp4Rules.video;
    const originalAudio = mp4Rules.audio;

    try {
      mp4Rules.video = ['vp9'];
      mp4Rules.audio = ['opus'];

      const decision = planJob({
        presetId: 'video-to-mp4',
        summary: baseSummary,
      });

      expect(decision.warnings).toContain('Target container mp4 does not allow video codec h264.');
      expect(decision.warnings).toContain('Target container mp4 does not allow audio codec aac.');
    } finally {
      mp4Rules.video = originalVideo;
      mp4Rules.audio = originalAudio;
    }
  });

  it('notes tier fallbacks when requested tier data is missing', () => {
    const preset = PRESETS.find((item) => item.id === 'video-to-mp4');
    expect(preset).toBeDefined();
    if (!preset) return;

    const originalVideoTiers = preset.video.tiers;
    const originalAudioTiers = preset.audio.tiers;

    preset.video.tiers = {
      fast: {
        bitrateK: 2800,
      },
    };
    preset.audio.tiers = {
      fast: {
        bitrateK: 192,
      },
    };

    try {
      const decision = planJob({
        presetId: preset.id,
        summary: baseSummary,
        requestedTier: 'high',
      });

      expect(decision.notes).toContain('Video tier fallback applied: using fast.');
      expect(decision.notes).toContain('Audio tier fallback applied: using fast.');
    } finally {
      preset.video.tiers = originalVideoTiers;
      preset.audio.tiers = originalAudioTiers;
    }
  });

  it('warns when selected encoders are missing from reported capabilities', () => {
    const decision = planJob({
      presetId: 'video-to-mp4',
      summary: { ...baseSummary, vcodec: 'vp9', acodec: 'opus' },
      capabilities: {
        videoEncoders: new Set(),
        audioEncoders: new Set(['aac']),
        formats: new Set(),
        filters: new Set(),
      },
    });

    expect(decision.warnings).toContain(
      'Encoder libx264 for h264 is not available; transcode may fail.',
    );
  });
});
