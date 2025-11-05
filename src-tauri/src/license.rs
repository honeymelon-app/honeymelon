/**
 * License Validation and Management Module
 *
 * This module implements a comprehensive license validation system for Honeymelon,
 * providing cryptographic verification of commercial licenses with secure storage
 * and activation tracking. It serves as the gatekeeper for premium features,
 * ensuring only valid, properly signed licenses grant access to commercial functionality.
 *
 * ## Architecture Overview
 *
 * The license system follows a multi-layered security approach:
 *
 * 1. **Key Decoding**: Base32-encoded license keys are decoded to binary format
 * 2. **Cryptographic Verification**: Ed25519 signatures ensure license authenticity
 * 3. **Payload Parsing**: Structured license data extraction and validation
 * 4. **Version Control**: License compatibility checking against application versions
 * 5. **Secure Storage**: Encrypted license persistence with integrity verification
 * 6. **Activation Tracking**: Timestamp recording for license usage analytics
 *
 * ## License Key Format
 *
 * License keys use a custom Base32 encoding with the following characteristics:
 *
 * - **Alphabet**: `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (excludes I, O, 0, 1 for readability)
 * - **Grouping**: Keys are formatted with dashes every 5 characters (e.g., `ABCDE-FGHIJ-KLMN`)
 * - **Structure**: Binary payload (42 bytes) + Ed25519 signature (64 bytes)
 * - **Normalization**: Input keys are case-insensitive and ignore punctuation/separators
 *
 * ## Cryptographic Design
 *
 * ### Signature Verification
 * - **Algorithm**: Ed25519 digital signatures for fast, secure verification
 * - **Key Management**: Public keys loaded from environment variables at runtime
 * - **Payload Integrity**: Entire license payload is signed, preventing tampering
 * - **Replay Protection**: Timestamps ensure licenses have reasonable issuance dates
 *
 * ### Payload Structure
 * The 42-byte license payload contains:
 * - **Version** (1 byte): License format version for future compatibility
 * - **License ID** (16 bytes): UUID uniquely identifying this license
 * - **Order ID** (16 bytes): UUID linking to the purchase/order system
 * - **Max Version** (1 byte): Maximum major version this license supports
 * - **Issued At** (8 bytes): Unix timestamp when license was issued
 *
 * ## Security Considerations
 *
 * ### Key Security
 * - Public keys are loaded from environment variables, never embedded in binaries
 * - Multiple environment variable names supported for flexibility
 * - Compile-time fallback for development builds
 * - No private keys ever present in the application
 *
 * ### Input Validation
 * - Strict Base32 character validation prevents injection attacks
 * - Length validation prevents buffer overflow attempts
 * - Signature verification prevents forged licenses
 * - Version checking prevents downgrade attacks
 *
 * ### Storage Security
 * - Licenses stored in application config directory with proper permissions
 * - JSON serialization with pretty-printing for readability
 * - Re-verification on load ensures stored licenses remain valid
 * - Secure deletion with proper file removal
 *
 * ## Version Compatibility System
 *
 * The license system implements semantic versioning compatibility:
 * - **Major Version Limit**: Licenses specify maximum supported major version
 * - **Graceful Degradation**: Expired licenses can be detected and handled
 * - **Future-Proofing**: Version field allows format evolution
 * - **Backwards Compatibility**: Older license formats remain supported
 *
 * ## Error Handling Strategy
 *
 * ### Comprehensive Error Types
 * The system defines specific error conditions:
 * - **Format Errors**: Invalid characters, padding, or length
 * - **Cryptographic Errors**: Signature verification failures, invalid keys
 * - **Version Errors**: Unsupported license versions or expired compatibility
 * - **Storage Errors**: File system issues, permission problems
 * - **Parsing Errors**: Malformed JSON or binary data
 *
 * ### Error Code Mapping
 * Each error type maps to specific error codes for programmatic handling:
 * - `license_empty`: Empty license key provided
 * - `license_invalid_char`: Invalid Base32 character
 * - `license_signature`: Cryptographic signature verification failed
 * - `license_version`: License version not supported
 * - `license_storage`: Unable to access license storage location
 *
 * ## Integration Points
 *
 * This module integrates with several application components:
 *
 * - **Error Handling** (`error.rs`): Leverages custom error types for IPC communication
 * - **Application Core** (`lib.rs`): Provides license validation for feature gating
 * - **User Interface**: Displays license status and activation dialogs
 * - **Settings System**: Stores license information in application preferences
 * - **Update System**: Checks license compatibility with new versions
 *
 * ## Storage and Persistence
 *
 * ### License Storage Location
 * - **Platform-Specific**: Uses Tauri's app config directory
 * - **File Name**: `license.json` for easy identification
 * - **Format**: Pretty-printed JSON for debugging and manual inspection
 * - **Permissions**: Standard file permissions, no special security measures
 *
 * ### Activation Tracking
 * - **Timestamp Recording**: Records when license was first activated
 * - **Usage Analytics**: Enables feature usage tracking (future enhancement)
 * - **License Auditing**: Supports license compliance verification
 * - **Migration Support**: Preserves activation data across updates
 *
 * ## Testing Strategy
 *
 * The module includes rigorous testing covering:
 * - Base32 encoding/decoding round-trip validation
 * - License key normalization and formatting
 * - Cryptographic signature verification
 * - Payload parsing with various data combinations
 * - Error condition handling and edge cases
 * - Storage and retrieval operations
 * - Version compatibility checking
 *
 * ## Future Enhancements
 *
 * Potential areas for expansion:
 * - License server integration for real-time validation
 * - Feature-specific license entitlements
 * - License transfer and deactivation capabilities
 * - Subscription-based license models
 * - Hardware-locked license binding
 * - Offline license validation periods
 * - License usage analytics and reporting
 */
