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

//! Application service layer that decouples Tauri commands from domain logic.
//!
//! Each service exposes a small, focused API surface so commands simply
//! validate input and delegate work. Trait-based indirection keeps
//! responsibilities isolated and dramatically improves testability.

mod capabilities;
mod dialogs;
mod jobs;
mod media;
mod paths;

pub use capabilities::{CapabilityService, CapabilityServiceApi};
pub use dialogs::{DialogService, DialogServiceApi, MediaFilter};
pub use jobs::{JobService, JobServiceApi};
pub use media::{MediaProbeService, MediaProbeServiceApi};
pub use paths::{PathService, PathServiceApi};

use std::sync::Arc;

/// Shared registry that bundles the available services for dependency
/// injection via `tauri::State`.
#[derive(Clone)]
pub struct ServiceRegistry {
    pub capabilities: Arc<dyn CapabilityServiceApi>,
    pub media_probe: Arc<dyn MediaProbeServiceApi>,
    pub jobs: Arc<dyn JobServiceApi>,
    pub paths: Arc<dyn PathServiceApi>,
    pub dialogs: Arc<dyn DialogServiceApi>,
}

impl Default for ServiceRegistry {
    fn default() -> Self {
        Self {
            capabilities: Arc::new(CapabilityService),
            media_probe: Arc::new(MediaProbeService),
            jobs: Arc::new(JobService::default()),
            paths: Arc::new(PathService),
            dialogs: Arc::new(DialogService),
        }
    }
}
