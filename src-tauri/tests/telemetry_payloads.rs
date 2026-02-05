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

use honeymelon_lib::{CompletionPayload, ProgressMetrics, ProgressPayload};
use serde_json::{json, Value};

#[test]
fn progress_payload_serializes_expected_fields() {
    let payload = ProgressPayload {
        job_id: "job-1".into(),
        progress: Some(ProgressMetrics {
            processed_seconds: Some(42.0),
            fps: Some(29.97),
            speed: Some(1.25),
        }),
        raw: "frame=100 fps=29.97 time=00:00:42.00 speed=1.25x".into(),
    };

    let json = serde_json::to_value(&payload).expect("serialize payload");
    assert_eq!(json["jobId"], "job-1");
    assert_eq!(json["raw"], payload.raw);
    assert_eq!(json["progress"]["fps"], json!(29.97));
}

#[test]
fn completion_payload_includes_logs_and_status() {
    let payload = CompletionPayload {
        job_id: "job-1".into(),
        success: false,
        cancelled: false,
        timed_out: false,
        exit_code: Some(1),
        signal: None,
        code: "job_failed".into(),
        message: Some("ffmpeg exited with status 1".into()),
        logs: vec!["line 1".into(), "line 2".into()],
        error_category: Some("input_problem".into()),
        user_message: Some("The input file could not be read.".into()),
        technical_details: Some("Invalid data found when processing input".into()),
    };

    let json: Value = serde_json::to_value(&payload).expect("serialize payload");
    assert_eq!(json["jobId"], "job-1");
    assert_eq!(json["code"], "job_failed");
    assert_eq!(json["logs"].as_array().unwrap().len(), 2);
    assert_eq!(json["errorCategory"], "input_problem");
    assert_eq!(json["userMessage"], "The input file could not be read.");
}

#[test]
fn completion_payload_omits_optional_fields_when_none() {
    let payload = CompletionPayload {
        job_id: "job-2".into(),
        success: true,
        cancelled: false,
        timed_out: false,
        exit_code: Some(0),
        signal: None,
        code: "job_completed".into(),
        message: None,
        logs: vec![],
        error_category: None,
        user_message: None,
        technical_details: None,
    };

    let json: Value = serde_json::to_value(&payload).expect("serialize payload");
    assert_eq!(json["success"], true);
    // Optional fields should not be present
    assert!(json.get("errorCategory").is_none());
    assert!(json.get("userMessage").is_none());
    assert!(json.get("technicalDetails").is_none());
}
