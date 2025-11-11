mod concurrency;
mod output_manager;
mod process_spawner;
mod progress_monitor;
mod validator;

use concurrency::ConcurrencyManager;
use output_manager::OutputManager;
use process_spawner::ProcessSpawner;
use progress_monitor::{ProgressMonitor, RunningProcess};
use validator::JobValidator;

use crate::error::AppError;
use once_cell::sync::Lazy;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tauri::AppHandle;

/// Global FFmpeg runner instance
static RUNNER: Lazy<FfmpegRunner> = Lazy::new(FfmpegRunner::new);

/// Central manager for FFmpeg conversion processes
#[derive(Clone)]
pub struct FfmpegRunner {
    processes: Arc<Mutex<HashMap<String, Arc<RunningProcess>>>>,
    concurrency: ConcurrencyManager,
}

impl FfmpegRunner {
    fn new() -> Self {
        Self {
            processes: Arc::new(Mutex::new(HashMap::new())),
            concurrency: ConcurrencyManager::new(),
        }
    }

    /// Starts a new FFmpeg conversion job
    pub fn start_job(
        &self,
        app: AppHandle,
        job_id: String,
        args: Vec<String>,
        output_path: String,
        exclusive: bool,
    ) -> Result<(), AppError> {
        // Validate arguments
        let validator = JobValidator::new();
        validator.validate_args(&args)?;

        // Validate concurrency
        {
            let guard = self.processes.lock().expect("process mutex poisoned");
            validator.validate_concurrency(
                &job_id,
                &guard,
                self.concurrency.get_limit(),
                exclusive,
            )?;
        }

        // Resolve FFmpeg binary
        let ffmpeg_path = ProcessSpawner::resolve_ffmpeg(&app)?;

        // Prepare output paths
        let (final_path, temp_path) = OutputManager::prepare(&output_path, exclusive)?;
        let temp_arg = temp_path
            .to_str()
            .ok_or_else(|| {
                AppError::new("job_output_invalid", "Output path contains invalid UTF-8")
            })?
            .to_string();

        // Spawn FFmpeg process
        let mut child = ProcessSpawner::spawn(ffmpeg_path, &args, &temp_arg)?;

        // Set up monitoring
        let stderr = child.stderr.take();
        let process = Arc::new(RunningProcess::new(child, exclusive));

        // Register process
        {
            let mut guard = self.processes.lock().expect("process mutex poisoned");
            guard.insert(job_id.clone(), Arc::clone(&process));
        }

        // Replace child stderr for monitoring
        if let Ok(mut child_guard) = process.child.lock() {
            if let Some(child) = child_guard.as_mut() {
                child.stderr = stderr;
            }
        }

        // Start monitoring
        let runner = self.clone();
        let monitor_job_id = job_id.clone();
        ProgressMonitor::start(app, job_id, process, final_path, temp_path);

        // Clean up from registry after monitoring completes
        std::thread::spawn(move || {
            std::thread::sleep(std::time::Duration::from_secs(60));
            runner.remove(&monitor_job_id);
        });

        Ok(())
    }

    /// Cancels an active conversion job
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
            child.kill().map_err(|err| {
                AppError::new(
                    "job_cancel_failed",
                    format!("Failed to cancel job {job_id}: {err}"),
                )
            })?;
            return Ok(true);
        }

        Ok(false)
    }

    /// Removes a job from the registry
    fn remove(&self, job_id: &str) {
        let mut guard = self.processes.lock().expect("process mutex poisoned");
        guard.remove(job_id);
    }

    /// Updates concurrency limit
    pub fn set_max_concurrency(&self, limit: usize) {
        self.concurrency.set_limit(limit);
    }
}

/// Public API for starting jobs
pub fn start_job(
    app: AppHandle,
    job_id: String,
    args: Vec<String>,
    output_path: String,
    exclusive: bool,
) -> Result<(), AppError> {
    RUNNER.start_job(app, job_id, args, output_path, exclusive)
}

/// Public API for cancelling jobs
pub fn cancel_job(job_id: &str) -> Result<bool, AppError> {
    RUNNER.cancel_job(job_id)
}

/// Public API for setting concurrency
pub fn set_max_concurrency(limit: usize) {
    RUNNER.set_max_concurrency(limit);
}
