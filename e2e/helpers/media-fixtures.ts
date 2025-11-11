import { spawn } from 'child_process';
import { writeFile, mkdir } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

/**
 * Helper utilities for creating test media files using FFmpeg
 *
 * These fixtures generate small, predictable media files for testing
 * without requiring large sample files in the repository.
 */

export interface VideoFixtureOptions {
  /**
   * Duration in seconds (default: 5)
   */
  duration?: number;

  /**
   * Width in pixels (default: 640)
   */
  width?: number;

  /**
   * Height in pixels (default: 480)
   */
  height?: number;

  /**
   * Video codec (default: 'libx264')
   */
  videoCodec?: string;

  /**
   * Audio codec (default: 'aac')
   */
  audioCodec?: string;

  /**
   * Frame rate (default: 30)
   */
  frameRate?: number;

  /**
   * Audio sample rate (default: 44100)
   */
  audioSampleRate?: number;

  /**
   * Container format (default: 'mp4')
   */
  format?: string;

  /**
   * Include audio (default: true)
   */
  hasAudio?: boolean;

  /**
   * Include subtitles (default: false)
   */
  hasSubtitles?: boolean;

  /**
   * Number of audio tracks (default: 1)
   */
  audioTracks?: number;
}

export interface AudioFixtureOptions {
  /**
   * Duration in seconds (default: 5)
   */
  duration?: number;

  /**
   * Audio codec (default: 'aac')
   */
  codec?: string;

  /**
   * Sample rate (default: 44100)
   */
  sampleRate?: number;

  /**
   * Container format (default: 'mp4')
   */
  format?: string;

  /**
   * Frequency of test tone in Hz (default: 440)
   */
  frequency?: number;
}

export interface ImageFixtureOptions {
  /**
   * Width in pixels (default: 1920)
   */
  width?: number;

  /**
   * Height in pixels (default: 1080)
   */
  height?: number;

  /**
   * Format (default: 'png')
   */
  format?: string;

  /**
   * Pattern type (default: 'testsrc')
   */
  pattern?: 'testsrc' | 'mandelbrot' | 'smptebars' | 'color';

  /**
   * Color for 'color' pattern (default: 'blue')
   */
  color?: string;
}

/**
 * Create a temporary directory for test fixtures
 */
async function createTempDir(): Promise<string> {
  const dir = join(tmpdir(), 'honeymelon-test-fixtures', Date.now().toString());
  await mkdir(dir, { recursive: true });
  return dir;
}

/**
 * Generate a test video file using FFmpeg
 *
 * @param options Configuration for the test video
 * @returns Promise that resolves with the path to the generated file
 *
 * @example
 * ```typescript
 * const videoPath = await createTestVideo({
 *   duration: 10,
 *   width: 1920,
 *   height: 1080,
 *   videoCodec: 'libx264',
 * });
 * ```
 */
export async function createTestVideo(options: VideoFixtureOptions = {}): Promise<string> {
  const {
    duration = 5,
    width = 640,
    height = 480,
    videoCodec = 'libx264',
    audioCodec = 'aac',
    frameRate = 30,
    audioSampleRate = 44100,
    format = 'mp4',
    hasAudio = true,
    hasSubtitles = false,
    audioTracks = 1,
  } = options;

  const tempDir = await createTempDir();
  const fileName = `test-video-${Date.now()}.${format}`;
  const filePath = join(tempDir, fileName);

  // Build FFmpeg command
  const args = [
    '-f',
    'lavfi',
    '-i',
    `testsrc=duration=${duration}:size=${width}x${height}:rate=${frameRate}`,
  ];

  if (hasAudio) {
    for (let i = 0; i < audioTracks; i++) {
      // Generate sine wave audio (440 Hz + offset for each track)
      args.push(
        '-f',
        'lavfi',
        '-i',
        `sine=frequency=${440 + i * 100}:duration=${duration}:sample_rate=${audioSampleRate}`,
      );
    }
  }

  // Video encoding options
  args.push('-c:v', videoCodec);

  if (videoCodec === 'libx264') {
    args.push('-preset', 'ultrafast', '-crf', '23');
  }

  // Audio encoding options
  if (hasAudio) {
    args.push('-c:a', audioCodec);
    if (audioCodec === 'aac') {
      args.push('-b:a', '128k');
    }
  }

  // Add subtitles if requested
  if (hasSubtitles) {
    const srtContent = `1\n00:00:00,000 --> 00:00:${duration},000\nTest subtitle\n`;
    const srtPath = join(tempDir, 'test-subtitle.srt');
    await writeFile(srtPath, srtContent);
    args.push('-i', srtPath, '-c:s', 'mov_text');
  }

  // Output options
  args.push('-t', duration.toString(), '-y', filePath);

  await runFFmpeg(args);
  return filePath;
}

