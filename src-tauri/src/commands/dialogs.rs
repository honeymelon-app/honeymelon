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

use tauri::State;

use crate::{
    error::AppError,
    services::{MediaFilter, ServiceRegistry},
};

#[tauri::command]
pub async fn pick_media_files(
    services: State<'_, ServiceRegistry>,
    media_kind: Option<String>,
) -> Result<Vec<String>, AppError> {
    let dialog_service = services.inner().dialogs.clone();
    let filter = MediaFilter::from_kind(media_kind.as_deref());
    spawn_dialog(move || dialog_service.pick_media_files(filter)).await
}

#[tauri::command]
pub async fn choose_output_directory(
    services: State<'_, ServiceRegistry>,
    default_path: Option<String>,
) -> Result<Option<String>, AppError> {
    let dialog_service = services.inner().dialogs.clone();
    spawn_dialog(move || dialog_service.choose_output_directory(default_path)).await
}

async fn spawn_dialog<T>(
    task: impl FnOnce() -> Result<T, AppError> + Send + 'static,
) -> Result<T, AppError>
where
    T: Send + 'static,
{
    tauri::async_runtime::spawn_blocking(task)
        .await
        .map_err(|err| AppError::new("dialog_thread_join", err.to_string()))?
}
