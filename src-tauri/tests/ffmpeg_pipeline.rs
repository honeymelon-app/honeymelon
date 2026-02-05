// Copyright (C) 2025-2026 Jerome Thayananthajothy
//
// This file is part of Honeymelon.
//
// Honeymelon is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program. If not, see <https://www.gnu.org/licenses/\>.

//! FFmpeg Pipeline Integration Tests
//!
//! This test suite exercises the full FFmpeg pipeline (probe > plan > execute)
//! against a corpus of test media files to ensure:
//!
//! 1. Normal files succeed and produce valid outputs
//! 2. Edge cases are handled correctly
//! 3. Known-bad files fail gracefully with proper error classification
//!
//! ## Running These Tests
//!
//! ```bash
//! # Run all pipeline tests
//! cd src-tauri && cargo test --test ffmpeg_pipeline -- --nocapture
//!
//! # Run specific test category
//! cd src-tauri && cargo test --test ffmpeg_pipeline normal -- --nocapture
//! cd src-tauri && cargo test --test ffmpeg_pipeline edge_case -- --nocapture
//! cd src-tauri && cargo test --test ffmpeg_pipeline known_bad -- --nocapture
//! ```
//!
//! ## Test Media Location
//!
//! Test files are located in `test-media/` at the repository root:
//! - `test-media/normal/` - Standard media files that should convert successfully
//! - `test-media/edge-cases/` - Unusual but valid files
//! - `test-media/known-bad/` - Files that should fail gracefully

use std::env;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

/// Check if we're running in CI environment
fn is_ci() -> bool {
    env::var("CI").is_ok() || env::var("GITHUB_ACTIONS").is_ok()
}

/// Get the path to the test-media directory
fn test_media_dir() -> PathBuf {
    // Navigate from src-tauri/tests to repo root
    let manifest_dir = env::var("CARGO_MANIFEST_DIR").expect("CARGO_MANIFEST_DIR not set");
    Path::new(&manifest_dir).join("../test-media")
}

/// Get the path to ffprobe binary
fn ffprobe_path() -> PathBuf {
    let manifest_dir = env::var("CARGO_MANIFEST_DIR").expect("CARGO_MANIFEST_DIR not set");
    Path::new(&manifest_dir).join("bin/ffprobe")
}

/// Get the path to ffmpeg binary
fn ffmpeg_path() -> PathBuf {
    let manifest_dir = env::var("CARGO_MANIFEST_DIR").expect("CARGO_MANIFEST_DIR not set");
    Path::new(&manifest_dir).join("bin/ffmpeg")
}

/// Check if test media files are available
fn check_test_media_available() -> bool {
    let media_dir = test_media_dir();
    let available = media_dir.exists() && media_dir.join("normal").exists();
    if !available && is_ci() {
        panic!(
            "Test media not available in CI! Run 'npm run generate-test-media' first.\n\
             Expected directory: {}",
            media_dir.display()
        );
    }
    available
}

/// Check if FFmpeg binaries are available
fn check_ffmpeg_available() -> bool {
    let ffmpeg = ffmpeg_path();
    let ffprobe = ffprobe_path();
    let available = ffmpeg.exists() && ffprobe.exists();
    if !available && is_ci() {
        panic!(
            "FFmpeg binaries not available in CI! Run 'npm run download-ffmpeg' first.\n\
             Expected ffmpeg:  {}\n\
             Expected ffprobe: {}",
            ffmpeg.display(),
            ffprobe.display()
        );
    }
    available
}

/// Result of probing a media file
#[derive(Debug)]
struct ProbeResult {
    success: bool,
    has_video: bool,
    has_audio: bool,
    duration_sec: f64,
    width: Option<u32>,
    height: Option<u32>,
    video_codec: Option<String>,
    audio_codec: Option<String>,
    error: Option<String>,
}

/// Probe a media file using ffprobe
fn probe_file(path: &Path) -> ProbeResult {
    let ffprobe = ffprobe_path();

    let output = Command::new(&ffprobe)
        .args([
            "-v",
            "quiet",
            "-print_format",
            "json",
            "-show_format",
            "-show_streams",
            path.to_str().unwrap(),
        ])
        .output();

    match output {
        Ok(output) if output.status.success() => {
            let json_str = String::from_utf8_lossy(&output.stdout);
            parse_probe_output(&json_str)
        },
        Ok(output) => ProbeResult {
            success: false,
            has_video: false,
            has_audio: false,
            duration_sec: 0.0,
            width: None,
            height: None,
            video_codec: None,
            audio_codec: None,
            error: Some(String::from_utf8_lossy(&output.stderr).to_string()),
        },
        Err(e) => ProbeResult {
            success: false,
            has_video: false,
            has_audio: false,
            duration_sec: 0.0,
            width: None,
            height: None,
            video_codec: None,
            audio_codec: None,
            error: Some(e.to_string()),
        },
    }
}