/**
 * Generate a test audio file using FFmpeg
 *
 * @param options Configuration for the test audio
 * @returns Promise that resolves with the path to the generated file
 */
export async function createTestAudio(options: AudioFixtureOptions = {}): Promise<string> {
  const {
    duration = 5,
    codec = 'aac',
    sampleRate = 44100,
    format = 'm4a',
    frequency = 440,
  } = options;

  const tempDir = await createTempDir();
  const fileName = `test-audio-${Date.now()}.${format}`;
  const filePath = join(tempDir, fileName);

  const args = [
    '-f',
    'lavfi',
    '-i',
    `sine=frequency=${frequency}:duration=${duration}:sample_rate=${sampleRate}`,
    '-c:a',
    codec,
  ];

  if (codec === 'aac') {
    args.push('-b:a', '128k');
  }

  args.push('-t', duration.toString(), '-y', filePath);

  await runFFmpeg(args);
  return filePath;
}

/**
 * Generate a test image using FFmpeg
 *
 * @param options Configuration for the test image
 * @returns Promise that resolves with the path to the generated file
 */
export async function createTestImage(options: ImageFixtureOptions = {}): Promise<string> {
  const {
    width = 1920,
    height = 1080,
    format = 'png',
    pattern = 'testsrc',
    color = 'blue',
  } = options;

  const tempDir = await createTempDir();
  const fileName = `test-image-${Date.now()}.${format}`;
  const filePath = join(tempDir, fileName);

  let source = pattern;
  if (pattern === 'color') {
    source = `color=c=${color}:s=${width}x${height}`;
  } else {
    source = `${pattern}=size=${width}x${height}`;
  }

  const args = ['-f', 'lavfi', '-i', source, '-frames:v', '1', '-y', filePath];

  await runFFmpeg(args);
  return filePath;
}

/**
 * Create a corrupted media file for error testing
 *
 * @returns Promise that resolves with the path to the corrupted file
 */
export async function createCorruptedVideo(): Promise<string> {
  const tempDir = await createTempDir();
  const fileName = `corrupted-${Date.now()}.mp4`;
  const filePath = join(tempDir, fileName);

  // Create a valid video first
  const validPath = await createTestVideo({ duration: 2 });

  // Read the file and truncate it to corrupt it
  const fs = await import('fs/promises');
  const buffer = await fs.readFile(validPath);
  const corruptedBuffer = buffer.slice(0, Math.floor(buffer.length / 2));
  await fs.writeFile(filePath, corruptedBuffer);

  return filePath;
}

/**
 * Create an empty (0-byte) file
 */
export async function createEmptyFile(): Promise<string> {
  const tempDir = await createTempDir();
  const fileName = `empty-${Date.now()}.mp4`;
  const filePath = join(tempDir, fileName);

  await writeFile(filePath, '');
  return filePath;
}

/**
 * Create a very large video file for disk space testing
 *
 * @param sizeInMB Target file size in megabytes
 */
export async function createLargeVideo(sizeInMB: number): Promise<string> {
  // Calculate duration needed to reach target size
  // Rough estimate: 1080p H.264 at 5 Mbps = ~37.5 MB per minute
  const estimatedDurationSeconds = Math.ceil((sizeInMB / 37.5) * 60);

  return createTestVideo({
    duration: estimatedDurationSeconds,
    width: 1920,
    height: 1080,
    videoCodec: 'libx264',
    frameRate: 30,
  });
}

/**
 * Create a video with specific codec for compatibility testing
 */
