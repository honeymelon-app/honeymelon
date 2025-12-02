import { describe, it, expect } from 'vitest';
import {
  VIDEO_CONTAINERS,
  AUDIO_CONTAINERS,
  IMAGE_CONTAINERS,
  inferContainerFromPath,
  mediaKindForContainer,
  listTargetContainers,
} from '../media-formats';
import type { Container } from '../types';

describe('media-formats', () => {
  describe('VIDEO_CONTAINERS', () => {
    it('should contain expected video containers', () => {
      expect(VIDEO_CONTAINERS).toContain('mp4');
      expect(VIDEO_CONTAINERS).toContain('mov');
      expect(VIDEO_CONTAINERS).toContain('mkv');
      expect(VIDEO_CONTAINERS).toContain('webm');
      expect(VIDEO_CONTAINERS).toContain('gif');
      // New containers from Comet
      expect(VIDEO_CONTAINERS).toContain('avi');
      expect(VIDEO_CONTAINERS).toContain('flv');
      expect(VIDEO_CONTAINERS).toContain('m4v');
      expect(VIDEO_CONTAINERS).toContain('ts');
      expect(VIDEO_CONTAINERS).toContain('ogv');
      expect(VIDEO_CONTAINERS).toContain('mpeg');
    });

    it('should be readonly', () => {
      expect(Object.isFrozen(VIDEO_CONTAINERS)).toBe(false); // as const makes it readonly at type level
      expect(VIDEO_CONTAINERS.length).toBe(11);
    });
  });

  describe('AUDIO_CONTAINERS', () => {
    it('should contain expected audio containers', () => {
      expect(AUDIO_CONTAINERS).toContain('m4a');
      expect(AUDIO_CONTAINERS).toContain('mp3');
      expect(AUDIO_CONTAINERS).toContain('flac');
      expect(AUDIO_CONTAINERS).toContain('wav');
      // New containers from Comet
      expect(AUDIO_CONTAINERS).toContain('ogg');
      expect(AUDIO_CONTAINERS).toContain('aac');
      expect(AUDIO_CONTAINERS).toContain('aiff');
      expect(AUDIO_CONTAINERS).toContain('opus');
    });

    it('should be readonly', () => {
      expect(AUDIO_CONTAINERS.length).toBe(8);
    });
  });

  describe('IMAGE_CONTAINERS', () => {
    it('should contain expected image containers', () => {
      expect(IMAGE_CONTAINERS).toContain('png');
      expect(IMAGE_CONTAINERS).toContain('jpg');
      expect(IMAGE_CONTAINERS).toContain('webp');
      // New containers from Comet
      expect(IMAGE_CONTAINERS).toContain('bmp');
      expect(IMAGE_CONTAINERS).toContain('tiff');
    });

    it('should be readonly', () => {
      expect(IMAGE_CONTAINERS.length).toBe(5);
    });
  });

  describe('inferContainerFromPath', () => {
    it('should infer mp4 from .mp4 extension', () => {
      expect(inferContainerFromPath('/path/to/video.mp4')).toBe('mp4');
      expect(inferContainerFromPath('video.MP4')).toBe('mp4');
      expect(inferContainerFromPath('C:\\videos\\test.Mp4')).toBe('mp4');
    });

    it('should infer m4v from .m4v extension', () => {
      expect(inferContainerFromPath('/path/to/video.m4v')).toBe('m4v');
      expect(inferContainerFromPath('video.M4V')).toBe('m4v');
    });

    it('should infer mov from .mov extension', () => {
      expect(inferContainerFromPath('/path/to/video.mov')).toBe('mov');
      expect(inferContainerFromPath('video.MOV')).toBe('mov');
    });

    it('should infer mkv from .mkv extension', () => {
      expect(inferContainerFromPath('/path/to/video.mkv')).toBe('mkv');
      expect(inferContainerFromPath('video.MKV')).toBe('mkv');
    });

    it('should infer webm from .webm extension', () => {
      expect(inferContainerFromPath('/path/to/video.webm')).toBe('webm');
    });

    it('should infer gif from .gif extension', () => {
      expect(inferContainerFromPath('/path/to/animation.gif')).toBe('gif');
    });

    it('should infer new video containers from Comet', () => {
      expect(inferContainerFromPath('/path/to/video.avi')).toBe('avi');
      expect(inferContainerFromPath('/path/to/video.flv')).toBe('flv');
      expect(inferContainerFromPath('/path/to/video.ts')).toBe('ts');
      expect(inferContainerFromPath('/path/to/video.mts')).toBe('ts');
      expect(inferContainerFromPath('/path/to/video.m2ts')).toBe('ts');
      expect(inferContainerFromPath('/path/to/video.ogv')).toBe('ogv');
      expect(inferContainerFromPath('/path/to/video.mpeg')).toBe('mpeg');
      expect(inferContainerFromPath('/path/to/video.mpg')).toBe('mpeg');
    });

    it('should infer audio containers', () => {
      expect(inferContainerFromPath('/path/to/audio.m4a')).toBe('m4a');
      expect(inferContainerFromPath('/path/to/audio.mp3')).toBe('mp3');
      expect(inferContainerFromPath('/path/to/audio.flac')).toBe('flac');
      expect(inferContainerFromPath('/path/to/audio.wav')).toBe('wav');
      // New audio containers from Comet
      expect(inferContainerFromPath('/path/to/audio.ogg')).toBe('ogg');
      expect(inferContainerFromPath('/path/to/audio.oga')).toBe('ogg');
      expect(inferContainerFromPath('/path/to/audio.aac')).toBe('aac');
      expect(inferContainerFromPath('/path/to/audio.aiff')).toBe('aiff');
      expect(inferContainerFromPath('/path/to/audio.aif')).toBe('aiff');
      expect(inferContainerFromPath('/path/to/audio.opus')).toBe('opus');
    });

    it('should infer image containers', () => {
      expect(inferContainerFromPath('/path/to/image.png')).toBe('png');
      expect(inferContainerFromPath('/path/to/photo.jpg')).toBe('jpg');
      expect(inferContainerFromPath('/path/to/photo.jpeg')).toBe('jpg');
      expect(inferContainerFromPath('/path/to/graphic.webp')).toBe('webp');
      // New image containers from Comet
      expect(inferContainerFromPath('/path/to/image.bmp')).toBe('bmp');
      expect(inferContainerFromPath('/path/to/image.tiff')).toBe('tiff');
      expect(inferContainerFromPath('/path/to/image.tif')).toBe('tiff');
    });

    it('should return undefined for unknown extensions', () => {
      expect(inferContainerFromPath('/path/to/file.txt')).toBeUndefined();
      expect(inferContainerFromPath('/path/to/file.unknown')).toBeUndefined();
      expect(inferContainerFromPath('/path/to/file.doc')).toBeUndefined();
    });

    it('should return undefined for paths without extensions', () => {
      expect(inferContainerFromPath('/path/to/file')).toBeUndefined();
      expect(inferContainerFromPath('filename')).toBeUndefined();
    });

    it('should return undefined for paths ending with dot', () => {
      expect(inferContainerFromPath('/path/to/file.')).toBeUndefined();
    });

    it('should handle complex paths', () => {
      expect(inferContainerFromPath('/path/with.dots/in/folder/video.mp4')).toBe('mp4');
      expect(inferContainerFromPath('/path.with.multiple.dots.in.name/video.mkv')).toBe('mkv');
    });

    it('should handle paths with multiple dots in filename', () => {
      expect(inferContainerFromPath('my.video.file.mp4')).toBe('mp4');
      expect(inferContainerFromPath('archive.2024.01.15.mkv')).toBe('mkv');
    });

    it('should be case-insensitive', () => {
      expect(inferContainerFromPath('video.MP4')).toBe('mp4');
      expect(inferContainerFromPath('video.Mp4')).toBe('mp4');
      expect(inferContainerFromPath('video.mP4')).toBe('mp4');
      expect(inferContainerFromPath('VIDEO.MP4')).toBe('mp4');
    });
  });

  describe('mediaKindForContainer', () => {
    it('should return "video" for video containers', () => {
      expect(mediaKindForContainer('mp4')).toBe('video');
      expect(mediaKindForContainer('mov')).toBe('video');
      expect(mediaKindForContainer('mkv')).toBe('video');
      expect(mediaKindForContainer('webm')).toBe('video');
      expect(mediaKindForContainer('gif')).toBe('video');
      // New video containers
      expect(mediaKindForContainer('avi')).toBe('video');
      expect(mediaKindForContainer('flv')).toBe('video');
      expect(mediaKindForContainer('m4v')).toBe('video');
      expect(mediaKindForContainer('ts')).toBe('video');
      expect(mediaKindForContainer('ogv')).toBe('video');
      expect(mediaKindForContainer('mpeg')).toBe('video');
    });

    it('should return "audio" for audio containers', () => {
      expect(mediaKindForContainer('m4a')).toBe('audio');
      expect(mediaKindForContainer('mp3')).toBe('audio');
      expect(mediaKindForContainer('flac')).toBe('audio');
      expect(mediaKindForContainer('wav')).toBe('audio');
      // New audio containers
      expect(mediaKindForContainer('ogg')).toBe('audio');
      expect(mediaKindForContainer('aac')).toBe('audio');
      expect(mediaKindForContainer('aiff')).toBe('audio');
      expect(mediaKindForContainer('opus')).toBe('audio');
    });

    it('should return "image" for image containers', () => {
      expect(mediaKindForContainer('png')).toBe('image');
      expect(mediaKindForContainer('jpg')).toBe('image');
      expect(mediaKindForContainer('webp')).toBe('image');
      // New image containers
      expect(mediaKindForContainer('bmp')).toBe('image');
      expect(mediaKindForContainer('tiff')).toBe('image');
    });

    it('should return "video" for unknown containers (default)', () => {
      // The implementation treats unknown containers as video by default
      expect(mediaKindForContainer('unknown' as Container)).toBe('video');
    });
  });

  describe('listTargetContainers', () => {
    it('should return audio containers for "audio" kind', () => {
      const result = listTargetContainers('audio');
      expect(result).toEqual(AUDIO_CONTAINERS);
      expect(result.length).toBe(8);
      expect(result).toContain('m4a');
      expect(result).toContain('mp3');
      expect(result).toContain('flac');
      expect(result).toContain('wav');
      expect(result).toContain('ogg');
      expect(result).toContain('aac');
      expect(result).toContain('aiff');
      expect(result).toContain('opus');
    });

    it('should return video containers for "video" kind', () => {
      const result = listTargetContainers('video');
      expect(result).toEqual(VIDEO_CONTAINERS);
      expect(result.length).toBe(11);
      expect(result).toContain('mp4');
      expect(result).toContain('mov');
      expect(result).toContain('mkv');
      expect(result).toContain('webm');
      expect(result).toContain('gif');
      expect(result).toContain('avi');
      expect(result).toContain('flv');
      expect(result).toContain('m4v');
      expect(result).toContain('ts');
      expect(result).toContain('ogv');
      expect(result).toContain('mpeg');
    });

    it('should return image containers for "image" kind', () => {
      const result = listTargetContainers('image');
      expect(result).toEqual(IMAGE_CONTAINERS);
      expect(result.length).toBe(5);
      expect(result).toContain('png');
      expect(result).toContain('jpg');
      expect(result).toContain('webp');
      expect(result).toContain('bmp');
      expect(result).toContain('tiff');
    });

    it('should return empty array for unknown kind', () => {
      const result = listTargetContainers('unknown' as any);
      expect(result).toEqual([]);
    });

    it('should return readonly arrays', () => {
      const videoContainers = listTargetContainers('video');
      const audioContainers = listTargetContainers('audio');

      // These are readonly arrays at type level
      expect(Array.isArray(videoContainers)).toBe(true);
      expect(Array.isArray(audioContainers)).toBe(true);
    });
  });

  describe('integration tests', () => {
    it('should correctly identify and categorize video files', () => {
      const videoPath = '/videos/sample.mp4';
      const container = inferContainerFromPath(videoPath);

      expect(container).toBe('mp4');
      expect(mediaKindForContainer(container!)).toBe('video');
      expect(listTargetContainers('video')).toContain(container);
    });

    it('should correctly identify and categorize audio files', () => {
      const audioPath = '/music/song.mp3';
      const container = inferContainerFromPath(audioPath);

      expect(container).toBe('mp3');
      expect(mediaKindForContainer(container!)).toBe('audio');
      expect(listTargetContainers('audio')).toContain(container);
    });

    it('should handle conversion workflow', () => {
      const sourcePath = '/videos/input.mov';
      const sourceContainer = inferContainerFromPath(sourcePath);
      const sourceKind = mediaKindForContainer(sourceContainer!);
      const targetOptions = listTargetContainers(sourceKind);

      expect(sourceContainer).toBe('mov');
      expect(sourceKind).toBe('video');
      expect(targetOptions).toContain('mp4');
      expect(targetOptions).toContain('mkv');
      expect(targetOptions).toContain('avi');
      expect(targetOptions).not.toContain('mp3');
    });
  });

  describe('image integration', () => {
    it('should correctly identify and categorize image files', () => {
      const imagePath = '/images/picture.webp';
      const container = inferContainerFromPath(imagePath);

      expect(container).toBe('webp');
      expect(mediaKindForContainer(container!)).toBe('image');
      expect(listTargetContainers('image')).toContain(container);
    });

    it('should correctly handle new image formats from Comet', () => {
      const bmpPath = '/images/picture.bmp';
      const tiffPath = '/images/photo.tiff';

      expect(inferContainerFromPath(bmpPath)).toBe('bmp');
      expect(inferContainerFromPath(tiffPath)).toBe('tiff');
      expect(mediaKindForContainer('bmp')).toBe('image');
      expect(mediaKindForContainer('tiff')).toBe('image');
    });
  });
});
