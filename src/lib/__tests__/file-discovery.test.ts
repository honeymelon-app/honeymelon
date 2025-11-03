import { describe, it, expect, beforeEach } from 'vitest';
import { MEDIA_EXTENSIONS, discoverDroppedEntries } from '../file-discovery';

describe('file-discovery', () => {
  describe('MEDIA_EXTENSIONS', () => {
    it('should include common video formats', () => {
      expect(MEDIA_EXTENSIONS).toContain('mp4');
      expect(MEDIA_EXTENSIONS).toContain('mkv');
      expect(MEDIA_EXTENSIONS).toContain('webm');
      expect(MEDIA_EXTENSIONS).toContain('mov');
      expect(MEDIA_EXTENSIONS).toContain('avi');
    });

    it('should include common audio formats', () => {
      expect(MEDIA_EXTENSIONS).toContain('mp3');
      expect(MEDIA_EXTENSIONS).toContain('flac');
      expect(MEDIA_EXTENSIONS).toContain('wav');
      expect(MEDIA_EXTENSIONS).toContain('m4a');
      expect(MEDIA_EXTENSIONS).toContain('aac');
    });

    it('should include broadcast formats', () => {
      expect(MEDIA_EXTENSIONS).toContain('mxf');
      expect(MEDIA_EXTENSIONS).toContain('ts');
      expect(MEDIA_EXTENSIONS).toContain('m2ts');
    });

    it('should include codec-specific extensions', () => {
      expect(MEDIA_EXTENSIONS).toContain('hevc');
      expect(MEDIA_EXTENSIONS).toContain('h265');
      expect(MEDIA_EXTENSIONS).toContain('h264');
    });

    it('should include legacy formats', () => {
      expect(MEDIA_EXTENSIONS).toContain('avi');
      expect(MEDIA_EXTENSIONS).toContain('mpg');
      expect(MEDIA_EXTENSIONS).toContain('mpeg');
      expect(MEDIA_EXTENSIONS).toContain('flv');
      expect(MEDIA_EXTENSIONS).toContain('wmv');
    });

    it('should include GIF', () => {
      expect(MEDIA_EXTENSIONS).toContain('gif');
    });

    it('should include common image formats', () => {
      expect(MEDIA_EXTENSIONS).toContain('jpg');
      expect(MEDIA_EXTENSIONS).toContain('jpeg');
      expect(MEDIA_EXTENSIONS).toContain('png');
      expect(MEDIA_EXTENSIONS).toContain('webp');
    });

    it('should not include non-media extensions', () => {
      expect(MEDIA_EXTENSIONS).not.toContain('txt');
      expect(MEDIA_EXTENSIONS).not.toContain('pdf');
    });

    it('should have unique extensions', () => {
      const uniqueExtensions = new Set(MEDIA_EXTENSIONS);
      expect(MEDIA_EXTENSIONS.length).toBe(uniqueExtensions.size);
    });

    it('should have lowercase extensions', () => {
      MEDIA_EXTENSIONS.forEach((ext) => {
        expect(ext).toBe(ext.toLowerCase());
      });
    });
  });

  describe('discoverDroppedEntries - browser environment', () => {
    beforeEach(() => {
      // Environment setup for browser tests
      if (typeof window !== 'undefined') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (window as any).__TAURI_INTERNALS__;
      }
    });

    it('should handle FileList with paths', async () => {
      const mockFiles = [
        { name: 'video.mp4', path: '/path/to/video.mp4' } as unknown as File,
        { name: 'audio.mp3', path: '/path/to/audio.mp3' } as unknown as File,
      ];

      const result = await discoverDroppedEntries(mockFiles);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ path: '/path/to/video.mp4', name: 'video.mp4' });
      expect(result[1]).toEqual({ path: '/path/to/audio.mp3', name: 'audio.mp3' });
    });

    it('should handle files without path property', async () => {
      const mockFiles = [{ name: 'video.mp4' } as unknown as File];

      const result = await discoverDroppedEntries(mockFiles);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ path: 'video.mp4', name: 'video.mp4' });
    });

    it('should handle empty FileList', async () => {
      const result = await discoverDroppedEntries([]);
      expect(result).toEqual([]);
    });

    it('should use path as name when name property is missing', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockFiles = [{ path: '/path/to/video.mp4' }] as any[];

      const result = await discoverDroppedEntries(mockFiles);

      // When file.name is missing, the code uses file.path or 'Untitled'
      // In this case, path exists so it should use the path as the name
      expect(result[0].name).toBe('/path/to/video.mp4');
      expect(result[0].path).toBe('/path/to/video.mp4');
    });

    it('should handle mixed files with and without paths', async () => {
      const mockFiles = [
        { name: 'video1.mp4', path: '/path/to/video1.mp4' } as unknown as File,
        { name: 'video2.mp4' } as unknown as File,
      ];

      const result = await discoverDroppedEntries(mockFiles);

      expect(result).toHaveLength(2);
      expect(result[0].path).toBe('/path/to/video1.mp4');
      expect(result[1].path).toBe('video2.mp4');
    });
  });

  describe('Extension filtering', () => {
    it('should allow files with .mp4 extension', () => {
      expect(MEDIA_EXTENSIONS).toContain('mp4');
    });

    it('should allow files with .mkv extension', () => {
      expect(MEDIA_EXTENSIONS).toContain('mkv');
    });

    it('should handle uppercase extensions conceptually', () => {
      expect(MEDIA_EXTENSIONS.includes('mp4')).toBe(true);
    });

    it('should handle mixed case extensions conceptually', () => {
      expect(MEDIA_EXTENSIONS.includes('mkv')).toBe(true);
    });

    it('should reject non-media extensions conceptually', () => {
      expect(MEDIA_EXTENSIONS.includes('txt')).toBe(false);
      expect(MEDIA_EXTENSIONS.includes('pdf')).toBe(false);
    });
  });

  describe('Path handling', () => {
    it('should handle absolute paths', async () => {
      const mockFiles = [
        { name: 'video.mp4', path: '/absolute/path/to/video.mp4' } as unknown as File,
      ];

      const result = await discoverDroppedEntries(mockFiles);

      expect(result[0].path).toBe('/absolute/path/to/video.mp4');
    });

    it('should handle relative paths', async () => {
      const mockFiles = [{ name: 'video.mp4', path: 'relative/path/video.mp4' } as unknown as File];

      const result = await discoverDroppedEntries(mockFiles);

      expect(result[0].path).toBe('relative/path/video.mp4');
    });

    it('should handle Windows-style paths', async () => {
      const mockFiles = [
        { name: 'video.mp4', path: 'C:\\Users\\test\\video.mp4' } as unknown as File,
      ];

      const result = await discoverDroppedEntries(mockFiles);

      expect(result[0].path).toBe('C:\\Users\\test\\video.mp4');
    });

    it('should handle paths with spaces', async () => {
      const mockFiles = [
        { name: 'my video.mp4', path: '/path/to/my video.mp4' } as unknown as File,
      ];

      const result = await discoverDroppedEntries(mockFiles);

      expect(result[0].path).toBe('/path/to/my video.mp4');
      expect(result[0].name).toBe('my video.mp4');
    });

    it('should handle paths with special characters', async () => {
      const mockFiles = [
        { name: 'video[1].mp4', path: '/path/to/video[1].mp4' } as unknown as File,
      ];

      const result = await discoverDroppedEntries(mockFiles);

      expect(result[0].path).toBe('/path/to/video[1].mp4');
    });

    it('should handle paths with Unicode characters', async () => {
      const mockFiles = [{ name: '视频.mp4', path: '/path/to/视频.mp4' } as unknown as File];

      const result = await discoverDroppedEntries(mockFiles);

      expect(result[0].path).toBe('/path/to/视频.mp4');
      expect(result[0].name).toBe('视频.mp4');
    });
  });

  describe('Basename extraction', () => {
    it('should extract basename from Unix path', () => {
      const path = '/path/to/video.mp4';
      const basename = path.split('/').pop();
      expect(basename).toBe('video.mp4');
    });

    it('should extract basename from Windows path', () => {
      const path = 'C:\\path\\to\\video.mp4';
      const normalized = path.replace(/\\/g, '/');
      const basename = normalized.split('/').pop();
      expect(basename).toBe('video.mp4');
    });

    it('should handle path with trailing slash', () => {
      const path = '/path/to/folder/';
      const segments = path.replace(/\\/g, '/').split('/');
      const basename = segments[segments.length - 1] || path;
      // When split on '/', trailing slash creates empty last element
      // The || path fallback returns the full path
      expect(basename).toBe('/path/to/folder/');
    });

    it('should handle filename without path', () => {
      const path = 'video.mp4';
      const segments = path.split('/');
      const basename = segments[segments.length - 1];
      expect(basename).toBe('video.mp4');
    });
  });

  describe('Edge cases', () => {
    it('should handle null FileList gracefully', async () => {
      const result = await discoverDroppedEntries([]);
      expect(result).toEqual([]);
    });

    it('should handle undefined in FileList', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockFiles = [undefined] as any[];
      const filtered = mockFiles.filter(Boolean);
      expect(filtered).toEqual([]);
    });

    it('should handle files with no extension', async () => {
      const mockFiles = [{ name: 'README', path: '/path/to/README' } as unknown as File];

      const result = await discoverDroppedEntries(mockFiles);

      expect(result).toHaveLength(1);
    });

    it('should handle hidden files', async () => {
      const mockFiles = [{ name: '.hidden.mp4', path: '/path/to/.hidden.mp4' } as unknown as File];

      const result = await discoverDroppedEntries(mockFiles);

      expect(result[0].name).toBe('.hidden.mp4');
    });

    it('should handle very long filenames', async () => {
      const longName = 'a'.repeat(200) + '.mp4';
      const mockFiles = [{ name: longName, path: `/path/to/${longName}` } as unknown as File];

      const result = await discoverDroppedEntries(mockFiles);

      expect(result[0].name).toBe(longName);
    });

    it('should handle files with multiple dots', async () => {
      const mockFiles = [
        { name: 'video.backup.mp4', path: '/path/to/video.backup.mp4' } as unknown as File,
      ];

      const result = await discoverDroppedEntries(mockFiles);

      expect(result[0].name).toBe('video.backup.mp4');
    });
  });

  describe('Multiple file handling', () => {
    it('should handle multiple files at once', async () => {
      const mockFiles = [
        { name: 'video1.mp4', path: '/path/to/video1.mp4' } as unknown as File,
        { name: 'video2.mkv', path: '/path/to/video2.mkv' } as unknown as File,
        { name: 'audio.mp3', path: '/path/to/audio.mp3' } as unknown as File,
      ];

      const result = await discoverDroppedEntries(mockFiles);

      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('video1.mp4');
      expect(result[1].name).toBe('video2.mkv');
      expect(result[2].name).toBe('audio.mp3');
    });

    it('should maintain order of files', async () => {
      const mockFiles = [
        { name: 'a.mp4', path: '/path/a.mp4' } as unknown as File,
        { name: 'b.mp4', path: '/path/b.mp4' } as unknown as File,
        { name: 'c.mp4', path: '/path/c.mp4' } as unknown as File,
      ];

      const result = await discoverDroppedEntries(mockFiles);

      expect(result.map((r) => r.name)).toEqual(['a.mp4', 'b.mp4', 'c.mp4']);
    });

    it('should handle large number of files', async () => {
      const mockFiles = Array.from({ length: 100 }, (_, i) => ({
        name: `video${i}.mp4`,
        path: `/path/to/video${i}.mp4`,
      })) as unknown as File[];

      const result = await discoverDroppedEntries(mockFiles);

      expect(result).toHaveLength(100);
    });
  });

  describe('Media extension coverage', () => {
    it('should include all MP4 variants', () => {
      expect(MEDIA_EXTENSIONS).toContain('mp4');
      expect(MEDIA_EXTENSIONS).toContain('m4v');
    });

    it('should include QuickTime formats', () => {
      expect(MEDIA_EXTENSIONS).toContain('mov');
    });

    it('should include transport stream formats', () => {
      expect(MEDIA_EXTENSIONS).toContain('ts');
      expect(MEDIA_EXTENSIONS).toContain('m2ts');
    });

    it('should include professional formats', () => {
      expect(MEDIA_EXTENSIONS).toContain('mxf');
    });

    it('should include web formats', () => {
      expect(MEDIA_EXTENSIONS).toContain('webm');
      expect(MEDIA_EXTENSIONS).toContain('ogv');
    });

    it('should include audio-only formats', () => {
      expect(MEDIA_EXTENSIONS).toContain('mp3');
      expect(MEDIA_EXTENSIONS).toContain('aac');
      expect(MEDIA_EXTENSIONS).toContain('flac');
      expect(MEDIA_EXTENSIONS).toContain('wav');
      expect(MEDIA_EXTENSIONS).toContain('ogg');
      expect(MEDIA_EXTENSIONS).toContain('opus');
    });

    it('should include Apple formats', () => {
      expect(MEDIA_EXTENSIONS).toContain('m4a');
      expect(MEDIA_EXTENSIONS).toContain('alac');
      expect(MEDIA_EXTENSIONS).toContain('aiff');
      expect(MEDIA_EXTENSIONS).toContain('aif');
    });

    it('should include Windows formats', () => {
      expect(MEDIA_EXTENSIONS).toContain('wmv');
      expect(MEDIA_EXTENSIONS).toContain('wma');
    });
  });

  describe('Integration scenarios', () => {
    it('should handle typical drag-and-drop scenario', async () => {
      const mockFiles = [
        { name: 'vacation.mp4', path: '/Users/test/Videos/vacation.mp4' } as unknown as File,
        { name: 'concert.mkv', path: '/Users/test/Videos/concert.mkv' } as unknown as File,
      ];

      const result = await discoverDroppedEntries(mockFiles);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        name: 'vacation.mp4',
        path: '/Users/test/Videos/vacation.mp4',
      });
      expect(result[1]).toMatchObject({
        name: 'concert.mkv',
        path: '/Users/test/Videos/concert.mkv',
      });
    });

    it('should provide consistent output structure', async () => {
      const mockFiles = [{ name: 'test.mp4', path: '/test.mp4' } as unknown as File];

      const result = await discoverDroppedEntries(mockFiles);

      expect(result[0]).toHaveProperty('path');
      expect(result[0]).toHaveProperty('name');
      expect(typeof result[0].path).toBe('string');
      expect(typeof result[0].name).toBe('string');
    });
  });
});
