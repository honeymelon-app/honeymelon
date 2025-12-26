use super::activation::generate_device_id;
use super::types::LicenseError;
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

const DEVICE_ID_FILE_NAME: &str = "device_id.txt";

/// Abstraction for resolving where the device id should be stored.
///
/// This is intentionally separate from the license file so that removing a license
/// doesn't force a new activation on the same machine.
pub trait DeviceIdPathProvider {
    fn device_id_store_path(&self) -> Result<PathBuf, LicenseError>;
}

impl DeviceIdPathProvider for AppHandle {
    fn device_id_store_path(&self) -> Result<PathBuf, LicenseError> {
        self.path()
            .app_config_dir()
            .map_err(|_| LicenseError::StoragePath)
            .map(|dir| dir.join(DEVICE_ID_FILE_NAME))
    }
}

pub fn get_or_create_device_id(
    provider: &impl DeviceIdPathProvider,
) -> Result<String, LicenseError> {
    let path = provider.device_id_store_path()?;

    if path.exists() {
        let value = fs::read_to_string(&path)?;
        let trimmed = value.trim();

        if !trimmed.is_empty() {
            return Ok(trimmed.to_string());
        }
    }

    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }

    let device_id = generate_device_id();
    fs::write(&path, format!("{}\n", device_id))?;

    Ok(device_id)
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[derive(Clone)]
    struct TempProvider {
        path: PathBuf,
    }

    impl DeviceIdPathProvider for TempProvider {
        fn device_id_store_path(&self) -> Result<PathBuf, LicenseError> {
            Ok(self.path.clone())
        }
    }

    #[test]
    fn persists_and_reuses_device_id() {
        let dir = TempDir::new().expect("temp dir");
        let provider = TempProvider {
            path: dir.path().join("device_id.txt"),
        };

        let first = get_or_create_device_id(&provider).expect("first create");
        let second = get_or_create_device_id(&provider).expect("second load");

        assert!(!first.is_empty());
        assert_eq!(first, second);
    }
}
