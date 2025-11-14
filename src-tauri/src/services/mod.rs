//! Application service layer that decouples Tauri commands from domain logic.
//!
//! Each service exposes a small, focused API surface so commands simply
//! validate input and delegate work. Trait-based indirection keeps
//! responsibilities isolated and dramatically improves testability.

mod capabilities;
mod dialogs;
mod jobs;
mod licensing;
mod media;
mod paths;

pub use capabilities::{CapabilityService, CapabilityServiceApi};
pub use dialogs::{DialogService, DialogServiceApi, MediaFilter};
pub use jobs::{JobService, JobServiceApi};
pub use licensing::{LicenseService, LicenseServiceApi};
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
    pub licensing: Arc<dyn LicenseServiceApi>,
}

impl Default for ServiceRegistry {
    fn default() -> Self {
        Self {
            capabilities: Arc::new(CapabilityService::default()),
            media_probe: Arc::new(MediaProbeService::default()),
            jobs: Arc::new(JobService::default()),
            paths: Arc::new(PathService::default()),
            dialogs: Arc::new(DialogService::default()),
            licensing: Arc::new(LicenseService::default()),
        }
    }
}
