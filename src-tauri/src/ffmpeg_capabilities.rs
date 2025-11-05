/**
 * FFmpeg capability detection and caching system.
 *
 * This module is responsible for detecting what features and capabilities are available
 * in the installed FFmpeg binary. It runs FFmpeg commands to query available encoders,
 * formats, and filters, then caches the results to avoid repeated expensive operations.
 *
 * The capability detection is crucial for:
 * - Determining which conversion presets are available
 * - Validating that required codecs exist before attempting conversions
 * - Providing accurate feature support information to the frontend
 * - Optimizing the user experience by hiding unsupported options
 *
 * The system uses a multi-stage approach:
 * 1. Check for cached capabilities first
 * 2. If no cache, probe FFmpeg directly
 * 3. Parse the output to extract capability information
 * 4. Cache the results for future use
 */
use serde::{Deserialize, Serialize};
use std::{
    collections::BTreeSet,
    ffi::OsString,
    fs,
    path::{Path, PathBuf},
    process::Command,
};
use tauri::{AppHandle, Manager};

use crate::error::AppError;

/**
 * Snapshot of FFmpeg capabilities detected on the system.
 *
 * This struct contains all the capability information that can be detected
 * from FFmpeg, including available encoders, supported formats, and filters.
 * It's designed to be serializable for caching and IPC communication.
 *
 * # Fields
 *
 * * `video_encoders` - List of available video encoder names (e.g., "h264", "libx264")
 * * `audio_encoders` - List of available audio encoder names (e.g., "aac", "mp3")
 * * `formats` - List of supported container formats (e.g., "mp4", "mkv", "webm")
 * * `filters` - List of available filter names (e.g., "scale", "crop", "overlay")
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CapabilitySnapshot {
    /** Available video encoder names */
    pub video_encoders: Vec<String>,
    /** Available audio encoder names */
    pub audio_encoders: Vec<String>,
    /** Supported container format names */
    pub formats: Vec<String>,
    /** Available filter names */
    pub filters: Vec<String>,
}

/**
 * Loads FFmpeg capabilities, using cache when available.
 *
 * This is the main entry point for capability detection. It first attempts to
 * load cached capabilities from disk, and only performs fresh detection if
 * no valid cache exists. The results are always cached after successful detection.
 *
 * # Arguments
 *
 * * `app` - Tauri application handle for accessing app directories
 *
 * # Returns
 *
 * Returns a `Result` containing:
 * - `Ok(CapabilitySnapshot)` - The detected or cached capabilities
 * - `Err(AppError)` - An error if capability detection fails
 *
 * # Caching Strategy
 *
 * The cache is stored in the application's cache directory as JSON. This approach:
 * - Reduces startup time by avoiding repeated FFmpeg probing
 * - Provides resilience against temporary FFmpeg unavailability
 * - Ensures consistent capability reporting across application sessions
 */
