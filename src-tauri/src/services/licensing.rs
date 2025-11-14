use tauri::{AppHandle, Emitter};

use crate::{error::AppError, license};

pub trait LicenseServiceApi: Send + Sync {
    fn verify(&self, key: &str) -> Result<license::LicenseInfo, AppError>;
    fn activate(&self, app: &AppHandle, key: &str) -> Result<license::LicenseInfo, AppError>;
    fn current(&self, app: &AppHandle) -> Result<Option<license::LicenseInfo>, AppError>;
    fn remove(&self, app: &AppHandle) -> Result<(), AppError>;
}

/// Handles license verification, activation, and persistence flows.
#[derive(Clone, Default)]
pub struct LicenseService;

impl LicenseServiceApi for LicenseService {
    fn verify(&self, key: &str) -> Result<license::LicenseInfo, AppError> {
        license::verify(key).map_err(Into::into)
    }

    fn activate(&self, app: &AppHandle, key: &str) -> Result<license::LicenseInfo, AppError> {
        let mut info = license::verify(key)?;
        info.activated_at = Some(license::activate_timestamp());
        license::persist(app, &info)?;
        app.emit("license://activated", &info).ok();
        Ok(info)
    }

    fn current(&self, app: &AppHandle) -> Result<Option<license::LicenseInfo>, AppError> {
        license::load(app).map_err(Into::into)
    }

    fn remove(&self, app: &AppHandle) -> Result<(), AppError> {
        license::remove(app)?;
        app.emit("license://removed", &()).ok();
        Ok(())
    }
}
