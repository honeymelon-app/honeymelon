use super::{
    concurrency::ConcurrencyManager,
    events::SharedEmitter,
    external::SpawnController,
    job_registry::{JobRecord, JobRegistry},
    output_manager::OutputManager,
    progress_monitor::{ProgressMonitor, RunningProcess},
    validator::JobValidator,
};
use crate::error::AppError;
use std::sync::Arc;
use tauri::AppHandle;

/// Coordinates FFmpeg job lifecycle and collaboration between subsystems.
pub struct JobCoordinator {
    registry: Arc<JobRegistry>,
    concurrency: ConcurrencyManager,
    spawner: Arc<dyn SpawnController>,
}

impl JobCoordinator {
    pub fn with_spawner(spawner: Arc<dyn SpawnController>) -> Self {
        Self {
            registry: Arc::new(JobRegistry::new()),
            concurrency: ConcurrencyManager::new(),
            spawner,
        }
    }

    pub fn start_job(
        &self,
        app: AppHandle,
        emitter: SharedEmitter,
        job_id: String,
        args: Vec<String>,
        output_path: String,
        exclusive: bool,
    ) -> Result<(), AppError> {
        let validator = JobValidator::new();
        validator.validate_args(&args)?;

        let ffmpeg_path = self.spawner.resolve_ffmpeg(&app)?;
        let (final_path, temp_path) = self.spawner.prepare_output(&output_path, exclusive)?;
        let temp_arg = temp_path
            .to_str()
            .ok_or_else(|| {
                AppError::new("job_output_invalid", "Output path contains invalid UTF-8")
            })?
            .to_string();

        let mut child = self.spawner.spawn_job(ffmpeg_path, &args, &temp_arg)?;

        let stderr = child.stderr.take();
        let process = Arc::new(RunningProcess::new(child, exclusive));
        let record = JobRecord::new(
            Arc::clone(&process),
            final_path.clone(),
            temp_path.clone(),
            exclusive,
        );
        self.registry
            .register(job_id.clone(), record, self.concurrency.get_limit())?;

        if let Ok(mut child_guard) = process.child.lock() {
            if let Some(child) = child_guard.as_mut() {
                child.stderr = stderr;
            }
        }

        let registry = Arc::clone(&self.registry);
        ProgressMonitor::start(emitter, registry, job_id, process, final_path, temp_path);

        Ok(())
    }

    pub fn cancel_job(&self, job_id: &str) -> Result<bool, AppError> {
        let Some(snapshot) = self.registry.snapshot(job_id) else {
            return Ok(false);
        };

        snapshot.process.mark_cancelled();
        let mut child_guard = snapshot.process.child.lock().expect("child mutex poisoned");
        if let Some(child) = child_guard.as_mut() {
            child.kill().map_err(|err| {
                AppError::new(
                    "job_cancel_failed",
                    format!("Failed to cancel job {job_id}: {err}"),
                )
            })?;
            OutputManager::cleanup_temp(&snapshot.temp_path);
            self.registry.remove(job_id);
            return Ok(true);
        }

        Ok(false)
    }

    pub fn set_max_concurrency(&self, limit: usize) {
        self.concurrency.set_limit(limit);
    }
}

impl Clone for JobCoordinator {
    fn clone(&self) -> Self {
        Self {
            registry: Arc::clone(&self.registry),
            concurrency: self.concurrency.clone(),
            spawner: Arc::clone(&self.spawner),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::super::external::DefaultSpawnController;
    use super::*;
    use std::fs;
    use std::process::{Command, Stdio};
    use tempfile::TempDir;

    fn sleeping_process() -> Arc<RunningProcess> {
        let child = Command::new("sh")
            .arg("-c")
            .arg("sleep 5")
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn()
            .expect("spawn sleep");
        Arc::new(RunningProcess::new(child, false))
    }

    #[test]
    fn cancel_job_kills_registered_process() {
        let coordinator = JobCoordinator::with_spawner(Arc::new(DefaultSpawnController::default()));
        let temp = TempDir::new().unwrap();
        let final_path = temp.path().join("final.mp4");
        let temp_path = temp.path().join("final.mp4.tmp");
        fs::File::create(&temp_path).unwrap();
        coordinator
            .registry
            .register(
                "job".into(),
                JobRecord::new(sleeping_process(), final_path, temp_path.clone(), false),
                10,
            )
            .unwrap();

        let cancelled = coordinator.cancel_job("job").expect("cancel call");
        assert!(cancelled);
        assert!(!temp_path.exists(), "temp file should be cleaned");
    }

    #[test]
    fn cancel_job_returns_false_for_unknown_id() {
        let coordinator = JobCoordinator::with_spawner(Arc::new(DefaultSpawnController::default()));
        assert!(!coordinator
            .cancel_job("unknown")
            .expect("cancel call should not fail"));
    }
}
