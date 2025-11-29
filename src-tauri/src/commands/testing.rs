//! Commands for E2E testing support.
//!
//! These commands are only active when the `PLAYWRIGHT_E2E` environment variable is set.

use tauri::AppHandle;
use tauri_remote_ui::RemoteUiExt;

/// Start the Remote UI server for Playwright E2E testing.
///
/// This command enables the tauri-remote-ui plugin's WebSocket server,
/// allowing Playwright to connect to the app's UI via a web browser.
///
/// # Arguments
/// * `port` - The port to start the Remote UI server on (default: 9090)
///
/// # Returns
/// * `Ok(String)` - The URL where the Remote UI is accessible
/// * `Err(String)` - Error message if the server failed to start
#[tauri::command]
pub async fn enable_remote_ui(app: AppHandle, port: Option<u16>) -> Result<String, String> {
    // Only allow this command when E2E testing is enabled
    if std::env::var("PLAYWRIGHT_E2E").is_err() {
        return Err("Remote UI is only available in E2E test mode".to_string());
    }

    let port = port.unwrap_or(9090);
    let config = tauri_remote_ui::RemoteUiConfig::default().set_port(Some(port));

    app.start_remote_ui(config)
        .await
        .map_err(|e| format!("Failed to start Remote UI server: {}", e))?;

    Ok(format!("http://localhost:{}", port))
}

/// Stop the Remote UI server.
#[tauri::command]
pub async fn disable_remote_ui(app: AppHandle) -> Result<(), String> {
    if std::env::var("PLAYWRIGHT_E2E").is_err() {
        return Err("Remote UI is only available in E2E test mode".to_string());
    }

    app.stop_remote_ui()
        .await
        .map_err(|e| format!("Failed to stop Remote UI server: {}", e))
}