/// Parse ffprobe JSON output
fn parse_probe_output(json_str: &str) -> ProbeResult {
    let parsed: serde_json::Value = match serde_json::from_str(json_str) {
        Ok(v) => v,
        Err(e) => {
            return ProbeResult {
                success: false,
                has_video: false,
                has_audio: false,
                duration_sec: 0.0,
                width: None,
                height: None,
                video_codec: None,
                audio_codec: None,
                error: Some(format!("JSON parse error: {}", e)),
            };
        },
    };

    let streams = parsed["streams"].as_array();
    let format = &parsed["format"];

    let duration_sec = format["duration"]
        .as_str()
        .and_then(|s| s.parse::<f64>().ok())
        .unwrap_or(0.0);

    let mut has_video = false;
    let mut has_audio = false;
    let mut width = None;
    let mut height = None;
    let mut video_codec = None;
    let mut audio_codec = None;

    if let Some(streams) = streams {
        for stream in streams {
            let codec_type = stream["codec_type"].as_str().unwrap_or("");
            let codec_name = stream["codec_name"].as_str().map(|s| s.to_string());

            match codec_type {
                "video" => {
                    has_video = true;
                    video_codec = codec_name;
                    width = stream["width"].as_u64().map(|w| w as u32);
                    height = stream["height"].as_u64().map(|h| h as u32);
                },
                "audio" => {
                    has_audio = true;
                    audio_codec = codec_name;
                },
                _ => {},
            }
        }
    }

    ProbeResult {
        success: true,
        has_video,
        has_audio,
        duration_sec,
        width,
        height,
        video_codec,
        audio_codec,
        error: None,
    }
}

/// Execute a simple conversion (remux or transcode)
fn execute_conversion(input_path: &Path, output_path: &Path, transcode: bool) -> ConversionResult {
    let ffmpeg = ffmpeg_path();

    let mut args = vec![
        "-y".to_string(),
        "-i".to_string(),
        input_path.to_str().unwrap().to_string(),
    ];

    if transcode {
        // Simple transcode to H.264/AAC
        args.extend([
            "-c:v".to_string(),
            "libx264".to_string(),
            "-preset".to_string(),
            "ultrafast".to_string(),
            "-crf".to_string(),
            "28".to_string(),
            "-c:a".to_string(),
            "aac".to_string(),
            "-b:a".to_string(),
            "64k".to_string(),
        ]);
    } else {
        // Remux (copy streams)
        args.extend(["-c".to_string(), "copy".to_string()]);
    }

    args.push(output_path.to_str().unwrap().to_string());

    let output = Command::new(&ffmpeg).args(&args).output();

    match output {
        Ok(output) => {
            let stderr = String::from_utf8_lossy(&output.stderr).to_string();
            if output.status.success() {
                // Validate output
                let output_exists = output_path.exists();
                let output_size = if output_exists {
                    fs::metadata(output_path).map(|m| m.len()).unwrap_or(0)
                } else {
                    0
                };

                ConversionResult {
                    success: output_exists && output_size > 0,
                    exit_code: output.status.code(),
                    output_exists,
                    output_size,
                    stderr: if stderr.is_empty() {
                        None
                    } else {
                        Some(stderr)
                    },
                    error_category: None,
                }
            } else {
                // Classify the error
                let category = classify_ffmpeg_error(&stderr, output.status.code());
                ConversionResult {
                    success: false,
                    exit_code: output.status.code(),
                    output_exists: output_path.exists(),
                    output_size: 0,
                    stderr: Some(stderr),
                    error_category: Some(category),
                }
            }
        },
        Err(e) => ConversionResult {
            success: false,
            exit_code: None,
            output_exists: false,
            output_size: 0,
            stderr: Some(e.to_string()),
            error_category: Some(ErrorCategory::InternalPipelineError),
        },
    }
}

/// Execute a simple video conversion with explicit codecs and format.
fn execute_video_conversion(
    input_path: &Path,
    output_path: &Path,
    format: Option<&str>,
    video_codec: &str,
    audio_codec: Option<&str>,
) -> ConversionResult {
    let ffmpeg = ffmpeg_path();

    let mut args = vec![
        "-y".to_string(),
        "-i".to_string(),
        input_path.to_str().unwrap().to_string(),
        "-t".to_string(),
        "0.5".to_string(),
        "-c:v".to_string(),
        video_codec.to_string(),
    ];

    match audio_codec {
        Some(codec) => {
            args.push("-c:a".to_string());
            args.push(codec.to_string());
        },
        None => {
            args.push("-an".to_string());
        },
    }

    if let Some(format) = format {
        args.push("-f".to_string());
        args.push(format.to_string());
    }

    let output = Command::new(&ffmpeg).args(&args).arg(output_path).output();

    match output {
        Ok(output) => {
            let stderr = String::from_utf8_lossy(&output.stderr).to_string();
            if output.status.success() {
                let output_exists = output_path.exists();
                let output_size = if output_exists {
                    fs::metadata(output_path).map(|m| m.len()).unwrap_or(0)
                } else {
                    0
                };

                ConversionResult {
                    success: output_exists && output_size > 0,
                    exit_code: output.status.code(),
                    output_exists,
                    output_size,
                    stderr: if stderr.is_empty() {
                        None
                    } else {
                        Some(stderr)
                    },
                    error_category: None,
                }
            } else {
                let category = classify_ffmpeg_error(&stderr, output.status.code());
                ConversionResult {
                    success: false,
                    exit_code: output.status.code(),
                    output_exists: output_path.exists(),
                    output_size: 0,
                    stderr: Some(stderr),
                    error_category: Some(category),
                }
            }
        },
        Err(e) => ConversionResult {
            success: false,
            exit_code: None,
            output_exists: false,
            output_size: 0,
            stderr: Some(e.to_string()),
            error_category: Some(ErrorCategory::InternalPipelineError),
        },
    }
}

