use tauri::AppHandle;

use crate::{error::AppError, ffmpeg_probe};

pub trait MediaProbeServiceApi: Send + Sync {
    fn probe(&self, app: &AppHandle, path: &str) -> Result<ffmpeg_probe::ProbeResponse, AppError>;
}

/// Service responsible for media probing/introspection.
#[derive(Clone, Default)]
pub struct MediaProbeService;

impl MediaProbeServiceApi for MediaProbeService {
    fn probe(&self, app: &AppHandle, path: &str) -> Result<ffmpeg_probe::ProbeResponse, AppError> {
        ffmpeg_probe::probe_media(app, path)
    }
}
