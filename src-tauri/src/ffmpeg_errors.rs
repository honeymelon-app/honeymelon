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

/*!
 * FFmpeg Error Classification Module
 *
 * This module maps low-level FFmpeg errors (exit codes, stderr patterns) to
 * user-friendly error categories. The goal is to provide clear, actionable
 * messages when conversions fail, while keeping technical details available
 * for debugging.
 *
 * # Error Categories
 *
 * - `InputProblem`: File is corrupted, unsupported, or unreadable
 * - `UnsupportedCombination`: Codec/container/option combination not allowed
 * - `ResourceIssue`: Disk full, permission denied, I/O errors
 * - `InternalPipelineError`: Bug in Honeymelon's argument construction
 * - `Timeout`: Job exceeded maximum allowed time
 * - `Cancelled`: User cancelled the job
 * - `Unknown`: Unclassified error
 */

use serde::Serialize;

/// Error categories for user-facing messages.
///
/// Each category maps to a specific user-friendly message that explains
/// what went wrong without exposing internal FFmpeg details.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum ErrorCategory {
    /// Input file is corrupted, unsupported, or unreadable
    InputProblem,
    /// Codec/container/option combination not supported
    UnsupportedCombination,
    /// Disk full, permission errors, or I/O failures
    ResourceIssue,
    /// Bug in argument construction or internal logic
    InternalPipelineError,
    /// Job exceeded maximum allowed time
    Timeout,
    /// User explicitly cancelled the job
    Cancelled,
    /// Output validation failed after FFmpeg reported success
    OutputValidationFailed,
    /// Unclassified error
    Unknown,
}

impl ErrorCategory {
    /// Returns a user-friendly message for this error category.
    ///
    /// Messages are designed to be helpful without being technical.
    pub fn user_message(&self) -> &'static str {
        match self {
            ErrorCategory::InputProblem => {
                "Honeymelon couldn't read this file. It may be corrupted, incomplete, or not a supported media format."
            }
            ErrorCategory::UnsupportedCombination => {
                "These settings aren't supported for this file on your Mac. Try a different preset or container."
            }
            ErrorCategory::ResourceIssue => {
                "Your Mac ran into a resource problem (disk space or permissions) while converting this file."
            }
            ErrorCategory::InternalPipelineError => {
                "Honeymelon hit an internal error while building this conversion. Please send the error details so it can be fixed."
            }
            ErrorCategory::Timeout => {
                "This conversion took too long and was automatically stopped."
            }
            ErrorCategory::Cancelled => {
                "Conversion cancelled."
            }
            ErrorCategory::OutputValidationFailed => {
                "The conversion appeared to complete, but the output file couldn't be verified. The file may be incomplete or corrupted."
            }
            ErrorCategory::Unknown => {
                "Something went wrong during conversion. Check the technical details for more information."
            }
        }
    }

    /// Returns the error code string for this category.
    pub fn code(&self) -> &'static str {
        match self {
            ErrorCategory::InputProblem => "input_problem",
            ErrorCategory::UnsupportedCombination => "unsupported_combination",
            ErrorCategory::ResourceIssue => "resource_issue",
            ErrorCategory::InternalPipelineError => "internal_pipeline_error",
            ErrorCategory::Timeout => "timeout",
            ErrorCategory::Cancelled => "cancelled",
            ErrorCategory::OutputValidationFailed => "output_validation_failed",
            ErrorCategory::Unknown => "unknown_error",
        }
    }
}

/// Classified error result with category, user message, and technical details.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ClassifiedError {
    /// Error category for programmatic handling
    pub category: ErrorCategory,
    /// User-friendly error message
    pub user_message: String,
    /// Technical details (for "show details" expander)
    pub technical_details: Option<String>,
    /// Original exit code if available
    pub exit_code: Option<i32>,
}

impl ClassifiedError {
    /// Creates a new classified error.
    pub fn new(
        category: ErrorCategory,
        technical_details: Option<String>,
        exit_code: Option<i32>,
    ) -> Self {
        Self {
            user_message: category.user_message().to_string(),
            category,
            technical_details,
            exit_code,
        }
    }

    /// Creates a timeout error.
    pub fn timeout(elapsed_seconds: f64, max_seconds: f64) -> Self {
        Self::new(
            ErrorCategory::Timeout,
            Some(format!(
                "Job timed out after {:.1}s (limit: {:.1}s)",
                elapsed_seconds, max_seconds
            )),
            None,
        )
    }

