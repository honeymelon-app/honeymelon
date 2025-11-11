/**
 * Honeymelon Tauri Application Library
 *
 * This is the main Rust library for the Honeymelon desktop application, built with Tauri.
 * It provides the backend functionality for media conversion, file management, licensing,
 * and system integration through a set of Tauri commands that can be invoked from the
 * frontend JavaScript/TypeScript code.
 *
 * The application uses FFmpeg for media processing and provides a native desktop experience
 * with file dialogs, system menus, and notification support.
 *
 * Key modules:
 * - binary_resolver: Centralized FFmpeg/FFprobe binary path resolution
 * - ffmpeg_capabilities: Detects available FFmpeg codecs and formats
 * - ffmpeg_probe: Analyzes media files to extract metadata
 * - ffmpeg_runner: Executes FFmpeg conversion jobs
 * - fs_utils: File system utilities for media file discovery
 * - license: Handles application licensing and activation
 * - error: Custom error types for the application
 *
 * Architecture:
 * The library exposes async Tauri commands that spawn blocking operations on separate
 * threads to avoid blocking the main UI thread. All media processing is done asynchronously
 * with proper error handling and progress reporting.
 */
mod binary_resolver;
mod error;
mod ffmpeg_capabilities;
mod ffmpeg_probe;
mod fs_utils;
mod license;
mod runner;

use error::AppError;
use tauri::{Emitter, Manager};

/**
 * Supported video file extensions.
 *
 * These extensions are used for file filtering in dialogs and
 * determining which files to process as video content.
 */
const VIDEO_EXTENSIONS: &[&str] = &[
    "mp4", "m4v", "mov", "mkv", "webm", "avi", "mpg", "mpeg", "ts", "m2ts", "mxf", "hevc", "h265",
    "h264", "flv", "ogv", "wmv", "gif",
];

/**
 * Supported audio file extensions.
 *
 * These extensions are used for file filtering in dialogs and
 * determining which files to process as audio content.
 */
const AUDIO_EXTENSIONS: &[&str] = &[
    "mp3", "aac", "m4a", "flac", "wav", "aiff", "aif", "ogg", "opus", "wma", "alac", "wave",
];

/**
 * Supported image file extensions.
 *
 * These extensions are used for file filtering in dialogs and
 * determining which files to process as image content.
 */
const IMAGE_EXTENSIONS: &[&str] = &["png", "jpg", "jpeg", "gif", "webp"];

/**
 * All supported media file extensions combined.
 *
 * Used when no specific media type filter is requested.
 */
const ALL_MEDIA_EXTENSIONS: &[&str] = &[
    "mp4", "m4v", "mov", "mkv", "webm", "avi", "mpg", "mpeg", "ts", "m2ts", "mxf", "hevc", "h265",
    "h264", "flv", "ogv", "wmv", "gif", "mp3", "aac", "m4a", "flac", "wav", "aiff", "aif", "ogg",
    "opus", "wma", "alac", "wave", "png", "jpg", "jpeg", "webp",
];

/**
 * Loads FFmpeg capabilities asynchronously.
 *
 * This command probes the system to determine which FFmpeg codecs,
 * formats, and features are available. The result is cached and used
 * to determine which conversion presets are supported.
 *
 * @param app - Tauri application handle for accessing app data directory
 * @return CapabilitySnapshot containing available codecs and formats
 */
#[tauri::command]
async fn load_capabilities(
    app: tauri::AppHandle,
) -> Result<ffmpeg_capabilities::CapabilitySnapshot, AppError> {
    tauri::async_runtime::spawn_blocking(move || ffmpeg_capabilities::load_capabilities(&app))
        .await
        .map_err(|err| AppError::new("capability_thread_join", err.to_string()))?
}

/**
 * Probes a media file for metadata.
 *
 * Analyzes a media file using FFmpeg to extract information about
 * streams, duration, codecs, and other metadata needed for conversion.
 *
 * @param app - Tauri application handle
 * @param path - File system path to the media file
 * @return ProbeResponse containing detailed media information
 */