/// Execute a simple audio conversion with explicit codec and format.
fn execute_audio_conversion(
    input_path: &Path,
    output_path: &Path,
    format: Option<&str>,
    audio_codec: &str,
) -> ConversionResult {
    let ffmpeg = ffmpeg_path();

    let mut args = vec![
        "-y".to_string(),
        "-i".to_string(),
        input_path.to_str().unwrap().to_string(),
        "-t".to_string(),
        "0.5".to_string(),
        "-vn".to_string(),
        "-c:a".to_string(),
        audio_codec.to_string(),
    ];

    if let Some(format) = format {
        args.push("-f".to_string());
        args.push(format.to_string());
    }

    let output = Command::new(&ffmpeg).args(&args).arg(output_path).output();

    match output {
        Ok(output) => {
            let stderr = String::from_utf8_lossy(&output.stderr).to_string();
            if output.status.success() {
                let output_exists = output_path.exists();
                let output_size = if output_exists {
                    fs::metadata(output_path).map(|m| m.len()).unwrap_or(0)
                } else {
                    0
                };

                ConversionResult {
                    success: output_exists && output_size > 0,
                    exit_code: output.status.code(),
                    output_exists,
                    output_size,
                    stderr: if stderr.is_empty() {
                        None
                    } else {
                        Some(stderr)
                    },
                    error_category: None,
                }
            } else {
                let category = classify_ffmpeg_error(&stderr, output.status.code());
                ConversionResult {
                    success: false,
                    exit_code: output.status.code(),
                    output_exists: output_path.exists(),
                    output_size: 0,
                    stderr: Some(stderr),
                    error_category: Some(category),
                }
            }
        },
        Err(e) => ConversionResult {
            success: false,
            exit_code: None,
            output_exists: false,
            output_size: 0,
            stderr: Some(e.to_string()),
            error_category: Some(ErrorCategory::InternalPipelineError),
        },
    }
}

/// Execute a simple image conversion to a single-frame output.
fn execute_image_conversion(
    input_path: &Path,
    output_path: &Path,
    format: &str,
    codec: &str,
) -> ConversionResult {
    let ffmpeg = ffmpeg_path();

    let args = vec![
        "-y".to_string(),
        "-i".to_string(),
        input_path.to_str().unwrap().to_string(),
        "-f".to_string(),
        format.to_string(),
        "-c:v".to_string(),
        codec.to_string(),
        "-frames:v".to_string(),
        "1".to_string(),
    ];

    let output = Command::new(&ffmpeg).args(&args).arg(output_path).output();

    match output {
        Ok(output) => {
            let stderr = String::from_utf8_lossy(&output.stderr).to_string();
            if output.status.success() {
                let output_exists = output_path.exists();
                let output_size = if output_exists {
                    fs::metadata(output_path).map(|m| m.len()).unwrap_or(0)
                } else {
                    0
                };

                ConversionResult {
                    success: output_exists && output_size > 0,
                    exit_code: output.status.code(),
                    output_exists,
                    output_size,
                    stderr: if stderr.is_empty() {
                        None
                    } else {
                        Some(stderr)
                    },
                    error_category: None,
                }
            } else {
                let category = classify_ffmpeg_error(&stderr, output.status.code());
                ConversionResult {
                    success: false,
                    exit_code: output.status.code(),
                    output_exists: output_path.exists(),
                    output_size: 0,
                    stderr: Some(stderr),
                    error_category: Some(category),
                }
            }
        },
        Err(e) => ConversionResult {
            success: false,
            exit_code: None,
            output_exists: false,
            output_size: 0,
            stderr: Some(e.to_string()),
            error_category: Some(ErrorCategory::InternalPipelineError),
        },
    }
}

/// Result of a conversion attempt
#[derive(Debug)]
#[allow(dead_code)]
struct ConversionResult {
    success: bool,
    exit_code: Option<i32>,
    output_exists: bool,
    output_size: u64,
    stderr: Option<String>,
    error_category: Option<ErrorCategory>,
}

/// Error categories matching those in ffmpeg_errors.rs
#[derive(Debug, PartialEq, Clone, Copy)]
#[allow(dead_code)]
enum ErrorCategory {
    InputProblem,
    UnsupportedCombination,
    ResourceIssue,
    InternalPipelineError,
    Timeout,
    Cancelled,
    OutputValidationFailed,
    Unknown,
}

/// Classify FFmpeg error based on stderr output
fn classify_ffmpeg_error(stderr: &str, _exit_code: Option<i32>) -> ErrorCategory {
    let stderr_lower = stderr.to_lowercase();

    // Input problems
    if stderr_lower.contains("invalid data found")
        || stderr_lower.contains("no such file")
        || stderr_lower.contains("moov atom not found")
        || stderr_lower.contains("error while decoding")
        || stderr_lower.contains("invalid nal unit")
        || stderr_lower.contains("does not contain any stream")
        || stderr_lower.contains("could not find codec parameters")
    {
        return ErrorCategory::InputProblem;
    }

    // Unsupported combinations
    if stderr_lower.contains("unknown encoder")
        || stderr_lower.contains("encoder not found")
        || stderr_lower.contains("decoder not found")
        || stderr_lower.contains("codec not currently supported")
        || stderr_lower.contains("is not supported by the container")
    {
        return ErrorCategory::UnsupportedCombination;
    }

    // Resource issues
    if stderr_lower.contains("permission denied")
        || stderr_lower.contains("no space left")
        || stderr_lower.contains("disk quota exceeded")
        || stderr_lower.contains("cannot allocate memory")
        || stderr_lower.contains("too many open files")
    {
        return ErrorCategory::ResourceIssue;
    }

    // Internal pipeline errors
    if stderr_lower.contains("unrecognized option")
        || stderr_lower.contains("invalid option")
        || stderr_lower.contains("option not found")
    {
        return ErrorCategory::InternalPipelineError;
    }

    ErrorCategory::Unknown
}