    /// Creates a cancelled error.
    pub fn cancelled() -> Self {
        Self::new(ErrorCategory::Cancelled, None, None)
    }
}

/// Patterns in FFmpeg stderr that indicate specific error categories.
struct StderrPattern {
    pattern: &'static str,
    category: ErrorCategory,
}

/// Known stderr patterns for classification.
///
/// Order matters: more specific patterns should come first.
const STDERR_PATTERNS: &[StderrPattern] = &[
    // Input problems
    StderrPattern {
        pattern: "Invalid data found when processing input",
        category: ErrorCategory::InputProblem,
    },
    StderrPattern {
        pattern: "Could not find codec parameters",
        category: ErrorCategory::InputProblem,
    },
    StderrPattern {
        pattern: "does not contain any stream",
        category: ErrorCategory::InputProblem,
    },
    StderrPattern {
        pattern: "Invalid data found",
        category: ErrorCategory::InputProblem,
    },
    StderrPattern {
        pattern: "No such file or directory",
        category: ErrorCategory::InputProblem,
    },
    StderrPattern {
        pattern: "moov atom not found",
        category: ErrorCategory::InputProblem,
    },
    StderrPattern {
        pattern: "Error while decoding stream",
        category: ErrorCategory::InputProblem,
    },
    StderrPattern {
        pattern: "Discarding packet",
        category: ErrorCategory::InputProblem,
    },
    StderrPattern {
        pattern: "Invalid NAL unit",
        category: ErrorCategory::InputProblem,
    },
    StderrPattern {
        pattern: "Discarding non-keyframe",
        category: ErrorCategory::InputProblem,
    },
    StderrPattern {
        pattern: "Discarding damaged",
        category: ErrorCategory::InputProblem,
    },
    StderrPattern {
        pattern: "concealing errors",
        category: ErrorCategory::InputProblem,
    },
    StderrPattern {
        pattern: "Error opening input",
        category: ErrorCategory::InputProblem,
    },
    StderrPattern {
        pattern: "not a valid media file",
        category: ErrorCategory::InputProblem,
    },
    // Unsupported combinations
    StderrPattern {
        pattern: "Unknown encoder",
        category: ErrorCategory::UnsupportedCombination,
    },
    StderrPattern {
        pattern: "Encoder not found",
        category: ErrorCategory::UnsupportedCombination,
    },
    StderrPattern {
        pattern: "Decoder not found",
        category: ErrorCategory::UnsupportedCombination,
    },
    StderrPattern {
        pattern: "codec not currently supported",
        category: ErrorCategory::UnsupportedCombination,
    },
    StderrPattern {
        pattern: "Requested output format",
        category: ErrorCategory::UnsupportedCombination,
    },
    StderrPattern {
        pattern: "is not supported by the container",
        category: ErrorCategory::UnsupportedCombination,
    },
    StderrPattern {
        pattern: "Only VP8 or VP9",
        category: ErrorCategory::UnsupportedCombination,
    },
    StderrPattern {
        pattern: "Only VP8 or VP9 or AV1",
        category: ErrorCategory::UnsupportedCombination,
    },
    StderrPattern {
        pattern: "Discarding unsupported",
        category: ErrorCategory::UnsupportedCombination,
    },
    StderrPattern {
        pattern: "could not find codec",
        category: ErrorCategory::UnsupportedCombination,
    },
    // Resource issues
    StderrPattern {
        pattern: "Permission denied",
        category: ErrorCategory::ResourceIssue,
    },
    StderrPattern {
        pattern: "No space left on device",
        category: ErrorCategory::ResourceIssue,
    },
    StderrPattern {
        pattern: "Disk quota exceeded",
        category: ErrorCategory::ResourceIssue,
    },
    StderrPattern {
        pattern: "Read-only file system",
        category: ErrorCategory::ResourceIssue,
    },
    StderrPattern {
        pattern: "Cannot allocate memory",
        category: ErrorCategory::ResourceIssue,
    },
    StderrPattern {
        pattern: "Too many open files",
        category: ErrorCategory::ResourceIssue,
    },
    StderrPattern {
        pattern: "I/O error",
        category: ErrorCategory::ResourceIssue,
    },
    StderrPattern {
        pattern: "Input/output error",
        category: ErrorCategory::ResourceIssue,
    },
    // Internal/argument errors
    StderrPattern {
        pattern: "Unrecognized option",
        category: ErrorCategory::InternalPipelineError,
    },
    StderrPattern {
        pattern: "Invalid option",
        category: ErrorCategory::InternalPipelineError,
    },
    StderrPattern {
        pattern: "Option not found",
        category: ErrorCategory::InternalPipelineError,
    },
    StderrPattern {
        pattern: "Error parsing option",
        category: ErrorCategory::InternalPipelineError,
    },
    StderrPattern {
        pattern: "Invalid argument",
        category: ErrorCategory::InternalPipelineError,
    },
];

