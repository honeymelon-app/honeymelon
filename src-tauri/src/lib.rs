mod error;
mod ffmpeg_capabilities;
mod ffmpeg_probe;
mod ffmpeg_runner;
mod fs_utils;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

use error::AppError;

#[tauri::command]
async fn load_capabilities(
    app: tauri::AppHandle,
) -> Result<ffmpeg_capabilities::CapabilitySnapshot, AppError> {
    tauri::async_runtime::spawn_blocking(move || ffmpeg_capabilities::load_capabilities(&app))
        .await
        .map_err(|err| AppError::new("capability_thread_join", err.to_string()))?
}

#[tauri::command]
async fn probe_media(
    app: tauri::AppHandle,
    path: String,
) -> Result<ffmpeg_probe::ProbeResponse, AppError> {
    tauri::async_runtime::spawn_blocking(move || ffmpeg_probe::probe_media(&app, &path))
        .await
        .map_err(|err| AppError::new("probe_thread_join", err.to_string()))?
}

#[tauri::command]
async fn start_job(
    app: tauri::AppHandle,
    job_id: String,
    args: Vec<String>,
    output_path: String,
    exclusive: bool,
) -> Result<(), AppError> {
    ffmpeg_runner::start_job(app, job_id, args, output_path, exclusive)
}

#[tauri::command]
async fn cancel_job(job_id: String) -> Result<bool, AppError> {
    ffmpeg_runner::cancel_job(&job_id)
}

#[tauri::command]
async fn set_max_concurrency(limit: usize) {
    ffmpeg_runner::set_max_concurrency(limit);
}

#[tauri::command]
async fn expand_media_paths(paths: Vec<String>) -> Result<Vec<String>, AppError> {
    tauri::async_runtime::spawn_blocking(move || fs_utils::expand_media_paths(paths))
        .await
        .map_err(|err| AppError::new("fs_thread_join", err.to_string()))?
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            load_capabilities,
            probe_media,
            start_job,
            cancel_job,
            set_max_concurrency,
            expand_media_paths
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
