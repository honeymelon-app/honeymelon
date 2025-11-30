use std::future::Future;
use std::pin::Pin;

use tauri::{AppHandle, Emitter};

use crate::{error::AppError, license};

pub trait LicenseServiceApi: Send + Sync {
    fn verify(&self, key: &str) -> Result<license::LicenseInfo, AppError>;
    fn activate_online(
        &self,
        app: &AppHandle,
        key: &str,
        app_version: &str,
    ) -> Pin<Box<dyn Future<Output = Result<license::LicenseInfo, AppError>> + Send + '_>>;
    fn current(&self, app: &AppHandle) -> Result<Option<license::LicenseInfo>, AppError>;
    fn remove(&self, app: &AppHandle) -> Result<(), AppError>;
    fn is_activated(&self, app: &AppHandle) -> Result<bool, AppError>;
}

/// Handles license verification, activation, and persistence flows.
#[derive(Clone, Default)]
pub struct LicenseService;

impl LicenseServiceApi for LicenseService {
    fn verify(&self, key: &str) -> Result<license::LicenseInfo, AppError> {
        license::verify(key).map_err(Into::into)
    }

    /// Activate the license via the platform API.
    /// This is the primary activation method for the one-time online activation model.
    fn activate_online(
        &self,
        app: &AppHandle,
        key: &str,
        app_version: &str,
    ) -> Pin<Box<dyn Future<Output = Result<license::LicenseInfo, AppError>> + Send + '_>> {
        let app = app.clone();
        let key = key.to_string();
        let app_version = app_version.to_string();

        Box::pin(async move {
            // Generate device ID
            let device_id = license::generate_device_id();

            // Call the async activation function directly
            let info = license::activate_online(&key, &app_version, Some(&device_id)).await?;

            // Store the activation locally
            license::persist(&app, &info)?;
            app.emit("license://activated", &info).ok();

            Ok(info)
        })
    }

    fn current(&self, app: &AppHandle) -> Result<Option<license::LicenseInfo>, AppError> {
        license::load(app).map_err(Into::into)
    }

    fn remove(&self, app: &AppHandle) -> Result<(), AppError> {
        license::remove(app)?;
        app.emit("license://removed", &()).ok();
        Ok(())
    }

    /// Check if the app has already been activated.
    /// This is a purely local check - no network calls.
    fn is_activated(&self, app: &AppHandle) -> Result<bool, AppError> {
        let license = license::load(app)?;
        Ok(license.map(|l| l.activated_at.is_some()).unwrap_or(false))
    }
}
