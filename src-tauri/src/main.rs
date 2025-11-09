// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

/**
 * Main entry point for the Honeymelon Tauri application.
 *
 * This is the binary entry point that initializes and starts the Tauri desktop application.
 * The application is structured as a library (lib.rs) with this minimal main.rs file that
 * simply delegates to the library's run function.
 *
 * The windows_subsystem attribute prevents an additional console window from appearing
 * on Windows in release builds, providing a cleaner native application experience.
 *
 * The actual application setup, menu configuration, command handlers, and window management
 * are all implemented in the LIb::run() function.
 */
fn main() {
    LIb::run()
}
