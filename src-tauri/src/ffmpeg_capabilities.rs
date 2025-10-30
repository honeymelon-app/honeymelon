use serde::{Deserialize, Serialize};
use std::{collections::BTreeSet, ffi::OsString, fs, path::PathBuf, process::Command};
use tauri::{AppHandle, Manager};

use crate::error::AppError;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CapabilitySnapshot {
    pub video_encoders: Vec<String>,
    pub audio_encoders: Vec<String>,
    pub formats: Vec<String>,
    pub filters: Vec<String>,
}

pub fn load_capabilities(app: &AppHandle) -> Result<CapabilitySnapshot, AppError> {
    if let Some(cache_path) = cache_path(app) {
        if let Ok(contents) = fs::read_to_string(&cache_path) {
            if let Ok(snapshot) = serde_json::from_str::<CapabilitySnapshot>(&contents) {
                return Ok(snapshot);
            }
        }
    }

    let snapshot = refresh_capabilities(app)?;

    if let Some(cache_path) = cache_path(app) {
        if let Some(parent) = cache_path.parent() {
            let _ = fs::create_dir_all(parent);
        }
        if let Ok(serialized) = serde_json::to_string(&snapshot) {
            let _ = fs::write(cache_path, serialized);
        }
    }

    Ok(snapshot)
}

fn cache_path(app: &AppHandle) -> Option<PathBuf> {
    app.path()
        .app_cache_dir()
        .ok()
        .map(|dir| dir.join("ffmpeg-capabilities.json"))
}

fn refresh_capabilities(app: &AppHandle) -> Result<CapabilitySnapshot, AppError> {
    let encoders_output = run_ffmpeg(app, &["-hide_banner", "-encoders"])?;
    let formats_output = run_ffmpeg(app, &["-hide_banner", "-formats"])?;
    let filters_output = run_ffmpeg(app, &["-hide_banner", "-filters"])?;

    let (video_encoders, audio_encoders) = parse_encoders(&encoders_output);
    let formats = parse_formats(&formats_output);
    let filters = parse_filters(&filters_output);

    Ok(CapabilitySnapshot {
        video_encoders,
        audio_encoders,
        formats,
        filters,
    })
}

fn run_ffmpeg(app: &AppHandle, args: &[&str]) -> Result<String, AppError> {
    let mut last_err: Option<String> = None;

    for candidate in candidate_ffmpeg_paths(app) {
        let mut command = Command::new(&candidate);
        command.args(args);

        match command.output() {
            Ok(output) if output.status.success() => {
                return Ok(String::from_utf8_lossy(&output.stdout).to_string());
            },
            Ok(output) => {
                last_err = Some(format!(
                    "ffmpeg exited with status {} (stderr: {})",
                    output
                        .status
                        .code()
                        .map(|code| code.to_string())
                        .unwrap_or_else(|| "unknown".into()),
                    String::from_utf8_lossy(&output.stderr).trim()
                ));
            },
            Err(error) => {
                last_err = Some(error.to_string());
            },
        }
    }

    Err(AppError::new(
        "capability_ffmpeg_exec",
        last_err.unwrap_or_else(|| "Unable to execute ffmpeg".into()),
    ))
}

pub fn candidate_ffmpeg_paths(app: &AppHandle) -> Vec<OsString> {
    let mut candidates: Vec<OsString> = Vec::new();

    if let Ok(resource_dir) = app.path().resource_dir() {
        let bundled = resource_dir.join("bin/ffmpeg");
        if bundled.exists() && bundled.is_file() {
            candidates.push(bundled.into_os_string());
        }
    }

    candidates.push(OsString::from("ffmpeg"));
    candidates
}

fn parse_encoders(output: &str) -> (Vec<String>, Vec<String>) {
    let mut video = BTreeSet::new();
    let mut audio = BTreeSet::new();

    for line in output.lines() {
        let trimmed = line.trim_start();
        if trimmed.len() < 8 {
            continue;
        }

        let (flags, rest) = trimmed.split_at(7);
        let name = rest.split_whitespace().next().unwrap_or_default();
        if name.is_empty() {
            continue;
        }

        match flags.chars().next() {
            Some('V') => {
                video.insert(name.to_string());
            },
            Some('A') => {
                audio.insert(name.to_string());
            },
            _ => {},
        }
    }

    (video.into_iter().collect(), audio.into_iter().collect())
}

fn parse_formats(output: &str) -> Vec<String> {
    let mut formats = BTreeSet::new();

    for line in output.lines() {
        let trimmed = line.trim_start();
        if trimmed.len() < 3 {
            continue;
        }

        let (flags, rest) = trimmed.split_at(3);
        if !flags.contains('D') && !flags.contains('E') {
            continue;
        }

        let name = rest.split_whitespace().next().unwrap_or_default();
        if !name.is_empty() {
            formats.insert(name.to_string());
        }
    }

    formats.into_iter().collect()
}

fn parse_filters(output: &str) -> Vec<String> {
    let mut filters = BTreeSet::new();

    for line in output.lines() {
        let trimmed = line.trim_start();
        if trimmed.len() < 2 {
            continue;
        }

        let name = trimmed.split_whitespace().next().unwrap_or_default();
        if !name.is_empty() && !name.starts_with('*') {
            filters.insert(name.to_string());
        }
    }

    filters.into_iter().collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_encoders() {
        let sample = "
 V..... h264           H.264 / AVC / MPEG-4 AVC / MPEG-4 part 10 (codec avc1)
 A..... aac            AAC (Advanced Audio Coding)
 S..... ass            ASS (Advanced SSA) subtitle
";
        let (video, audio) = parse_encoders(sample);
        assert_eq!(video, vec!["h264"]);
        assert_eq!(audio, vec!["aac"]);
    }

    #[test]
    fn parses_formats() {
        let sample = "
 D  matroska             Matroska
 E  mp4                  MP4 (MPEG-4 Part 14)
 D  mov,mp4,m4a,3gp,3g2,mj2 QuickTime / MOV
";
        let formats = parse_formats(sample);
        assert!(formats.contains(&"matroska".to_string()));
        assert!(formats.contains(&"mp4".to_string()));
    }

    #[test]
    fn parses_filters() {
        let sample = "
scale               V->V       Scale the input video to width:height size and/or convert the image format.
transpose           V->V       Transpose rows with columns.
";
        let filters = parse_filters(sample);
        assert!(filters.contains(&"scale".to_string()));
        assert!(filters.contains(&"transpose".to_string()));
    }
}
