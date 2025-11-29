//! Tauri command handlers. Each function is a thin adapter that validates
//! input, defers to the appropriate service, and handles threading concerns.

pub mod dialogs;
pub mod jobs;
pub mod licensing;
pub mod media;

#[cfg(test)]
mod tests;