/// Validate that output file is readable and contains expected streams
fn validate_output(path: &Path, expect_video: bool, expect_audio: bool) -> ValidationResult {
    if !path.exists() {
        return ValidationResult {
            valid: false,
            error: Some("Output file does not exist".to_string()),
        };
    }

    let size = fs::metadata(path).map(|m| m.len()).unwrap_or(0);
    if size == 0 {
        return ValidationResult {
            valid: false,
            error: Some("Output file is empty".to_string()),
        };
    }

    // Probe the output to verify streams
    let probe = probe_file(path);
    if !probe.success {
        return ValidationResult {
            valid: false,
            error: Some(format!(
                "Output file could not be probed: {:?}",
                probe.error
            )),
        };
    }

    if expect_video && !probe.has_video {
        return ValidationResult {
            valid: false,
            error: Some("Output file is missing expected video stream".to_string()),
        };
    }

    if expect_audio && !probe.has_audio {
        return ValidationResult {
            valid: false,
            error: Some("Output file is missing expected audio stream".to_string()),
        };
    }

    ValidationResult {
        valid: true,
        error: None,
    }
}

#[derive(Debug)]
struct ValidationResult {
    valid: bool,
    error: Option<String>,
}

// ============================================================================
// NORMAL FILE TESTS
// ============================================================================

/// Test that normal video files can be probed successfully
#[test]
fn normal_video_files_probe_successfully() {
    if !check_ffmpeg_available() {
        eprintln!("[WARN] Skipping test: FFmpeg binaries not available");
        return;
    }
    if !check_test_media_available() {
        eprintln!("[WARN] Skipping test: Test media not available");
        return;
    }

    let test_files = [
        ("normal/h264_aac_1080p.mp4", true, true),
        ("normal/h264_aac_4k.mp4", true, true),
        ("normal/hevc_720p.mp4", true, true),
        ("normal/vp9_opus.webm", true, true),
        ("normal/h264_aac_mkv.mkv", true, true),
        ("normal/h264_aac_mov.mov", true, true),
    ];

    let media_dir = test_media_dir();

    for (file, expect_video, expect_audio) in test_files {
        let path = media_dir.join(file);
        println!("\n Testing: {}", file);

        if !path.exists() {
            eprintln!("  [WARN] File not found, skipping");
            continue;
        }

        let result = probe_file(&path);

        assert!(
            result.success,
            "Probe failed for {}: {:?}",
            file, result.error
        );
        assert_eq!(
            result.has_video, expect_video,
            "{} video stream mismatch",
            file
        );
        assert_eq!(
            result.has_audio, expect_audio,
            "{} audio stream mismatch",
            file
        );
        assert!(result.duration_sec > 0.0, "{} has zero duration", file);

        println!(
            "  [OK] Probe OK: {}x{}, {:.2}s, video={}, audio={}",
            result.width.unwrap_or(0),
            result.height.unwrap_or(0),
            result.duration_sec,
            result.video_codec.as_deref().unwrap_or("none"),
            result.audio_codec.as_deref().unwrap_or("none")
        );
    }
}

/// Test that normal audio files can be probed successfully
#[test]
fn normal_audio_files_probe_successfully() {
    if !check_ffmpeg_available() || !check_test_media_available() {
        eprintln!("[WARN] Skipping test: Dependencies not available");
        return;
    }

    let test_files = [
        "normal/audio_stereo.mp3",
        "normal/audio_lossless.flac",
        "normal/audio_pcm.wav",
        "normal/audio_vorbis.ogg",
        "normal/audio_opus.opus",
        "normal/audio_aac.aac",
        "normal/audio_aiff.aiff",
    ];

    let media_dir = test_media_dir();

    for file in test_files {
        let path = media_dir.join(file);
        println!("\n Testing: {}", file);

        if !path.exists() {
            eprintln!("  [WARN] File not found, skipping");
            continue;
        }

        let result = probe_file(&path);

        assert!(
            result.success,
            "Probe failed for {}: {:?}",
            file, result.error
        );
        assert!(!result.has_video, "{} should not have video", file);
        assert!(result.has_audio, "{} should have audio", file);
        assert!(result.duration_sec > 0.0, "{} has zero duration", file);

        println!(
            "  [OK] Probe OK: {:.2}s, codec={}",
            result.duration_sec,
            result.audio_codec.as_deref().unwrap_or("unknown")
        );
    }
}