#[tauri::command]
async fn probe_media(
    app: tauri::AppHandle,
    path: String,
) -> Result<ffmpeg_probe::ProbeResponse, AppError> {
    tauri::async_runtime::spawn_blocking(move || ffmpeg_probe::probe_media(&app, &path))
        .await
        .map_err(|err| AppError::new("probe_thread_join", err.to_string()))?
}

/**
 * Starts a media conversion job.
 *
 * Initiates an FFmpeg conversion process with the specified arguments
 * and output path. Jobs can be run exclusively (blocking other jobs)
 * or concurrently based on system capabilities.
 *
 * @param app - Tauri application handle for progress reporting
 * @param job_id - Unique identifier for the job
 * @param args - FFmpeg command line arguments
 * @param output_path - Destination file path
 * @param exclusive - Whether to run exclusively (blocking other jobs)
 */
#[tauri::command]
async fn start_job(
    app: tauri::AppHandle,
    job_id: String,
    args: Vec<String>,
    output_path: String,
    exclusive: bool,
) -> Result<(), AppError> {
    runner::start_job(app, job_id, args, output_path, exclusive)
}

/**
 * Cancels a running conversion job.
 *
 * Attempts to stop an active FFmpeg process for the specified job.
 * Returns whether the cancellation was successful.
 *
 * @param job_id - Unique identifier of the job to cancel
 * @return true if cancellation succeeded, false otherwise
 */
#[tauri::command]
async fn cancel_job(job_id: String) -> Result<bool, AppError> {
    runner::cancel_job(&job_id)
}

/**
 * Sets the maximum concurrency limit for jobs.
 *
 * Controls how many conversion jobs can run simultaneously.
 * This affects system resource usage and processing speed.
 *
 * @param limit - Maximum number of concurrent jobs
 */
#[tauri::command]
async fn set_max_concurrency(limit: usize) {
    runner::set_max_concurrency(limit);
}

/**
 * Expands media file paths from directories.
 *
 * Recursively scans directories to find all media files within them.
 * This allows users to drop folders and have all contained media files processed.
 *
 * @param paths - List of file/folder paths to expand
 * @return List of expanded media file paths
 */
#[tauri::command]
async fn expand_media_paths(paths: Vec<String>) -> Result<Vec<String>, AppError> {
    tauri::async_runtime::spawn_blocking(move || fs_utils::expand_media_paths(paths))
        .await
        .map_err(|err| AppError::new("fs_thread_join", err.to_string()))?
}

/**
 * Opens a native file picker for media files.
 *
 * Displays a system file dialog filtered by media type, allowing users
 * to select multiple files for processing.
 *
 * @param media_kind - Optional filter: "video", "audio", "image", or none for all
 * @return List of selected file paths
 */
#[tauri::command]
async fn pick_media_files(media_kind: Option<String>) -> Result<Vec<String>, AppError> {
    let extensions = match media_kind.as_deref() {
        Some("video") => VIDEO_EXTENSIONS,
        Some("audio") => AUDIO_EXTENSIONS,
        Some("image") => IMAGE_EXTENSIONS,
        _ => ALL_MEDIA_EXTENSIONS,
    };

    let filter_name = match media_kind.as_deref() {
        Some("video") => "Video Files",
        Some("audio") => "Audio Files",
        Some("image") => "Image Files",
        _ => "Media Files",
    };

    let selection = tauri::async_runtime::spawn_blocking(move || {
        rfd::FileDialog::new()
            .set_title("Choose media files")
            .add_filter(filter_name, extensions)
            .pick_files()
    })
    .await
    .map_err(|err| AppError::new("dialog_thread_join", err.to_string()))?;

    let Some(paths) = selection else {
        return Ok(Vec::new());
    };

    let files = paths
        .into_iter()
        .filter_map(|path| path.to_str().map(|value| value.to_string()))
        .collect();

    Ok(files)
}

/**
 * Verifies a license key without activation.
 *
 * Checks if a license key is valid and extracts license information
 * without persisting it to the system.
 *
 * @param key - License key string to verify
 * @return LicenseInfo if valid, error otherwise
 */
#[tauri::command]
async fn verify_license_key(key: String) -> Result<license::LicenseInfo, AppError> {
    license::verify(&key).map_err(Into::into)
}