/// Classifies an FFmpeg error based on exit code and stderr content.
///
/// # Arguments
/// * `exit_code` - FFmpeg process exit code (None if process was killed)
/// * `stderr` - Collected stderr output from FFmpeg
/// * `was_cancelled` - Whether the job was cancelled by the user
/// * `was_timeout` - Whether the job exceeded the timeout limit
///
/// # Returns
/// A `ClassifiedError` with category, user message, and technical details.
///
/// # Example
/// ```
/// use honeymelon_lib::ffmpeg_errors::classify_error;
///
/// let error = classify_error(
///     Some(1),
///     "Invalid data found when processing input",
///     false,
///     false,
/// );
/// assert_eq!(error.category, honeymelon_lib::ffmpeg_errors::ErrorCategory::InputProblem);
/// ```
pub fn classify_error(
    exit_code: Option<i32>,
    stderr: &str,
    was_cancelled: bool,
    was_timeout: bool,
) -> ClassifiedError {
    // Priority 1: Explicit cancellation
    if was_cancelled {
        return ClassifiedError::cancelled();
    }

    // Priority 2: Timeout
    if was_timeout {
        return ClassifiedError::new(
            ErrorCategory::Timeout,
            Some("Job exceeded maximum allowed time".to_string()),
            exit_code,
        );
    }

    // Priority 3: Pattern matching on stderr
    let stderr_lower = stderr.to_lowercase();
    for pattern in STDERR_PATTERNS {
        if stderr_lower.contains(&pattern.pattern.to_lowercase()) {
            return ClassifiedError::new(
                pattern.category,
                extract_relevant_stderr(stderr),
                exit_code,
            );
        }
    }

    // Priority 4: Exit code heuristics
    if let Some(code) = exit_code {
        let category = match code {
            0 => return ClassifiedError::new(ErrorCategory::Unknown, None, Some(0)),
            1 => ErrorCategory::InputProblem, // Most common: encoding failed
            2 => ErrorCategory::InternalPipelineError, // Invalid arguments
            69 => ErrorCategory::ResourceIssue, // Output exists (shouldn't happen with temp files)
            _ => ErrorCategory::Unknown,
        };

        if category != ErrorCategory::Unknown {
            return ClassifiedError::new(category, extract_relevant_stderr(stderr), exit_code);
        }
    }

    // Priority 5: Unknown error
    ClassifiedError::new(
        ErrorCategory::Unknown,
        extract_relevant_stderr(stderr),
        exit_code,
    )
}

/// Extracts the most relevant lines from FFmpeg stderr for display.
///
/// Filters out progress lines and keeps error-related output.
fn extract_relevant_stderr(stderr: &str) -> Option<String> {
    if stderr.is_empty() {
        return None;
    }

    let relevant_lines: Vec<&str> = stderr
        .lines()
        .filter(|line| {
            let trimmed = line.trim();
            // Skip empty lines
            if trimmed.is_empty() {
                return false;
            }
            // Skip progress output
            if trimmed.starts_with("frame=")
                || trimmed.starts_with("fps=")
                || trimmed.starts_with("bitrate=")
                || trimmed.starts_with("out_time=")
                || trimmed.starts_with("speed=")
                || trimmed.starts_with("progress=")
                || trimmed.starts_with("total_size=")
                || trimmed.starts_with("dup_frames=")
                || trimmed.starts_with("drop_frames=")
            {
                return false;
            }
            true
        })
        .take(50) // Limit to 50 lines
        .collect();

    if relevant_lines.is_empty() {
        None
    } else {
        Some(relevant_lines.join("\n"))
    }
}

