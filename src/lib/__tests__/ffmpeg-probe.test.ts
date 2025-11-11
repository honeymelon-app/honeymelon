import { describe, it, expect, vi, beforeEach } from 'vitest';
import { probeMedia, type ProbeResponse } from '../ffmpeg-probe';
import type { ProbeSummary } from '../types';

// Mock the Tauri invoke function
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

import { invoke } from '@tauri-apps/api/core';

describe('ffmpeg-probe', () => {
  const mockInvoke = vi.mocked(invoke);

  beforeEach(() => {
    mockInvoke.mockReset();
  });

  describe('probeMedia', () => {
    const mockProbeSummary: ProbeSummary = {
      durationSec: 120.5,
      vcodec: 'h264',
      acodec: 'aac',
      width: 1920,
      height: 1080,
    };

    const mockProbeResponse: ProbeResponse = {
      raw: {},
      summary: mockProbeSummary,
    };

    it('should probe media file with valid path', async () => {
      mockInvoke.mockResolvedValue(mockProbeResponse);

      const result = await probeMedia('/path/to/video.mp4');

      expect(mockInvoke).toHaveBeenCalledWith('probe_media', {
        path: '/path/to/video.mp4',
      });
      expect(result).toEqual(mockProbeResponse);
    });

    it('should normalize file:// URL to path', async () => {
      mockInvoke.mockResolvedValue(mockProbeResponse);

      const result = await probeMedia('file:///Users/test/video.mp4');

      expect(mockInvoke).toHaveBeenCalledWith('probe_media', {
        path: '/Users/test/video.mp4',
      });
      expect(result).toEqual(mockProbeResponse);
    });

    it('should normalize file:// URL with encoded spaces', async () => {
      mockInvoke.mockResolvedValue(mockProbeResponse);

      const result = await probeMedia('file:///Users/test/my%20video.mp4');

      expect(mockInvoke).toHaveBeenCalledWith('probe_media', {
        path: '/Users/test/my video.mp4',
      });
      expect(result).toEqual(mockProbeResponse);
    });

    it('should trim whitespace from path', async () => {
      mockInvoke.mockResolvedValue(mockProbeResponse);

      const result = await probeMedia('  /path/to/video.mp4  ');

      expect(mockInvoke).toHaveBeenCalledWith('probe_media', {
        path: '/path/to/video.mp4',
      });
      expect(result).toEqual(mockProbeResponse);
    });

    it('should normalize NFC unicode characters', async () => {
      mockInvoke.mockResolvedValue(mockProbeResponse);

      // macOS can produce decomposed unicode (NFD), we normalize to NFC
      const decomposed = '/Users/test/cafe\u0301.mp4'; // e + combining acute accent
      const result = await probeMedia(decomposed);

      expect(mockInvoke).toHaveBeenCalledWith('probe_media', {
        path: '/Users/test/café.mp4', // composed form
      });
      expect(result).toEqual(mockProbeResponse);
    });

    it('should throw error for empty path', async () => {
      await expect(probeMedia('')).rejects.toThrow('Path to probe is missing or empty');
      expect(mockInvoke).not.toHaveBeenCalled();
    });

    it('should throw error for whitespace-only path', async () => {
      await expect(probeMedia('   ')).rejects.toThrow('Path to probe is missing or empty');
      expect(mockInvoke).not.toHaveBeenCalled();
    });

    it('should handle invalid file:// URL gracefully', async () => {
      mockInvoke.mockResolvedValue(mockProbeResponse);

      // Malformed URL should be passed as-is after trim
      const result = await probeMedia('file://invalid url');

      expect(mockInvoke).toHaveBeenCalled();
      expect(result).toEqual(mockProbeResponse);
    });

    it('should propagate Tauri invoke errors', async () => {
      const error = new Error('FFprobe failed: file not found');
      mockInvoke.mockRejectedValue(error);

      await expect(probeMedia('/nonexistent/file.mp4')).rejects.toThrow(
        'FFprobe failed: file not found',
      );
    });

    it('should handle probe response with subtitle info', async () => {
      const responseWithSubs: ProbeResponse = {
        raw: {},
        summary: {
          ...mockProbeSummary,
          hasTextSubs: true,
        },
      };

      mockInvoke.mockResolvedValue(responseWithSubs);

      const result = await probeMedia('/video/with/subs.mkv');

      expect(result.summary.hasTextSubs).toBe(true);
    });

    it('should handle audio-only file', async () => {
      const audioOnlyResponse: ProbeResponse = {
        raw: {},
        summary: {
          durationSec: 180.0,
          acodec: 'mp3',
        },
      };

      mockInvoke.mockResolvedValue(audioOnlyResponse);

      const result = await probeMedia('/audio/track.mp3');

      expect(result.summary.vcodec).toBeUndefined();
      expect(result.summary.acodec).toBe('mp3');
    });

    it('should handle paths with special characters', async () => {
      mockInvoke.mockResolvedValue(mockProbeResponse);

      const specialPath = '/path/to/[video] (2024) #1.mp4';
      const result = await probeMedia(specialPath);

      expect(mockInvoke).toHaveBeenCalledWith('probe_media', {
        path: specialPath,
      });
      expect(result).toEqual(mockProbeResponse);
    });

    it('should handle very long paths', async () => {
      mockInvoke.mockResolvedValue(mockProbeResponse);

      const longPath = '/very/' + 'long/'.repeat(50) + 'path/to/video.mp4';
      const result = await probeMedia(longPath);

      expect(mockInvoke).toHaveBeenCalledWith('probe_media', {
        path: longPath,
      });
      expect(result).toEqual(mockProbeResponse);
    });
  });
});
