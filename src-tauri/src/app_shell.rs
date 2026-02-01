use crate::services::ServiceRegistry;
use tauri::menu::{MenuBuilder, MenuItemBuilder, SubmenuBuilder};
use tauri::{App, Builder, Emitter, Manager, WindowEvent, Wry};

type AppRuntime = Wry;

pub fn build_app() -> Builder<AppRuntime> {
    let builder = Builder::new()
        .on_window_event(|window, event| {
            #[cfg(target_os = "macos")]
            {
                if window.label() == "main" {
                    if let WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        let _ = window.hide();
                    }
                }
            }
        })
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_store::Builder::default().build());

    let builder =
        builder
            .manage(ServiceRegistry::default())
            .invoke_handler(tauri::generate_handler![
                crate::commands::media::load_capabilities,
                crate::commands::media::probe_media,
                crate::commands::media::file_exists,
                crate::commands::jobs::start_job,
                crate::commands::jobs::cancel_job,
                crate::commands::jobs::set_max_concurrency,
                crate::commands::media::expand_media_paths,
                crate::commands::dialogs::pick_media_files,
                crate::commands::dialogs::choose_output_directory,
            ]);

    builder.setup(|app| {
        configure_menus(app)?;
        setup_window_behavior(app)?;
        Ok(())
    })
}

#[cfg(any(target_os = "macos", target_os = "windows", target_os = "linux"))]
fn configure_menus(app: &App<AppRuntime>) -> tauri::Result<()> {
    let menu = build_desktop_menu(app)?;
    app.set_menu(menu)?;
    register_menu_handlers(app);
    Ok(())
}

#[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
fn configure_menus(_app: &App<AppRuntime>) -> tauri::Result<()> {
    Ok(())
}

fn setup_window_behavior(_app: &App<AppRuntime>) -> tauri::Result<()> {
    // Window close behavior is handled by the frontend's onCloseRequested handler
    // in use-app-orchestration.ts, which allows showing confirmation dialogs
    // for active jobs before hiding/closing the window.
    // No additional Rust-side configuration is needed for Tauri v2.
    Ok(())
}

fn build_desktop_menu(app: &App<AppRuntime>) -> tauri::Result<tauri::menu::Menu<AppRuntime>> {
    let about_item = MenuItemBuilder::with_id("about", "About Honeymelon").build(app)?;
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
        .item(&hide_item)
        .item(&hide_others_item)
        .item(&show_all_item)
        .separator()
        .item(&quit_item)
        .build()?;

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

    // Use predefined menu items for standard edit operations
    // These automatically work with the webview without custom handlers
    let edit_menu = SubmenuBuilder::new(app, "Edit")
        .undo()
        .redo()
        .separator()
        .cut()
        .copy()
        .paste()
        .separator()
        .select_all()
        .build()?;

    #[cfg(debug_assertions)]
    let toggle_devtools_item =
        MenuItemBuilder::with_id("toggle_devtools", "Toggle Developer Tools")
            .accelerator("CmdOrCtrl+Alt+I")
            .build(app)?;

    let view_menu = {
        #[cfg(debug_assertions)]
        {
            SubmenuBuilder::new(app, "View")
                .item(&toggle_devtools_item)
                .build()?
        }
        #[cfg(not(debug_assertions))]
        {
            SubmenuBuilder::new(app, "View").build()?
        }
    };

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

    MenuBuilder::new(app)
        .item(&app_menu)
        .item(&file_menu)
        .item(&edit_menu)
        .item(&view_menu)
        .item(&window_menu)
        .build()
}

fn register_menu_handlers(app: &App<AppRuntime>) {
    app.on_menu_event(move |app, event| match event.id.as_ref() {
        "about" => {
            if let Err(e) = app.emit("menu:about", ()) {
                eprintln!("Failed to emit menu:about event: {}", e);
            }
        },
        "quit" => {
            let _ = app.emit("menu:quit", ());
            app.exit(0);
        },
        "open" => {
            if let Err(e) = app.emit("menu:open", ()) {
                eprintln!("Failed to emit menu:open event: {}", e);
            }
        },
        "close" => {
            // Emit event to frontend so it can show confirmation dialog if needed
            if let Err(e) = app.emit("menu:close", ()) {
                eprintln!("Failed to emit menu:close event: {}", e);
            }

            // Fallback: if the frontend doesn't handle it, match macOS behavior and hide the window.
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.hide();
            }
        },
        "hide" => {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.hide();
            }
        },
        "show_all" | "bring_all_front" => {
            if let Some(window) = app.get_webview_window("main") {
                if let Err(e) = window.show() {
                    eprintln!("Failed to show window: {}", e);
                }
                if let Err(e) = window.set_focus() {
                    eprintln!("Failed to focus window: {}", e);
                }
            }
        },
        "hide_others" => {
            // macOS handles hiding other apps at the system level
            // We don't need to do anything here
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
        #[cfg(debug_assertions)]
        "toggle_devtools" => {
            if let Some(window) = app.get_webview_window("main") {
                if window.is_devtools_open() {
                    window.close_devtools();
                } else {
                    window.open_devtools();
                }
            }
        },
        _ => {},
    });
}