pub fn load_capabilities(app: &AppHandle) -> Result<CapabilitySnapshot, AppError> {
    // Try to load from cache first
    if let Some(cache_path) = cache_path(app) {
        if let Ok(contents) = fs::read_to_string(&cache_path) {
            if let Ok(snapshot) = serde_json::from_str::<CapabilitySnapshot>(&contents) {
                return Ok(snapshot);
            }
        }
    }

    // Cache miss or invalid, perform fresh detection
    let snapshot = refresh_capabilities(app)?;

    // Cache the results for future use
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

/**
 * Generates the cache file path for capability storage.
 *
 * # Arguments
 *
 * * `app` - Tauri application handle
 *
 * # Returns
 *
 * Returns `Some(PathBuf)` containing the cache file path, or `None` if
 * the app cache directory cannot be determined.
 */
fn cache_path(app: &AppHandle) -> Option<PathBuf> {
    app.path()
        .app_cache_dir()
        .ok()
        .map(|dir| dir.join("ffmpeg-capabilities.json"))
}

/**
 * Performs fresh capability detection by querying FFmpeg directly.
 *
 * This function runs multiple FFmpeg commands to gather comprehensive
 * capability information. It's more expensive than loading from cache
 * but provides the most accurate and up-to-date information.
 *
 * # Arguments
 *
 * * `app` - Tauri application handle for FFmpeg path resolution
 *
 * # Returns
 *
 * Returns a `Result` containing the freshly detected capabilities.
 *
 * # FFmpeg Commands Used
 *
 * 1. `ffmpeg -encoders` - Lists all available encoders with their types
 * 2. `ffmpeg -formats` - Lists all supported container formats
 * 3. `ffmpeg -filters` - Lists all available filters
 *
 * Each command's output is parsed to extract relevant capability information.
 */
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

/**
 * Executes FFmpeg with the given arguments and returns its output.
 *
 * This function handles FFmpeg binary discovery and execution, trying multiple
 * candidate paths until one succeeds. It provides robust error handling and
 * informative error messages when FFmpeg execution fails.
 *
 * # Arguments
 *
 * * `app` - Tauri application handle for path resolution
 * * `args` - Command line arguments to pass to FFmpeg
 *
 * # Returns
 *
 * Returns a `Result` containing FFmpeg's stdout output as a string.
 *
 * # FFmpeg Path Resolution
 *
 * The function tries FFmpeg binaries in this order:
 * 1. Path specified in `HONEYMELON_FFMPEG_PATH` environment variable
 * 2. Bundled binary in development resources (`src-tauri/resources/bin/ffmpeg`)
 * 3. Bundled binary in installed app resources
 * 4. System PATH (`ffmpeg` command)
 */
fn run_ffmpeg(app: &AppHandle, args: &[&str]) -> Result<String, AppError> {
    let mut last_err: Option<String> = None;

    // Try each candidate FFmpeg path until one works
    for candidate in candidate_ffmpeg_paths(app) {
        let mut command = Command::new(&candidate);
        command.args(args);

        match command.output() {
            Ok(output) if output.status.success() => {
                return Ok(String::from_utf8_lossy(&output.stdout).to_string());
            },
            Ok(output) => {
                // FFmpeg ran but exited with error
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
                // Failed to execute FFmpeg at this path
                last_err = Some(error.to_string());
            },
        }
    }

    // All candidates failed
    Err(AppError::new(
        "capability_ffmpeg_exec",
        last_err.unwrap_or_else(|| "Unable to execute ffmpeg".into()),
    ))
}

/**
 * Generates a list of candidate FFmpeg binary paths to try.
 *
 * This function creates an ordered list of possible FFmpeg installations,
 * prioritizing specific paths over generic system PATH lookup.
 *
 * # Arguments
 *
 * * `app` - Tauri application handle for resource path resolution
 *
 * # Returns
 *
 * Returns a vector of `OsString` paths to try, in order of preference.
 */
pub fn candidate_ffmpeg_paths(app: &AppHandle) -> Vec<OsString> {
    let mut candidates: Vec<OsString> = Vec::new();

    /**
     * Helper function to add a path to candidates if it's a valid binary.
     */
    fn push_if_valid(list: &mut Vec<OsString>, path: PathBuf) {
        if is_valid_binary(&path) {
            list.push(path.into_os_string());
        }
    }

    // 1. Environment variable override (highest priority)
    if let Ok(override_path) = std::env::var("HONEYMELON_FFMPEG_PATH") {
        push_if_valid(&mut candidates, PathBuf::from(override_path));
    }

    // 2. Development bundled binary (for `tauri dev`)
    let dev_bundled_path = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("resources/bin/ffmpeg");
    push_if_valid(&mut candidates, dev_bundled_path);

    // 3. Production bundled binary
    if let Ok(resource_dir) = app.path().resource_dir() {
        let bundled = resource_dir.join("bin/ffmpeg");
        push_if_valid(&mut candidates, bundled);
    }

    // 4. System PATH (lowest priority)
    candidates.push(OsString::from("ffmpeg"));

    candidates
}

/**
 * Checks if a given path points to a valid executable binary.
 *
 * Performs basic validation to ensure the path exists, is a file,
 * and has non-zero size (basic check for valid executable).
 *
 * # Arguments
 *
 * * `path` - Path to the potential binary file
 *
 * # Returns
 *
 * Returns `true` if the path appears to be a valid binary, `false` otherwise.
 */
pub(crate) fn is_valid_binary(path: &Path) -> bool {
    if !path.exists() || !path.is_file() {
        return false;
    }

    match path.metadata() {
        Ok(meta) => meta.len() > 0,
        Err(_) => false,
    }
}

/**
 * Parses FFmpeg encoder output to extract video and audio encoder names.
 *
 * Parses the output of `ffmpeg -encoders` to categorize encoders by type.
 * Uses the first character of each line to determine encoder type:
 * - 'V' prefix indicates video encoders
 * - 'A' prefix indicates audio encoders
 * - Other prefixes (like 'S' for subtitles) are ignored
 *
 * # Arguments
 *
 * * `output` - Raw output string from `ffmpeg -encoders`
 *
 * # Returns
 *
 * Returns a tuple of `(video_encoders, audio_encoders)` as sorted string vectors.
 *
 * # Example Output Parsing
 *
 * ```
 *  V..... h264           H.264 / AVC / MPEG-4 AVC / MPEG-4 part 10
 *  A..... aac            AAC (Advanced Audio Coding)
 *  S..... ass            ASS (Advanced SSA) subtitle
 * ```
 *
 * Results in `(["h264"], ["aac"])`.
 */
fn parse_encoders(output: &str) -> (Vec<String>, Vec<String>) {
    let mut video = BTreeSet::new();
    let mut audio = BTreeSet::new();

    for line in output.lines() {
        let trimmed = line.trim_start();
        if trimmed.len() < 8 {
            continue;
        }

        // Split at position 7 to separate flags from encoder name
        let (flags, rest) = trimmed.split_at(7);
        let name = rest.split_whitespace().next().unwrap_or_default();
        if name.is_empty() {
            continue;
        }

        // Check the first character of flags to determine encoder type
        match flags.chars().next() {
            Some('V') => {
                video.insert(name.to_string());
            },
            Some('A') => {
                audio.insert(name.to_string());
            },
            _ => {
                // Ignore other types (subtitles, etc.)
            },
        }
    }

    (video.into_iter().collect(), audio.into_iter().collect())
}

/**
 * Parses FFmpeg format output to extract supported container formats.
 *
 * Parses the output of `ffmpeg -formats` to find formats that support
 * either demuxing (decoding) or muxing (encoding). Only formats marked
 * with 'D' (demux) or 'E' (mux) flags are included.
 *
 * # Arguments
 *
 * * `output` - Raw output string from `ffmpeg -formats`
 *
 * # Returns
 *
 * Returns a sorted vector of format names.
 *
 * # Example Output Parsing
 *
 * ```
 *  D  matroska             Matroska
 *  E  mp4                  MP4 (MPEG-4 Part 14)
 * DE mov,mp4,m4a,3gp,3g2,mj2 QuickTime / MOV
 * ```
 *
 * Results in `["matroska", "mov,mp4,m4a,3gp,3g2,mj2", "mp4"]`.
 */
fn parse_formats(output: &str) -> Vec<String> {
    let mut formats = BTreeSet::new();

    for line in output.lines() {
        let trimmed = line.trim_start();
        if trimmed.len() < 3 {
            continue;
        }

        // Split at position 3 to separate flags from format name
        let (flags, rest) = trimmed.split_at(3);
        // Only include formats that can demux or mux
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

/**
 * Parses FFmpeg filter output to extract available filter names.
 *
 * Parses the output of `ffmpeg -filters` to extract filter names.
 * Filters marked with asterisks (indicating they're not available)
 * are excluded from the results.
 *
 * # Arguments
 *
 * * `output` - Raw output string from `ffmpeg -filters`
 *
 * # Returns
 *
 * Returns a sorted vector of filter names.
 *
 * # Example Output Parsing
 *
 * ```
 * scale               V->V       Scale the input video to width:height size
 * *scale_cuda         V->V       GPU accelerated scaling (not available)
 * transpose           V->V       Transpose rows with columns
 * ```
 *
 * Results in `["scale", "transpose"]`.
 */
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
