use tauri::{AppHandle, State};

use crate::{error::AppError, license::LicenseInfo, services::ServiceRegistry};

/// Application version for activation requests.
const APP_VERSION: &str = env!("CARGO_PKG_VERSION");

#[tauri::command]
pub async fn verify_license_key(
    services: State<'_, ServiceRegistry>,
    key: String,
) -> Result<LicenseInfo, AppError> {
    let licensing = services.inner().licensing.clone();
    licensing.verify(&key)
}

/// Activate a license via the platform API.
/// This performs a one-time online activation and stores the result locally.
/// After this, the app runs fully offline.
#[tauri::command]
pub async fn activate_license(
    app: AppHandle,
    services: State<'_, ServiceRegistry>,
    key: String,
) -> Result<LicenseInfo, AppError> {
    let licensing = services.inner().licensing.clone();
    licensing.activate_online(&app, &key, APP_VERSION)
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

/// Check if the app has already been activated.
/// This is a purely local check - no network calls.
#[tauri::command]
pub async fn is_license_activated(
    app: AppHandle,
    services: State<'_, ServiceRegistry>,
) -> Result<bool, AppError> {
    let licensing = services.inner().licensing.clone();
    licensing.is_activated(&app)
}
