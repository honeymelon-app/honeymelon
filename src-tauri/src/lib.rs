mod error;
mod ffmpeg_capabilities;
mod ffmpeg_probe;
mod ffmpeg_runner;
mod fs_utils;

use error::AppError;
use tauri::Manager;

#[tauri::command]
async fn load_capabilities(
    app: tauri::AppHandle,
) -> Result<ffmpeg_capabilities::CapabilitySnapshot, AppError> {
    tauri::async_runtime::spawn_blocking(move || ffmpeg_capabilities::load_capabilities(&app))
        .await
        .map_err(|err| AppError::new("capability_thread_join", err.to_string()))?
}

#[tauri::command]
async fn probe_media(
    app: tauri::AppHandle,
    path: String,
) -> Result<ffmpeg_probe::ProbeResponse, AppError> {
    tauri::async_runtime::spawn_blocking(move || ffmpeg_probe::probe_media(&app, &path))
        .await
        .map_err(|err| AppError::new("probe_thread_join", err.to_string()))?
}

#[tauri::command]
async fn start_job(
    app: tauri::AppHandle,
    job_id: String,
    args: Vec<String>,
    output_path: String,
    exclusive: bool,
) -> Result<(), AppError> {
    ffmpeg_runner::start_job(app, job_id, args, output_path, exclusive)
}

#[tauri::command]
async fn cancel_job(job_id: String) -> Result<bool, AppError> {
    ffmpeg_runner::cancel_job(&job_id)
}

#[tauri::command]
async fn set_max_concurrency(limit: usize) {
    ffmpeg_runner::set_max_concurrency(limit);
}

#[tauri::command]
async fn expand_media_paths(paths: Vec<String>) -> Result<Vec<String>, AppError> {
    tauri::async_runtime::spawn_blocking(move || fs_utils::expand_media_paths(paths))
        .await
        .map_err(|err| AppError::new("fs_thread_join", err.to_string()))?
}

#[tauri::command]
async fn show_about(app: tauri::AppHandle) -> Result<(), AppError> {
    if let Some(window) = app.get_webview_window("about") {
        let _ = window.set_focus();
        return Ok(());
    }

    tauri::WebviewWindowBuilder::new(
        &app,
        "about",
        tauri::WebviewUrl::App("index.html#/about".into()),
    )
    .title("About Honeymelon")
    .inner_size(450.0, 550.0)
    .resizable(false)
    .center()
    .build()
    .map_err(|e| AppError::new("window_creation", e.to_string()))?;

    Ok(())
}

#[tauri::command]
async fn show_preferences(app: tauri::AppHandle) -> Result<(), AppError> {
    if let Some(window) = app.get_webview_window("preferences") {
        let _ = window.set_focus();
        return Ok(());
    }

    tauri::WebviewWindowBuilder::new(
        &app,
        "preferences",
        tauri::WebviewUrl::App("index.html#/preferences".into()),
    )
    .title("Preferences")
    .inner_size(700.0, 600.0)
    .resizable(false)
    .center()
    .build()
    .map_err(|e| AppError::new("window_creation", e.to_string()))?;

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    use tauri::menu::{MenuBuilder, MenuItemBuilder};

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            load_capabilities,
            probe_media,
            start_job,
            cancel_job,
            set_max_concurrency,
            expand_media_paths,
            show_about,
            show_preferences
        ])
        .setup(|app| {
            // Build the application menu
            let about_item = MenuItemBuilder::with_id("about", "About Honeymelon").build(app)?;
            let preferences_item = MenuItemBuilder::with_id("preferences", "Preferences...")
                .accelerator("Cmd+,")
                .build(app)?;
            let quit_item = MenuItemBuilder::with_id("quit", "Quit Honeymelon")
                .accelerator("Cmd+Q")
                .build(app)?;

            let menu = MenuBuilder::new(app)
                .item(&about_item)
                .separator()
                .item(&preferences_item)
                .separator()
                .item(&quit_item)
                .build()?;

            app.set_menu(menu)?;

            // Handle menu events
            app.on_menu_event(move |app, event| {
                match event.id.as_ref() {
                    "about" => {
                        let app_clone = app.clone();
                        tauri::async_runtime::spawn(async move {
                            let _ = show_about(app_clone).await;
                        });
                    }
                    "preferences" => {
                        let app_clone = app.clone();
                        tauri::async_runtime::spawn(async move {
                            let _ = show_preferences(app_clone).await;
                        });
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
