/*!
 * Output Validation Module
 *
 * This module validates FFmpeg output files after a conversion completes
 * successfully (exit code 0). It catches cases where FFmpeg reports success
 * but the output file is corrupted, incomplete, or missing expected streams.
 *
 * # Validation Steps
 *
 * 1. File existence check
 * 2. File size check (must be > 0)
 * 3. Quick ffprobe verification of container/streams
 * 4. Stream type validation (matches expected output)
 */

use std::ffi::OsString;
use std::fs;
use std::path::Path;
use std::process::Command;

use tauri::AppHandle;

use crate::binary_resolver::resolve_ffprobe_paths;
use crate::error::AppError;
use crate::ffmpeg_errors::{ClassifiedError, ErrorCategory};

/// Expected output characteristics for validation.
#[derive(Debug, Clone, Default)]
pub struct ExpectedOutput {
    /// Whether the output should have a video stream
    pub has_video: bool,
    /// Whether the output should have an audio stream
    pub has_audio: bool,
    /// Minimum expected file size in bytes (0 = any size > 0)
    pub min_size_bytes: u64,
}

impl ExpectedOutput {
    /// Creates expectations for a video file.
    pub fn video_with_audio() -> Self {
        Self {
            has_video: true,
            has_audio: true,
            min_size_bytes: 0,
        }
    }

    /// Creates expectations for a video-only file.
    pub fn video_only() -> Self {
        Self {
            has_video: true,
            has_audio: false,
            min_size_bytes: 0,
        }
    }

    /// Creates expectations for an audio-only file.
    pub fn audio_only() -> Self {
        Self {
            has_video: false,
            has_audio: true,
            min_size_bytes: 0,
        }
    }

    /// Creates expectations for an image file.
    pub fn image() -> Self {
        Self {
            has_video: true, // Images show up as video streams in ffprobe
            has_audio: false,
            min_size_bytes: 0,
        }
    }
}

/// Result of output validation.
#[derive(Debug)]
pub struct ValidationResult {
    /// Whether validation passed
    pub valid: bool,
    /// File size in bytes
    pub file_size: u64,
    /// Whether video stream was found
    pub has_video: bool,
    /// Whether audio stream was found
    pub has_audio: bool,
    /// Error message if validation failed
    pub error: Option<String>,
}

impl ValidationResult {
    fn success(file_size: u64, has_video: bool, has_audio: bool) -> Self {
        Self {
            valid: true,
            file_size,
            has_video,
            has_audio,
            error: None,
        }
    }

    fn failure(message: impl Into<String>) -> Self {
        Self {
            valid: false,
            file_size: 0,
            has_video: false,
            has_audio: false,
            error: Some(message.into()),
        }
    }
}

/// Validates an FFmpeg output file.
///
/// This function should be called after FFmpeg exits with status 0 but before
/// marking the job as complete. It catches cases where FFmpeg reports success
/// but the output is actually unusable.
///
/// # Arguments
/// * `app` - Tauri app handle for ffprobe resolution
/// * `output_path` - Path to the output file to validate
/// * `expected` - Expected output characteristics
///
/// # Returns
/// `Ok(ValidationResult)` if validation completes (check `result.valid`),
/// or `Err(AppError)` if validation itself fails.
pub fn validate_output(
    app: &AppHandle,
    output_path: &Path,
    expected: &ExpectedOutput,
) -> Result<ValidationResult, AppError> {
    // Step 1: Check file exists
    if !output_path.exists() {
        return Ok(ValidationResult::failure(
            "Output file was not created. The conversion may have failed silently.",
        ));
    }

    // Step 2: Check file size
    let metadata = fs::metadata(output_path).map_err(|err| {
        AppError::new(
            "validation_metadata_error",
            format!("Unable to read output file info: {}", err),
        )
    })?;

    let file_size = metadata.len();
    if file_size == 0 {
        return Ok(ValidationResult::failure(
            "Output file is empty (0 bytes). The conversion may have failed.",
        ));
    }

    if expected.min_size_bytes > 0 && file_size < expected.min_size_bytes {
        return Ok(ValidationResult::failure(format!(
            "Output file is suspiciously small ({} bytes). Expected at least {} bytes.",
            file_size, expected.min_size_bytes
        )));
    }

    // Step 3: Run quick ffprobe check
    let output_path_str = output_path.to_string_lossy();
    match run_quick_ffprobe(app, &output_path_str) {
        Ok(probe_result) => {
            // Step 4: Validate streams match expectations
            if expected.has_video && !probe_result.has_video {
                return Ok(ValidationResult::failure(
                    "Output file is missing expected video stream. The file may be corrupted.",
                ));
            }

            if expected.has_audio && !probe_result.has_audio {
                return Ok(ValidationResult::failure(
                    "Output file is missing expected audio stream. The file may be incomplete.",
                ));
            }

            Ok(ValidationResult::success(
                file_size,
                probe_result.has_video,
                probe_result.has_audio,
            ))
        },
        Err(probe_error) => {
            // ffprobe couldn't read the output - it's likely corrupt
            Ok(ValidationResult::failure(format!(
                "Output file could not be verified: {}",
                probe_error
            )))
        },
    }
}