/**
 * Activates a license key.
 *
 * Verifies and persists a license key to the system, marking it as
 * activated with a timestamp. Emits an event to notify the frontend.
 *
 * @param app - Tauri application handle for persistence
 * @param key - License key to activate
 * @return Activated LicenseInfo
 */
#[tauri::command]
async fn activate_license(
    app: tauri::AppHandle,
    key: String,
) -> Result<license::LicenseInfo, AppError> {
    let mut info = license::verify(&key)?;
    info.activated_at = Some(license::activate_timestamp());
    license::persist(&app, &info)?;
    app.emit("license://activated", &info).ok();
    Ok(info)
}

/**
 * Retrieves the current active license.
 *
 * Loads the persisted license information from the system.
 *
 * @param app - Tauri application handle
 * @return Current license info or None if no license
 */
#[tauri::command]
async fn current_license(app: tauri::AppHandle) -> Result<Option<license::LicenseInfo>, AppError> {
    license::load(&app).map_err(Into::into)
}

/**
 * Removes the current license.
 *
 * Deletes the persisted license information and emits an event
 * to notify the frontend of the license removal.
 *
 * @param app - Tauri application handle
 */
#[tauri::command]
async fn remove_license(app: tauri::AppHandle) -> Result<(), AppError> {
    license::remove(&app)?;
    app.emit("license://removed", &()).ok();
    Ok(())
}

/**
 * Opens a directory picker for output location.
 *
 * Displays a system folder selection dialog for choosing where
 * converted files should be saved.
 *
 * @param default_path - Optional default directory to start in
 * @return Selected directory path or None if cancelled
 */
#[tauri::command]
async fn choose_output_directory(default_path: Option<String>) -> Result<Option<String>, AppError> {
    let selection = tauri::async_runtime::spawn_blocking(move || {
        let mut dialog = rfd::FileDialog::new().set_title("Select output folder");
        if let Some(path) = &default_path {
            dialog = dialog.set_directory(path);
        }
        dialog.pick_folder()
    })
    .await
    .map_err(|err| AppError::new("dialog_thread_join", err.to_string()))?;

    let Some(path) = selection else {
        return Ok(None);
    };

    Ok(path.to_str().map(|value| value.to_string()))
}