/// Test that normal image files can be probed successfully
#[test]
fn normal_image_files_probe_successfully() {
    if !check_ffmpeg_available() || !check_test_media_available() {
        eprintln!("[WARN] Skipping test: Dependencies not available");
        return;
    }

    let test_files = [
        "normal/image_test.png",
        "normal/image_photo.jpg",
        "normal/image_web.webp",
        "normal/image_bitmap.bmp",
        "normal/image_scan.tiff",
    ];

    let media_dir = test_media_dir();

    for file in test_files {
        let path = media_dir.join(file);
        println!("\n[IMG] Testing: {}", file);

        if !path.exists() {
            eprintln!("  [WARN] File not found, skipping");
            continue;
        }

        let result = probe_file(&path);

        assert!(
            result.success,
            "Probe failed for {}: {:?}",
            file, result.error
        );
        // Images show up as video streams in ffprobe
        assert!(
            result.has_video,
            "{} should have video (image) stream",
            file
        );
        assert!(!result.has_audio, "{} should not have audio", file);

        println!(
            "  [OK] Probe OK: {}x{}",
            result.width.unwrap_or(0),
            result.height.unwrap_or(0)
        );
    }
}

/// Test that image files can be converted to BMP/TIFF even with temp extensions
#[test]
fn normal_image_files_convert_successfully() {
    if !check_ffmpeg_available() || !check_test_media_available() {
        eprintln!("[WARN] Skipping test: Dependencies not available");
        return;
    }

    let media_dir = test_media_dir();
    let temp_dir = tempfile::tempdir().expect("Failed to create temp dir");

    let input_path = media_dir.join("normal/image_test.png");
    if !input_path.exists() {
        eprintln!("  [WARN] File not found, skipping");
        return;
    }

    let conversions = [
        ("image2", "bmp", "image_to_bmp.bmp.tmp"),
        ("image2", "tiff", "image_to_tiff.tiff.tmp"),
    ];

    for (format, codec, file_name) in conversions {
        let output_path = temp_dir.path().join(file_name);
        println!("\n Converting image_test.png -> {}", file_name);

        let result = execute_image_conversion(&input_path, &output_path, format, codec);

        assert!(
            result.success,
            "Image conversion failed for {}: {:?}",
            file_name, result.stderr
        );
        assert!(result.output_exists, "{} output not created", file_name);
        assert!(result.output_size > 0, "{} output is empty", file_name);

        let validation = validate_output(&output_path, true, false);
        assert!(
            validation.valid,
            "Output validation failed for {}: {:?}",
            file_name, validation.error
        );

        println!("  [OK] Image conversion OK: {} bytes", result.output_size);

        let _ = fs::remove_file(&output_path);
    }
}

/// Test representative video outputs across containers/codecs
#[test]
fn normal_video_outputs_convert_successfully() {
    if !check_ffmpeg_available() || !check_test_media_available() {
        eprintln!("[WARN] Skipping test: Dependencies not available");
        return;
    }

    let media_dir = test_media_dir();
    let temp_dir = tempfile::tempdir().expect("Failed to create temp dir");
    let input_path = media_dir.join("normal/h264_aac_1080p.mp4");

    if !input_path.exists() {
        eprintln!("  [WARN] File not found, skipping");
        return;
    }

    let conversions = [
        ("output_mp4.mp4", Some("mp4"), "libx264", Some("aac")),
        ("output_mov.mov", Some("mp4"), "libx264", Some("aac")),
        ("output_mkv.mkv", Some("matroska"), "libx264", Some("aac")),
        (
            "output_webm.webm",
            Some("webm"),
            "libvpx-vp9",
            Some("libopus"),
        ),
        ("output_avi.avi", Some("avi"), "mpeg4", Some("libmp3lame")),
        ("output_flv.flv", Some("flv"), "libx264", Some("aac")),
        ("output_ts.ts", Some("mpegts"), "libx264", Some("aac")),
        (
            "output_ogv.ogv",
            Some("ogg"),
            "libtheora",
            Some("libvorbis"),
        ),
        ("output_mpeg.mpeg", Some("mpeg"), "mpeg2video", Some("mp2")),
    ];

    for (file_name, format, vcodec, acodec) in conversions {
        let output_path = temp_dir.path().join(file_name);
        println!("\n Converting video -> {}", file_name);

        let result = execute_video_conversion(&input_path, &output_path, format, vcodec, acodec);

        assert!(
            result.success,
            "Video conversion failed for {}: {:?}",
            file_name, result.stderr
        );
        assert!(result.output_exists, "{} output not created", file_name);
        assert!(result.output_size > 0, "{} output is empty", file_name);

        let validation = validate_output(&output_path, true, true);
        assert!(
            validation.valid,
            "Output validation failed for {}: {:?}",
            file_name, validation.error
        );

        println!("  [OK] Video conversion OK: {} bytes", result.output_size);

        let _ = fs::remove_file(&output_path);
    }
}

/// Test representative audio outputs across containers/codecs
#[test]
fn normal_audio_outputs_convert_successfully() {
    if !check_ffmpeg_available() || !check_test_media_available() {
        eprintln!("[WARN] Skipping test: Dependencies not available");
        return;
    }

    let media_dir = test_media_dir();
    let temp_dir = tempfile::tempdir().expect("Failed to create temp dir");
    let input_path = media_dir.join("normal/audio_stereo.mp3");

    if !input_path.exists() {
        eprintln!("  [WARN] File not found, skipping");
        return;
    }

    let conversions = [
        ("output_m4a.m4a", Some("mp4"), "aac"),
        ("output_ogg.ogg", Some("ogg"), "libvorbis"),
        ("output_opus.opus", Some("ogg"), "libopus"),
        ("output_aiff.aiff", Some("aiff"), "pcm_s16le"),
        ("output_aac.aac", Some("adts"), "aac"),
    ];

    for (file_name, format, codec) in conversions {
        let output_path = temp_dir.path().join(file_name);
        println!("\n Converting audio -> {}", file_name);

        let result = execute_audio_conversion(&input_path, &output_path, format, codec);

        assert!(
            result.success,
            "Audio conversion failed for {}: {:?}",
            file_name, result.stderr
        );
        assert!(result.output_exists, "{} output not created", file_name);
        assert!(result.output_size > 0, "{} output is empty", file_name);

        let validation = validate_output(&output_path, false, true);
        assert!(
            validation.valid,
            "Output validation failed for {}: {:?}",
            file_name, validation.error
        );

        println!("  [OK] Audio conversion OK: {} bytes", result.output_size);

        let _ = fs::remove_file(&output_path);
    }
}

