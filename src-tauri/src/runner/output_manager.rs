// Copyright (C) 2025-2026 Jerome Thayananthajothy
//
// This file is part of Honeymelon.
//
// Honeymelon is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program. If not, see <https://www.gnu.org/licenses/\>.

use crate::error::AppError;
use std::fs;
use std::io::ErrorKind;
use std::path::{Path, PathBuf};

/// Manages output file paths and temporary file creation
pub struct OutputManager;

impl OutputManager {
    /// Prepares output path, creating directories and validating permissions
    pub fn prepare(output_path: &str, _exclusive: bool) -> Result<(PathBuf, PathBuf), AppError> {
        let output = PathBuf::from(output_path);

        // Create parent directories if needed
        if let Some(parent) = output.parent() {
            if !parent.as_os_str().is_empty() {
                fs::create_dir_all(parent).map_err(|err| {
                    AppError::new(
                        "job_output_directory",
                        format!(
                            "Failed creating output directory {}: {err}",
                            parent.display()
                        ),
                    )
                })?;
            }
        }

        // Generate temporary file path while preserving the original extension
        let temp_file_name = match (
            output.file_stem().and_then(|name| name.to_str()),
            output.extension().and_then(|ext| ext.to_str()),
        ) {
            (Some(stem), Some(ext)) if !stem.is_empty() && !ext.is_empty() => {
                format!("{stem}.tmp.{ext}")
            },
            _ => output
                .file_name()
                .and_then(|name| name.to_str())
                .map(|name| format!("{name}.tmp"))
                .unwrap_or_else(|| "output.tmp".to_string()),
        };
        let temp_path = output.with_file_name(temp_file_name);

        // Validate write permissions
        Self::validate_permissions(&temp_path, &output)?;

        Ok((output, temp_path))
    }

    /// Validates write permissions by attempting to create the temp file
    fn validate_permissions(temp_path: &Path, output: &Path) -> Result<(), AppError> {
        match fs::File::create(temp_path) {
            Ok(file) => {
                drop(file);
                let _ = fs::remove_file(temp_path);
                Ok(())
            }
            Err(err) if err.kind() == ErrorKind::PermissionDenied => Err(AppError::new(
                "job_output_permission",
                format!(
                    "Unable to write output file at {}: {err}. Select a different output directory in Preferences or grant Honeymelon Full Disk Access (System Settings > Privacy & Security > Full Disk Access).",
                    output.display()
                ),
            )),
            Err(err) => Err(AppError::new(
                "job_output_prepare",
                format!("Failed preparing output file {}: {err}", output.display()),
            )),
        }
    }

    /// Finalizes output by moving temp file to final location
    pub fn finalize(temp_path: &Path, final_path: &Path) -> Result<(), AppError> {
        // Remove any existing output file
        if final_path.exists() {
            let _ = fs::remove_file(final_path);
        }

        // Atomically move temp file to final location
        fs::rename(temp_path, final_path).map_err(|err| {
            // Clean up temp file on rename failure
            let _ = fs::remove_file(temp_path);
            AppError::new(
                "job_finalize_failed",
                format!("Failed to finalize output file: {err}"),
            )
        })
    }

    /// Cleans up a temporary file
    pub fn cleanup_temp(temp_path: &Path) {
        let _ = fs::remove_file(temp_path);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs::File;
    use tempfile::tempdir;

    #[test]
    fn test_prepare_creates_directories() {
        let temp_dir = tempdir().expect("temp dir");
        let test_path = temp_dir.path().join("test_honeymelon_output/file.mp4");

        let result = OutputManager::prepare(test_path.to_str().unwrap(), false);
        assert!(result.is_ok());
    }

    #[test]
    fn test_prepare_preserves_extension_in_temp_name() {
        let temp_dir = tempdir().expect("temp dir");
        let test_path = temp_dir.path().join("test_honeymelon_output/image.bmp");

        let result = OutputManager::prepare(test_path.to_str().unwrap(), false);
        assert!(result.is_ok());

        let (_, temp_path) = result.unwrap();
        assert_eq!(
            temp_path.file_name().and_then(|name| name.to_str()),
            Some("image.tmp.bmp")
        );
    }

    #[test]
    fn test_finalize_moves_file() {
        let temp_dir = tempdir().expect("temp dir");
        let temp_file = temp_dir.path().join("test_temp.txt");
        let final_file = temp_dir.path().join("test_final.txt");

        // Create temp file
        File::create(&temp_file).unwrap();

        // Finalize
        let result = OutputManager::finalize(&temp_file, &final_file);
        assert!(result.is_ok());
        assert!(!temp_file.exists());
        assert!(final_file.exists());
    }
}
