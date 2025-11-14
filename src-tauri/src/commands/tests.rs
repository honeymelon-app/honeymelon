use super::jobs;
use crate::{
    error::AppError,
    services::{JobServiceApi, ServiceRegistry},
};
use std::sync::{Arc, Mutex};
use tauri::{test::mock_app, Manager};

#[derive(Default)]
struct MockJobService {
    start_calls: Mutex<Vec<String>>,
    cancel_calls: Mutex<Vec<String>>,
    concurrency: Mutex<Vec<usize>>,
}

impl JobServiceApi for MockJobService {
    fn start_job(
        &self,
        _app: tauri::AppHandle,
        job_id: String,
        _args: Vec<String>,
        _output_path: String,
        _exclusive: bool,
    ) -> Result<(), AppError> {
        self.start_calls.lock().unwrap().push(job_id);
        Ok(())
    }

    fn cancel_job(&self, job_id: &str) -> Result<bool, AppError> {
        self.cancel_calls.lock().unwrap().push(job_id.to_string());
        Ok(true)
    }

    fn set_max_concurrency(&self, limit: usize) {
        self.concurrency.lock().unwrap().push(limit);
    }
}

fn registry_with_job(mock: Arc<dyn JobServiceApi>) -> ServiceRegistry {
    ServiceRegistry {
        jobs: mock,
        ..ServiceRegistry::default()
    }
}

#[test]
fn cancel_and_limit_commands_delegate() {
    let job_service = Arc::new(MockJobService::default());
    let registry = registry_with_job(job_service.clone());

    let app = mock_app();
    app.manage(registry.clone());
    let handle = app.handle();
    tauri::async_runtime::block_on(async {
        let state = handle.state::<ServiceRegistry>();
        let cancelled = jobs::cancel_job(state.clone(), "abc".into())
            .await
            .expect("cancel command");
        assert!(cancelled);
        jobs::set_max_concurrency(state, 4)
            .await
            .expect("limit command");
    });

    assert_eq!(job_service.cancel_calls.lock().unwrap().len(), 1);
    assert_eq!(*job_service.concurrency.lock().unwrap(), vec![4]);
}

#[test]
fn start_job_emits_failure_events() {
    use crate::commands::jobs::{record_failure_for_test, JobFailureTelemetry};

    let app = mock_app();
    let _handle = app.handle();
    record_failure_for_test(JobFailureTelemetry {
        job_id: "job-duplicate".into(),
        stage: "start".into(),
        code: "job_already_running".into(),
        message: "Job is already running".into(),
        args: vec!["-i".into(), "input.mp4".into()],
    });

    let payloads = jobs::take_job_failures();
    assert_eq!(payloads.len(), 1);
    let payload = &payloads[0];
    assert_eq!(payload.job_id, "job-duplicate");
    assert_eq!(payload.code, "job_already_running");
    assert_eq!(payload.stage, "start");
}
