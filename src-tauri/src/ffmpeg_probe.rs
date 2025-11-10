/** # FFmpeg Media Probing Module

This module provides comprehensive media file analysis capabilities using FFmpeg's `ffprobe`
utility. It serves as the core intelligence layer for Honeymelon's media processing pipeline,
extracting detailed metadata about video, audio, and subtitle streams to inform conversion
decisions and user interface presentation.

## Architecture Overview

The probing system follows a multi-layered approach:

1. **Binary Resolution**: Locates available `ffprobe` executables across multiple candidate paths
2. **Command Execution**: Runs `ffprobe` with optimized arguments for JSON output parsing
3. **Data Extraction**: Parses structured JSON output into strongly-typed Rust structures
4. **Metadata Summarization**: Transforms raw probe data into application-specific summaries
5. **Error Handling**: Provides graceful degradation and detailed error reporting

## Key Design Decisions

### Path Resolution Strategy
The module implements a cascading path resolution strategy to ensure maximum compatibility
across different deployment scenarios:
- Environment variable override (`HONEYMELON_FFPROBE_PATH`) for custom installations
- Development-bundled binary for local development
- Application-bundled binary for packaged distributions
- System PATH fallback for standard installations

### Metadata Extraction Philosophy
Rather than exposing raw `ffprobe` output directly, the module provides curated summaries
that focus on conversion-relevant information:
- Duration, dimensions, and frame rates for video processing decisions
- Codec identification for capability matching
- Color space metadata for accurate color reproduction
- Subtitle presence detection for user interface hints

### Error Resilience
The probing system is designed to be fault-tolerant:
- Attempts multiple `ffprobe` candidates before failing
- Provides detailed error context for debugging
- Gracefully handles malformed or missing metadata
- Uses safe parsing with fallback defaults

## Integration Points

This module integrates with several other system components:

- **Capability Detection** (`ffmpeg_capabilities.rs`): Uses shared binary validation logic
- **Error Handling** (`error.rs`): Leverages custom error types for IPC communication
- **Job Orchestration**: Provides metadata for conversion planning and progress estimation
- **User Interface**: Supplies stream information for preset selection and preview

## Performance Considerations

The probing implementation is optimized for responsiveness:
- Uses minimal `ffprobe` arguments to reduce execution time
- Caches binary path resolution results
- Performs lightweight JSON parsing without unnecessary allocations
- Extracts only essential metadata fields

## Testing Strategy

The module includes comprehensive unit tests covering:
- Frame rate parsing across different formats (rational, decimal, invalid)
- Subtitle type detection for various codec families
- Multi-stream file analysis with video, audio, and subtitle combinations
- Color metadata extraction and handling
- Error conditions and edge cases

## Future Enhancements

Potential areas for expansion:
- Hardware acceleration detection for GPU-accelerated codecs
- Advanced color space analysis (HDR metadata, mastering display)
- Container format-specific optimizations
- Streaming media support for network sources
- Performance profiling and optimization
*/
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::{ffi::OsString, process::Command};
use tauri::AppHandle;

use crate::error::AppError;

/** Color space metadata extracted from video streams.

This structure captures the essential color characteristics of a video stream
as reported by `ffprobe`. These values are crucial for accurate color reproduction
during transcoding operations, especially when converting between different
color spaces or when preserving HDR content.

# Fields
* `primaries` - Color primaries standard (e.g., "bt709", "bt2020")
* `trc` - Transfer characteristics/curve (e.g., "bt709", "pq", "hlg")
* `space` - Color space matrix (e.g., "bt709", "bt2020nc", "rgb")

# Usage Context
Used in conversion planning to determine if color space conversion is needed
and to select appropriate FFmpeg color handling parameters.
*/
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProbeColor {
    /** Color primaries standard identifier */
    pub primaries: Option<String>,
    /** Transfer characteristics (gamma curve) */
    pub trc: Option<String>,
    /** Color space matrix coefficients */
    pub space: Option<String>,
}

