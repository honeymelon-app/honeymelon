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
        exit_code: Some(1),
        signal: None,
        code: "job_failed".into(),
        message: Some("ffmpeg exited with status 1".into()),
        logs: vec!["line 1".into(), "line 2".into()],
    };

    let json: Value = serde_json::to_value(&payload).expect("serialize payload");
    assert_eq!(json["jobId"], "job-1");
    assert_eq!(json["code"], "job_failed");
    assert_eq!(json["logs"].as_array().unwrap().len(), 2);
}
