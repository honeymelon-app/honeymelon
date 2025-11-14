use std::ffi::OsString;
use std::path::PathBuf;
use std::process::Child;

use tauri::AppHandle;

use crate::error::AppError;

/// Abstraction for spawning ffmpeg processes to ease testing.
pub trait SpawnController: Send + Sync {
    fn resolve_ffmpeg(&self, app: &AppHandle) -> Result<OsString, AppError>;
    fn prepare_output(
        &self,
        output_path: &str,
        exclusive: bool,
    ) -> Result<(PathBuf, PathBuf), AppError>;
    fn spawn_job(
        &self,
        ffmpeg_path: OsString,
        args: &[String],
        temp_output: &str,
    ) -> Result<Child, AppError>;
}

/// Production implementation wired to the existing runner helpers.
#[derive(Default)]
pub struct DefaultSpawnController;

impl SpawnController for DefaultSpawnController {
    fn resolve_ffmpeg(&self, app: &AppHandle) -> Result<OsString, AppError> {
        super::process_spawner::ProcessSpawner::resolve_ffmpeg(app)
    }

    fn prepare_output(
        &self,
        output_path: &str,
        exclusive: bool,
    ) -> Result<(PathBuf, PathBuf), AppError> {
        super::output_manager::OutputManager::prepare(output_path, exclusive)
    }

    fn spawn_job(
        &self,
        ffmpeg_path: OsString,
        args: &[String],
        temp_output: &str,
    ) -> Result<Child, AppError> {
        super::process_spawner::ProcessSpawner::spawn(ffmpeg_path, args, temp_output)
    }
}