/** Curated summary of media file metadata for application use.

This structure represents the essential information extracted from a media file
that Honeymelon needs for conversion planning and user interface display.
Unlike raw `ffprobe` output, this summary focuses on conversion-relevant data
and normalizes values for consistent handling across different media types.

# Design Rationale
The summary approach provides several benefits:
- Reduces memory usage by extracting only needed fields
- Normalizes codec names to lowercase for consistent comparison
- Provides boolean flags for quick UI decisions (subtitle presence)
- Handles missing metadata gracefully with Option types
- Enables efficient serialization for IPC communication
*/
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProbeSummary {
    /** Total duration in seconds (floating point for precision) */
    pub duration_sec: f64,
    /** Video width in pixels (None for audio-only files) */
    pub width: Option<u32>,
    /** Video height in pixels (None for audio-only files) */
    pub height: Option<u32>,
    /** Video frame rate (frames per second, None for audio-only) */
    pub fps: Option<f64>,
    /** Video codec name in lowercase (None for audio-only files) */
    pub vcodec: Option<String>,
    /** Audio codec name in lowercase (None for video-only files) */
    pub acodec: Option<String>,
    /** Whether the file contains text-based subtitles (SRT, ASS, etc.) */
    pub has_text_subs: bool,
    /** Whether the file contains image-based subtitles (PGS, DVD, etc.) */
    pub has_image_subs: bool,
    /** Number of audio channels (None for video-only files) */
    pub channels: Option<u32>,
    /** Color space metadata (None if not available or not applicable) */
    pub color: Option<ProbeColor>,
}

/** Complete probe response containing both raw and summarized data.

This structure provides dual access to probe results: the original raw JSON
output from `ffprobe` for advanced users or debugging, alongside a curated
summary optimized for application use. This design enables future enhancements
while maintaining backward compatibility.

# Usage Patterns
- **Application Logic**: Use `summary` for conversion planning and UI display
- **Debugging**: Access `raw` for detailed inspection of `ffprobe` output
- **Extensibility**: Raw data enables extraction of additional fields in future versions
*/
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProbeResponse {
    /** Raw JSON output from `ffprobe` (preserved for debugging and future extensions) */
    pub raw: Value,
    /** Curated summary optimized for application use */
    pub summary: ProbeSummary,
}

/** Internal representation of `ffprobe` format section.

This structure maps directly to the "format" section of `ffprobe` JSON output,
containing container-level metadata. Only essential fields are extracted to
minimize parsing overhead and memory usage.
*/
#[derive(Debug, Deserialize, Default)]
struct FfprobeFormat {
    /** Total duration as a string (parsed to f64 for calculations) */
    duration: Option<String>,
}

/** Internal representation of individual `ffprobe` streams.

This structure captures the essential metadata for each media stream detected
by `ffprobe`. The mapping focuses on fields relevant to conversion decisions
while maintaining compatibility with `ffprobe`'s JSON output format.

# Stream Types
The structure handles three primary stream types:
- **Video**: Codec, dimensions, frame rate, color metadata
- **Audio**: Codec, channel count
- **Subtitle**: Codec type for presence detection
*/
#[derive(Debug, Deserialize, Default)]
struct FfprobeStream {
    /** Stream type identifier ("video", "audio", "subtitle") */
    #[serde(rename = "codec_type")]
    codec_type: Option<String>,
    /** Codec name as reported by FFmpeg */
    #[serde(rename = "codec_name")]
    codec_name: Option<String>,
    /** Video width in pixels (video streams only) */
    width: Option<u32>,
    /** Video height in pixels (video streams only) */
    height: Option<u32>,
    /** Average frame rate as a rational string (e.g., "30/1", "24000/1001") */
    #[serde(rename = "avg_frame_rate")]
    avg_frame_rate: Option<String>,
    /** Real frame rate as a rational string (fallback for avg_frame_rate) */
    #[serde(rename = "r_frame_rate")]
    r_frame_rate: Option<String>,
    /** Number of audio channels (audio streams only) */
    channels: Option<u32>,
    /** Color primaries standard (video streams only) */
    #[serde(rename = "color_primaries")]
    color_primaries: Option<String>,
    /** Color transfer characteristics (video streams only) */
    #[serde(rename = "color_transfer")]
    color_transfer: Option<String>,
    /** Color space matrix (video streams only) */
    #[serde(rename = "color_space")]
    color_space: Option<String>,
}

