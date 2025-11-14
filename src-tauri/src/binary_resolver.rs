//! Binary resolution utilities for locating FFmpeg and FFprobe binaries.
//!
//! This module provides a centralized, DRY approach to resolving FFmpeg/FFprobe paths
//! using a 4-tier fallback strategy:
//! 1. Environment variable override (HONEYMELON_FFMPEG_PATH / HONEYMELON_FFPROBE_PATH)
//! 2. Development bundled binary (src-tauri/bin/)
//! 3. Production bundled binary (app.app/Contents/Resources/bin/)
//! 4. System PATH fallback
//!
//! This eliminates code duplication across ffmpeg_probe.rs, ffmpeg_capabilities.rs,
//! and the runner modules under `src-tauri/src/runner`.

use std::ffi::OsString;
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

/// Represents the type of binary to resolve
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BinaryType {
    /// FFmpeg binary for media conversion
    FFmpeg,
    /// FFprobe binary for media inspection
    FFprobe,
}

impl BinaryType {
    /// Returns the environment variable name for this binary type
    fn env_var_name(&self) -> &'static str {
        match self {
            BinaryType::FFmpeg => "HONEYMELON_FFMPEG_PATH",
            BinaryType::FFprobe => "HONEYMELON_FFPROBE_PATH",
        }
    }

    /// Returns the binary filename for this binary type
    fn binary_name(&self) -> &'static str {
        match self {
            BinaryType::FFmpeg => "ffmpeg",
            BinaryType::FFprobe => "ffprobe",
        }
    }
}

/// Resolves candidate paths for a given binary type using the 4-tier fallback strategy.
///
/// # Arguments
/// * `binary_type` - The type of binary to resolve (FFmpeg or FFprobe)
/// * `app` - Tauri AppHandle for accessing resource directories
///
/// # Returns
/// A vector of candidate paths in priority order. The first valid path should be used.
///
/// # Example
/// ```ignore
/// use honeymelon_lib::binary_resolver::{BinaryType, resolve_binary_paths};
/// use std::process::Command;
/// # use tauri::AppHandle;
/// # fn example(app: &AppHandle) {
/// let candidates = resolve_binary_paths(BinaryType::FFmpeg, app);
/// // Try each candidate until one works
/// for path in candidates {
///     if let Ok(output) = Command::new(&path).arg("-version").output() {
///         // Found working FFmpeg
///         break;
///     }
/// }
/// # }
/// ```
pub fn resolve_binary_paths(binary_type: BinaryType, app: &AppHandle) -> Vec<OsString> {
    let mut candidates: Vec<OsString> = Vec::new();
    let binary_name = binary_type.binary_name();

    // Priority 1: Environment variable override for custom installations
    if let Ok(override_path) = std::env::var(binary_type.env_var_name()) {
        push_if_valid(&mut candidates, PathBuf::from(override_path));
    }

    // Priority 2: Development-bundled binary for local development (`tauri dev`)
    let dev_bundled_path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("bin")
        .join(binary_name);
    push_if_valid(&mut candidates, dev_bundled_path);

    // Priority 3: Application-bundled binary for packaged distributions
    if let Ok(resource_dir) = app.path().resource_dir() {
        let bundled = resource_dir.join("bin").join(binary_name);
        push_if_valid(&mut candidates, bundled);
    }

    // Priority 4: System PATH fallback for standard installations
    candidates.push(OsString::from(binary_name));

    candidates
}

/// Convenience function to resolve FFmpeg paths
pub fn resolve_ffmpeg_paths(app: &AppHandle) -> Vec<OsString> {
    resolve_binary_paths(BinaryType::FFmpeg, app)
}

/// Convenience function to resolve FFprobe paths
pub fn resolve_ffprobe_paths(app: &AppHandle) -> Vec<OsString> {
    resolve_binary_paths(BinaryType::FFprobe, app)
}

/// Helper function to add a path to candidates if it's a valid executable.
///
/// A valid binary must:
/// - Exist as a file
/// - Have executable permissions (on Unix systems)
fn push_if_valid(list: &mut Vec<OsString>, path: PathBuf) {
    if is_valid_binary(&path) {
        list.push(path.into_os_string());
    }
}

/// Checks if a given path points to a valid executable binary.
///
/// # Arguments
/// * `path` - The path to check
///
/// # Returns
/// `true` if the path exists and is executable, `false` otherwise
fn is_valid_binary(path: &PathBuf) -> bool {
    if !path.exists() {
        return false;
    }

    let metadata = match fs::metadata(path) {
        Ok(m) => m,
        Err(_) => return false,
    };

    if !metadata.is_file() {
        return false;
    }

    // On Unix systems, check executable permission
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let permissions = metadata.permissions();
        let mode = permissions.mode();
        // Check if any execute bit is set (user, group, or other)
        if mode & 0o111 == 0 {
            return false;
        }
    }

    true
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_binary_type_env_var_names() {
        assert_eq!(BinaryType::FFmpeg.env_var_name(), "HONEYMELON_FFMPEG_PATH");
        assert_eq!(
            BinaryType::FFprobe.env_var_name(),
            "HONEYMELON_FFPROBE_PATH"
        );
    }

    #[test]
    fn test_binary_type_binary_names() {
        assert_eq!(BinaryType::FFmpeg.binary_name(), "ffmpeg");
        assert_eq!(BinaryType::FFprobe.binary_name(), "ffprobe");
    }

    #[test]
    fn test_is_valid_binary_nonexistent() {
        let path = PathBuf::from("/nonexistent/path/ffmpeg");
        assert!(!is_valid_binary(&path));
    }

    #[test]
    fn test_is_valid_binary_directory() {
        // Use a known directory (current directory)
        let path = PathBuf::from(".");
        assert!(!is_valid_binary(&path));
    }

    // Note: More comprehensive tests would require mocking the filesystem
    // or using a test fixture directory with actual binary files
}
