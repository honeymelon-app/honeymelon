use tauri::{AppHandle, State};

use crate::{error::AppError, license::LicenseInfo, services::ServiceRegistry};

#[tauri::command]
pub async fn verify_license_key(
    services: State<'_, ServiceRegistry>,
    key: String,
) -> Result<LicenseInfo, AppError> {
    let licensing = services.inner().licensing.clone();
    licensing.verify(&key)
}

#[tauri::command]
pub async fn activate_license(
    app: AppHandle,
    services: State<'_, ServiceRegistry>,
    key: String,
) -> Result<LicenseInfo, AppError> {
    let licensing = services.inner().licensing.clone();
    licensing.activate(&app, &key)
}

#[tauri::command]
pub async fn current_license(
    app: AppHandle,
    services: State<'_, ServiceRegistry>,
) -> Result<Option<LicenseInfo>, AppError> {
    let licensing = services.inner().licensing.clone();
    licensing.current(&app)
}

#[tauri::command]
pub async fn remove_license(
    app: AppHandle,
    services: State<'_, ServiceRegistry>,
) -> Result<(), AppError> {
    let licensing = services.inner().licensing.clone();
    licensing.remove(&app)
}
