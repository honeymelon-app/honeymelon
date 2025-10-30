use serde::Serialize;

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AppError {
    pub code: &'static str,
    pub message: String,
}

impl AppError {
    pub fn new(code: &'static str, message: impl Into<String>) -> Self {
        Self {
            code,
            message: message.into(),
        }
    }
}

impl From<std::io::Error> for AppError {
    fn from(value: std::io::Error) -> Self {
        Self::new("io_error", value.to_string())
    }
}

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