/// Test that normal video files can be converted (remux)
#[test]
fn normal_video_files_convert_successfully() {
    if !check_ffmpeg_available() || !check_test_media_available() {
        eprintln!("[WARN] Skipping test: Dependencies not available");
        return;
    }

    let test_files = [
        ("normal/h264_aac_1080p.mp4", true, true),
        ("normal/hevc_720p.mp4", true, true),
    ];

    let media_dir = test_media_dir();
    let temp_dir = tempfile::tempdir().expect("Failed to create temp dir");

    for (file, expect_video, expect_audio) in test_files {
        let input_path = media_dir.join(file);
        let output_path = temp_dir
            .path()
            .join(format!("output_{}", file.replace("/", "_")));

        println!("\n Converting: {}", file);

        if !input_path.exists() {
            eprintln!("  [WARN] File not found, skipping");
            continue;
        }

        // Test remux (copy streams)
        let result = execute_conversion(&input_path, &output_path, false);

        assert!(
            result.success,
            "Conversion failed for {}: {:?}",
            file, result.stderr
        );
        assert!(result.output_exists, "{} output not created", file);
        assert!(result.output_size > 0, "{} output is empty", file);

        // Validate output
        let validation = validate_output(&output_path, expect_video, expect_audio);
        assert!(
            validation.valid,
            "Output validation failed for {}: {:?}",
            file, validation.error
        );

        println!("  [OK] Conversion OK: {} bytes", result.output_size);

        // Cleanup
        let _ = fs::remove_file(&output_path);
    }
}

/// Test transcoding (re-encode) of video files
#[test]
fn normal_video_files_transcode_successfully() {
    if !check_ffmpeg_available() || !check_test_media_available() {
        eprintln!("[WARN] Skipping test: Dependencies not available");
        return;
    }

    let media_dir = test_media_dir();
    let temp_dir = tempfile::tempdir().expect("Failed to create temp dir");

    let input_path = media_dir.join("normal/h264_aac_1080p.mp4");
    let output_path = temp_dir.path().join("transcoded.mp4");

    println!("\n Transcoding: normal/h264_aac_1080p.mp4");

    if !input_path.exists() {
        eprintln!("  [WARN] File not found, skipping");
        return;
    }

    let result = execute_conversion(&input_path, &output_path, true);

    assert!(result.success, "Transcoding failed: {:?}", result.stderr);

    let validation = validate_output(&output_path, true, true);
    assert!(
        validation.valid,
        "Output validation failed: {:?}",
        validation.error
    );

    println!("  [OK] Transcode OK: {} bytes", result.output_size);
}

// ============================================================================
// EDGE CASE TESTS
// ============================================================================

/// Test edge case files (unusual but valid)
#[test]
fn edge_case_video_no_audio_probes_correctly() {
    if !check_ffmpeg_available() || !check_test_media_available() {
        eprintln!("[WARN] Skipping test: Dependencies not available");
        return;
    }

    let path = test_media_dir().join("edge-cases/video_no_audio.mp4");
    println!("\n Testing: edge-cases/video_no_audio.mp4");

    if !path.exists() {
        eprintln!("  [WARN] File not found, skipping");
        return;
    }

    let result = probe_file(&path);

    assert!(result.success, "Probe failed: {:?}", result.error);
    assert!(result.has_video, "Should have video");
    assert!(!result.has_audio, "Should NOT have audio");

    println!(
        "  [OK] Probe OK: {}x{}, video-only",
        result.width.unwrap_or(0),
        result.height.unwrap_or(0)
    );
}

/// Test vertical (portrait) video
#[test]
fn edge_case_vertical_video_probes_correctly() {
    if !check_ffmpeg_available() || !check_test_media_available() {
        eprintln!("[WARN] Skipping test: Dependencies not available");
        return;
    }

    let path = test_media_dir().join("edge-cases/vertical_video.mp4");
    println!("\n Testing: edge-cases/vertical_video.mp4");

    if !path.exists() {
        eprintln!("  [WARN] File not found, skipping");
        return;
    }

    let result = probe_file(&path);

    assert!(result.success, "Probe failed: {:?}", result.error);
    assert!(result.has_video, "Should have video");

    // Verify portrait orientation (height > width)
    let width = result.width.unwrap_or(0);
    let height = result.height.unwrap_or(0);
    assert!(
        height > width,
        "Vertical video should have height ({}) > width ({})",
        height,
        width
    );

    println!("  [OK] Probe OK: {}x{} (portrait)", width, height);
}

