// Copyright (C) 2025-2026 Jerome Thayananthajothy
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
 * are all implemented in the honeymelon_lib::run() function.
 */
fn main() {
    honeymelon_lib::run()
}
