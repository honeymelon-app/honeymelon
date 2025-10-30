use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::{ffi::OsString, process::Command};
use tauri::{AppHandle, Manager};

use crate::error::AppError;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProbeColor {
    pub primaries: Option<String>,
    pub trc: Option<String>,
    pub space: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProbeSummary {
    pub duration_sec: f64,
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub fps: Option<f64>,
    pub vcodec: Option<String>,
    pub acodec: Option<String>,
    pub has_text_subs: bool,
    pub has_image_subs: bool,
    pub channels: Option<u32>,
    pub color: Option<ProbeColor>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProbeResponse {
    pub raw: Value,
    pub summary: ProbeSummary,
}

#[derive(Debug, Deserialize, Default)]
struct FfprobeFormat {
    duration: Option<String>,
}

#[derive(Debug, Deserialize, Default)]
struct FfprobeStream {
    #[serde(rename = "codec_type")]
    codec_type: Option<String>,
    #[serde(rename = "codec_name")]
    codec_name: Option<String>,
    width: Option<u32>,
    height: Option<u32>,
    #[serde(rename = "avg_frame_rate")]
    avg_frame_rate: Option<String>,
    #[serde(rename = "r_frame_rate")]
    r_frame_rate: Option<String>,
    channels: Option<u32>,
    #[serde(rename = "color_primaries")]
    color_primaries: Option<String>,
    #[serde(rename = "color_transfer")]
    color_transfer: Option<String>,
    #[serde(rename = "color_space")]
    color_space: Option<String>,
}

#[derive(Debug, Deserialize, Default)]
struct FfprobeOutput {
    #[serde(default)]
    streams: Vec<FfprobeStream>,
    #[serde(default)]
    format: FfprobeFormat,
}

pub fn probe_media(app: &AppHandle, path: &str) -> Result<ProbeResponse, AppError> {
    let output = run_ffprobe(app, path)?;
    let raw: Value = serde_json::from_str(&output)
        .map_err(|err| AppError::new("probe_parse_json", err.to_string()))?;
    let parsed: FfprobeOutput = serde_json::from_value(raw.clone())
        .map_err(|err| AppError::new("probe_parse_struct", err.to_string()))?;
    let summary = summarize(&parsed);

    Ok(ProbeResponse { raw, summary })
}

fn run_ffprobe(app: &AppHandle, path: &str) -> Result<String, AppError> {
    let mut last_err: Option<String> = None;

    for candidate in candidate_ffprobe_paths(app) {
        let mut command = Command::new(&candidate);
        command.args([
            "-hide_banner",
            "-loglevel",
            "error",
            "-print_format",
            "json",
            "-show_format",
            "-show_streams",
            path,
        ]);

        match command.output() {
            Ok(output) if output.status.success() => {
                return Ok(String::from_utf8_lossy(&output.stdout).to_string());
            },
            Ok(output) => {
                last_err = Some(format!(
                    "ffprobe exited with status {} (stderr: {})",
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
        "probe_ffprobe_exec",
        last_err.unwrap_or_else(|| "Unable to execute ffprobe".into()),
    ))
}

fn candidate_ffprobe_paths(app: &AppHandle) -> Vec<OsString> {
    let mut candidates: Vec<OsString> = Vec::new();

    if let Ok(resource_dir) = app.path().resource_dir() {
        let bundled = resource_dir.join("bin/ffprobe");
        if bundled.exists() && bundled.is_file() {
            candidates.push(bundled.into_os_string());
        }
    }

    candidates.push(OsString::from("ffprobe"));
    candidates
}

fn summarize(data: &FfprobeOutput) -> ProbeSummary {
    let duration_sec = data
        .format
        .duration
        .as_deref()
        .and_then(|value| value.parse::<f64>().ok())
        .unwrap_or_default();

    let video_stream = data
        .streams
        .iter()
        .find(|stream| matches!(stream.codec_type.as_deref(), Some("video")));

    let audio_stream = data
        .streams
        .iter()
        .find(|stream| matches!(stream.codec_type.as_deref(), Some("audio")));

    let subtitle_stats = subtitle_presence(&data.streams);

    let fps = video_stream
        .and_then(|stream| {
            stream
                .avg_frame_rate
                .as_deref()
                .or(stream.r_frame_rate.as_deref())
        })
        .and_then(parse_frame_rate);

    let color = video_stream.and_then(|stream| {
        if stream.color_primaries.is_some()
            || stream.color_transfer.is_some()
            || stream.color_space.is_some()
        {
            Some(ProbeColor {
                primaries: stream.color_primaries.clone(),
                trc: stream.color_transfer.clone(),
                space: stream.color_space.clone(),
            })
        } else {
            None
        }
    });

    ProbeSummary {
        duration_sec,
        width: video_stream.and_then(|stream| stream.width),
        height: video_stream.and_then(|stream| stream.height),
        fps,
        vcodec: video_stream
            .and_then(|stream| stream.codec_name.as_ref().cloned())
            .map(|value| value.to_lowercase()),
        acodec: audio_stream
            .and_then(|stream| stream.codec_name.as_ref().cloned())
            .map(|value| value.to_lowercase()),
        has_text_subs: subtitle_stats.0,
        has_image_subs: subtitle_stats.1,
        channels: audio_stream.and_then(|stream| stream.channels),
        color,
    }
}

fn subtitle_presence(streams: &[FfprobeStream]) -> (bool, bool) {
    let mut has_text = false;
    let mut has_image = false;

    for stream in streams {
        if !matches!(stream.codec_type.as_deref(), Some("subtitle")) {
            continue;
        }

        let codec = stream
            .codec_name
            .as_deref()
            .unwrap_or_default()
            .to_lowercase();
        if is_image_subtitle(&codec) {
            has_image = true;
        } else {
            has_text = true;
        }
    }

    (has_text, has_image)
}

fn is_image_subtitle(codec: &str) -> bool {
    matches!(
        codec,
        "pgs" | "hdmv_pgs_subtitle" | "dvd_subtitle" | "dvdsub" | "xsub" | "webp"
    )
}

fn parse_frame_rate(value: &str) -> Option<f64> {
    if value.is_empty() {
        return None;
    }

    if let Some((numerator, denominator)) = value.split_once('/') {
        let num: f64 = numerator.parse().ok()?;
        let den: f64 = denominator.parse().ok()?;
        if den.abs() < f64::EPSILON {
            return None;
        }
        Some(num / den)
    } else {
        value.parse::<f64>().ok()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_frame_rates() {
        assert_eq!(parse_frame_rate("24000/1001").unwrap().round(), 24.0);
        assert_eq!(parse_frame_rate("30").unwrap(), 30.0);
        assert!(parse_frame_rate("0/0").is_none());
    }

    #[test]
    fn detects_subtitle_types() {
        let streams = vec![
            FfprobeStream {
                codec_type: Some("subtitle".into()),
                codec_name: Some("ass".into()),
                ..Default::default()
            },
            FfprobeStream {
                codec_type: Some("subtitle".into()),
                codec_name: Some("hdmv_pgs_subtitle".into()),
                ..Default::default()
            },
        ];
        let (text, image) = subtitle_presence(&streams);
        assert!(text);
        assert!(image);
    }
}
