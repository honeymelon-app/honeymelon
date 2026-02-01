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
