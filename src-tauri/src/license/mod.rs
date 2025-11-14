//! License validation subsystem organized into decoding, verification,
//! and storage layers for improved testability and SOLID alignment.

mod decoder;
mod storage;
mod types;
mod verifier;

pub use storage::{load, persist, remove};
pub use types::LicenseInfo;
pub use verifier::{activate_timestamp, verify};