/// Converts a validation failure to a classified error.
pub fn validation_to_classified_error(result: &ValidationResult) -> ClassifiedError {
    ClassifiedError::new(
        ErrorCategory::OutputValidationFailed,
        result.error.clone(),
        None,
    )
}

/// Quick probe result for validation purposes.
struct QuickProbeResult {
    has_video: bool,
    has_audio: bool,
}

/// Runs a minimal ffprobe check to verify the output is readable.
///
/// Uses minimal ffprobe arguments for speed - we just need to know
/// if the file has valid video/audio streams.
fn run_quick_ffprobe(app: &AppHandle, path: &str) -> Result<QuickProbeResult, String> {
    let candidates = resolve_ffprobe_paths(app);

    for candidate in candidates {
        match run_probe_with_candidate(&candidate, path) {
            Ok(result) => return Ok(result),
            Err(_) => continue, // Try next candidate
        }
    }

    Err("Unable to verify output file - ffprobe not available".to_string())
}

fn run_probe_with_candidate(
    ffprobe_path: &OsString,
    path: &str,
) -> Result<QuickProbeResult, String> {
    let mut command = Command::new(ffprobe_path);
    command.args([
        "-hide_banner",
        "-loglevel",
        "error",
        "-print_format",
        "json",
        "-show_streams",
        "-select_streams",
        "v:0", // First video stream
        path,
    ]);

    let video_output = command.output().map_err(|e| e.to_string())?;
    let has_video = video_output.status.success()
        && String::from_utf8_lossy(&video_output.stdout).contains("\"codec_type\"");

    // Check for audio stream
    let mut audio_command = Command::new(ffprobe_path);
    audio_command.args([
        "-hide_banner",
        "-loglevel",
        "error",
        "-print_format",
        "json",
        "-show_streams",
        "-select_streams",
        "a:0", // First audio stream
        path,
    ]);

    let audio_output = audio_command.output().map_err(|e| e.to_string())?;
    let has_audio = audio_output.status.success()
        && String::from_utf8_lossy(&audio_output.stdout).contains("\"codec_type\"");

    // If neither command found streams, try a general probe
    if !has_video && !has_audio {
        let mut general_command = Command::new(ffprobe_path);
        general_command.args([
            "-hide_banner",
            "-loglevel",
            "error",
            "-print_format",
            "json",
            "-show_streams",
            path,
        ]);

        let general_output = general_command.output().map_err(|e| e.to_string())?;
        if !general_output.status.success() {
            return Err(format!(
                "ffprobe failed: {}",
                String::from_utf8_lossy(&general_output.stderr)
            ));
        }

        // Check what streams exist
        let output_str = String::from_utf8_lossy(&general_output.stdout);
        let found_video = output_str.contains("\"codec_type\": \"video\"")
            || output_str.contains("\"codec_type\":\"video\"");
        let found_audio = output_str.contains("\"codec_type\": \"audio\"")
            || output_str.contains("\"codec_type\":\"audio\"");

        return Ok(QuickProbeResult {
            has_video: found_video,
            has_audio: found_audio,
        });
    }

    Ok(QuickProbeResult {
        has_video,
        has_audio,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_expected_output_presets() {
        let video_audio = ExpectedOutput::video_with_audio();
        assert!(video_audio.has_video);
        assert!(video_audio.has_audio);

        let video_only = ExpectedOutput::video_only();
        assert!(video_only.has_video);
        assert!(!video_only.has_audio);

        let audio_only = ExpectedOutput::audio_only();
        assert!(!audio_only.has_video);
        assert!(audio_only.has_audio);

        let image = ExpectedOutput::image();
        assert!(image.has_video);
        assert!(!image.has_audio);
    }

    #[test]
    fn test_validation_result_success() {
        let result = ValidationResult::success(1024, true, true);
        assert!(result.valid);
        assert_eq!(result.file_size, 1024);
        assert!(result.has_video);
        assert!(result.has_audio);
        assert!(result.error.is_none());
    }

    #[test]
    fn test_validation_result_failure() {
        let result = ValidationResult::failure("Test error");
        assert!(!result.valid);
        assert_eq!(result.file_size, 0);
        assert_eq!(result.error, Some("Test error".to_string()));
    }

    #[test]
    fn test_validation_to_classified_error() {
        let result = ValidationResult::failure("Output missing");
        let classified = validation_to_classified_error(&result);
        assert_eq!(classified.category, ErrorCategory::OutputValidationFailed);
        assert!(classified.technical_details.is_some());
    }
}