/// Classifies a probe error for input validation.
///
/// Called when ffprobe fails or returns unexpected results.
pub fn classify_probe_error(
    exit_code: Option<i32>,
    stderr: &str,
    file_size: Option<u64>,
) -> ClassifiedError {
    // Zero-byte file
    if file_size == Some(0) {
        return ClassifiedError::new(
            ErrorCategory::InputProblem,
            Some("File is empty (0 bytes)".to_string()),
            exit_code,
        );
    }

    // Check stderr patterns
    let stderr_lower = stderr.to_lowercase();

    if stderr_lower.contains("invalid data") || stderr_lower.contains("invalid data found") {
        return ClassifiedError::new(
            ErrorCategory::InputProblem,
            Some("File appears to be corrupted or is not a valid media file".to_string()),
            exit_code,
        );
    }

    if stderr_lower.contains("no such file") || stderr_lower.contains("does not exist") {
        return ClassifiedError::new(
            ErrorCategory::InputProblem,
            Some("File not found".to_string()),
            exit_code,
        );
    }

    if stderr_lower.contains("permission denied") {
        return ClassifiedError::new(
            ErrorCategory::ResourceIssue,
            Some("Permission denied when reading file".to_string()),
            exit_code,
        );
    }

    // Generic probe failure
    ClassifiedError::new(
        ErrorCategory::InputProblem,
        extract_relevant_stderr(stderr),
        exit_code,
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_classify_cancelled() {
        let error = classify_error(None, "", true, false);
        assert_eq!(error.category, ErrorCategory::Cancelled);
    }

    #[test]
    fn test_classify_timeout() {
        let error = classify_error(None, "", false, true);
        assert_eq!(error.category, ErrorCategory::Timeout);
    }

    #[test]
    fn test_classify_input_problem_pattern() {
        let error = classify_error(
            Some(1),
            "Invalid data found when processing input",
            false,
            false,
        );
        assert_eq!(error.category, ErrorCategory::InputProblem);
    }

    #[test]
    fn test_classify_unsupported_encoder() {
        let error = classify_error(Some(1), "Unknown encoder 'libfoo'", false, false);
        assert_eq!(error.category, ErrorCategory::UnsupportedCombination);
    }

    #[test]
    fn test_classify_permission_denied() {
        let error = classify_error(Some(1), "Permission denied", false, false);
        assert_eq!(error.category, ErrorCategory::ResourceIssue);
    }

    #[test]
    fn test_classify_disk_full() {
        let error = classify_error(Some(1), "No space left on device", false, false);
        assert_eq!(error.category, ErrorCategory::ResourceIssue);
    }

    #[test]
    fn test_classify_invalid_option() {
        let error = classify_error(Some(2), "Unrecognized option 'foo'", false, false);
        assert_eq!(error.category, ErrorCategory::InternalPipelineError);
    }

    #[test]
    fn test_classify_exit_code_1() {
        let error = classify_error(Some(1), "", false, false);
        assert_eq!(error.category, ErrorCategory::InputProblem);
    }

    #[test]
    fn test_classify_exit_code_2() {
        let error = classify_error(Some(2), "", false, false);
        assert_eq!(error.category, ErrorCategory::InternalPipelineError);
    }

    #[test]
    fn test_classify_unknown() {
        let error = classify_error(Some(99), "some random output", false, false);
        assert_eq!(error.category, ErrorCategory::Unknown);
    }

    #[test]
    fn test_extract_relevant_stderr_filters_progress() {
        let stderr = "frame=100\nfps=30\nError: something went wrong\nspeed=1.5x";
        let relevant = extract_relevant_stderr(stderr);
        assert!(relevant.is_some());
        let text = relevant.unwrap();
        assert!(text.contains("Error: something went wrong"));
        assert!(!text.contains("frame="));
        assert!(!text.contains("fps="));
        assert!(!text.contains("speed="));
    }

    #[test]
    fn test_user_messages_are_helpful() {
        // Ensure messages don't expose internal terms
        for category in [
            ErrorCategory::InputProblem,
            ErrorCategory::UnsupportedCombination,
            ErrorCategory::ResourceIssue,
            ErrorCategory::InternalPipelineError,
            ErrorCategory::Timeout,
            ErrorCategory::Cancelled,
            ErrorCategory::OutputValidationFailed,
            ErrorCategory::Unknown,
        ] {
            let msg = category.user_message();
            assert!(!msg.is_empty());
            assert!(!msg.contains("FFmpeg")); // User-facing should say "Honeymelon"
            assert!(!msg.contains("stderr"));
            assert!(!msg.contains("exit code"));
        }
    }

    #[test]
    fn test_classify_probe_error_zero_byte() {
        let error = classify_probe_error(Some(1), "", Some(0));
        assert_eq!(error.category, ErrorCategory::InputProblem);
        assert!(error.technical_details.unwrap().contains("0 bytes"));
    }

    #[test]
    fn test_classify_probe_error_invalid_data() {
        let error = classify_probe_error(Some(1), "Invalid data found", Some(1024));
        assert_eq!(error.category, ErrorCategory::InputProblem);
    }
}
