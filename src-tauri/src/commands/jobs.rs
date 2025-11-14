#[cfg(test)]
use once_cell::sync::Lazy;
use serde::Serialize;
#[cfg(test)]
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, State};

use crate::{error::AppError, services::ServiceRegistry};

#[tauri::command]
pub async fn start_job(
    app: AppHandle,
    services: State<'_, ServiceRegistry>,
    job_id: String,
    args: Vec<String>,
    output_path: String,
    exclusive: bool,
) -> Result<(), AppError> {
    let jobs = services.inner().jobs.clone();
    match jobs.start_job(
        app.clone(),
        job_id.clone(),
        args.clone(),
        output_path,
        exclusive,
    ) {
        Ok(value) => Ok(value),
        Err(err) => {
            emit_job_failure(
                &app,
                JobFailureTelemetry {
                    job_id,
                    stage: "start".into(),
                    code: err.code.into(),
                    message: err.message.clone(),
                    args,
                },
            );
            Err(err)
        },
    }
}

#[tauri::command]
pub async fn cancel_job(
    services: State<'_, ServiceRegistry>,
    job_id: String,
) -> Result<bool, AppError> {
    let jobs = services.inner().jobs.clone();
    jobs.cancel_job(&job_id)
}

#[tauri::command]
pub async fn set_max_concurrency(
    services: State<'_, ServiceRegistry>,
    limit: usize,
) -> Result<(), AppError> {
    let jobs = services.inner().jobs.clone();
    jobs.set_max_concurrency(limit);
    Ok(())
}

#[derive(Serialize, Clone, Debug)]
pub(crate) struct JobFailureTelemetry {
    pub(crate) job_id: String,
    pub(crate) stage: String,
    pub(crate) code: String,
    pub(crate) message: String,
    pub(crate) args: Vec<String>,
}

#[cfg(test)]
static JOB_FAILURE_EVENTS: Lazy<Mutex<Vec<JobFailureTelemetry>>> =
    Lazy::new(|| Mutex::new(Vec::new()));

fn emit_job_failure(app: &AppHandle, payload: JobFailureTelemetry) {
    #[cfg(test)]
    {
        record_failure_for_test(payload.clone());
    }

    if let Err(err) = app.emit("job://error", &payload) {
        eprintln!(
            "[jobs] failed emitting job failure telemetry for {}: {}",
            payload.job_id, err
        );
    }
}

#[cfg(test)]
pub fn take_job_failures() -> Vec<JobFailureTelemetry> {
    JOB_FAILURE_EVENTS
        .lock()
        .map(|mut guard| guard.drain(..).collect())
        .unwrap_or_default()
}

#[cfg(test)]
pub fn record_failure_for_test(payload: JobFailureTelemetry) {
    JOB_FAILURE_EVENTS.lock().unwrap().push(payload);
}
