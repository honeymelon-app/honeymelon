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
///
/// Includes both the raw technical information and user-friendly error
/// classification for failed jobs.
#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CompletionPayload {
    /// Unique job identifier
    pub job_id: String,
    /// Whether the job completed successfully
    pub success: bool,
    /// Whether the job was cancelled by the user
    pub cancelled: bool,
    /// Whether the job was terminated due to timeout
    #[serde(default)]
    pub timed_out: bool,
    /// FFmpeg process exit code (if available)
    pub exit_code: Option<i32>,
    /// Unix signal that terminated the process (if applicable)
    pub signal: Option<i32>,
    /// Internal status code for programmatic handling
    pub code: String,
    /// Technical error message (for logging/debugging)
    pub message: Option<String>,
    /// Recent FFmpeg stderr lines (for "show details" UI)
    pub logs: Vec<String>,
    /// Error category code (e.g., "input_problem", "resource_issue")
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error_category: Option<String>,
    /// User-friendly error message for display in UI
    #[serde(skip_serializing_if = "Option::is_none")]
    pub user_message: Option<String>,
    /// Technical details for advanced users (ffmpeg stderr excerpts)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub technical_details: Option<String>,
}

/// Shared alias for trait objects.
pub type SharedEmitter = Arc<dyn ProgressEmitter>;
