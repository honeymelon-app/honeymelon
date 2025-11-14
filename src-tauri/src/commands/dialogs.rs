use tauri::State;

use crate::{
    error::AppError,
    services::{MediaFilter, ServiceRegistry},
};

#[tauri::command]
pub async fn pick_media_files(
    services: State<'_, ServiceRegistry>,
    media_kind: Option<String>,
) -> Result<Vec<String>, AppError> {
    let dialog_service = services.inner().dialogs.clone();
    let filter = MediaFilter::from_kind(media_kind.as_deref());
    spawn_dialog(move || dialog_service.pick_media_files(filter)).await
}

#[tauri::command]
pub async fn choose_output_directory(
    services: State<'_, ServiceRegistry>,
    default_path: Option<String>,
) -> Result<Option<String>, AppError> {
    let dialog_service = services.inner().dialogs.clone();
    spawn_dialog(move || dialog_service.choose_output_directory(default_path)).await
}

async fn spawn_dialog<T>(
    task: impl FnOnce() -> Result<T, AppError> + Send + 'static,
) -> Result<T, AppError>
where
    T: Send + 'static,
{
    tauri::async_runtime::spawn_blocking(task)
        .await
        .map_err(|err| AppError::new("dialog_thread_join", err.to_string()))?
}
