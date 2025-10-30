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
    fn parses_encoders_multiple() {
        let sample = "
 V..... libx264        libx264 H.264 / AVC / MPEG-4 AVC / MPEG-4 part 10
 V..... libx265        libx265 H.265 / HEVC
 V..... libvpx-vp9     libvpx VP9
 A..... libopus        libopus Opus
 A..... aac            AAC (Advanced Audio Coding)
 A..... libmp3lame     libmp3lame MP3 (MPEG audio layer 3)
";
        let (video, audio) = parse_encoders(sample);
        assert_eq!(video, vec!["libvpx-vp9", "libx264", "libx265"]);
        assert_eq!(audio, vec!["aac", "libmp3lame", "libopus"]);
    }

    #[test]
    fn parses_encoders_ignores_subtitles() {
        let sample = "
 V..... h264           H.264
 A..... aac            AAC
 S..... ass            ASS subtitle
 S..... srt            SubRip subtitle
";
        let (video, audio) = parse_encoders(sample);
        assert_eq!(video, vec!["h264"]);
        assert_eq!(audio, vec!["aac"]);
    }

    #[test]
    fn parses_encoders_short_lines() {
        let sample = "
 V..... h264
 A
 short
";
        let (video, audio) = parse_encoders(sample);
        assert_eq!(video, vec!["h264"]);
        assert_eq!(audio.len(), 0);
    }

    #[test]
    fn parses_encoders_empty() {
        let sample = "";
        let (video, audio) = parse_encoders(sample);
        assert_eq!(video.len(), 0);
        assert_eq!(audio.len(), 0);
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
    fn parses_formats_demux_and_mux() {
        let sample = "
 DE matroska,webm       Matroska / WebM
 DE mp4                 MP4 (MPEG-4 Part 14)
 D  mov,mp4,m4a         QuickTime / MOV
 E  webm                WebM
";
        let formats = parse_formats(sample);
        assert!(formats.contains(&"matroska,webm".to_string()));
        assert!(formats.contains(&"mp4".to_string()));
        assert!(formats.contains(&"mov,mp4,m4a".to_string()));
        assert!(formats.contains(&"webm".to_string()));
    }

    #[test]
    fn parses_formats_ignores_invalid() {
        let sample = "
 DE mp4                 MP4
    invalid            No flags
 X  notvalid            Wrong flag
";
        let formats = parse_formats(sample);
        assert!(formats.contains(&"mp4".to_string()));
        assert_eq!(formats.len(), 1);
    }

    #[test]
    fn parses_formats_empty() {
        let sample = "";
        let formats = parse_formats(sample);
        assert_eq!(formats.len(), 0);
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

    #[test]
    fn parses_filters_multiple_types() {
        let sample = "
aformat             A->A       Convert the input audio to one of the specified formats.
scale               V->V       Scale the input video size and/or convert the image format.
overlay             VV->V      Overlay a video source on top of the input.
amix                AA->A      Audio mixing.
";
        let filters = parse_filters(sample);
        assert!(filters.contains(&"aformat".to_string()));
        assert!(filters.contains(&"scale".to_string()));
        assert!(filters.contains(&"overlay".to_string()));
        assert!(filters.contains(&"amix".to_string()));
    }

    #[test]
    fn parses_filters_ignores_asterisks() {
        let sample = "
*scale              V->V       Scale filter
crop                V->V       Crop the input video
";
        let filters = parse_filters(sample);
        assert!(!filters.contains(&"*scale".to_string()));
        assert!(filters.contains(&"crop".to_string()));
    }

    #[test]
    fn parses_filters_short_lines() {
        let sample = "
scale               V->V       Description
x
ab
";
        let filters = parse_filters(sample);
        assert!(filters.contains(&"scale".to_string()));
        // x and ab are both valid filter names (short but valid)
        assert!(!filters.is_empty());
    }

    #[test]
    fn parses_filters_empty() {
        let sample = "";
        let filters = parse_filters(sample);
        assert_eq!(filters.len(), 0);
    }

    #[test]
    fn test_parse_encoders_preserves_sorted_order() {
        let sample = "
 V..... zlib           LCL (LossLess Codec Library) ZLIB
 V..... h264           H.264
 V..... aac_at         AAC (Advanced Audio Coding) (codec aac)
 A..... zlib_encoder   Custom
 A..... aac            AAC (Advanced Audio Coding)
";
        let (video, audio) = parse_encoders(sample);
        // BTreeSet should sort them
        assert_eq!(video[0], "aac_at");
        assert_eq!(video[1], "h264");
        assert_eq!(video[2], "zlib");

        assert_eq!(audio[0], "aac");
        assert_eq!(audio[1], "zlib_encoder");
    }

    #[test]
    fn test_parse_formats_deduplication() {
        let sample = "
 DE mp4                 MP4
 DE mp4                 MP4 duplicate
 E  webm                WebM
";
        let formats = parse_formats(sample);
        // Should only have 2 unique formats
        assert_eq!(formats.len(), 2);
        assert!(formats.contains(&"mp4".to_string()));
        assert!(formats.contains(&"webm".to_string()));
    }

    #[test]
    fn test_parse_filters_deduplication() {
        let sample = "
scale               V->V       Scale
scale               V->V       Scale duplicate
crop                V->V       Crop
";
        let filters = parse_filters(sample);
        // Should only have 2 unique filters
        assert_eq!(filters.len(), 2);
        assert!(filters.contains(&"scale".to_string()));
        assert!(filters.contains(&"crop".to_string()));
    }
}