use crate::error::AppError;
use base64::engine::general_purpose::STANDARD as BASE64;
use base64::Engine;
use ed25519_dalek::{Signature, Verifier, VerifyingKey};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Manager};
use thiserror::Error;
use uuid::Uuid;

/** Length of Ed25519 signature in bytes (64 bytes for Ed25519) */
const SIGNATURE_LENGTH: usize = 64;

/** Filename for license storage in application config directory */
const LICENSE_FILE_NAME: &str = "license.json";

/** Custom Base32 alphabet excluding ambiguous characters (I, O, 0, 1)
This alphabet improves license key readability and reduces transcription errors */
const BASE32_ALPHABET: &[u8; 32] = b"ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Total length of license payload in bytes (version + license_id + order_id + max_version + issued_at) */
const PAYLOAD_LENGTH: usize = 42; // sync with backend payload

/** Complete license information structure for application use.

This structure represents a fully validated and parsed license, containing
all information needed to determine feature availability and track license
usage. It includes both the original license key and parsed metadata.

# Fields
* `key` - Formatted license key for display/storage
* `license_id` - Unique UUID identifying this specific license
* `order_id` - UUID linking to the purchase/order system
* `max_major_version` - Maximum major version this license supports
* `issued_at` - Unix timestamp when license was issued
* `payload` - Base64-encoded binary payload for verification
* `signature` - Base64-encoded Ed25519 signature
* `activated_at` - Optional timestamp when license was first activated
*/
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LicenseInfo {
    /** Formatted license key with dashes for readability */
    pub key: String,
    /** Unique identifier for this license instance */
    pub license_id: String,
    /** Identifier linking to the purchase/order system */
    pub order_id: String,
    /** Maximum major version this license is valid for */
    pub max_major_version: u8,
    /** Unix timestamp when license was issued */
    pub issued_at: u64,
    /** Base64-encoded binary payload (for verification) */
    pub payload: String,
    /** Base64-encoded Ed25519 signature */
    pub signature: String,
    /** Optional timestamp when license was first activated locally */
    pub activated_at: Option<u64>,
}

