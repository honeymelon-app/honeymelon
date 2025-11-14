use crate::error::AppError;
use std::collections::VecDeque;
use std::io::{BufRead, BufReader};
use std::path::{Path, PathBuf};
use std::process::{Child, ExitStatus};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};

use super::{
    events::{CompletionPayload, ProgressMetrics, ProgressPayload, SharedEmitter},
    job_registry::JobRegistry,
    output_manager::OutputManager,
};

/// Wrapper around an active FFmpeg child process with management metadata
pub struct RunningProcess {
    /// The actual FFmpeg child process handle
    pub child: Mutex<Option<Child>>,
    /// Atomic flag indicating if the process has been cancelled
    pub cancelled: AtomicBool,
    /// Whether this job requires exclusive execution while running
    exclusive: AtomicBool,
    /// Circular buffer of recent log lines
    pub logs: Mutex<VecDeque<String>>,
}
impl RunningProcess {
    pub fn new(child: Child, exclusive: bool) -> Self {
        Self {
            child: Mutex::new(Some(child)),
            cancelled: AtomicBool::new(false),
            exclusive: AtomicBool::new(exclusive),
            logs: Mutex::new(VecDeque::with_capacity(256)),
        }
    }

    /// Updates the exclusivity flag, typically when cleaning up
    pub fn set_exclusive(&self, exclusive: bool) {
        self.exclusive.store(exclusive, Ordering::SeqCst);
    }

    #[allow(dead_code)]
    pub fn is_exclusive(&self) -> bool {
        self.exclusive.load(Ordering::SeqCst)
    }

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

/// Monitors FFmpeg process progress and completion
pub struct ProgressMonitor;

impl ProgressMonitor {
    /// Starts monitoring an FFmpeg process
    pub fn start(
        emitter: SharedEmitter,
        registry: Arc<JobRegistry>,
        job_id: String,
        process: Arc<RunningProcess>,
        final_path: PathBuf,
        temp_path: PathBuf,
    ) {
        tauri::async_runtime::spawn_blocking(move || {
            Self::monitor_process(emitter.clone(), &job_id, &process);
            Self::handle_completion(emitter, &job_id, &process, &final_path, &temp_path);
            registry.remove(&job_id);
        });
    }

    /// Monitors FFmpeg stderr for progress
    fn monitor_process(emitter: SharedEmitter, job_id: &str, process: &Arc<RunningProcess>) {
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

            emitter.emit_stderr(job_id, &line);

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
            emitter.emit_progress(&payload);
        }
    }

    /// Handles process completion and file finalization
    fn handle_completion(
        emitter: SharedEmitter,
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
                emitter.emit_progress(&ProgressPayload {
                    job_id: job_id.to_string(),
                    progress: None,
                    raw: detail.clone(),
                });
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

        process.set_exclusive(false);
        emitter.emit_completion(&completion);
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_timecode_supports_hms_and_seconds_only() {
        assert_eq!(ProgressMonitor::parse_timecode("01:02:03"), Some(3723.0));
        assert_eq!(ProgressMonitor::parse_timecode("42.5"), Some(42.5));
        assert_eq!(ProgressMonitor::parse_timecode(""), None);
    }

    #[test]
    fn parse_progress_line_detects_metrics_from_tokens() {
        let line = "frame=10 fps=29.97 q=-1.0 time=00:00:05.00 speed=1.5x";
        let metrics = ProgressMonitor::parse_progress_line(line).expect("metrics");
        assert_eq!(metrics.processed_seconds, Some(5.0));
        assert_eq!(metrics.fps, Some(29.97));
        assert_eq!(metrics.speed, Some(1.5));
    }

    #[test]
    fn explain_exit_code_handles_known_values() {
        assert!(ProgressMonitor::explain_ffmpeg_exit_code(1).is_some());
        assert!(ProgressMonitor::explain_ffmpeg_exit_code(69).is_some());
        assert!(ProgressMonitor::explain_ffmpeg_exit_code(9999).is_none());
    }
}
