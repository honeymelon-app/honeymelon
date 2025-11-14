use crate::error::AppError;

/// Validates FFmpeg arguments for security and correctness
pub struct JobValidator;

impl JobValidator {
    pub fn new() -> Self {
        Self
    }

    /// Validates that FFmpeg arguments are safe and non-empty
    pub fn validate_args(&self, args: &[String]) -> Result<&Self, AppError> {
        if args.is_empty() {
            return Err(AppError::new(
                "job_invalid_args",
                "FFmpeg arguments must not be empty.",
            ));
        }

        // Security validation: prevent command injection attacks
        for arg in args {
            if arg.contains(';')
                || arg.contains('|')
                || arg.contains('&')
                || arg.starts_with("$(")
                || arg.contains("`")
            {
                return Err(AppError::new(
                    "job_invalid_args",
                    format!("Unsafe argument detected: {}", arg),
                ));
            }
        }

        Ok(self)
    }

    /// Validates concurrency constraints for a job
    #[allow(dead_code)]
    pub fn validate_concurrency(
        &self,
        job_id: &str,
        active_jobs: &std::collections::HashMap<String, std::sync::Arc<super::RunningProcess>>,
        max_concurrency: usize,
        exclusive: bool,
    ) -> Result<&Self, AppError> {
        // Prevent duplicate job IDs
        if active_jobs.contains_key(job_id) {
            return Err(AppError::new(
                "job_already_running",
                format!("Job {job_id} is already running."),
            ));
        }

        let current_active = active_jobs.len();

        // Handle exclusive job requests
        if exclusive && current_active > 0 {
            return Err(AppError::new(
                "job_exclusive_blocked",
                "Exclusive job requested while other jobs are active.",
            ));
        }

        // Prevent new jobs when an existing exclusive job is running
        if active_jobs.values().any(|process| process.is_exclusive()) {
            return Err(AppError::new(
                "job_exclusive_blocked",
                "Another exclusive job is currently running.",
            ));
        }

        // Enforce concurrency limits
        let limit = max_concurrency.max(1);
        if current_active >= limit {
            return Err(AppError::new(
                "job_concurrency_limit",
                format!("Concurrency limit reached ({limit}); defer job start."),
            ));
        }

        Ok(self)
    }
}

impl Default for JobValidator {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::runner::RunningProcess;
    use std::collections::HashMap;
    use std::process::{Command, Stdio};
    use std::sync::Arc;

    #[test]
    fn test_validate_args_empty() {
        let validator = JobValidator::new();
        assert!(validator.validate_args(&[]).is_err());
    }

    #[test]
    fn test_validate_args_injection() {
        let validator = JobValidator::new();
        let dangerous = vec![
            "arg;rm -rf /".to_string(),
            "arg|cat".to_string(),
            "$(whoami)".to_string(),
            "`date`".to_string(),
        ];

        for arg in dangerous {
            assert!(
                validator.validate_args(std::slice::from_ref(&arg)).is_err(),
                "Should reject: {}",
                arg
            );
        }
    }

    #[test]
    fn test_validate_args_safe() {
        let validator = JobValidator::new();
        let safe = vec![
            "-i".to_string(),
            "input.mp4".to_string(),
            "-c:v".to_string(),
        ];

        assert!(validator.validate_args(&safe).is_ok());
    }

    fn stub_process(exclusive: bool) -> Arc<RunningProcess> {
        let child = Command::new("sh")
            .arg("-c")
            .arg("exit 0")
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn()
            .expect("spawn stub child");
        Arc::new(RunningProcess::new(child, exclusive))
    }

    #[test]
    fn test_validate_concurrency_prevents_duplicate_job_ids() {
        let validator = JobValidator::new();
        let mut active = HashMap::new();
        active.insert("job1".to_string(), stub_process(false));

        let result = validator.validate_concurrency("job1", &active, 2, false);
        assert!(result.is_err());
    }

    #[test]
    fn test_validate_concurrency_blocks_exclusive_requests_when_active() {
        let validator = JobValidator::new();
        let mut active = HashMap::new();
        active.insert("job1".to_string(), stub_process(false));

        let result = validator.validate_concurrency("job2", &active, 2, true);
        assert!(result.is_err());
    }

    #[test]
    fn test_validate_concurrency_detects_existing_exclusive_jobs() {
        let validator = JobValidator::new();
        let mut active = HashMap::new();
        active.insert("job1".to_string(), stub_process(true));

        let result = validator.validate_concurrency("job2", &active, 2, false);
        assert!(result.is_err());
    }

    #[test]
    fn test_validate_concurrency_enforces_limit() {
        let validator = JobValidator::new();
        let mut active = HashMap::new();
        active.insert("job1".to_string(), stub_process(false));

        let result = validator.validate_concurrency("job2", &active, 1, false);
        assert!(result.is_err());

        let ok = validator.validate_concurrency("job2", &active, 3, false);
        assert!(ok.is_ok());
    }
}
