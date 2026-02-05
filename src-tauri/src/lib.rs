// Copyright (C) 2025 Jerome Thayananthajothy
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
// along with this program. If not, see <https://www.gnu.org/licenses/>.

//! Honeymelon Tauri application entry point.
//!
//! This crate now wires up a thin command layer that delegates to dedicated
//! services, keeping SOLID responsibilities intact and making future refactors
//! simpler.

mod app_shell;
mod binary_resolver;
mod commands;
mod error;
mod ffmpeg_capabilities;
pub mod ffmpeg_errors;
mod ffmpeg_probe;
mod fs_utils;
pub mod job_lifecycle;
mod runner;
mod services;

pub use fs_utils::expand_media_paths;
pub use runner::events::{CompletionPayload, ProgressMetrics, ProgressPayload};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let _ = dotenvy::dotenv();
    let context = tauri::generate_context!();
    let app = crate::app_shell::build_app()
        .build(context)
        .expect("error while building tauri application");

    app.run(|app_handle, event| {
        #[cfg(target_os = "macos")]
        {
            use tauri::{Manager, RunEvent};

            if let RunEvent::Reopen {
                has_visible_windows: false,
                ..
            } = event
            {
                if let Some(window) = app_handle.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
        }
    });
}
