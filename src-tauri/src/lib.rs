mod error;
mod ffmpeg_capabilities;
mod ffmpeg_probe;
mod ffmpeg_runner;
mod fs_utils;

use error::AppError;
use tauri::{Emitter, Manager};

const MEDIA_DIALOG_EXTENSIONS: &[&str] = &[
    "mp4", "m4v", "mov", "mkv", "webm", "avi", "mpg", "mpeg", "ts", "m2ts", "mxf", "hevc", "h265",
    "h264", "flv", "ogv", "wmv", "gif", "mp3", "aac", "m4a", "flac", "wav", "aiff", "aif", "ogg",
    "opus", "wma", "alac",
];

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
async fn pick_media_files() -> Result<Vec<String>, AppError> {
    let selection = tauri::async_runtime::spawn_blocking(|| {
        rfd::FileDialog::new()
            .set_title("Choose media files")
            .add_filter("Media", MEDIA_DIALOG_EXTENSIONS)
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    use tauri::menu::{MenuBuilder, MenuItemBuilder, SubmenuBuilder};

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            load_capabilities,
            probe_media,
            start_job,
            cancel_job,
            set_max_concurrency,
            expand_media_paths,
            pick_media_files,
            choose_output_directory
        ])
        .setup(|app| {
            // Build native macOS menu structure

            // App menu (Honeymelon)
            let about_item = MenuItemBuilder::with_id("about", "About Honeymelon").build(app)?;
            let preferences_item = MenuItemBuilder::with_id("preferences", "Preferences...")
                .accelerator("CmdOrCtrl+,")
                .build(app)?;
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
                .item(&preferences_item)
                .separator()
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
                    "preferences" => {
                        let _ = app.emit("menu:preferences", ());
                    },
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
                            let is_maximized = window.is_maximized().unwrap_or(false);
                            if is_maximized {
                                let _ = window.unmaximize();
                            } else {
                                let _ = window.maximize();
                            }
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