export async function createVideoWithCodec(
  videoCodec: string,
  audioCodec: string = 'aac',
): Promise<string> {
  return createTestVideo({
    duration: 3,
    videoCodec,
    audioCodec,
  });
}

/**
 * Create a video with multiple audio tracks
 */
export async function createMultiAudioVideo(trackCount: number = 3): Promise<string> {
  return createTestVideo({
    duration: 3,
    audioTracks: trackCount,
  });
}

/**
 * Create a video with subtitles
 */
export async function createVideoWithSubtitles(): Promise<string> {
  return createTestVideo({
    duration: 5,
    hasSubtitles: true,
  });
}

/**
 * Create a video with no audio track
 */
export async function createVideoWithoutAudio(): Promise<string> {
  return createTestVideo({
    duration: 3,
    hasAudio: false,
  });
}

/**
 * Create an audio-only file (no video)
 */
export async function createAudioOnly(): Promise<string> {
  return createTestAudio({
    duration: 3,
  });
}

/**
 * Create a very short video (< 1 second)
 */
export async function createVeryShortVideo(): Promise<string> {
  return createTestVideo({
    duration: 0.5,
  });
}

/**
 * Create a very long video (for progress testing)
 */
export async function createVeryLongVideo(): Promise<string> {
  return createTestVideo({
    duration: 300, // 5 minutes
    width: 1920,
    height: 1080,
  });
}

/**
 * Create a video with unusual aspect ratio
 */
export async function createUnusualAspectVideo(): Promise<string> {
  return createTestVideo({
    duration: 3,
    width: 1080, // 1:1 aspect ratio
    height: 1080,
  });
}

/**
 * Execute FFmpeg command and return a promise
 */
function runFFmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', args, {
      stdio: 'pipe',
    });

    let stderr = '';

    ffmpeg.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    ffmpeg.on('error', (error) => {
      reject(new Error(`FFmpeg spawn error: ${error.message}`));
    });

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`FFmpeg exited with code ${code}\nStderr:\n${stderr}`));
      }
    });
  });
}

/**
 * Clean up all test fixtures in a directory
 */
export async function cleanupFixtures(dir: string): Promise<void> {
  try {
    const { rm } = await import('fs/promises');
    await rm(dir, { recursive: true, force: true });
  } catch (error) {
    console.warn(`Failed to clean up fixtures at ${dir}:`, error);
  }
}

/**
 * Create a set of common test fixtures
 *
 * Returns paths to multiple test files for comprehensive testing
 */
export async function createTestFixtureSet(): Promise<{
  video: {
    h264: string;
    hevc: string;
    noAudio: string;
    multiAudio: string;
    withSubtitles: string;
  };
  audio: {
    aac: string;
    mp3: string;
  };
  image: {
    png: string;
    jpeg: string;
  };
  invalid: {
    corrupted: string;
    empty: string;
  };
}> {
  const [h264Video, hevcVideo, noAudioVideo, multiAudioVideo, subsVideo] = await Promise.all([
    createTestVideo({ videoCodec: 'libx264', format: 'mp4' }),
    createTestVideo({ videoCodec: 'libx265', format: 'mp4' }),
    createVideoWithoutAudio(),
    createMultiAudioVideo(2),
    createVideoWithSubtitles(),
  ]);

  const [aacAudio, mp3Audio] = await Promise.all([
    createTestAudio({ codec: 'aac', format: 'm4a' }),
    createTestAudio({ codec: 'libmp3lame', format: 'mp3' }),
  ]);

  const [pngImage, jpegImage] = await Promise.all([
    createTestImage({ format: 'png' }),
    createTestImage({ format: 'jpg', pattern: 'smptebars' }),
  ]);

  const [corruptedFile, emptyFile] = await Promise.all([createCorruptedVideo(), createEmptyFile()]);

  return {
    video: {
      h264: h264Video,
      hevc: hevcVideo,
      noAudio: noAudioVideo,
      multiAudio: multiAudioVideo,
      withSubtitles: subsVideo,
    },
    audio: {
      aac: aacAudio,
      mp3: mp3Audio,
    },
    image: {
      png: pngImage,
      jpeg: jpegImage,
    },
    invalid: {
      corrupted: corruptedFile,
      empty: emptyFile,
    },
  };
}
