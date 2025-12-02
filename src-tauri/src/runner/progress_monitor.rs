use crate::error::AppError;
use crate::ffmpeg_errors::{classify_error, ClassifiedError, ErrorCategory};
use std::collections::VecDeque;
use std::io::{BufRead, BufReader};
use std::path::{Path, PathBuf};
use std::process::{Child, ExitStatus};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Instant;

use super::{
    events::{CompletionPayload, ProgressMetrics, ProgressPayload, SharedEmitter},
    job_registry::JobRegistry,
    output_manager::OutputManager,
    output_validator::{validate_output, validation_to_classified_error, ExpectedOutput},
};
use tauri::AppHandle;

/// Wrapper around an active FFmpeg child process with management metadata
pub struct RunningProcess {
    /// The actual FFmpeg child process handle
    pub child: Mutex<Option<Child>>,
    /// Atomic flag indicating if the process has been cancelled
    pub cancelled: AtomicBool,
    /// Atomic flag indicating if the process timed out
    pub timed_out: AtomicBool,
    /// Whether this job requires exclusive execution while running
    exclusive: AtomicBool,
    /// Circular buffer of recent log lines
    pub logs: Mutex<VecDeque<String>>,
    /// When the process started (for timeout tracking)
    pub started_at: Instant,
    /// Whether output should have video
    pub expects_video: AtomicBool,
    /// Whether output should have audio
    pub expects_audio: AtomicBool,
}
impl RunningProcess {
    pub fn new(child: Child, exclusive: bool) -> Self {
        Self {
            child: Mutex::new(Some(child)),
            cancelled: AtomicBool::new(false),
            timed_out: AtomicBool::new(false),
            exclusive: AtomicBool::new(exclusive),
            logs: Mutex::new(VecDeque::with_capacity(256)),
            started_at: Instant::now(),
            expects_video: AtomicBool::new(true),
            expects_audio: AtomicBool::new(true),
        }
    }

    /// Sets expected output streams for validation
    pub fn set_expected_streams(&self, video: bool, audio: bool) {
        self.expects_video.store(video, Ordering::SeqCst);
        self.expects_audio.store(audio, Ordering::SeqCst);
    }

