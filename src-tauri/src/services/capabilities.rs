use tauri::AppHandle;

use crate::{error::AppError, ffmpeg_capabilities};

pub trait CapabilityServiceApi: Send + Sync {
    fn load(&self, app: &AppHandle) -> Result<ffmpeg_capabilities::CapabilitySnapshot, AppError>;
}

/// Service wrapper for FFmpeg capability discovery.
#[derive(Clone, Default)]
pub struct CapabilityService;

impl CapabilityServiceApi for CapabilityService {
    fn load(&self, app: &AppHandle) -> Result<ffmpeg_capabilities::CapabilitySnapshot, AppError> {
        ffmpeg_capabilities::load_capabilities(app)
    }
}
