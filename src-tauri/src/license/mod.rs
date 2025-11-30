//! License validation subsystem organized into decoding, verification,
//! storage layers and online activation for improved testability and SOLID alignment.

mod activation;
mod decoder;
mod storage;
mod types;
mod verifier;

pub use activation::{activate_online, generate_device_id};
pub use storage::{load, persist, remove};
pub use types::LicenseInfo;
pub use verifier::verify;
