/**
 * Custom error types and error handling utilities for the Honeymelon application.
 *
 * This module defines the application's error handling strategy, providing a unified
 * `AppError` type that can be serialized and sent to the frontend. The error type
 * wraps various underlying error sources (I/O, JSON parsing, etc.) into a consistent
 * format with error codes and human-readable messages.
 *
 * The design prioritizes:
 * - Consistent error reporting across the application
 * - Safe serialization for IPC communication with the frontend
 * - Easy conversion from common Rust error types
 * - Debuggability with proper error codes and context
 */
use serde::Serialize;

/**
 * Application-specific error type that can be serialized for IPC communication.
 *
 * This struct represents errors that occur within the Honeymelon backend and
 * need to be communicated to the frontend. It uses camelCase serialization
 * to match JavaScript/TypeScript naming conventions.
 *
 * # Fields
 *
 * * `code` - A static string identifier for the error type (e.g., "io_error", "serde_error")
 * * `message` - A human-readable description of what went wrong
 *
 * # Examples
 *
 * ```ignore
 * use honeymelon_lib::error::AppError;
 *
 * // Create a custom error
 * let error = AppError::new("validation_error", "Invalid input provided");
 *
 * // Convert from standard library errors
 * let io_error = std::io::Error::new(std::io::ErrorKind::NotFound, "file not found");
 * let app_error: AppError = io_error.into();
 * ```
 */
#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AppError {
    /** Static error code identifier for programmatic error handling */
    pub code: &'static str,
    /** Human-readable error message describing what went wrong */
    pub message: String,
}

impl AppError {
    /**
     * Creates a new AppError with the specified code and message.
     *
     * # Arguments
     *
     * * `code` - A static string identifier for the error type
     * * `message` - The error message (can be any type that converts to String)
     *
     * # Examples
     *
     * ```ignore
     * use honeymelon_lib::error::AppError;
     *
     * let error = AppError::new("file_not_found", "The specified file does not exist");
     * let details = "timeout";
     * let error = AppError::new("network_error", format!("Connection failed: {}", details));
     * ```
     */
    pub fn new(code: &'static str, message: impl Into<String>) -> Self {
        Self {
            code,
            message: message.into(),
        }
    }
}

/**
 * Conversion from standard I/O errors to AppError.
 *
 * This implementation allows seamless conversion of `std::io::Error` instances
 * to `AppError`, maintaining the error message while assigning a consistent
 * error code for I/O operations.
 */
impl From<std::io::Error> for AppError {
    fn from(value: std::io::Error) -> Self {
        Self::new("io_error", value.to_string())
    }
}

/**
 * Conversion from Serde JSON errors to AppError.
 *
 * This implementation allows seamless conversion of `serde_json::Error` instances
 * to `AppError`, maintaining the error message while assigning a consistent
 * error code for JSON serialization/deserialization operations.
 */
impl From<serde_json::Error> for AppError {
    fn from(value: serde_json::Error) -> Self {
        Self::new("serde_error", value.to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io;

    #[test]
    fn test_app_error_creation() {
        let error = AppError::new("test_code", "test message");
        assert_eq!(error.code, "test_code");
        assert_eq!(error.message, "test message");
    }

    #[test]
    fn test_app_error_with_string() {
        let error = AppError::new("test_code", "owned string".to_string());
        assert_eq!(error.code, "test_code");
        assert_eq!(error.message, "owned string");
    }

    #[test]
    fn test_app_error_clone() {
        let error = AppError::new("test_code", "test message");
        let cloned = error.clone();
        assert_eq!(cloned.code, error.code);
        assert_eq!(cloned.message, error.message);
    }

    #[test]
    fn test_from_io_error() {
        let io_error = io::Error::new(io::ErrorKind::NotFound, "file not found");
        let app_error: AppError = io_error.into();
        assert_eq!(app_error.code, "io_error");
        assert!(app_error.message.contains("file not found"));
    }

    #[test]
    fn test_from_serde_json_error() {
        let invalid_json = "{invalid json}";
        let serde_error = serde_json::from_str::<serde_json::Value>(invalid_json).unwrap_err();
        let app_error: AppError = serde_error.into();
        assert_eq!(app_error.code, "serde_error");
        assert!(!app_error.message.is_empty());
    }

    #[test]
    fn test_error_serialization() {
        let error = AppError::new("test_code", "test message");
        let serialized = serde_json::to_string(&error).unwrap();
        assert!(serialized.contains("test_code"));
        assert!(serialized.contains("test message"));
        assert!(serialized.contains("\"code\""));
        assert!(serialized.contains("\"message\""));
    }

    #[test]
    fn test_error_debug_format() {
        let error = AppError::new("test_code", "test message");
        let debug_str = format!("{:?}", error);
        assert!(debug_str.contains("test_code"));
        assert!(debug_str.contains("test message"));
    }

    #[test]
    fn test_multiple_error_conversions() {
        // Test io::Error conversion
        let io_err = io::Error::new(io::ErrorKind::PermissionDenied, "access denied");
        let app_err1: AppError = io_err.into();
        assert_eq!(app_err1.code, "io_error");

        // Test serde_json::Error conversion
        let json_err = serde_json::from_str::<i32>("not a number").unwrap_err();
        let app_err2: AppError = json_err.into();
        assert_eq!(app_err2.code, "serde_error");
    }

    #[test]
    fn test_error_with_empty_message() {
        let error = AppError::new("empty_msg", "");
        assert_eq!(error.code, "empty_msg");
        assert_eq!(error.message, "");
    }

    #[test]
    fn test_error_with_long_message() {
        let long_message = "a".repeat(1000);
        let error = AppError::new("long_msg", long_message.clone());
        assert_eq!(error.code, "long_msg");
        assert_eq!(error.message, long_message);
    }

    #[test]
    fn test_error_with_special_characters() {
        let error = AppError::new("special_chars", "Error: \n\t\"quoted\" 'text' \\backslash");
        assert_eq!(error.code, "special_chars");
        assert!(error.message.contains("quoted"));
        assert!(error.message.contains("\\backslash"));
    }
}