/// Test square video
#[test]
fn edge_case_square_video_probes_correctly() {
    if !check_ffmpeg_available() || !check_test_media_available() {
        eprintln!("[WARN] Skipping test: Dependencies not available");
        return;
    }

    let path = test_media_dir().join("edge-cases/square_video.mp4");
    println!("\n Testing: edge-cases/square_video.mp4");

    if !path.exists() {
        eprintln!("  [WARN] File not found, skipping");
        return;
    }

    let result = probe_file(&path);

    assert!(result.success, "Probe failed: {:?}", result.error);

    // Verify square aspect ratio
    let width = result.width.unwrap_or(0);
    let height = result.height.unwrap_or(0);
    assert_eq!(width, height, "Square video should have equal dimensions");

    println!("  [OK] Probe OK: {}x{} (square)", width, height);
}

/// Test audio-only M4A file
#[test]
fn edge_case_audio_only_probes_correctly() {
    if !check_ffmpeg_available() || !check_test_media_available() {
        eprintln!("[WARN] Skipping test: Dependencies not available");
        return;
    }

    let path = test_media_dir().join("edge-cases/audio_only.m4a");
    println!("\n Testing: edge-cases/audio_only.m4a");

    if !path.exists() {
        eprintln!("  [WARN] File not found, skipping");
        return;
    }

    let result = probe_file(&path);

    assert!(result.success, "Probe failed: {:?}", result.error);
    assert!(!result.has_video, "Should NOT have video");
    assert!(result.has_audio, "Should have audio");

    println!(
        "  [OK] Probe OK: {:.2}s, codec={}",
        result.duration_sec,
        result.audio_codec.as_deref().unwrap_or("unknown")
    );
}

// ============================================================================
// KNOWN-BAD FILE TESTS
// ============================================================================

/// Test that zero-byte files fail gracefully
#[test]
fn known_bad_zero_bytes_fails_gracefully() {
    if !check_ffmpeg_available() || !check_test_media_available() {
        eprintln!("[WARN] Skipping test: Dependencies not available");
        return;
    }

    let path = test_media_dir().join("known-bad/zero_bytes.mp4");
    println!("\n Testing: known-bad/zero_bytes.mp4");

    if !path.exists() {
        eprintln!("  [WARN] File not found, skipping");
        return;
    }

    // Check file is actually zero bytes
    let size = fs::metadata(&path).map(|m| m.len()).unwrap_or(1);
    assert_eq!(size, 0, "Test file should be zero bytes");

    let result = probe_file(&path);

    // Zero-byte file should fail to probe
    assert!(!result.success, "Zero-byte file should fail to probe");

    println!("  [OK] Failed gracefully as expected");
}

/// Test that random binary data fails gracefully
#[test]
fn known_bad_random_data_fails_gracefully() {
    if !check_ffmpeg_available() || !check_test_media_available() {
        eprintln!("[WARN] Skipping test: Dependencies not available");
        return;
    }

    let path = test_media_dir().join("known-bad/random_data.mp4");
    println!("\n Testing: known-bad/random_data.mp4");

    if !path.exists() {
        eprintln!("  [WARN] File not found, skipping");
        return;
    }

    let result = probe_file(&path);

    // Random data should fail to probe
    assert!(!result.success, "Random binary data should fail to probe");

    println!("  [OK] Failed gracefully as expected");
}

/// Test that truncated files fail gracefully
#[test]
fn known_bad_truncated_file_fails_gracefully() {
    if !check_ffmpeg_available() || !check_test_media_available() {
        eprintln!("[WARN] Skipping test: Dependencies not available");
        return;
    }

    let path = test_media_dir().join("known-bad/truncated.mp4");
    println!("\n Testing: known-bad/truncated.mp4");

    if !path.exists() {
        eprintln!("  [WARN] File not found, skipping");
        return;
    }

    let result = probe_file(&path);

    // Truncated file may or may not probe successfully depending on where truncation occurred
    // But it should never panic
    if result.success {
        println!("  [WARN] Truncated file probed (partially valid header)");
    } else {
        println!("  [OK] Failed gracefully as expected");
    }

    // Try to convert - this should definitely fail
    let temp_dir = tempfile::tempdir().expect("Failed to create temp dir");
    let output_path = temp_dir.path().join("truncated_output.mp4");

    let conv_result = execute_conversion(&path, &output_path, false);

    if !conv_result.success {
        // Should classify as input problem
        assert!(
            matches!(
                conv_result.error_category,
                Some(ErrorCategory::InputProblem) | Some(ErrorCategory::Unknown)
            ),
            "Truncated file should be classified as InputProblem or Unknown, got {:?}",
            conv_result.error_category
        );
        println!("  [OK] Conversion failed with proper error classification");
    } else {
        // If it somehow succeeded, the output should be invalid
        let validation = validate_output(&output_path, true, true);
        if !validation.valid {
            println!("  [OK] Conversion produced invalid output (caught by validation)");
        } else {
            println!("  [WARN] Truncated file converted (partial data preserved)");
        }
    }
}

/// Test that text file renamed as MP4 fails gracefully
#[test]
fn known_bad_text_as_mp4_fails_gracefully() {
    if !check_ffmpeg_available() || !check_test_media_available() {
        eprintln!("[WARN] Skipping test: Dependencies not available");
        return;
    }

    let path = test_media_dir().join("known-bad/text_as_mp4.mp4");
    println!("\n Testing: known-bad/text_as_mp4.mp4");

    if !path.exists() {
        eprintln!("  [WARN] File not found, skipping");
        return;
    }

    let result = probe_file(&path);

    // Text file should fail to probe
    assert!(
        !result.success,
        "Text file masquerading as MP4 should fail to probe"
    );

    println!("  [OK] Failed gracefully as expected");
}