/**
 * Main application entry point.
 *
 * Initializes and runs the Tauri application with all configured
 * plugins, commands, and menu structure. Sets up the native macOS
 * menu bar and event handlers for desktop integration.
 */
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let _ = dotenvy::dotenv();

    use tauri::menu::{MenuBuilder, MenuItemBuilder, SubmenuBuilder};

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_store::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            load_capabilities,
            probe_media,
            start_job,
            cancel_job,
            set_max_concurrency,
            expand_media_paths,
            pick_media_files,
            choose_output_directory,
            verify_license_key,
            activate_license,
            current_license,
            remove_license
        ])
        .setup(|app| {
            // Build native macOS menu structure

            // App menu (Honeymelon)
            let about_item = MenuItemBuilder::with_id("about", "About Honeymelon").build(app)?;
            // Preferences menu item removed per user requirements
            // let preferences_item = MenuItemBuilder::with_id("preferences", "Preferences...")
            //     .accelerator("CmdOrCtrl+,")
            //     .build(app)?;
            let hide_item = MenuItemBuilder::with_id("hide", "Hide Honeymelon")
                .accelerator("CmdOrCtrl+H")
                .build(app)?;
            let hide_others_item = MenuItemBuilder::with_id("hide_others", "Hide Others")
                .accelerator("CmdOrCtrl+Alt+H")
                .build(app)?;
            let show_all_item = MenuItemBuilder::with_id("show_all", "Show All").build(app)?;
            let quit_item = MenuItemBuilder::with_id("quit", "Quit Honeymelon")
                .accelerator("CmdOrCtrl+Q")
                .build(app)?;

            let app_menu = SubmenuBuilder::new(app, "Honeymelon")
                .item(&about_item)
                .separator()
                // Preferences menu item removed
                // .item(&preferences_item)
                // .separator()
                .item(&hide_item)
                .item(&hide_others_item)
                .item(&show_all_item)
                .separator()
                .item(&quit_item)
                .build()?;

            // File menu
            let open_item = MenuItemBuilder::with_id("open", "Open Media Files...")
                .accelerator("CmdOrCtrl+O")
                .build(app)?;
            let close_window_item = MenuItemBuilder::with_id("close", "Close Window")
                .accelerator("CmdOrCtrl+W")
                .build(app)?;

            let file_menu = SubmenuBuilder::new(app, "File")
                .item(&open_item)
                .separator()
                .item(&close_window_item)
                .build()?;

            // Edit menu
            let undo_item = MenuItemBuilder::with_id("undo", "Undo")
                .accelerator("CmdOrCtrl+Z")
                .build(app)?;
            let redo_item = MenuItemBuilder::with_id("redo", "Redo")
                .accelerator("CmdOrCtrl+Shift+Z")
                .build(app)?;
            let cut_item = MenuItemBuilder::with_id("cut", "Cut")
                .accelerator("CmdOrCtrl+X")
                .build(app)?;
            let copy_item = MenuItemBuilder::with_id("copy", "Copy")
                .accelerator("CmdOrCtrl+C")
                .build(app)?;
            let paste_item = MenuItemBuilder::with_id("paste", "Paste")
                .accelerator("CmdOrCtrl+V")
                .build(app)?;
            let select_all_item = MenuItemBuilder::with_id("select_all", "Select All")
                .accelerator("CmdOrCtrl+A")
                .build(app)?;

            let edit_menu = SubmenuBuilder::new(app, "Edit")
                .item(&undo_item)
                .item(&redo_item)
                .separator()
                .item(&cut_item)
                .item(&copy_item)
                .item(&paste_item)
                .separator()
                .item(&select_all_item)
                .build()?;

            // View menu
            let toggle_devtools_item =
                MenuItemBuilder::with_id("toggle_devtools", "Toggle Developer Tools")
                    .accelerator("CmdOrCtrl+Alt+I")
                    .build(app)?;

            let view_menu = SubmenuBuilder::new(app, "View")
                .item(&toggle_devtools_item)
                .build()?;

            // Window menu
            let minimize_item = MenuItemBuilder::with_id("minimize", "Minimize")
                .accelerator("CmdOrCtrl+M")
                .build(app)?;
            let zoom_item = MenuItemBuilder::with_id("zoom", "Zoom").build(app)?;
            let bring_all_to_front_item =
                MenuItemBuilder::with_id("bring_all_front", "Bring All to Front").build(app)?;

            let window_menu = SubmenuBuilder::new(app, "Window")
                .item(&minimize_item)
                .item(&zoom_item)
                .separator()
                .item(&bring_all_to_front_item)
                .build()?;

            // Build complete menu bar
            let menu = MenuBuilder::new(app)
                .item(&app_menu)
                .item(&file_menu)
                .item(&edit_menu)
                .item(&view_menu)
                .item(&window_menu)
                .build()?;

            app.set_menu(menu)?;

            // Handle menu events
            app.on_menu_event(move |app, event| {
                match event.id.as_ref() {
                    "about" => {
                        let _ = app.emit("menu:about", ());
                    },
                    // Preferences menu handler removed per user requirements
                    // "preferences" => {
                    //     let _ = app.emit("menu:preferences", ());
                    // },
                    "quit" => {
                        app.exit(0);
                    },
                    "open" => {
                        // Open file dialog - emit event to frontend
                        let _ = app.emit("menu:open", ());
                    },
                    "close" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.close();
                        }
                    },
                    "hide" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.hide();
                        }
                    },
                    "minimize" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.minimize();
                        }
                    },
                    "zoom" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.maximize();
                        }
                    },
                    "toggle_devtools" => {
                        // Note: In Tauri v2, devtools access has changed.
                        // For macOS, you can right-click in the app and select "Inspect Element"
                        // or use Safari's developer tools to debug the webview.
                        #[cfg(debug_assertions)]
                        {
                            eprintln!(
                                "DevTools: Right-click in the app and select 'Inspect Element'"
                            );
                        }
                    },
                    _ => {
                        // For standard edit commands, emit events that the webview can handle
                        if matches!(
                            event.id.as_ref(),
                            "cut" | "copy" | "paste" | "select_all" | "undo" | "redo"
                        ) {
                            let _ = app.emit(&format!("menu:{}", event.id.as_ref()), ());
                        }
                    },
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
