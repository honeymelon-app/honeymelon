//! Honeymelon Tauri application entry point.
//!
//! This crate now wires up a thin command layer that delegates to dedicated
//! services, keeping SOLID responsibilities intact and making future refactors
//! (runner, licensing, etc.) simpler.

mod app_shell;
mod binary_resolver;
mod commands;
mod error;
mod ffmpeg_capabilities;
mod ffmpeg_probe;
mod fs_utils;
pub mod job_lifecycle;
mod license;
mod runner;
mod services;

pub use fs_utils::expand_media_paths;
pub use runner::events::{CompletionPayload, ProgressMetrics, ProgressPayload};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let _ = dotenvy::dotenv();
    crate::app_shell::build_app()
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
