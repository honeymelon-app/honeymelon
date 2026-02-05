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