/** Internal representation of complete `ffprobe` JSON output.

This structure provides a strongly-typed interface to the entire `ffprobe`
JSON response, enabling safe and efficient parsing of media metadata.
The use of `#[serde(default)]` ensures graceful handling of missing fields.
*/
#[derive(Debug, Deserialize, Default)]
struct FfprobeOutput {
    /** Array of all detected streams in the file */
    #[serde(default)]
    streams: Vec<FfprobeStream>,
    /** Container-level format information */
    #[serde(default)]
    format: FfprobeFormat,
}

/** Probes a media file and returns comprehensive metadata.

This is the main entry point for media analysis in Honeymelon. It orchestrates
the complete probing pipeline: locating `ffprobe`, executing the analysis,
parsing the results, and generating both raw and summarized outputs.

# Process Flow
1. Locate available `ffprobe` binary using candidate path resolution
2. Execute `ffprobe` with optimized arguments for JSON output
3. Parse JSON response into strongly-typed structures
4. Generate curated summary for application use
5. Return both raw and processed results

# Error Handling
Returns `AppError` with context about which step failed:
- `"probe_ffprobe_exec"`: Unable to execute `ffprobe` with any candidate path
- `"probe_parse_json"`: Invalid JSON output from `ffprobe`
- `"probe_parse_struct"`: JSON structure doesn't match expected format

# Performance
The function is optimized for quick analysis:
- Uses minimal `ffprobe` arguments to reduce execution time
- Performs lightweight parsing without unnecessary allocations
- Extracts only essential metadata fields

# Arguments
* `app` - Tauri application handle for path resolution
* `path` - File system path to the media file to analyze

# Returns
`ProbeResponse` containing both raw JSON and curated summary, or `AppError` on failure
*/
pub fn probe_media(app: &AppHandle, path: &str) -> Result<ProbeResponse, AppError> {
    // Execute ffprobe and capture JSON output
    let output = run_ffprobe(app, path)?;

    // Parse raw JSON for preservation and debugging
    let raw: Value = serde_json::from_str(&output)
        .map_err(|err| AppError::new("probe_parse_json", err.to_string()))?;

    // Parse into structured data for processing
    let parsed: FfprobeOutput = serde_json::from_value(raw.clone())
        .map_err(|err| AppError::new("probe_parse_struct", err.to_string()))?;

    // Generate application-optimized summary
    let summary = summarize(&parsed);

    Ok(ProbeResponse { raw, summary })
}

/** Executes `ffprobe` on a media file and returns JSON output.

This function implements a robust execution strategy that tries multiple
candidate `ffprobe` paths to ensure maximum compatibility across different
installation scenarios. It uses optimized command arguments to minimize
execution time while capturing essential metadata.

# Command Arguments
The function uses these `ffprobe` arguments for optimal performance:
- `-hide_banner`: Suppresses version information
- `-loglevel error`: Only shows error messages
- `-print_format json`: Structured output for reliable parsing
- `-show_format`: Container-level metadata
- `-show_streams`: Individual stream information

# Path Resolution Strategy
Attempts `ffprobe` execution in this order:
1. Environment variable override (`HONEYMELON_FFPROBE_PATH`)
2. Development-bundled binary (`resources/bin/ffprobe`)
3. Application-bundled binary (from Tauri resource directory)
4. System PATH (`ffprobe` command)

# Error Handling
Continues trying candidates until one succeeds or all fail.
Returns detailed error information including exit codes and stderr output.

# Arguments
* `app` - Tauri application handle for resource path resolution
* `path` - File system path to the media file to analyze

# Returns
JSON string output from `ffprobe`, or `AppError` if execution fails
*/
fn run_ffprobe(app: &AppHandle, path: &str) -> Result<String, AppError> {
    let mut last_err: Option<String> = None;

    // Try each candidate ffprobe path until one works
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
                // Success - return the JSON output
                return Ok(String::from_utf8_lossy(&output.stdout).to_string());
            },
            Ok(output) => {
                // ffprobe ran but exited with error - capture details for debugging
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
                // ffprobe couldn't be executed at all
                last_err = Some(error.to_string());
            },
        }
    }

    // All candidates failed - return detailed error
    Err(AppError::new(
        "probe_ffprobe_exec",
        last_err.unwrap_or_else(|| "Unable to execute ffprobe".into()),
    ))
}

