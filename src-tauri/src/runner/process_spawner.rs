use crate::{binary_resolver, error::AppError};
use std::ffi::OsString;
use std::path::Path;
use std::process::{Child, Command, Stdio};
use tauri::AppHandle;

/// Manages FFmpeg binary resolution and process spawning
pub struct ProcessSpawner;

impl ProcessSpawner {
    /// Resolves the path to an available FFmpeg executable
    pub fn resolve_ffmpeg(app: &AppHandle) -> Result<OsString, AppError> {
        binary_resolver::resolve_ffmpeg_paths(app)
            .into_iter()
            .find(|candidate| Path::new(&candidate).exists())
            .ok_or_else(|| {
                AppError::new(
                    "job_ffmpeg_not_found",
                    "Unable to locate ffmpeg executable.",
                )
            })
    }

    /// Spawns an FFmpeg process with the given arguments and output path
    pub fn spawn(
        ffmpeg_path: OsString,
        args: &[String],
        output_path: &str,
    ) -> Result<Child, AppError> {
        let mut command = Command::new(ffmpeg_path);
        command.args(args);
        command.arg(output_path);
        command.stdin(Stdio::null());
        command.stdout(Stdio::null());
        command.stderr(Stdio::piped());

        command
            .spawn()
            .map_err(|err| AppError::new("job_spawn_failed", err.to_string()))
    }
}
