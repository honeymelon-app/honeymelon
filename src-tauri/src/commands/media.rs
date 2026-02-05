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

use std::path::Path;
use tauri::{AppHandle, State};

use crate::{
    error::AppError, ffmpeg_capabilities::CapabilitySnapshot, ffmpeg_probe::ProbeResponse,
    services::ServiceRegistry,
};

/// Checks if a file exists at the given path
#[tauri::command]
pub fn file_exists(path: String) -> bool {
    Path::new(&path).exists()
}

#[tauri::command]
pub async fn load_capabilities(
    app: AppHandle,
    services: State<'_, ServiceRegistry>,
) -> Result<CapabilitySnapshot, AppError> {
    let capability_service = services.inner().capabilities.clone();
    tauri::async_runtime::spawn_blocking(move || capability_service.load(&app))
        .await
        .map_err(|err| AppError::new("capability_thread_join", err.to_string()))?
}

#[tauri::command]
pub async fn probe_media(
    app: AppHandle,
    services: State<'_, ServiceRegistry>,
    path: String,
) -> Result<ProbeResponse, AppError> {
    let probe_service = services.inner().media_probe.clone();
    tauri::async_runtime::spawn_blocking(move || probe_service.probe(&app, &path))
        .await
        .map_err(|err| AppError::new("probe_thread_join", err.to_string()))?
}

#[tauri::command]
pub async fn expand_media_paths(
    services: State<'_, ServiceRegistry>,
    paths: Vec<String>,
) -> Result<Vec<String>, AppError> {
    let path_service = services.inner().paths.clone();
    tauri::async_runtime::spawn_blocking(move || path_service.expand_paths(paths))
        .await
        .map_err(|err| AppError::new("fs_thread_join", err.to_string()))?
}
