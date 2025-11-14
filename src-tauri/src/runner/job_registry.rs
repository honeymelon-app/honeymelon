use super::progress_monitor::RunningProcess;
use crate::error::AppError;
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};

pub struct JobRegistry {
    records: Mutex<HashMap<String, JobRecord>>,
}

impl JobRegistry {
    pub fn new() -> Self {
        Self {
            records: Mutex::new(HashMap::new()),
        }
    }

    pub fn register(
        &self,
        job_id: String,
        record: JobRecord,
        max_concurrency: usize,
    ) -> Result<(), AppError> {
        let mut guard = self.records.lock().expect("job registry poisoned");
        if guard.contains_key(&job_id) {
            return Err(AppError::new(
                "job_already_running",
                format!("Job {job_id} is already running."),
            ));
        }

        if record.exclusive && !guard.is_empty() {
            return Err(AppError::new(
                "job_exclusive_blocked",
                "Exclusive job requested while other jobs are active.",
            ));
        }

        if guard.values().any(|entry| entry.exclusive) {
            return Err(AppError::new(
                "job_exclusive_blocked",
                "Another exclusive job is currently running.",
            ));
        }

        if guard.len() >= max_concurrency.max(1) {
            return Err(AppError::new(
                "job_concurrency_limit",
                format!("Concurrency limit reached ({max_concurrency}); defer job start."),
            ));
        }

        guard.insert(job_id, record);
        Ok(())
    }

    pub fn snapshot(&self, job_id: &str) -> Option<JobSnapshot> {
        let guard = self.records.lock().ok()?;
        guard.get(job_id).map(|record| record.snapshot())
    }

    pub fn remove(&self, job_id: &str) -> Option<JobRecord> {
        let mut guard = self.records.lock().ok()?;
        guard.remove(job_id)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::process::{Command, Stdio};

    fn stub_process() -> Arc<RunningProcess> {
        let child = Command::new("sh")
            .arg("-c")
            .arg("sleep 1")
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn()
            .expect("spawn stub process");
        Arc::new(RunningProcess::new(child, false))
    }

    #[test]
    fn rejects_duplicate_job_ids() {
        let registry = JobRegistry::new();
        registry
            .register(
                "job-1".into(),
                JobRecord::new(stub_process(), PathBuf::new(), PathBuf::new(), false),
                4,
            )
            .expect("first insert");

        let err = registry
            .register(
                "job-1".into(),
                JobRecord::new(stub_process(), PathBuf::new(), PathBuf::new(), false),
                4,
            )
            .expect_err("duplicate should fail");
        assert_eq!(err.code, "job_already_running");
    }

    #[test]
    fn enforces_exclusive_constraints() {
        let registry = JobRegistry::new();
        registry
            .register(
                "shared".into(),
                JobRecord::new(stub_process(), PathBuf::new(), PathBuf::new(), false),
                4,
            )
            .expect("insert shared job");

        let err = registry
            .register(
                "exclusive".into(),
                JobRecord::new(stub_process(), PathBuf::new(), PathBuf::new(), true),
                4,
            )
            .expect_err("exclusive should fail");
        assert_eq!(err.code, "job_exclusive_blocked");
    }

    #[test]
    fn respects_concurrency_limits() {
        let registry = JobRegistry::new();
        registry
            .register(
                "job-a".into(),
                JobRecord::new(stub_process(), PathBuf::new(), PathBuf::new(), false),
                1,
            )
            .expect("insert first job");
        let err = registry
            .register(
                "job-b".into(),
                JobRecord::new(stub_process(), PathBuf::new(), PathBuf::new(), false),
                1,
            )
            .expect_err("should hit limit");
        assert_eq!(err.code, "job_concurrency_limit");
    }
}

pub struct JobRecord {
    pub process: Arc<RunningProcess>,
    #[allow(dead_code)]
    pub final_path: PathBuf,
    pub temp_path: PathBuf,
    pub exclusive: bool,
}

impl JobRecord {
    pub fn new(
        process: Arc<RunningProcess>,
        final_path: PathBuf,
        temp_path: PathBuf,
        exclusive: bool,
    ) -> Self {
        Self {
            process,
            final_path,
            temp_path,
            exclusive,
        }
    }

    fn snapshot(&self) -> JobSnapshot {
        JobSnapshot {
            process: Arc::clone(&self.process),
            temp_path: self.temp_path.clone(),
        }
    }
}

pub struct JobSnapshot {
    pub process: Arc<RunningProcess>,
    pub temp_path: PathBuf,
}
