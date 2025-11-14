use tauri::{AppHandle, State};

use crate::{
    error::AppError, ffmpeg_capabilities::CapabilitySnapshot, ffmpeg_probe::ProbeResponse,
    services::ServiceRegistry,
};

#[tauri::command]
pub async fn load_capabilities(
    app: AppHandle,
    services: State<'_, ServiceRegistry>,
) -> Result<CapabilitySnapshot, AppError> {
    let capability_service = services.inner().capabilities.clone();
    tauri::async_runtime::spawn_blocking(move || capability_service.load(&app))
        .await
        .map_err(|err| AppError::new("capability_thread_join", err.to_string()))?
}

#[tauri::command]
pub async fn probe_media(
    app: AppHandle,
    services: State<'_, ServiceRegistry>,
    path: String,
) -> Result<ProbeResponse, AppError> {
    let probe_service = services.inner().media_probe.clone();
    tauri::async_runtime::spawn_blocking(move || probe_service.probe(&app, &path))
        .await
        .map_err(|err| AppError::new("probe_thread_join", err.to_string()))?
}

#[tauri::command]
pub async fn expand_media_paths(
    services: State<'_, ServiceRegistry>,
    paths: Vec<String>,
) -> Result<Vec<String>, AppError> {
    let path_service = services.inner().paths.clone();
    tauri::async_runtime::spawn_blocking(move || path_service.expand_paths(paths))
        .await
        .map_err(|err| AppError::new("fs_thread_join", err.to_string()))?
}
