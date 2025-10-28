use crate::{
    error::AppError,
    ffmpeg_capabilities::candidate_ffmpeg_paths,
};

use once_cell::sync::Lazy;
use serde::Serialize;
use std::{
    collections::{HashMap, VecDeque},
    ffi::OsString,
    fs,
    io::{BufRead, BufReader},
    path::{Path, PathBuf},
    process::{Child, Command, ExitStatus, Stdio},
    sync::{
        atomic::{AtomicBool, AtomicUsize, Ordering},
        Arc, Mutex,
    },
};
use tauri::{AppHandle, Emitter};

pub const PROGRESS_EVENT: &str = "ffmpeg://progress";
pub const COMPLETION_EVENT: &str = "ffmpeg://completion";

static RUNNER: Lazy<FfmpegRunner> = Lazy::new(FfmpegRunner::new);

#[derive(Clone)]
struct FfmpegRunner {
    processes: Arc<Mutex<HashMap<String, Arc<RunningProcess>>>>,
    max_concurrency: Arc<AtomicUsize>,
}

struct RunningProcess {
    child: Mutex<Option<Child>>,
    cancelled: AtomicBool,
    logs: Mutex<VecDeque<String>>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProgressMetrics {
    pub processed_seconds: Option<f64>,
    pub fps: Option<f64>,
    pub speed: Option<f64>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProgressPayload {
    pub job_id: String,
    pub progress: Option<ProgressMetrics>,
    pub raw: String,
}

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

impl RunningProcess {
    fn new(child: Child) -> Self {
        Self {
            child: Mutex::new(Some(child)),
            cancelled: AtomicBool::new(false),
            logs: Mutex::new(VecDeque::with_capacity(256)),
        }
    }

    fn mark_cancelled(&self) {
        self.cancelled.store(true, Ordering::SeqCst);
    }

    fn is_cancelled(&self) -> bool {
        self.cancelled.load(Ordering::SeqCst)
    }

    fn push_log(&self, line: &str) {
        if let Ok(mut logs) = self.logs.lock() {
            if logs.len() >= 500 {
                logs.pop_front();
            }
            logs.push_back(line.to_string());
        }
    }

    fn drain_logs(&self) -> Vec<String> {
        match self.logs.lock() {
            Ok(mut guard) => guard.drain(..).collect(),
            Err(_) => Vec::new(),
        }
    }
}

impl FfmpegRunner {
    fn new() -> Self {
        Self {
            processes: Arc::new(Mutex::new(HashMap::new())),
            max_concurrency: Arc::new(AtomicUsize::new(2)),
        }
    }

    pub fn start_job(
        &self,
        app: AppHandle,
        job_id: String,
        args: Vec<String>,
        output_path: String,
        exclusive: bool,
    ) -> Result<(), AppError> {
        if args.is_empty() {
            return Err(AppError::new(
                "job_invalid_args",
                "FFmpeg arguments must not be empty.",
            ));
        }

        if self.contains(&job_id) {
            return Err(AppError::new(
                "job_already_running",
                format!("Job {job_id} is already running."),
            ));
        }

        let current_active = self.active_count()?;

        if exclusive && current_active > 0 {
            return Err(AppError::new(
                "job_exclusive_blocked",
                "Exclusive job requested while other jobs are active.",
            ));
        }

        let limit = self.max_concurrency.load(Ordering::SeqCst).max(1);
        if current_active >= limit {
            return Err(AppError::new(
                "job_concurrency_limit",
                format!("Concurrency limit reached ({limit}); defer job start."),
            ));
        }

        let ffmpeg_path = self
            .resolve_ffmpeg_path(&app)
            .ok_or_else(|| AppError::new("job_ffmpeg_not_found", "Unable to locate ffmpeg executable."))?;

        let output = PathBuf::from(&output_path);
        if let Some(parent) = output.parent() {
            if !parent.as_os_str().is_empty() {
                fs::create_dir_all(parent).map_err(|err| {
                    AppError::new(
                        "job_output_directory",
                        format!(
                            "Failed creating output directory {}: {err}",
                            parent.display()
                        ),
                    )
                })?;
            }
        }

        let temp_file_name = output
            .file_name()
            .and_then(|name| name.to_str())
            .map(|name| format!("{name}.tmp"))
            .unwrap_or_else(|| "output.tmp".to_string());
        let temp_path = output.with_file_name(temp_file_name);
        let temp_arg = temp_path
            .to_str()
            .ok_or_else(|| AppError::new("job_output_invalid", "Output path contains invalid UTF-8"))?
            .to_string();

        let mut command = Command::new(ffmpeg_path);
        command.args(&args);
        command.arg(&temp_arg);
        command.stdin(Stdio::null());
        command.stdout(Stdio::null());
        command.stderr(Stdio::piped());

        let mut child = command
            .spawn()
            .map_err(|err| AppError::new("job_spawn_failed", err.to_string()))?;

        let stderr = child.stderr.take();
        let process = Arc::new(RunningProcess::new(child));

        {
            let mut guard = self
                .processes
                .lock()
                .expect("process mutex poisoned");
            guard.insert(job_id.clone(), Arc::clone(&process));
        }

        let runner = self.clone();
        let final_path = output.clone();
        let temp_capture = temp_path.clone();
        tauri::async_runtime::spawn_blocking(move || {
            if let Some(stderr) = stderr {
                let reader = BufReader::new(stderr);
                for line_result in reader.lines() {
                    let line = match line_result {
                        Ok(value) => value,
                        Err(_) => break,
                    };
                    process.push_log(&line);
                    let payload = ProgressPayload {
                        job_id: job_id.clone(),
                        progress: parse_progress_line(&line),
                        raw: line,
                    };
                    let _ = app.emit(PROGRESS_EVENT, &payload);
                }
            }

            let exit_status = runner.wait_for_exit(&job_id, &process);

            let cancelled = process.is_cancelled();
            let mut code_override: Option<&'static str> = None;
            let mut message_override: Option<String> = None;

            let (mut success, exit_code, signal) = match exit_status {
                Ok(status) => (
                    status.success() && !cancelled,
                    status.code(),
                    extract_signal(&status),
                ),
                Err(err) => {
                    code_override = Some(err.code);
                    let detail = format!("ffmpeg wait error: {}", err.message);
                    process.push_log(&detail);
                    let _ = app.emit(
                        PROGRESS_EVENT,
                        &ProgressPayload {
                            job_id: job_id.clone(),
                            progress: None,
                            raw: detail.clone(),
                        },
                    );
                    message_override = Some(detail);
                    (false, None, None)
                }
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

            if success && !cancelled {
                if final_path.exists() {
                    let _ = fs::remove_file(&final_path);
                }
                if let Err(err) = fs::rename(&temp_capture, &final_path) {
                    success = false;
                    code = "job_finalize_failed";
                    let detail = format!("Failed to finalize output file: {err}");
                    message = Some(detail.clone());
                    process.push_log(&detail);
                }
            } else {
                let _ = fs::remove_file(&temp_capture);
            }

            if !success && !cancelled && message.is_none() {
                if let Some(exit) = exit_code {
                    let detail = format!("ffmpeg exited with status {exit}");
                    message = Some(detail.clone());
                    process.push_log(&detail);
                }
            }

            let logs = process.drain_logs();

            runner.remove(&job_id);

            let completion = CompletionPayload {
                job_id,
                success,
                cancelled,
                exit_code,
                signal,
                code: code.to_string(),
                message,
                logs,
            };

            let _ = app.emit(COMPLETION_EVENT, &completion);
        });

        Ok(())
    }

    pub fn cancel_job(&self, job_id: &str) -> Result<bool, AppError> {
        let process = {
            let guard = self.processes.lock().expect("process mutex poisoned");
            guard.get(job_id).cloned()
        };

        let Some(process) = process else {
            return Ok(false);
        };

        process.mark_cancelled();
        let mut child_guard = process.child.lock().expect("child mutex poisoned");
        if let Some(child) = child_guard.as_mut() {
            child
                .kill()
                .map_err(|err| AppError::new("job_cancel_failed", format!("Failed to cancel job {job_id}: {err}")))?;
            return Ok(true);
        }

        Ok(false)
    }

    fn contains(&self, job_id: &str) -> bool {
        let guard = self.processes.lock().expect("process mutex poisoned");
        guard.contains_key(job_id)
    }

    fn active_count(&self) -> Result<usize, AppError> {
        let guard = self
            .processes
            .lock()
            .map_err(|_| AppError::new("job_registry_poisoned", "process mutex poisoned"))?;
        Ok(guard.len())
    }

    fn remove(&self, job_id: &str) {
        let mut guard = self.processes.lock().expect("process mutex poisoned");
        guard.remove(job_id);
    }

    fn wait_for_exit(
        &self,
        job_id: &str,
        process: &Arc<RunningProcess>,
    ) -> Result<ExitStatus, AppError> {
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

    fn resolve_ffmpeg_path(&self, app: &AppHandle) -> Option<OsString> {
        for candidate in candidate_ffmpeg_paths(app) {
            if Path::new(&candidate).exists() {
                return Some(candidate);
            }
        }
        None
    }

    pub fn set_max_concurrency(&self, limit: usize) {
        self.max_concurrency
            .store(limit.max(1), Ordering::SeqCst);
    }
}

pub fn start_job(
    app: AppHandle,
    job_id: String,
    args: Vec<String>,
    output_path: String,
    exclusive: bool,
) -> Result<(), AppError> {
    RUNNER.start_job(app, job_id, args, output_path, exclusive)
}

pub fn cancel_job(job_id: &str) -> Result<bool, AppError> {
    RUNNER.cancel_job(job_id)
}

pub fn set_max_concurrency(limit: usize) {
    RUNNER.set_max_concurrency(limit);
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

fn parse_progress_line(line: &str) -> Option<ProgressMetrics> {
    if line.trim().is_empty() {
        return None;
    }

    let mut processed_seconds: Option<f64> = None;
    let mut fps: Option<f64> = None;
    let mut speed: Option<f64> = None;

    for token in line.split_whitespace() {
        if let Some(value) = token.strip_prefix("time=") {
            processed_seconds = parse_timecode(value);
        } else if let Some(value) = token.strip_prefix("fps=") {
            fps = value.parse::<f64>().ok();
        } else if let Some(value) = token.strip_prefix("speed=") {
            let cleaned = value.trim_end_matches('x');
            speed = cleaned.parse::<f64>().ok();
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

    let hours: f64 = parts.get(0)?.parse().ok()?;
    let minutes: f64 = parts.get(1)?.parse().ok()?;
    let seconds: f64 = parts.get(2)?.parse().ok()?;

    Some(hours * 3600.0 + minutes * 60.0 + seconds)
}