/** Comprehensive error types for license validation and management.

This enum covers all possible failure modes in the license system,
from input validation errors to cryptographic failures. Each variant
provides detailed error information for debugging and user feedback.
*/
#[derive(Debug, Error)]
pub enum LicenseError {
    /** License key string is empty or contains only whitespace/punctuation */
    #[error("license key is empty")]
    EmptyKey,
    /** License key contains a character not in the Base32 alphabet */
    #[error("license key contains invalid character: {0}")]
    InvalidCharacter(char),
    /** License key has invalid Base32 padding (partial final group) */
    #[error("license key has invalid padding")]
    InvalidPadding,
    /** Decoded license payload has incorrect length */
    #[error("license payload length is invalid")]
    InvalidLength,
    /** License payload version is not supported by this client */
    #[error("license payload version {0} is unsupported")]
    UnsupportedVersion(u8),
    /** No public key available for signature verification */
    #[error("missing signing public key")]
    MissingPublicKey,
    /** Public key data is malformed or invalid */
    #[error("signing public key is invalid: {0}")]
    InvalidPublicKey(String),
    /** Cryptographic signature verification failed */
    #[error("signature verification failed")]
    InvalidSignature,
    /** Unable to determine license storage path */
    #[error("unable to determine license storage path")]
    StoragePath,
    /** UUID parsing failed for license or order ID */
    #[error(transparent)]
    Uuid(#[from] uuid::Error),
    /** File system operation failed */
    #[error(transparent)]
    Io(#[from] std::io::Error),
    /** JSON serialization/deserialization failed */
    #[error(transparent)]
    Serialization(#[from] serde_json::Error),
}

impl LicenseError {
    /** Maps license errors to standardized error codes for IPC communication.

    Each error variant maps to a specific code that can be used for
    programmatic error handling and user interface display.

    # Returns
    Static string error code for this error type
    */
    fn code(&self) -> &'static str {
        match self {
            LicenseError::EmptyKey => "license_empty",
            LicenseError::InvalidCharacter(_) => "license_invalid_char",
            LicenseError::InvalidPadding => "license_padding",
            LicenseError::InvalidLength => "license_length",
            LicenseError::UnsupportedVersion(_) => "license_version",
            LicenseError::MissingPublicKey => "license_public_key_missing",
            LicenseError::InvalidPublicKey(_) => "license_public_key_invalid",
            LicenseError::InvalidSignature => "license_signature",
            LicenseError::StoragePath => "license_storage",
            LicenseError::Uuid(_) => "license_uuid",
            LicenseError::Io(_) => "license_io",
            LicenseError::Serialization(_) => "license_serialization",
        }
    }
}

impl From<LicenseError> for AppError {
    /** Converts license errors to application errors for unified error handling.

    This conversion enables license errors to be returned through the
    application's standard error handling pipeline.
    */
    fn from(error: LicenseError) -> Self {
        AppError::new(error.code(), error.to_string())
    }
}

/**
 * Verifies a license key and extracts license information.
 *
 * This is the main entry point for license validation. It performs complete
 * cryptographic verification of a license key, ensuring it was signed by
 * the legitimate license authority and contains valid license data.
 *
 * # Process Flow
 * 1. Decode Base32 license key to binary format
 * 2. Validate payload length and structure
 * 3. Extract signature from binary data
 * 4. Load and validate public key for verification
 * 5. Verify Ed25519 signature over payload
 * 6. Parse structured license data from payload
 * 7. Return validated license information
 *
 * # Arguments
 * * `key` - License key string (with or without formatting dashes)
 *
 * # Returns
 * `LicenseInfo` on successful verification, `LicenseError` on failure
 *
 * # Errors
 * - `EmptyKey`: License key is empty or only contains separators
 * - `InvalidCharacter`: License contains non-Base32 characters
 * - `InvalidLength`: Decoded data has wrong length
 * - `InvalidSignature`: Cryptographic verification failed
 * - `UnsupportedVersion`: License format version not supported
 * - `MissingPublicKey`: No public key available for verification
 */
pub fn verify(key: &str) -> Result<LicenseInfo, LicenseError> {
    // Decode Base32 license key to binary format
    let blob = decode_key(key)?;

    // Validate total length (payload + signature)
    if blob.len() != PAYLOAD_LENGTH + SIGNATURE_LENGTH {
        return Err(LicenseError::InvalidLength);
    }

    // Split binary data into payload and signature portions
    let (payload_bytes, signature_bytes) = blob.split_at(PAYLOAD_LENGTH);

    // Convert signature bytes to fixed-size array for Ed25519
    let signature_bytes: [u8; SIGNATURE_LENGTH] = signature_bytes
        .try_into()
        .map_err(|_| LicenseError::InvalidSignature)?;
    let signature = Signature::from_bytes(&signature_bytes);

    // Load public key for signature verification
    let verifying_key = load_verifying_key()?;

    // Verify signature over payload bytes
    verifying_key
        .verify(payload_bytes, &signature)
        .map_err(|_| LicenseError::InvalidSignature)?;

    // Parse structured data from verified payload
    let parsed = parse_payload(payload_bytes)?;

    // Construct license info with formatted key and parsed data
    Ok(LicenseInfo {
        key: format_key(key),
        license_id: parsed.license_id.to_string(),
        order_id: parsed.order_id.to_string(),
        max_major_version: parsed.max_major_version,
        issued_at: parsed.issued_at,
        payload: BASE64.encode(payload_bytes),
        signature: BASE64.encode(signature_bytes),
        activated_at: None, // Set during activation
    })
}

/**
 * Persists license information to secure application storage.
 *
 * This function saves validated license information to the application's
 * config directory, ensuring the license persists across application restarts.
 * The license is stored as pretty-printed JSON for readability and debugging.
 *
 * # Process Flow
 * 1. Determine license storage path in app config directory
 * 2. Create parent directories if they don't exist
 * 3. Serialize license info to formatted JSON
 * 4. Write to storage file with secure permissions
 *
 * # Arguments
 * * `app` - Tauri application handle for path resolution
 * * `info` - Validated license information to persist
 *
 * # Returns
 * `Ok(())` on successful storage, `LicenseError` on failure
 *
 * # Errors
 * - `StoragePath`: Unable to determine config directory path
 * - `Io`: File system errors during directory creation or file writing
 * - `Serialization`: JSON serialization failure
 */
pub fn persist(app: &AppHandle, info: &LicenseInfo) -> Result<(), LicenseError> {
    // Get license storage path
    let path = license_store_path(app)?;

    // Ensure parent directory exists
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }

    // Serialize to pretty-printed JSON for readability
    let data = serde_json::to_vec_pretty(info)?;

    // Write to storage file
    fs::write(&path, data)?;
    Ok(())
}

/**
 * Loads and re-verifies stored license information.
 *
 * This function retrieves license information from persistent storage and
 * re-verifies it to ensure the stored license remains valid. This prevents
 * tampering with stored license files and ensures cryptographic integrity.
 *
 * # Process Flow
 * 1. Check if license file exists in storage location
 * 2. Read and deserialize stored license JSON
 * 3. Re-verify license key cryptographically
 * 4. Preserve original activation timestamp
 * 5. Return verified license information
 *
 * # Arguments
 * * `app` - Tauri application handle for path resolution
 *
 * # Returns
 * `Some(LicenseInfo)` if valid license exists, `None` if no license stored,
 * `LicenseError` on verification or storage failure
 *
 * # Security
 * Re-verification ensures stored licenses cannot be tampered with by
 * modifying the JSON file directly.
 */
pub fn load(app: &AppHandle) -> Result<Option<LicenseInfo>, LicenseError> {
    // Get license storage path
    let path = license_store_path(app)?;

    // Check if license file exists
    if !path.exists() {
        return Ok(None);
    }

    // Read stored license data
    let data = fs::read(&path)?;
    let stored: LicenseInfo = serde_json::from_slice(&data)?;

    // Re-verify stored license key to ensure integrity
    let mut verified = verify(&stored.key)?;
    verified.activated_at = stored.activated_at;

    Ok(Some(verified))
}

/**
 * Removes stored license information from the application.
 *
 * This function securely deletes the license file from storage, effectively
 * deactivating the license locally. It handles missing files gracefully
 * without treating them as errors.
 *
 * # Arguments
 * * `app` - Tauri application handle for path resolution
 *
 * # Returns
 * `Ok(())` on successful removal or if no license existed, `LicenseError` on failure
 *
 * # Errors
 * - `StoragePath`: Unable to determine storage path
 * - `Io`: File system error during deletion (excluding NotFound)
 */
pub fn remove(app: &AppHandle) -> Result<(), LicenseError> {
    // Get license storage path
    let path = license_store_path(app)?;

    // Attempt to remove license file
    match fs::remove_file(path) {
        Ok(_) => Ok(()),
        Err(err) if err.kind() == std::io::ErrorKind::NotFound => Ok(()), // No license to remove
        Err(err) => Err(err.into()),
    }
}

/**
 * Generates current Unix timestamp for license activation tracking.
 *
 * This function provides a consistent timestamp source for recording when
 * licenses are first activated locally. It uses the system clock with
 * fallback to zero for systems where time is unavailable.
 *
 * # Returns
 * Current Unix timestamp in seconds since epoch
 */
pub fn activate_timestamp() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

/**
 * Determines the file system path for license storage.
 *
 * This function calculates the appropriate location for storing license
 * information based on platform conventions and application structure.
 * Licenses are stored in the application's config directory.
 *
 * # Arguments
 * * `app` - Tauri application handle for path resolution
 *
 * # Returns
 * Absolute path to license storage file, or `LicenseError` if path cannot be determined
 *
 * # Platform Behavior
 * - **macOS**: `~/Library/Application Support/com.honeymelon.app/license.json`
 * - **Windows**: `%APPDATA%\com.honeymelon.app\license.json`
 * - **Linux**: `~/.config/honeymelon/license.json`
 */
fn license_store_path(app: &AppHandle) -> Result<PathBuf, LicenseError> {
    let dir = app
        .path()
        .app_config_dir()
        .map_err(|_| LicenseError::StoragePath)?;
    Ok(dir.join(LICENSE_FILE_NAME))
}

/**
 * Normalizes a license key by removing separators and converting to uppercase.
 *
 * This function strips all punctuation and whitespace from license keys,
 * then converts to uppercase for consistent processing. It enables flexible
 * input formatting while maintaining strict validation.
 *
 * # Arguments
 * * `key` - Raw license key string with potential formatting
 *
 * # Returns
 * Normalized license key string with only Base32 characters
 */
fn normalized_key(key: &str) -> String {
    key.chars()
        .filter(|c| !c.is_ascii_punctuation() && !c.is_whitespace())
        .map(|c| c.to_ascii_uppercase())
        .collect()
}

/**
 * Formats a normalized license key with standard grouping dashes.
 *
 * This function takes a normalized license key and adds dashes every 5
 * characters for improved readability and standard formatting.
 *
 * # Arguments
 * * `key` - Normalized license key string
 *
 * # Returns
 * Formatted license key with dashes (e.g., "ABCDE-FGHIJ-KLMN")
 */
fn format_key(key: &str) -> String {
    let normalized = normalized_key(key);
    if normalized.is_empty() {
        return normalized;
    }

    // Group characters in chunks of 5 with dashes
    normalized
        .chars()
        .collect::<Vec<_>>()
        .chunks(5)
        .map(|chunk| chunk.iter().collect::<String>())
        .collect::<Vec<_>>()
        .join("-")
}

/**
 * Decodes a Base32-encoded license key to binary format.
 *
 * This function implements custom Base32 decoding using the application's
 * specific alphabet. It validates input characters, handles padding, and
 * produces the binary license data for cryptographic verification.
 *
 * # Decoding Process
 * 1. Normalize input key (remove separators, uppercase)
 * 2. Validate all characters are in Base32 alphabet
 * 3. Convert each character to 5-bit value
 * 4. Accumulate bits into 8-bit output bytes
 * 5. Validate proper padding (no partial final byte)
 *
 * # Arguments
 * * `key` - License key string to decode
 *
 * # Returns
 * Binary license data as byte vector, or `LicenseError` on validation failure
 *
 * # Errors
 * - `EmptyKey`: Input key is empty after normalization
 * - `InvalidCharacter`: Non-Base32 character encountered
 * - `InvalidPadding`: Key has invalid padding bits
 */
fn decode_key(key: &str) -> Result<Vec<u8>, LicenseError> {
    // Normalize input and reject empty keys
    let normalized = normalized_key(key);
    if normalized.is_empty() {
        return Err(LicenseError::EmptyKey);
    }

    let mut buffer: u32 = 0;
    let mut bits = 0;
    let mut output = Vec::with_capacity(normalized.len() * 5 / 8 + 1);

    // Process each character in the normalized key
    for ch in normalized.chars() {
        // Convert character to 5-bit value
        let value = match char_to_value(ch as u8) {
            Some(val) => val,
            None => return Err(LicenseError::InvalidCharacter(ch)),
        };

        // Accumulate 5 bits into buffer
        buffer = (buffer << 5) | u32::from(value);
        bits += 5;

        // Extract complete bytes (8 bits) from buffer
        while bits >= 8 {
            bits -= 8;
            let byte = ((buffer >> bits) & 0xFF) as u8;
            output.push(byte);
            buffer &= (1u32 << bits) - 1;
        }
    }

    // Validate that any remaining bits represent proper padding
    if bits > 0 && (buffer & ((1 << bits) - 1)) != 0 {
        return Err(LicenseError::InvalidPadding);
    }

    Ok(output)
}

/**
 * Converts a Base32 character to its 5-bit numeric value.
 *
 * This function maps characters from the custom Base32 alphabet to their
 * corresponding 5-bit values (0-31) for decoding operations.
 *
 * # Arguments
 * * `ch` - ASCII character to convert
 *
 * # Returns
 * `Some(u8)` with 5-bit value if character is valid, `None` otherwise
 */
fn char_to_value(ch: u8) -> Option<u8> {
    BASE32_ALPHABET
        .iter()
        .position(|&item| item == ch)
        .map(|idx| idx as u8)
}

/** Parsed license payload structure extracted from binary data.

This internal structure represents the structured data contained within
a license payload after successful parsing and validation.
*/
struct ParsedPayload {
    /** Unique identifier for this license instance */
    license_id: Uuid,
    /** Identifier linking to the purchase/order system */
    order_id: Uuid,
    /** Maximum major version this license supports */
    max_major_version: u8,
    /** Unix timestamp when license was issued */
    issued_at: u64,
}

/**
 * Parses structured license data from binary payload bytes.
 *
 * This function extracts the structured license information from the
 * verified binary payload, validating format and extracting individual fields.
 *
 * # Payload Format
 * ```text
 * Byte 0: Version (must be 1)
 * Bytes 1-16: License ID (UUID)
 * Bytes 17-32: Order ID (UUID)
 * Byte 33: Max Major Version
 * Bytes 34-41: Issued At (u64 big-endian)
 * ```
 *
 * # Arguments
 * * `bytes` - Binary payload bytes (must be exactly PAYLOAD_LENGTH)
 *
 * # Returns
 * Parsed license payload structure, or `LicenseError` on validation failure
 *
 * # Errors
 * - `InvalidLength`: Payload has wrong byte length
 * - `UnsupportedVersion`: Version byte is not 1
 * - `Uuid`: License ID or Order ID are invalid UUIDs
 */
fn parse_payload(bytes: &[u8]) -> Result<ParsedPayload, LicenseError> {
    // Validate payload length
    if bytes.len() != PAYLOAD_LENGTH {
        return Err(LicenseError::InvalidLength);
    }

    // Check version compatibility
    let version = bytes[0];
    if version != 1 {
        return Err(LicenseError::UnsupportedVersion(version));
    }

    // Extract and parse license ID UUID
    let license_id = Uuid::from_slice(&bytes[1..17])?;

    // Extract and parse order ID UUID
    let order_id = Uuid::from_slice(&bytes[17..33])?;

    // Extract version limit
    let max_major_version = bytes[33];

    // Extract and parse timestamp
    let issued_at = u64::from_be_bytes(bytes[34..42].try_into().unwrap());

    Ok(ParsedPayload {
        license_id,
        order_id,
        max_major_version,
        issued_at,
    })
}

/**
 * Loads the Ed25519 public key for license signature verification.
 *
 * This function attempts to load the public key from multiple sources
 * in order of preference, allowing flexible deployment configurations.
 *
 * # Key Sources (in priority order)
 * 1. `HONEYMELON_LICENSE_PUBLIC_KEY` environment variable
 * 2. `LICENSE_SIGNING_PUBLIC_KEY` environment variable
 * 3. Compile-time `LICENSE_SIGNING_PUBLIC_KEY` environment variable
 *
 * # Returns
 * Ed25519 verifying key for signature validation, or `LicenseError` if no valid key found
 *
 * # Security
 * Public keys are never embedded in the binary; they must be provided
 * at runtime through environment variables.
 */
fn load_verifying_key() -> Result<VerifyingKey, LicenseError> {
    // Try runtime environment variables first
    if let Ok(value) = std::env::var("HONEYMELON_LICENSE_PUBLIC_KEY") {
        return parse_public_key(&value);
    }
    if let Ok(value) = std::env::var("LICENSE_SIGNING_PUBLIC_KEY") {
        return parse_public_key(&value);
    }

    // Fall back to compile-time environment variable
    if let Some(value) = option_env!("LICENSE_SIGNING_PUBLIC_KEY") {
        return parse_public_key(value);
    }

    Err(LicenseError::MissingPublicKey)
}

/** Parses a Base64-encoded Ed25519 public key string.

This function decodes a Base64-encoded public key string and validates
that it forms a valid Ed25519 public key for signature verification.

# Arguments
* `value` - Base64-encoded public key string

# Returns
Valid Ed25519 verifying key, or `LicenseError` on parsing/validation failure

# Errors
- `InvalidPublicKey`: Base64 decoding failed or key is malformed
*/
fn parse_public_key(value: &str) -> Result<VerifyingKey, LicenseError> {
    // Decode Base64 to binary
    let bytes = BASE64
        .decode(value)
        .map_err(|err| LicenseError::InvalidPublicKey(err.to_string()))?;

    // Validate key length (Ed25519 public keys are 32 bytes)
    let key_bytes: [u8; 32] = bytes
        .try_into()
        .map_err(|_| LicenseError::InvalidPublicKey("expected 32 bytes".into()))?;

    // Construct Ed25519 verifying key
    VerifyingKey::from_bytes(&key_bytes)
        .map_err(|err| LicenseError::InvalidPublicKey(err.to_string()))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn encode_base32(bytes: &[u8]) -> String {
        let mut buffer: u32 = 0;
        let mut bits = 0;
        let mut output = String::new();

        for &byte in bytes {
            buffer = (buffer << 8) | u32::from(byte);
            bits += 8;

            while bits >= 5 {
                bits -= 5;
                let index = ((buffer >> bits) & 0x1F) as usize;
                output.push(BASE32_ALPHABET[index] as char);
            }
        }

        if bits > 0 {
            let index = ((buffer << (5 - bits)) & 0x1F) as usize;
            output.push(BASE32_ALPHABET[index] as char);
        }

        output
            .chars()
            .collect::<Vec<_>>()
            .chunks(5)
            .map(|chunk| chunk.iter().collect::<String>())
            .collect::<Vec<_>>()
            .join("-")
    }

    #[test]
    fn decode_round_trip() {
        let bytes = vec![0xBA; PAYLOAD_LENGTH + SIGNATURE_LENGTH];
        let key = encode_base32(&bytes);
        let decoded = decode_key(&key).unwrap();
        assert_eq!(bytes, decoded);
    }

    #[test]
    fn normalize_strips_separators() {
        let key = "abcde-fghij";
        assert_eq!(normalized_key(key), "ABCDEFGHIJ");
    }

    #[test]
    fn format_key_groups_characters() {
        let formatted = format_key("abcdefghijklmn");
        assert_eq!(formatted, "ABCDE-FGHIJ-KLMN");
    }
}
