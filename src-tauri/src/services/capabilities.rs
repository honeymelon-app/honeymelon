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
// along with this program. If not, see <https://www.gnu.org/licenses/\>.

use tauri::AppHandle;

use crate::{error::AppError, ffmpeg_capabilities};

pub trait CapabilityServiceApi: Send + Sync {
    fn load(&self, app: &AppHandle) -> Result<ffmpeg_capabilities::CapabilitySnapshot, AppError>;
}

/// Service wrapper for FFmpeg capability discovery.
#[derive(Clone, Default)]
pub struct CapabilityService;

impl CapabilityServiceApi for CapabilityService {
    fn load(&self, app: &AppHandle) -> Result<ffmpeg_capabilities::CapabilitySnapshot, AppError> {
        ffmpeg_capabilities::load_capabilities(app)
    }
}
