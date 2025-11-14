use crate::error::AppError;
use serde::{Deserialize, Serialize};
use thiserror::Error;

/** Length of Ed25519 signature in bytes (64 bytes for Ed25519) */
pub const SIGNATURE_LENGTH: usize = 64;

/** Filename for license storage in application config directory */
pub const LICENSE_FILE_NAME: &str = "license.json";

/** Custom Base32 alphabet excluding ambiguous characters (I, O, 0, 1) */
pub const BASE32_ALPHABET: &[u8; 32] = b"ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Total length of license payload in bytes */
pub const PAYLOAD_LENGTH: usize = 42;

/** Complete license information structure for application use. */
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LicenseInfo {
    pub key: String,
    pub license_id: String,
    pub order_id: String,
    pub max_major_version: u8,
    pub issued_at: u64,
    pub payload: String,
    pub signature: String,
    pub activated_at: Option<u64>,
}

/** Comprehensive error types for license validation and management. */
#[derive(Debug, Error)]
pub enum LicenseError {
    #[error("license key is empty")]
    EmptyKey,
    #[error("license key contains invalid character: {0}")]
    InvalidCharacter(char),
    #[error("license key has invalid padding")]
    InvalidPadding,
    #[error("license payload length is invalid")]
    InvalidLength,
    #[error("license payload version {0} is unsupported")]
    UnsupportedVersion(u8),
    #[error("missing signing public key")]
    MissingPublicKey,
    #[error("signing public key is invalid: {0}")]
    InvalidPublicKey(String),
    #[error("signature verification failed")]
    InvalidSignature,
    #[error("unable to determine license storage path")]
    StoragePath,
    #[error(transparent)]
    Uuid(#[from] uuid::Error),
    #[error(transparent)]
    Io(#[from] std::io::Error),
    #[error(transparent)]
    Serialization(#[from] serde_json::Error),
}

impl LicenseError {
    /** Maps license errors to standardized error codes for IPC communication. */
    pub fn code(&self) -> &'static str {
        match self {
            LicenseError::EmptyKey => "license_empty",
            LicenseError::InvalidCharacter(_) | LicenseError::InvalidPadding => {
                "license_invalid_char"
            },
            LicenseError::InvalidLength => "license_length",
            LicenseError::UnsupportedVersion(_) => "license_version",
            LicenseError::MissingPublicKey | LicenseError::InvalidPublicKey(_) => {
                "license_public_key"
            },
            LicenseError::InvalidSignature => "license_signature",
            LicenseError::StoragePath | LicenseError::Io(_) => "license_storage",
            LicenseError::Serialization(_) => "license_serialization",
            LicenseError::Uuid(_) => "license_uuid",
        }
    }
}

impl From<LicenseError> for AppError {
    fn from(error: LicenseError) -> Self {
        AppError::new(error.code(), error.to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn error_codes_are_stable() {
        assert_eq!(LicenseError::EmptyKey.code(), "license_empty");
        assert_eq!(
            LicenseError::InvalidCharacter('x').code(),
            "license_invalid_char"
        );
        assert_eq!(LicenseError::InvalidSignature.code(), "license_signature");
    }

    #[test]
    fn app_error_conversion_uses_license_code() {
        let app_error: AppError = LicenseError::StoragePath.into();
        assert_eq!(app_error.code, "license_storage");
        assert!(app_error.message.contains("storage"));
    }
}
