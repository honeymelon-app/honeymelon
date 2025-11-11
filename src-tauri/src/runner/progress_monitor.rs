use crate::error::AppError;
use serde::Serialize;
use serde_json::json;
use std::collections::VecDeque;
use std::io::{BufRead, BufReader};
use std::path::{Path, PathBuf};
use std::process::{Child, ExitStatus};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter};

use super::output_manager::OutputManager;

pub const PROGRESS_EVENT: &str = "ffmpeg://progress";
pub const COMPLETION_EVENT: &str = "ffmpeg://completion";
pub const STDERR_EVENT: &str = "ffmpeg://stderr";

/// Wrapper around an active FFmpeg child process with management metadata
pub struct RunningProcess {
    /// The actual FFmpeg child process handle
    pub child: Mutex<Option<Child>>,
    /// Atomic flag indicating if the process has been cancelled
    pub cancelled: AtomicBool,
    /// Circular buffer of recent log lines
    pub logs: Mutex<VecDeque<String>>,
}
impl RunningProcess {
    pub fn new(child: Child) -> Self {
        Self {
            child: Mutex::new(Some(child)),
            cancelled: AtomicBool::new(false),
            logs: Mutex::new(VecDeque::with_capacity(256)),
        }
    }

    // `new_mock` removed: no longer required by local tests. Use real `Child` in
    // integration tests or create small test helpers inside those test modules.

    pub fn mark_cancelled(&self) {
        self.cancelled.store(true, Ordering::SeqCst);
    }

    pub fn is_cancelled(&self) -> bool {
        self.cancelled.load(Ordering::SeqCst)
    }

    pub fn push_log(&self, line: &str) {
        if let Ok(mut logs) = self.logs.lock() {
            if logs.len() >= 500 {
                logs.pop_front();
            }
            logs.push_back(line.to_string());
        }
    }

    pub fn drain_logs(&self) -> Vec<String> {
        match self.logs.lock() {
            Ok(mut guard) => guard.drain(..).collect(),
            Err(_) => Vec::new(),
        }
    }
}

/// Parsed progress metrics extracted from FFmpeg output
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProgressMetrics {
    pub processed_seconds: Option<f64>,
    pub fps: Option<f64>,
    pub speed: Option<f64>,
}

/// Payload for progress update events
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProgressPayload {
    pub job_id: String,
    pub progress: Option<ProgressMetrics>,
    pub raw: String,
}

/// Payload for job completion events
#[derive(Debug, Serialize)]
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

/// Monitors FFmpeg process progress and completion
pub struct ProgressMonitor;

impl ProgressMonitor {
    /// Starts monitoring an FFmpeg process
    pub fn start(
        app: AppHandle,
        job_id: String,
        process: Arc<RunningProcess>,
        final_path: PathBuf,
        temp_path: PathBuf,
    ) {
        tauri::async_runtime::spawn_blocking(move || {
            Self::monitor_process(&app, &job_id, &process);
            Self::handle_completion(&app, &job_id, &process, &final_path, &temp_path);
        });
    }

    /// Monitors FFmpeg stderr for progress
    fn monitor_process(app: &AppHandle, job_id: &str, process: &Arc<RunningProcess>) {
        let mut child_guard = process.child.lock().expect("child mutex poisoned");
        let Some(child) = child_guard.as_mut() else {
            return;
        };

        let stderr = match child.stderr.take() {
            Some(s) => s,
            None => return,
        };

        drop(child_guard);

        let reader = BufReader::new(stderr);
        for line_result in reader.lines() {
            let line = match line_result {
                Ok(value) => value,
                Err(_) => break,
            };

            eprintln!("[ffmpeg][{}] {}", job_id, line);

            // Emit raw stderr
            let _ = app.emit(
                STDERR_EVENT,
                json!({
                    "jobId": job_id,
                    "line": line.clone(),
                }),
            );

            process.push_log(&line);

            // Parse and emit progress
            let progress = Self::parse_progress_line(&line);
            if progress.is_some() {
                eprintln!("[ffmpeg-progress][{}] {:?}", job_id, progress);
            }
            let payload = ProgressPayload {
                job_id: job_id.to_string(),
                progress,
                raw: line,
            };
            let _ = app.emit(PROGRESS_EVENT, &payload);
        }
    }

