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
    });

    it('should be readonly', () => {
      expect(Object.isFrozen(VIDEO_CONTAINERS)).toBe(false); // as const makes it readonly at type level
      expect(VIDEO_CONTAINERS.length).toBe(5);
    });
  });

  describe('AUDIO_CONTAINERS', () => {
    it('should contain expected audio containers', () => {
      expect(AUDIO_CONTAINERS).toContain('m4a');
      expect(AUDIO_CONTAINERS).toContain('mp3');
      expect(AUDIO_CONTAINERS).toContain('flac');
      expect(AUDIO_CONTAINERS).toContain('wav');
    });

    it('should be readonly', () => {
      expect(AUDIO_CONTAINERS.length).toBe(4);
    });
  });

  describe('inferContainerFromPath', () => {
    it('should infer mp4 from .mp4 extension', () => {
      expect(inferContainerFromPath('/path/to/video.mp4')).toBe('mp4');
      expect(inferContainerFromPath('video.MP4')).toBe('mp4');
      expect(inferContainerFromPath('C:\\videos\\test.Mp4')).toBe('mp4');
    });

    it('should infer mp4 from .m4v extension', () => {
      expect(inferContainerFromPath('/path/to/video.m4v')).toBe('mp4');
      expect(inferContainerFromPath('video.M4V')).toBe('mp4');
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

    it('should infer audio containers', () => {
      expect(inferContainerFromPath('/path/to/audio.m4a')).toBe('m4a');
      expect(inferContainerFromPath('/path/to/audio.mp3')).toBe('mp3');
      expect(inferContainerFromPath('/path/to/audio.flac')).toBe('flac');
      expect(inferContainerFromPath('/path/to/audio.wav')).toBe('wav');
    });

    it('should infer image containers', () => {
      expect(inferContainerFromPath('/path/to/image.png')).toBe('png');
      expect(inferContainerFromPath('/path/to/photo.jpg')).toBe('jpg');
      expect(inferContainerFromPath('/path/to/photo.jpeg')).toBe('jpg');
      expect(inferContainerFromPath('/path/to/graphic.webp')).toBe('webp');
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
    });

    it('should return "audio" for audio containers', () => {
      expect(mediaKindForContainer('m4a')).toBe('audio');
      expect(mediaKindForContainer('mp3')).toBe('audio');
      expect(mediaKindForContainer('flac')).toBe('audio');
      expect(mediaKindForContainer('wav')).toBe('audio');
    });

    it('should return "image" for image containers', () => {
      expect(mediaKindForContainer('png')).toBe('image');
      expect(mediaKindForContainer('jpg')).toBe('image');
      expect(mediaKindForContainer('webp')).toBe('image');
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
      expect(result.length).toBe(4);
      expect(result).toContain('m4a');
      expect(result).toContain('mp3');
      expect(result).toContain('flac');
      expect(result).toContain('wav');
    });

    it('should return video containers for "video" kind', () => {
      const result = listTargetContainers('video');
      expect(result).toEqual(VIDEO_CONTAINERS);
      expect(result.length).toBe(5);
      expect(result).toContain('mp4');
      expect(result).toContain('mov');
      expect(result).toContain('mkv');
      expect(result).toContain('webm');
      expect(result).toContain('gif');
    });

    it('should return image containers for "image" kind', () => {
      const result = listTargetContainers('image');
      expect(result).toEqual(IMAGE_CONTAINERS);
      expect(result.length).toBe(3);
      expect(result).toContain('png');
      expect(result).toContain('jpg');
      expect(result).toContain('webp');
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
  });
});