/** Generates a list of candidate `ffprobe` executable paths.

This function implements a cascading path resolution strategy that ensures
`ffprobe` can be found across different deployment and development scenarios.
The strategy prioritizes explicit overrides while falling back to standard
locations.

# Resolution Priority
1. **Environment Override**: `HONEYMELON_FFPROBE_PATH` - Allows users to specify custom installations
2. **Development Bundle**: `resources/bin/ffprobe` relative to Cargo manifest - For local development
3. **Application Bundle**: `bin/ffprobe` in Tauri resource directory - For packaged applications
4. **System PATH**: Bare `ffprobe` command - For standard FFmpeg installations

# Validation
Each candidate path is validated using `is_valid_binary()` to ensure it's
an executable file before being added to the candidate list. This prevents
attempting execution of invalid or missing binaries.

# Arguments
* `app` - Tauri application handle for accessing resource directory

# Returns
Vector of `OsString` paths to try, in priority order
*/
/// Resolves candidate ffprobe paths using the centralized BinaryResolver.
///
/// This function delegates to the shared `binary_resolver` module to maintain DRY principles
/// and ensure consistent path resolution across the application.
fn candidate_ffprobe_paths(app: &AppHandle) -> Vec<OsString> {
    crate::binary_resolver::resolve_ffprobe_paths(app)
}

