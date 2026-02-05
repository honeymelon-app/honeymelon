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

//! Integration tests for FFmpeg error classification.
//!
//! Tests the error classification module against realistic FFmpeg error messages
//! to ensure proper categorization and user-friendly message generation.

use honeymelon_lib::ffmpeg_errors::{classify_error, ErrorCategory};

// Helper to call classify_error with common defaults
fn classify(exit_code: i32, stderr: &str) -> honeymelon_lib::ffmpeg_errors::ClassifiedError {
    classify_error(Some(exit_code), stderr, false, false)
}

// ============================================================================
// INPUT_PROBLEM Tests
// ============================================================================

#[test]
fn classify_file_not_found() {
    let classified = classify(1, "test.mp4: No such file or directory");
    assert_eq!(classified.category, ErrorCategory::InputProblem);
    assert!(!classified.user_message.is_empty());
}

#[test]
fn classify_invalid_data() {
    let classified = classify(
        1,
        "[mov,mp4,m4a,3gp,3g2,mj2 @ 0x7fa] Invalid data found when processing input",
    );
    assert_eq!(classified.category, ErrorCategory::InputProblem);
}

#[test]
fn classify_corrupted_file() {
    let classified = classify(1, "moov atom not found");
    assert_eq!(classified.category, ErrorCategory::InputProblem);
}

#[test]
fn classify_invalid_header() {
    let classified = classify(1, "Invalid NAL unit size");
    assert_eq!(classified.category, ErrorCategory::InputProblem);
}

// ============================================================================
// UNSUPPORTED_COMBINATION Tests
// ============================================================================

#[test]
fn classify_unsupported_codec() {
    // "Decoder not found" pattern matches UnsupportedCombination
    let classified = classify(1, "Decoder not found for codec hevc");
    assert_eq!(classified.category, ErrorCategory::UnsupportedCombination);
}

#[test]
fn classify_encoder_not_found() {
    let classified = classify(1, "Unknown encoder 'libx265'");
    assert_eq!(classified.category, ErrorCategory::UnsupportedCombination);
}

// ============================================================================
// RESOURCE_ISSUE Tests
// ============================================================================

#[test]
fn classify_disk_full() {
    let classified = classify(1, "No space left on device");
    assert_eq!(classified.category, ErrorCategory::ResourceIssue);
}

#[test]
fn classify_out_of_memory() {
    let classified = classify(1, "Cannot allocate memory");
    assert_eq!(classified.category, ErrorCategory::ResourceIssue);
}

#[test]
fn classify_too_many_open_files() {
    let classified = classify(1, "Too many open files");
    assert_eq!(classified.category, ErrorCategory::ResourceIssue);
}

#[test]
fn classify_read_only_fs() {
    let classified = classify(1, "Read-only file system");
    assert_eq!(classified.category, ErrorCategory::ResourceIssue);
}

#[test]
fn classify_permission_denied() {
    let classified = classify(1, "Permission denied: /protected/file.mp4");
    assert_eq!(classified.category, ErrorCategory::ResourceIssue);
}

// ============================================================================
// CANCELLED Tests
// ============================================================================

#[test]
fn classify_explicit_cancellation() {
    let classified = classify_error(None, "", true, false);
    assert_eq!(classified.category, ErrorCategory::Cancelled);
}

// ============================================================================
// TIMEOUT Tests
// ============================================================================

#[test]
fn classify_explicit_timeout() {
    let classified = classify_error(None, "", false, true);
    assert_eq!(classified.category, ErrorCategory::Timeout);
}

// ============================================================================
// INTERNAL_PIPELINE_ERROR Tests
// ============================================================================

#[test]
fn classify_unrecognized_option() {
    let classified = classify(2, "Unrecognized option 'foobar'");
    assert_eq!(classified.category, ErrorCategory::InternalPipelineError);
}

#[test]
fn classify_invalid_option() {
    let classified = classify(2, "Invalid option value");
    assert_eq!(classified.category, ErrorCategory::InternalPipelineError);
}

// ============================================================================
// User Message Tests
// ============================================================================

#[test]
fn user_messages_are_helpful() {
    // Test each category has a non-empty, user-friendly message
    let categories = [
        ErrorCategory::InputProblem,
        ErrorCategory::UnsupportedCombination,
        ErrorCategory::ResourceIssue,
        ErrorCategory::InternalPipelineError,
        ErrorCategory::Timeout,
        ErrorCategory::Cancelled,
    ];

    for category in categories {
        let msg = category.user_message();
        assert!(!msg.is_empty(), "{:?} should have a message", category);
        // Messages should not expose FFmpeg internals
        assert!(
            !msg.contains("FFmpeg"),
            "{:?} message should not mention FFmpeg",
            category
        );
    }
}

// ============================================================================
// Edge Cases
// ============================================================================

#[test]
fn classify_multiline_stderr() {
    let stderr = r#"
[mp4 @ 0x7fa] Error opening file 'output.mp4'
Error opening output files: Permission denied
"#;
    let classified = classify(1, stderr);
    assert_eq!(classified.category, ErrorCategory::ResourceIssue);
}

#[test]
fn classify_empty_stderr_uses_exit_code() {
    // Exit code 1 with empty stderr should use exit code heuristics
    let classified = classify(1, "");
    assert_eq!(classified.category, ErrorCategory::InputProblem);
}

#[test]
fn classify_exit_code_2_is_internal() {
    // Exit code 2 typically means invalid arguments
    let classified = classify(2, "");
    assert_eq!(classified.category, ErrorCategory::InternalPipelineError);
}

#[test]
fn classify_unknown_exit_code() {
    let classified = classify(255, "Unknown error");
    assert_eq!(classified.category, ErrorCategory::Unknown);
}

// ============================================================================
// Technical Details Extraction
// ============================================================================

#[test]
fn technical_details_filters_progress_lines() {
    let stderr = "frame=100\nfps=30\nError: something went wrong\nspeed=1.5x";
    let classified = classify(1, stderr);

    if let Some(details) = &classified.technical_details {
        assert!(
            details.contains("Error: something went wrong"),
            "Should keep error lines"
        );
        assert!(!details.contains("frame="), "Should filter frame= lines");
        assert!(!details.contains("fps="), "Should filter fps= lines");
        assert!(!details.contains("speed="), "Should filter speed= lines");
    }
}
