use crate::{binary_resolver, error::AppError};
use std::ffi::{OsStr, OsString};
use std::path::Path;
use std::process::{Child, Command, Stdio};
use tauri::AppHandle;

/// Manages FFmpeg binary resolution and process spawning
pub struct ProcessSpawner;

impl ProcessSpawner {
    /// Resolves the path to an available FFmpeg executable
    pub fn resolve_ffmpeg(app: &AppHandle) -> Result<OsString, AppError> {
        let candidates = binary_resolver::resolve_ffmpeg_paths(app);
        select_ffmpeg_candidate(&candidates).ok_or_else(|| {
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

fn select_ffmpeg_candidate(candidates: &[OsString]) -> Option<OsString> {
    for candidate in candidates {
        let candidate_path = Path::new(candidate);
        let has_separator = has_path_separator(candidate.as_os_str());

        if candidate_path.is_absolute() || has_separator {
            if candidate_path.exists() {
                return Some(candidate.clone());
            }
            continue;
        }

        return Some(candidate.clone());
    }

    None
}

fn has_path_separator(value: &OsStr) -> bool {
    let text = value.to_string_lossy();
    text.contains('/') || text.contains('\\')
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs::File;

    #[test]
    fn select_ffmpeg_candidate_prefers_existing_path() {
        let temp_dir = std::env::temp_dir();
        let path = temp_dir.join("hm_ffmpeg_candidate");
        let _ = File::create(&path).expect("failed to create candidate file");

        let candidates = vec![path.clone().into_os_string(), OsString::from("ffmpeg")];
        let selected = select_ffmpeg_candidate(&candidates).expect("expected candidate");

        assert_eq!(selected, path.clone().into_os_string());

        let _ = std::fs::remove_file(path);
    }

    #[test]
    fn select_ffmpeg_candidate_falls_back_to_path_lookup() {
        let candidates = vec![OsString::from("ffmpeg")];
        let selected = select_ffmpeg_candidate(&candidates).expect("expected fallback");

        assert_eq!(selected, OsString::from("ffmpeg"));
    }
}