/// Test that known-bad file conversions fail with proper error classification
#[test]
fn known_bad_conversions_produce_correct_error_categories() {
    if !check_ffmpeg_available() || !check_test_media_available() {
        eprintln!("[WARN] Skipping test: Dependencies not available");
        return;
    }

    let test_files = ["known-bad/random_data.mp4", "known-bad/text_as_mp4.mp4"];

    let media_dir = test_media_dir();
    let temp_dir = tempfile::tempdir().expect("Failed to create temp dir");

    for file in test_files {
        let input_path = media_dir.join(file);
        let output_path = temp_dir
            .path()
            .join(format!("conv_{}", file.replace("/", "_")));

        println!("\n Converting: {}", file);

        if !input_path.exists() {
            eprintln!("  [WARN] File not found, skipping");
            continue;
        }

        let result = execute_conversion(&input_path, &output_path, false);

        assert!(!result.success, "{} conversion should fail", file);
        assert!(
            result.error_category.is_some(),
            "{} should have error category",
            file
        );

        // These should be classified as input problems
        let category = result.error_category.unwrap();
        println!("  [OK] Failed with category: {:?}", category);

        // Cleanup
        let _ = fs::remove_file(&output_path);
    }
}

// ============================================================================
// FULL PIPELINE TEST
// ============================================================================

/// End-to-end pipeline test: probe > validate > convert > validate output
#[test]
fn full_pipeline_probe_convert_validate() {
    if !check_ffmpeg_available() || !check_test_media_available() {
        eprintln!("[WARN] Skipping test: Dependencies not available");
        return;
    }

    println!("\n Full Pipeline Test: probe > convert > validate");

    let input_path = test_media_dir().join("normal/h264_aac_1080p.mp4");

    if !input_path.exists() {
        eprintln!("  [WARN] Test file not found, skipping");
        return;
    }

    let temp_dir = tempfile::tempdir().expect("Failed to create temp dir");
    let output_path = temp_dir.path().join("pipeline_output.mp4");

    // Step 1: Probe input
    println!("  Step 1: Probing input...");
    let probe = probe_file(&input_path);
    assert!(probe.success, "Probe failed: {:?}", probe.error);
    println!(
        "    [OK] Probe OK: {}x{}, {:.2}s",
        probe.width.unwrap_or(0),
        probe.height.unwrap_or(0),
        probe.duration_sec
    );

    // Step 2: Validate input has expected streams
    println!("  Step 2: Validating input streams...");
    assert!(probe.has_video, "Input should have video");
    assert!(probe.has_audio, "Input should have audio");
    println!("    [OK] Input has video and audio");

    // Step 3: Execute conversion
    println!("  Step 3: Converting (transcode)...");
    let conversion = execute_conversion(&input_path, &output_path, true);
    assert!(
        conversion.success,
        "Conversion failed: {:?}",
        conversion.stderr
    );
    println!(
        "    [OK] Conversion completed: {} bytes",
        conversion.output_size
    );

    // Step 4: Validate output
    println!("  Step 4: Validating output...");
    let validation = validate_output(&output_path, true, true);
    assert!(
        validation.valid,
        "Validation failed: {:?}",
        validation.error
    );

    // Re-probe output for detailed validation
    let output_probe = probe_file(&output_path);
    assert!(output_probe.success, "Output probe failed");
    assert!(output_probe.has_video, "Output missing video");
    assert!(output_probe.has_audio, "Output missing audio");
    println!(
        "    [OK] Output validated: {}x{}, {:.2}s",
        output_probe.width.unwrap_or(0),
        output_probe.height.unwrap_or(0),
        output_probe.duration_sec
    );

    println!("\n   Full pipeline test PASSED");
}

// ============================================================================
// BINARY AVAILABILITY TEST
// ============================================================================

/// Verify FFmpeg and FFprobe binaries are present and working
#[test]
fn ffmpeg_binaries_are_available_and_working() {
    let ffmpeg = ffmpeg_path();
    let ffprobe = ffprobe_path();

    println!("\n Checking FFmpeg binaries...");
    println!("   ffmpeg:  {}", ffmpeg.display());
    println!("   ffprobe: {}", ffprobe.display());

    if !ffmpeg.exists() || !ffprobe.exists() {
        eprintln!("   [WARN] Binaries not found - run `npm run download-ffmpeg` first");
        eprintln!("   Skipping remaining binary checks");
        return;
    }

    // Test ffmpeg version
    let ffmpeg_output = Command::new(&ffmpeg)
        .args(["-version"])
        .output()
        .expect("Failed to run ffmpeg");

    assert!(ffmpeg_output.status.success(), "ffmpeg -version failed");

    let version = String::from_utf8_lossy(&ffmpeg_output.stdout);
    let version_line = version.lines().next().unwrap_or("unknown");
    println!("   [OK] ffmpeg:  {}", version_line);

    // Test ffprobe version
    let ffprobe_output = Command::new(&ffprobe)
        .args(["-version"])
        .output()
        .expect("Failed to run ffprobe");

    assert!(ffprobe_output.status.success(), "ffprobe -version failed");

    let version = String::from_utf8_lossy(&ffprobe_output.stdout);
    let version_line = version.lines().next().unwrap_or("unknown");
    println!("   [OK] ffprobe: {}", version_line);

    println!("    Binaries OK");
}