/** Transforms raw `ffprobe` output into an application-optimized summary.

This function performs the critical transformation from `ffprobe`'s detailed
JSON output to a curated summary focused on conversion-relevant information.
It extracts and normalizes metadata from video, audio, and subtitle streams
while handling missing data gracefully.

# Extraction Strategy
- **Duration**: Parsed from container format, defaults to 0.0 for invalid values
- **Video Metadata**: First video stream's codec, dimensions, frame rate, and color info
- **Audio Metadata**: First audio stream's codec and channel count
- **Subtitle Detection**: Scans all streams for text and image subtitle presence
- **Codec Normalization**: Converts codec names to lowercase for consistent comparison

# Stream Selection Logic
For files with multiple streams of the same type, the function selects the first
encountered stream. This approach works well for most media files where stream
order reflects encoding priority.

# Arguments
* `data` - Parsed `ffprobe` output structure

# Returns
`ProbeSummary` with normalized metadata for application use
*/
fn summarize(data: &FfprobeOutput) -> ProbeSummary {
    // Extract duration from container format with safe parsing
    let duration_sec = data
        .format
        .duration
        .as_deref()
        .and_then(|value| value.parse::<f64>().ok())
        .unwrap_or_default();

    // Find first video and audio streams for metadata extraction
    let video_stream = data
        .streams
        .iter()
        .find(|stream| matches!(stream.codec_type.as_deref(), Some("video")));

    let audio_stream = data
        .streams
        .iter()
        .find(|stream| matches!(stream.codec_type.as_deref(), Some("audio")));

    // Analyze subtitle presence across all streams
    let subtitle_stats = subtitle_presence(&data.streams);

    // Extract frame rate with fallback from avg_frame_rate to r_frame_rate
    let fps = video_stream
        .and_then(|stream| {
            stream
                .avg_frame_rate
                .as_deref()
                .or(stream.r_frame_rate.as_deref())
        })
        .and_then(parse_frame_rate);

    // Extract color metadata if any color fields are present
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

    // Construct summary with normalized and extracted metadata
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

/** Analyzes subtitle streams to determine presence of text and image subtitles.

This function scans all streams in a media file to detect subtitle content,
categorizing them into text-based (SRT, ASS, etc.) and image-based (PGS, DVD, etc.)
formats. This information helps the UI indicate subtitle availability to users.

# Subtitle Categories
- **Text Subtitles**: Editable formats like SRT, ASS, SubRip - can be extracted or converted
- **Image Subtitles**: Bitmap formats like PGS, DVD - typically embedded in video stream

# Detection Logic
The function iterates through all streams, checking for "subtitle" codec_type,
then categorizes based on codec name using `is_image_subtitle()` classification.

# Arguments
* `streams` - Slice of all streams detected in the media file

# Returns
Tuple of (has_text_subtitles: bool, has_image_subtitles: bool)
*/
fn subtitle_presence(streams: &[FfprobeStream]) -> (bool, bool) {
    let mut has_text = false;
    let mut has_image = false;

    // Scan all streams for subtitle content
    for stream in streams {
        // Only process subtitle streams
        if !matches!(stream.codec_type.as_deref(), Some("subtitle")) {
            continue;
        }

        // Classify subtitle type based on codec
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

/** Determines if a subtitle codec represents image-based subtitles.

Image-based subtitles are bitmap graphics that are typically embedded in the
video stream and cannot be easily extracted or edited as text. This classification
helps the application provide appropriate UI hints and conversion options.

# Supported Image Subtitle Codecs
- `pgs` / `hdmv_pgs_subtitle`: Blu-ray Presentation Graphics
- `dvd_subtitle` / `dvdsub`: DVD subtitle format
- `xsub`: XSUB (extended subtitle) format
- `webp`: WebP image subtitles

# Arguments
* `codec` - Lowercase codec name string

# Returns
`true` if the codec represents image-based subtitles, `false` for text-based
*/
fn is_image_subtitle(codec: &str) -> bool {
    matches!(
        codec,
        "pgs" | "hdmv_pgs_subtitle" | "dvd_subtitle" | "dvdsub" | "xsub" | "webp"
    )
}

/** Parses a frame rate string into a floating-point value.

FFmpeg reports frame rates in various formats that need normalization:
- Rational format: "30000/1001" (numerator/denominator)
- Decimal format: "29.97" (direct floating point)
- Integer format: "30" (whole number)

This function handles all these formats safely, preventing division by zero
and handling malformed input gracefully.

# Parsing Logic
1. Check for rational format (contains '/')
2. Parse numerator and denominator separately
3. Perform safe division with zero denominator check
4. Fall back to direct float parsing for decimal/integer formats
5. Return None for invalid or empty input

# Arguments
* `value` - Frame rate string from `ffprobe` output

# Returns
`Some(f64)` with calculated frame rate, or `None` for invalid input
*/
fn parse_frame_rate(value: &str) -> Option<f64> {
    // Reject empty strings immediately
    if value.is_empty() {
        return None;
    }

    // Handle rational format (e.g., "30000/1001")
    if let Some((numerator, denominator)) = value.split_once('/') {
        let num: f64 = numerator.parse().ok()?;
        let den: f64 = denominator.parse().ok()?;

        // Prevent division by zero
        if den.abs() < f64::EPSILON {
            return None;
        }

        Some(num / den)
    } else {
        // Handle decimal or integer format (e.g., "29.97", "30")
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
    fn parses_frame_rate_rational() {
        assert_eq!(parse_frame_rate("30000/1001").unwrap(), 30000.0 / 1001.0);
        assert_eq!(parse_frame_rate("60/1").unwrap(), 60.0);
        assert_eq!(parse_frame_rate("25/1").unwrap(), 25.0);
    }

    #[test]
    fn parses_frame_rate_decimal() {
        assert_eq!(parse_frame_rate("23.976").unwrap(), 23.976);
        assert_eq!(parse_frame_rate("59.94").unwrap(), 59.94);
    }

    #[test]
    fn parses_frame_rate_invalid() {
        assert_eq!(parse_frame_rate(""), None);
        assert_eq!(parse_frame_rate("invalid"), None);
        assert_eq!(parse_frame_rate("10/0"), None);
        assert_eq!(parse_frame_rate("abc/def"), None);
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

    #[test]
    fn detects_text_subtitle_types() {
        let streams = vec![
            FfprobeStream {
                codec_type: Some("subtitle".into()),
                codec_name: Some("srt".into()),
                ..Default::default()
            },
            FfprobeStream {
                codec_type: Some("subtitle".into()),
                codec_name: Some("ass".into()),
                ..Default::default()
            },
            FfprobeStream {
                codec_type: Some("subtitle".into()),
                codec_name: Some("subrip".into()),
                ..Default::default()
            },
        ];
        let (text, image) = subtitle_presence(&streams);
        assert!(text);
        assert!(!image);
    }

    #[test]
    fn detects_image_subtitle_types() {
        let streams = vec![
            FfprobeStream {
                codec_type: Some("subtitle".into()),
                codec_name: Some("pgs".into()),
                ..Default::default()
            },
            FfprobeStream {
                codec_type: Some("subtitle".into()),
                codec_name: Some("dvd_subtitle".into()),
                ..Default::default()
            },
            FfprobeStream {
                codec_type: Some("subtitle".into()),
                codec_name: Some("dvdsub".into()),
                ..Default::default()
            },
        ];
        let (text, image) = subtitle_presence(&streams);
        assert!(!text);
        assert!(image);
    }

    #[test]
    fn test_is_image_subtitle() {
        assert!(is_image_subtitle("pgs"));
        assert!(is_image_subtitle("hdmv_pgs_subtitle"));
        assert!(is_image_subtitle("dvd_subtitle"));
        assert!(is_image_subtitle("dvdsub"));
        assert!(is_image_subtitle("xsub"));
        assert!(is_image_subtitle("webp"));

        assert!(!is_image_subtitle("srt"));
        assert!(!is_image_subtitle("ass"));
        assert!(!is_image_subtitle("subrip"));
    }

    #[test]
    fn test_subtitle_presence_no_subtitles() {
        let streams = vec![
            FfprobeStream {
                codec_type: Some("video".into()),
                codec_name: Some("h264".into()),
                ..Default::default()
            },
            FfprobeStream {
                codec_type: Some("audio".into()),
                codec_name: Some("aac".into()),
                ..Default::default()
            },
        ];
        let (text, image) = subtitle_presence(&streams);
        assert!(!text);
        assert!(!image);
    }

    #[test]
    fn test_summarize_video_stream() {
        let data = FfprobeOutput {
            format: FfprobeFormat {
                duration: Some("120.5".to_string()),
            },
            streams: vec![FfprobeStream {
                codec_type: Some("video".into()),
                codec_name: Some("H264".into()),
                width: Some(1920),
                height: Some(1080),
                avg_frame_rate: Some("30/1".into()),
                color_primaries: Some("bt709".into()),
                color_transfer: Some("bt709".into()),
                color_space: Some("bt709".into()),
                ..Default::default()
            }],
        };

        let summary = summarize(&data);
        assert_eq!(summary.duration_sec, 120.5);
        assert_eq!(summary.width, Some(1920));
        assert_eq!(summary.height, Some(1080));
        assert_eq!(summary.fps, Some(30.0));
        assert_eq!(summary.vcodec, Some("h264".to_string()));
        assert_eq!(summary.acodec, None);

        let color = summary.color.unwrap();
        assert_eq!(color.primaries, Some("bt709".to_string()));
        assert_eq!(color.trc, Some("bt709".to_string()));
        assert_eq!(color.space, Some("bt709".to_string()));
    }

    #[test]
    fn test_summarize_audio_stream() {
        let data = FfprobeOutput {
            format: FfprobeFormat {
                duration: Some("60.0".to_string()),
            },
            streams: vec![FfprobeStream {
                codec_type: Some("audio".into()),
                codec_name: Some("AAC".into()),
                channels: Some(2),
                ..Default::default()
            }],
        };

        let summary = summarize(&data);
        assert_eq!(summary.duration_sec, 60.0);
        assert_eq!(summary.acodec, Some("aac".to_string()));
        assert_eq!(summary.channels, Some(2));
        assert_eq!(summary.vcodec, None);
        assert_eq!(summary.width, None);
        assert_eq!(summary.height, None);
    }

    #[test]
    fn test_summarize_multi_stream() {
        let data = FfprobeOutput {
            format: FfprobeFormat {
                duration: Some("180.25".to_string()),
            },
            streams: vec![
                FfprobeStream {
                    codec_type: Some("video".into()),
                    codec_name: Some("hevc".into()),
                    width: Some(3840),
                    height: Some(2160),
                    avg_frame_rate: Some("24000/1001".into()),
                    ..Default::default()
                },
                FfprobeStream {
                    codec_type: Some("audio".into()),
                    codec_name: Some("opus".into()),
                    channels: Some(6),
                    ..Default::default()
                },
                FfprobeStream {
                    codec_type: Some("subtitle".into()),
                    codec_name: Some("srt".into()),
                    ..Default::default()
                },
            ],
        };

        let summary = summarize(&data);
        assert_eq!(summary.duration_sec, 180.25);
        assert_eq!(summary.vcodec, Some("hevc".to_string()));
        assert_eq!(summary.acodec, Some("opus".to_string()));
        assert_eq!(summary.width, Some(3840));
        assert_eq!(summary.height, Some(2160));
        assert_eq!(summary.fps.unwrap().round(), 24.0);
        assert_eq!(summary.channels, Some(6));
        assert!(summary.has_text_subs);
        assert!(!summary.has_image_subs);
    }

    #[test]
    fn test_summarize_invalid_duration() {
        let data = FfprobeOutput {
            format: FfprobeFormat {
                duration: Some("invalid".to_string()),
            },
            streams: vec![],
        };

        let summary = summarize(&data);
        assert_eq!(summary.duration_sec, 0.0);
    }

    #[test]
    fn test_summarize_missing_duration() {
        let data = FfprobeOutput {
            format: FfprobeFormat { duration: None },
            streams: vec![],
        };

        let summary = summarize(&data);
        assert_eq!(summary.duration_sec, 0.0);
    }

    #[test]
    fn test_summarize_r_frame_rate_fallback() {
        let data = FfprobeOutput {
            format: FfprobeFormat {
                duration: Some("10.0".to_string()),
            },
            streams: vec![FfprobeStream {
                codec_type: Some("video".into()),
                codec_name: Some("vp9".into()),
                avg_frame_rate: None,
                r_frame_rate: Some("60/1".into()),
                ..Default::default()
            }],
        };

        let summary = summarize(&data);
        assert_eq!(summary.fps, Some(60.0));
    }

    #[test]
    fn test_summarize_partial_color_metadata() {
        let data = FfprobeOutput {
            format: FfprobeFormat {
                duration: Some("10.0".to_string()),
            },
            streams: vec![FfprobeStream {
                codec_type: Some("video".into()),
                codec_name: Some("h264".into()),
                color_primaries: Some("bt709".into()),
                color_transfer: None,
                color_space: None,
                ..Default::default()
            }],
        };

        let summary = summarize(&data);
        let color = summary.color.unwrap();
        assert_eq!(color.primaries, Some("bt709".to_string()));
        assert_eq!(color.trc, None);
        assert_eq!(color.space, None);
    }

    #[test]
    fn test_summarize_no_color_metadata() {
        let data = FfprobeOutput {
            format: FfprobeFormat {
                duration: Some("10.0".to_string()),
            },
            streams: vec![FfprobeStream {
                codec_type: Some("video".into()),
                codec_name: Some("h264".into()),
                color_primaries: None,
                color_transfer: None,
                color_space: None,
                ..Default::default()
            }],
        };

        let summary = summarize(&data);
        assert!(summary.color.is_none());
    }
}
