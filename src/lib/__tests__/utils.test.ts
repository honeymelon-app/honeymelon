import { describe, it, expect } from 'vitest';
import {
  normalizePath,
  pathDirname,
  pathBasename,
  stripExtension,
  joinPath,
  formatFileSize,
  formatDuration,
  getFileExtension,
} from '../utils';

describe('utils', () => {
  describe('normalizePath', () => {
    it('should convert backslashes to forward slashes', () => {
      expect(normalizePath('C:\\Users\\test\\file.txt')).toBe('C:/Users/test/file.txt');
    });

    it('should handle multiple consecutive backslashes', () => {
      expect(normalizePath('path\\\\to\\\\file')).toBe('path/to/file');
    });

    it('should handle mixed slashes', () => {
      expect(normalizePath('path\\to/file')).toBe('path/to/file');
    });

    it('should handle already normalized paths', () => {
      expect(normalizePath('/usr/local/bin')).toBe('/usr/local/bin');
    });

    it('should handle empty string', () => {
      expect(normalizePath('')).toBe('');
    });
  });

  describe('pathDirname', () => {
    it('should extract directory from absolute path', () => {
      expect(pathDirname('/Users/test/file.txt')).toBe('/Users/test');
    });

    it('should extract directory from nested path', () => {
      expect(pathDirname('/a/b/c/d.txt')).toBe('/a/b/c');
    });

    it('should return / for root-level file', () => {
      expect(pathDirname('/file.txt')).toBe('/');
    });

    it('should return empty string for filename without path', () => {
      expect(pathDirname('file.txt')).toBe('');
    });

    it('should handle trailing slashes', () => {
      expect(pathDirname('/Users/test/folder/')).toBe('/Users/test');
    });

    it('should handle empty string', () => {
      expect(pathDirname('')).toBe('');
    });

    it('should handle multiple consecutive slashes', () => {
      expect(pathDirname('/Users//test///file.txt')).toBe('/Users/test');
    });

    it('should handle Windows-style paths', () => {
      expect(pathDirname('C:\\Users\\test\\file.txt')).toBe('C:/Users/test');
    });
  });

  describe('pathBasename', () => {
    it('should extract filename from absolute path', () => {
      expect(pathBasename('/Users/test/file.txt')).toBe('file.txt');
    });

    it('should return filename from path without directory', () => {
      expect(pathBasename('file.txt')).toBe('file.txt');
    });

    it('should handle trailing slashes', () => {
      expect(pathBasename('/Users/test/folder/')).toBe('folder');
    });

    it('should handle empty string', () => {
      expect(pathBasename('')).toBe('');
    });

    it('should handle root path', () => {
      expect(pathBasename('/')).toBe('');
    });

    it('should handle filename with multiple dots', () => {
      expect(pathBasename('/path/to/file.tar.gz')).toBe('file.tar.gz');
    });

    it('should handle Windows-style paths', () => {
      expect(pathBasename('C:\\Users\\test\\file.txt')).toBe('file.txt');
    });
  });

  describe('stripExtension', () => {
    it('should remove file extension', () => {
      expect(stripExtension('/Users/test/file.txt')).toBe('/Users/test/file');
    });

    it('should handle files without extension', () => {
      expect(stripExtension('/Users/test/file')).toBe('/Users/test/file');
    });

    it('should handle multiple dots in filename', () => {
      expect(stripExtension('/path/to/file.tar.gz')).toBe('/path/to/file.tar');
    });

    it('should handle hidden files', () => {
      expect(stripExtension('/path/to/.gitignore')).toBe('/path/to/.gitignore');
    });

    it('should handle filename without path', () => {
      expect(stripExtension('file.txt')).toBe('file');
    });

    it('should handle empty string', () => {
      expect(stripExtension('')).toBe('');
    });

    it('should handle dot at the beginning', () => {
      expect(stripExtension('.bashrc')).toBe('.bashrc');
    });

    it('should preserve directory structure', () => {
      expect(stripExtension('/a/b/c/file.mp4')).toBe('/a/b/c/file');
    });

    it('should handle Windows-style paths', () => {
      expect(stripExtension('C:\\Users\\test\\file.txt')).toBe('C:/Users/test/file');
    });
  });

  describe('joinPath', () => {
    it('should join two path segments', () => {
      expect(joinPath('/Users/test', 'file.txt')).toBe('/Users/test/file.txt');
    });

    it('should join multiple path segments', () => {
      expect(joinPath('/Users', 'test', 'documents', 'file.txt')).toBe(
        '/Users/test/documents/file.txt',
      );
    });

    it('should handle trailing slashes', () => {
      expect(joinPath('/Users/test/', 'file.txt')).toBe('/Users/test/file.txt');
    });

    it('should handle leading slashes in segments', () => {
      expect(joinPath('/Users/test', '/file.txt')).toBe('/Users/test/file.txt');
    });

    it('should filter out undefined segments', () => {
      expect(joinPath('/Users', undefined, 'test', 'file.txt')).toBe('/Users/test/file.txt');
    });

    it('should filter out null segments', () => {
      expect(joinPath('/Users', null, 'test', 'file.txt')).toBe('/Users/test/file.txt');
    });

    it('should filter out empty string segments', () => {
      expect(joinPath('/Users', '', 'test', 'file.txt')).toBe('/Users/test/file.txt');
    });

    it('should return empty string for all empty inputs', () => {
      expect(joinPath('', undefined, null)).toBe('');
    });

    it('should handle single segment', () => {
      expect(joinPath('/Users/test')).toBe('/Users/test');
    });

    it('should normalize multiple slashes', () => {
      expect(joinPath('/Users//test', 'file.txt')).toBe('/Users/test/file.txt');
    });

    it('should handle Windows-style paths', () => {
      expect(joinPath('C:\\Users\\test', 'file.txt')).toBe('C:/Users/test/file.txt');
    });

    it('should handle relative paths', () => {
      expect(joinPath('relative', 'path', 'file.txt')).toBe('relative/path/file.txt');
    });
  });

  describe('formatFileSize', () => {
    it('should format zero bytes', () => {
      expect(formatFileSize(0)).toBe('0 B');
    });

    it('should format bytes', () => {
      expect(formatFileSize(100)).toBe('100 B');
      expect(formatFileSize(1023)).toBe('1023 B');
    });

    it('should format kilobytes', () => {
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1536)).toBe('1.5 KB');
      expect(formatFileSize(10240)).toBe('10 KB');
    });

    it('should format megabytes', () => {
      expect(formatFileSize(1048576)).toBe('1 MB');
      expect(formatFileSize(1572864)).toBe('1.5 MB');
      expect(formatFileSize(10485760)).toBe('10 MB');
    });

    it('should format gigabytes', () => {
      expect(formatFileSize(1073741824)).toBe('1 GB');
      expect(formatFileSize(1610612736)).toBe('1.5 GB');
      expect(formatFileSize(10737418240)).toBe('10 GB');
    });

    it('should format terabytes', () => {
      expect(formatFileSize(1099511627776)).toBe('1 TB');
      expect(formatFileSize(1649267441664)).toBe('1.5 TB');
    });

    it('should round to one decimal place', () => {
      expect(formatFileSize(1126)).toMatch(/^1\.\d KB$/);
      expect(formatFileSize(1536000)).toMatch(/^1\.\d MB$/);
    });

    it('should handle large numbers', () => {
      const result = formatFileSize(9999999999999);
      expect(result).toContain('TB');
    });
  });

  describe('formatDuration', () => {
    it('should format seconds', () => {
      expect(formatDuration(0)).toBe('0s');
      expect(formatDuration(30)).toBe('30s');
      expect(formatDuration(59)).toBe('59s');
    });

    it('should format minutes and seconds', () => {
      expect(formatDuration(60)).toBe('1m 0s');
      expect(formatDuration(90)).toBe('1m 30s');
      expect(formatDuration(125)).toBe('2m 5s');
      expect(formatDuration(3599)).toBe('59m 59s');
    });

    it('should format hours and minutes', () => {
      expect(formatDuration(3600)).toBe('1h 0m');
      expect(formatDuration(3660)).toBe('1h 1m');
      expect(formatDuration(5400)).toBe('1h 30m');
      expect(formatDuration(7200)).toBe('2h 0m');
    });

    it('should handle large durations', () => {
      expect(formatDuration(36000)).toBe('10h 0m');
      expect(formatDuration(86400)).toBe('24h 0m');
    });

    it('should floor fractional seconds', () => {
      expect(formatDuration(30.9)).toBe('30s');
      expect(formatDuration(90.5)).toBe('1m 30s');
    });

    it('should handle zero', () => {
      expect(formatDuration(0)).toBe('0s');
    });

    it('should handle edge case at 60 seconds', () => {
      expect(formatDuration(59.9)).toBe('59s');
      expect(formatDuration(60)).toBe('1m 0s');
    });

    it('should handle edge case at 3600 seconds', () => {
      expect(formatDuration(3599)).toBe('59m 59s');
      expect(formatDuration(3600)).toBe('1h 0m');
    });
  });

  describe('getFileExtension', () => {
    it('should extract file extension', () => {
      expect(getFileExtension('file.txt')).toBe('TXT');
      expect(getFileExtension('video.mp4')).toBe('MP4');
      expect(getFileExtension('audio.flac')).toBe('FLAC');
    });

    it('should extract extension from path', () => {
      expect(getFileExtension('/Users/test/file.txt')).toBe('TXT');
      expect(getFileExtension('/path/to/video.mkv')).toBe('MKV');
    });

    it('should handle multiple dots', () => {
      expect(getFileExtension('archive.tar.gz')).toBe('GZ');
    });

    it('should return empty string for no extension', () => {
      expect(getFileExtension('file')).toBe('');
      expect(getFileExtension('/path/to/file')).toBe('');
    });

    it('should handle hidden files', () => {
      expect(getFileExtension('.gitignore')).toBe('');
    });

    it('should handle dot at the beginning', () => {
      expect(getFileExtension('.bashrc')).toBe('');
    });

    it('should uppercase the extension', () => {
      expect(getFileExtension('file.MkV')).toBe('MKV');
      expect(getFileExtension('file.Mp4')).toBe('MP4');
    });

    it('should handle Windows-style paths', () => {
      expect(getFileExtension('C:\\Users\\test\\file.txt')).toBe('TXT');
    });

    it('should handle empty string', () => {
      expect(getFileExtension('')).toBe('');
    });

    it('should handle common video formats', () => {
      expect(getFileExtension('video.mp4')).toBe('MP4');
      expect(getFileExtension('video.mkv')).toBe('MKV');
      expect(getFileExtension('video.webm')).toBe('WEBM');
      expect(getFileExtension('video.mov')).toBe('MOV');
      expect(getFileExtension('video.avi')).toBe('AVI');
    });

    it('should handle common audio formats', () => {
      expect(getFileExtension('audio.mp3')).toBe('MP3');
      expect(getFileExtension('audio.flac')).toBe('FLAC');
      expect(getFileExtension('audio.wav')).toBe('WAV');
      expect(getFileExtension('audio.m4a')).toBe('M4A');
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle very long paths', () => {
      const longPath = '/very/long/path/' + 'segment/'.repeat(100) + 'file.txt';
      expect(pathBasename(longPath)).toBe('file.txt');
      expect(pathDirname(longPath)).toContain('segment');
    });

    it('should handle special characters in filenames', () => {
      expect(pathBasename('/path/to/file with spaces.txt')).toBe('file with spaces.txt');
      expect(getFileExtension('file-with-dashes.mp4')).toBe('MP4');
      expect(pathBasename('/path/to/file[brackets].txt')).toBe('file[brackets].txt');
    });

    it('should handle Unicode characters', () => {
      expect(pathBasename('/path/to/文件.txt')).toBe('文件.txt');
      expect(getFileExtension('файл.mp4')).toBe('MP4');
    });

    it('should handle paths with only slashes', () => {
      expect(pathDirname('/')).toBe('');
      expect(pathBasename('/')).toBe('');
    });

    it('should handle relative paths', () => {
      expect(pathDirname('relative/path/file.txt')).toBe('relative/path');
      expect(pathBasename('relative/path/file.txt')).toBe('file.txt');
    });

    it('should handle dot directories', () => {
      expect(pathDirname('./file.txt')).toBe('.');
      expect(pathDirname('../file.txt')).toBe('..');
    });
  });

  describe('Integration scenarios', () => {
    it('should handle common media file operations', () => {
      const inputPath = '/Users/test/videos/movie.mkv';
      const dir = pathDirname(inputPath);
      const basename = pathBasename(inputPath);
      const withoutExt = stripExtension(inputPath);
      const ext = getFileExtension(inputPath);

      expect(dir).toBe('/Users/test/videos');
      expect(basename).toBe('movie.mkv');
      expect(withoutExt).toBe('/Users/test/videos/movie');
      expect(ext).toBe('MKV');
    });

    it('should construct output path from input path', () => {
      const inputPath = '/Users/test/input.mkv';
      const outputDir = '/Users/test/output';
      const baseWithoutExt = pathBasename(stripExtension(inputPath));
      const outputPath = joinPath(outputDir, `${baseWithoutExt}.mp4`);

      expect(outputPath).toBe('/Users/test/output/input.mp4');
    });

    it('should handle path normalization and joining together', () => {
      const dir = 'C:\\Users\\test';
      const file = 'video.mp4';
      const normalized = normalizePath(dir);
      const joined = joinPath(normalized, file);

      expect(joined).toBe('C:/Users/test/video.mp4');
    });
  });
});
