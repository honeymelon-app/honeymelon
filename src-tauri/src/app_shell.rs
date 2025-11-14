use crate::services::ServiceRegistry;
use tauri::menu::{MenuBuilder, MenuItemBuilder, SubmenuBuilder};
use tauri::{App, Builder, Emitter, Manager, Wry};

type AppRuntime = Wry;

pub fn build_app() -> Builder<AppRuntime> {
    Builder::new()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_store::Builder::default().build())
        .manage(ServiceRegistry::default())
        .invoke_handler(tauri::generate_handler![
            crate::commands::media::load_capabilities,
            crate::commands::media::probe_media,
            crate::commands::jobs::start_job,
            crate::commands::jobs::cancel_job,
            crate::commands::jobs::set_max_concurrency,
            crate::commands::media::expand_media_paths,
            crate::commands::dialogs::pick_media_files,
            crate::commands::dialogs::choose_output_directory,
            crate::commands::licensing::verify_license_key,
            crate::commands::licensing::activate_license,
            crate::commands::licensing::current_license,
            crate::commands::licensing::remove_license
        ])
        .setup(|app| {
            configure_menus(app)?;
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

    let toggle_devtools_item =
        MenuItemBuilder::with_id("toggle_devtools", "Toggle Developer Tools")
            .accelerator("CmdOrCtrl+Alt+I")
            .build(app)?;

    let view_menu = SubmenuBuilder::new(app, "View")
        .item(&toggle_devtools_item)
        .build()?;

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
            let _ = app.emit("menu:about", ());
        },
        "quit" => {
            app.exit(0);
        },
        "open" => {
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
            #[cfg(debug_assertions)]
            {
                eprintln!("DevTools: Right-click and choose 'Inspect Element'.");
            }
        },
        _ => {
            if matches!(
                event.id.as_ref(),
                "cut" | "copy" | "paste" | "select_all" | "undo" | "redo"
            ) {
                let _ = app.emit(&format!("menu:{}", event.id.as_ref()), ());
            }
        },
    });
}
