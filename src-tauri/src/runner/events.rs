use serde::Serialize;
use std::sync::Arc;
use tauri::{AppHandle, Emitter};

/// Event IDs emitted to the frontend.
pub const PROGRESS_EVENT: &str = "ffmpeg://progress";
pub const COMPLETION_EVENT: &str = "ffmpeg://completion";
pub const STDERR_EVENT: &str = "ffmpeg://stderr";

/// Abstraction over event emission to decouple process monitoring from Tauri.
pub trait ProgressEmitter: Send + Sync {
    fn emit_progress(&self, payload: &ProgressPayload);
    fn emit_completion(&self, payload: &CompletionPayload);
    fn emit_stderr(&self, job_id: &str, line: &str);
}

/// Concrete emitter that forwards events to the Tauri frontend.
pub struct TauriEmitter {
    app: AppHandle,
}

impl TauriEmitter {
    pub fn new(app: AppHandle) -> Self {
        Self { app }
    }
}

impl ProgressEmitter for TauriEmitter {
    fn emit_progress(&self, payload: &ProgressPayload) {
        let _ = self.app.emit(PROGRESS_EVENT, payload);
    }

    fn emit_completion(&self, payload: &CompletionPayload) {
        let _ = self.app.emit(COMPLETION_EVENT, payload);
    }

    fn emit_stderr(&self, job_id: &str, line: &str) {
        let _ = self.app.emit(
            STDERR_EVENT,
            serde_json::json!({
                "jobId": job_id,
                "line": line,
            }),
        );
    }
}

/// Parsed progress metrics extracted from FFmpeg output.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProgressMetrics {
    pub processed_seconds: Option<f64>,
    pub fps: Option<f64>,
    pub speed: Option<f64>,
}

/// Payload for progress update events.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProgressPayload {
    pub job_id: String,
    pub progress: Option<ProgressMetrics>,
    pub raw: String,
}

/// Payload for job completion events.
#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CompletionPayload {
    pub job_id: String,
    pub success: bool,
    pub cancelled: bool,
    pub exit_code: Option<i32>,
    pub signal: Option<i32>,
    pub code: String,
    pub message: Option<String>,
    pub logs: Vec<String>,
}

/// Shared alias for trait objects.
pub type SharedEmitter = Arc<dyn ProgressEmitter>;