    /// Gets expected output configuration
    pub fn get_expected_output(&self) -> ExpectedOutput {
        ExpectedOutput {
            has_video: self.expects_video.load(Ordering::SeqCst),
            has_audio: self.expects_audio.load(Ordering::SeqCst),
            min_size_bytes: 0,
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

    pub fn mark_timed_out(&self) {
        self.timed_out.store(true, Ordering::SeqCst);
    }

    pub fn is_timed_out(&self) -> bool {
        self.timed_out.load(Ordering::SeqCst)
    }

    /// Returns elapsed time since process started
    pub fn elapsed_seconds(&self) -> f64 {
        self.started_at.elapsed().as_secs_f64()
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

/// Default timeout: 2 hours in seconds
pub const DEFAULT_TIMEOUT_SECONDS: f64 = 7200.0;

/// Calculates timeout based on media duration.
///
/// Uses a formula: timeout = duration * multiplier + buffer
/// - multiplier: 10x for safety (slow encodes like AV1)
/// - buffer: 5 minutes minimum for setup/finalization
pub fn calculate_timeout(duration_seconds: Option<f64>) -> f64 {
    const MULTIPLIER: f64 = 10.0;
    const BUFFER_SECONDS: f64 = 300.0; // 5 minutes
    const MIN_TIMEOUT: f64 = 600.0; // 10 minutes minimum

    match duration_seconds {
        Some(duration) if duration > 0.0 => {
            let calculated = duration * MULTIPLIER + BUFFER_SECONDS;
            calculated.clamp(MIN_TIMEOUT, DEFAULT_TIMEOUT_SECONDS)
        },
        _ => DEFAULT_TIMEOUT_SECONDS,
    }
}

/// Monitors FFmpeg process progress and completion
pub struct ProgressMonitor;

impl ProgressMonitor {
    /// Starts monitoring an FFmpeg process
    #[allow(clippy::too_many_arguments)]
    pub fn start(
        app: AppHandle,
        emitter: SharedEmitter,
        registry: Arc<JobRegistry>,
        job_id: String,
        process: Arc<RunningProcess>,
        final_path: PathBuf,
        temp_path: PathBuf,
        timeout_seconds: Option<f64>,
    ) {
        tauri::async_runtime::spawn_blocking(move || {
            Self::monitor_process(emitter.clone(), &job_id, &process, timeout_seconds);
            Self::handle_completion(app, emitter, &job_id, &process, &final_path, &temp_path);
            registry.remove(&job_id);
        });
    }

    /// Monitors FFmpeg stderr for progress with optional timeout
    fn monitor_process(
        emitter: SharedEmitter,
        job_id: &str,
        process: &Arc<RunningProcess>,
        timeout_seconds: Option<f64>,
    ) {
        let mut child_guard = process.child.lock().expect("child mutex poisoned");
        let Some(child) = child_guard.as_mut() else {
            return;
        };

        let stderr = match child.stderr.take() {
            Some(s) => s,
            None => return,
        };

        drop(child_guard);

        let timeout = timeout_seconds.unwrap_or(DEFAULT_TIMEOUT_SECONDS);
        let reader = BufReader::new(stderr);

        for line_result in reader.lines() {
            // Check timeout
            if process.elapsed_seconds() > timeout {
                eprintln!("[ffmpeg][{}] Timeout exceeded ({:.1}s)", job_id, timeout);
                process.mark_timed_out();
                // Kill the process
                if let Ok(mut guard) = process.child.lock() {
                    if let Some(ref mut child) = *guard {
                        let _ = child.kill();
                    }
                }
                break;
            }

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

    /// Handles process completion and file finalization with error classification
    fn handle_completion(
        app: AppHandle,
        emitter: SharedEmitter,
        job_id: &str,
        process: &Arc<RunningProcess>,
        final_path: &Path,
        temp_path: &Path,
    ) {
        let exit_status = Self::wait_for_exit(job_id, process);
        let cancelled = process.is_cancelled();
        let timed_out = process.is_timed_out();

        // Collect logs for error classification
        let logs_snapshot: Vec<String> = process
            .logs
            .lock()
            .map(|guard| guard.iter().cloned().collect())
            .unwrap_or_default();
        let stderr_text = logs_snapshot.join("\n");

        let (exit_success, exit_code, signal) = match exit_status {
            Ok(status) => (
                status.success(),
                status.code(),
                Self::extract_signal(&status),
            ),
            Err(err) => {
                process.push_log(&format!("ffmpeg wait error: {}", err.message));
                (false, None, None)
            },
        };

        // Classify the error using our error classification system
        let classified = if cancelled {
            ClassifiedError::cancelled()
        } else if timed_out {
            ClassifiedError::timeout(process.elapsed_seconds(), DEFAULT_TIMEOUT_SECONDS)
        } else if !exit_success {
            classify_error(exit_code, &stderr_text, false, false)
        } else {
            // FFmpeg reported success - but we need to validate output
            ClassifiedError::new(ErrorCategory::Unknown, None, exit_code)
        };

        let mut success = exit_success && !cancelled && !timed_out;
        let mut code = classified.category.code();
        let mut message = if success {
            None
        } else {
            Some(classified.user_message.clone())
        };
        let mut category = Some(classified.category);

        // Finalize or validate output file
        if success {
            // First, validate the output
            let expected = process.get_expected_output();
            match validate_output(&app, final_path.parent().unwrap_or(final_path), &expected) {
                Ok(validation) if !validation.valid => {
                    // Validation failed - treat as error
                    success = false;
                    let validation_error = validation_to_classified_error(&validation);
                    code = validation_error.category.code();
                    message = Some(validation_error.user_message);
                    category = Some(validation_error.category);
                    if let Some(detail) = validation.error {
                        process.push_log(&format!("Output validation failed: {}", detail));
                    }
                    OutputManager::cleanup_temp(temp_path);
                },
                Ok(_) => {
                    // Validation passed - finalize the file
                    if let Err(err) = OutputManager::finalize(temp_path, final_path) {
                        success = false;
                        code = err.code;
                        message = Some(err.message.clone());
                        category = Some(ErrorCategory::ResourceIssue);
                        process.push_log(&err.message);
                    } else {
                        code = "job_complete";
                        category = None; // Success has no error category
                    }
                },
                Err(err) => {
                    // Validation itself failed - log but don't fail the job
                    process.push_log(&format!(
                        "Warning: Could not validate output: {}",
                        err.message
                    ));
                    // Still try to finalize
                    if let Err(err) = OutputManager::finalize(temp_path, final_path) {
                        success = false;
                        code = err.code;
                        message = Some(err.message.clone());
                        category = Some(ErrorCategory::ResourceIssue);
                        process.push_log(&err.message);
                    } else {
                        code = "job_complete";
                        category = None;
                    }
                },
            }
        } else {
            OutputManager::cleanup_temp(temp_path);
        }

        // Set appropriate status codes
        if cancelled {
            code = "job_cancelled";
        } else if timed_out {
            code = "job_timeout";
        }

        // Include technical details in message if available
        if !success && message.is_none() {
            message = classified.technical_details.clone();
        }

        let logs = process.drain_logs();

        let completion = CompletionPayload {
            job_id: job_id.to_string(),
            success,
            cancelled,
            timed_out,
            exit_code,
            signal,
            code: code.to_string(),
            message,
            logs,
            error_category: category.map(|c| c.code().to_string()),
            user_message: if success {
                None
            } else {
                Some(classified.user_message)
            },
            technical_details: classified.technical_details,
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

    #[allow(dead_code)]
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