    /// Handles process completion and file finalization
    fn handle_completion(
        app: &AppHandle,
        job_id: &str,
        process: &Arc<RunningProcess>,
        final_path: &Path,
        temp_path: &Path,
    ) {
        let exit_status = Self::wait_for_exit(job_id, process);
        let cancelled = process.is_cancelled();
        let mut code_override: Option<&'static str> = None;
        let mut message_override: Option<String> = None;

        let (mut success, exit_code, signal) = match exit_status {
            Ok(status) => (
                status.success() && !cancelled,
                status.code(),
                Self::extract_signal(&status),
            ),
            Err(err) => {
                code_override = Some(err.code);
                let detail = format!("ffmpeg wait error: {}", err.message);
                process.push_log(&detail);
                let _ = app.emit(
                    PROGRESS_EVENT,
                    &ProgressPayload {
                        job_id: job_id.to_string(),
                        progress: None,
                        raw: detail.clone(),
                    },
                );
                message_override = Some(detail);
                (false, None, None)
            },
        };

        let mut message = message_override;
        let mut code = if let Some(code) = code_override {
            code
        } else if cancelled {
            "job_cancelled"
        } else if success {
            "job_complete"
        } else {
            "job_failed"
        };

        // Finalize output file
        if success && !cancelled {
            if let Err(err) = OutputManager::finalize(temp_path, final_path) {
                success = false;
                code = err.code;
                message = Some(err.message.clone());
                process.push_log(&err.message);
            }
        } else {
            OutputManager::cleanup_temp(temp_path);
        }

        // Generate error message if needed
        if !success && !cancelled && message.is_none() {
            if let Some(exit) = exit_code {
                let detail = if let Some(explanation) = Self::explain_ffmpeg_exit_code(exit) {
                    format!("ffmpeg exited with status {exit}: {explanation}")
                } else {
                    format!("ffmpeg exited with status {exit}")
                };
                message = Some(detail.clone());
                process.push_log(&detail);
            }
        }

        let logs = process.drain_logs();

        let completion = CompletionPayload {
            job_id: job_id.to_string(),
            success,
            cancelled,
            exit_code,
            signal,
            code: code.to_string(),
            message,
            logs,
        };

        let _ = app.emit(COMPLETION_EVENT, &completion);
    }

    fn wait_for_exit(job_id: &str, process: &Arc<RunningProcess>) -> Result<ExitStatus, AppError> {
        let mut child_guard = process.child.lock().expect("child mutex poisoned");
        let Some(mut child) = child_guard.take() else {
            return Err(AppError::new(
                "job_missing_child",
                format!("Job {job_id} missing child process handle."),
            ));
        };

        child
            .wait()
            .map_err(|err| AppError::new("job_wait_failed", err.to_string()))
    }

    fn parse_progress_line(line: &str) -> Option<ProgressMetrics> {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            return None;
        }

        let mut processed_seconds: Option<f64> = None;
        let mut fps: Option<f64> = None;
        let mut speed: Option<f64> = None;

        if let Some(value) = trimmed.strip_prefix("out_time=") {
            processed_seconds = Self::parse_timecode(value);
        } else if let Some(value) = trimmed.strip_prefix("fps=") {
            fps = value.parse::<f64>().ok();
        } else if let Some(value) = trimmed.strip_prefix("speed=") {
            let cleaned = value.trim_end_matches('x').trim();
            speed = cleaned.parse::<f64>().ok();
        } else {
            for token in trimmed.split_whitespace() {
                if let Some(value) = token.strip_prefix("time=") {
                    processed_seconds = Self::parse_timecode(value);
                } else if let Some(value) = token.strip_prefix("out_time=") {
                    processed_seconds = Self::parse_timecode(value);
                } else if let Some(value) = token.strip_prefix("fps=") {
                    fps = value.parse::<f64>().ok();
                } else if let Some(value) = token.strip_prefix("speed=") {
                    let cleaned = value.trim_end_matches('x').trim();
                    speed = cleaned.parse::<f64>().ok();
                }
            }
        }

        if processed_seconds.is_none() && fps.is_none() && speed.is_none() {
            return None;
        }

        Some(ProgressMetrics {
            processed_seconds,
            fps,
            speed,
        })
    }

    fn parse_timecode(value: &str) -> Option<f64> {
        if value.is_empty() {
            return None;
        }

        let parts: Vec<&str> = value.split(':').collect();
        if parts.len() != 3 {
            return value.parse::<f64>().ok();
        }

        let hours: f64 = parts.first()?.parse().ok()?;
        let minutes: f64 = parts.get(1)?.parse().ok()?;
        let seconds: f64 = parts.get(2)?.parse().ok()?;

        Some(hours * 3600.0 + minutes * 60.0 + seconds)
    }

    fn explain_ffmpeg_exit_code(code: i32) -> Option<&'static str> {
        match code {
            1 => Some("Encoding failed. Check input file format and codec support."),
            2 => Some("Invalid FFmpeg arguments. Please report this issue."),
            69 => Some("Output file already exists and cannot be overwritten."),
            _ => None,
        }
    }

    fn extract_signal(status: &ExitStatus) -> Option<i32> {
        #[cfg(unix)]
        {
            use std::os::unix::process::ExitStatusExt;
            status.signal()
        }
        #[cfg(not(unix))]
        {
            let _ = status;
            None
        }
    }
}
