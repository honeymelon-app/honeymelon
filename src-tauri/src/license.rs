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

const SIGNATURE_LENGTH: usize = 64;
const LICENSE_FILE_NAME: &str = "license.json";
const BASE32_ALPHABET: &[u8; 32] = b"ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LicenseInfo {
    pub key: String,
    pub license_id: String,
    pub order_id: String,
    pub seats: u16,
    pub entitlements_checksum: u64,
    pub flags: u16,
    pub updates_until: Option<u64>,
    pub payload: String,
    pub signature: String,
    pub activated_at: Option<u64>,
}

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
    fn from(error: LicenseError) -> Self {
        AppError::new(error.code(), error.to_string())
    }
}

pub fn verify(key: &str) -> Result<LicenseInfo, LicenseError> {
    let blob = decode_key(key)?;

    let payload_len = license_payload_length();
    if blob.len() != payload_len + SIGNATURE_LENGTH {
        return Err(LicenseError::InvalidLength);
    }

    let (payload_bytes, signature_bytes) = blob.split_at(payload_len);
    let signature_bytes: [u8; SIGNATURE_LENGTH] = signature_bytes
        .try_into()
        .map_err(|_| LicenseError::InvalidSignature)?;
    let signature = Signature::from_bytes(&signature_bytes);

    let verifying_key = load_verifying_key()?;
    verifying_key
        .verify(payload_bytes, &signature)
        .map_err(|_| LicenseError::InvalidSignature)?;

    let parsed = parse_payload(payload_bytes)?;

    Ok(LicenseInfo {
        key: format_key(key),
        license_id: parsed.license_id.to_string(),
        order_id: parsed.order_id.to_string(),
        seats: parsed.seats,
        entitlements_checksum: parsed.entitlements_checksum,
        flags: parsed.flags,
        updates_until: parsed.updates_until,
        payload: BASE64.encode(payload_bytes),
        signature: BASE64.encode(signature_bytes),
        activated_at: None,
    })
}

pub fn persist(app: &AppHandle, info: &LicenseInfo) -> Result<(), LicenseError> {
    let path = license_store_path(app)?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }

    let data = serde_json::to_vec_pretty(info)?;
    fs::write(&path, data)?;
    Ok(())
}

pub fn load(app: &AppHandle) -> Result<Option<LicenseInfo>, LicenseError> {
    let path = license_store_path(app)?;
    if !path.exists() {
        return Ok(None);
    }

    let data = fs::read(&path)?;
    let stored: LicenseInfo = serde_json::from_slice(&data)?;

    // Re-verify to ensure the stored key is still valid
    let mut verified = verify(&stored.key)?;
    verified.activated_at = stored.activated_at;

    Ok(Some(verified))
}

pub fn remove(app: &AppHandle) -> Result<(), LicenseError> {
    let path = license_store_path(app)?;
    match fs::remove_file(path) {
        Ok(_) => Ok(()),
        Err(err) if err.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(err) => Err(err.into()),
    }
}

pub fn activate_timestamp() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

fn license_store_path(app: &AppHandle) -> Result<PathBuf, LicenseError> {
    let dir = app
        .path()
        .app_config_dir()
        .map_err(|_| LicenseError::StoragePath)?;
    Ok(dir.join(LICENSE_FILE_NAME))
}

fn normalized_key(key: &str) -> String {
    key.chars()
        .filter(|c| !c.is_ascii_punctuation() && !c.is_whitespace())
        .map(|c| c.to_ascii_uppercase())
        .collect()
}

fn format_key(key: &str) -> String {
    let normalized = normalized_key(key);
    if normalized.is_empty() {
        return normalized;
    }

    normalized
        .chars()
        .collect::<Vec<_>>()
        .chunks(5)
        .map(|chunk| chunk.iter().collect::<String>())
        .collect::<Vec<_>>()
        .join("-")
}

fn decode_key(key: &str) -> Result<Vec<u8>, LicenseError> {
    let normalized = normalized_key(key);
    if normalized.is_empty() {
        return Err(LicenseError::EmptyKey);
    }

    let mut buffer: u32 = 0;
    let mut bits = 0;
    let mut output = Vec::with_capacity(normalized.len() * 5 / 8 + 1);

    for ch in normalized.chars() {
        let value = match char_to_value(ch as u8) {
            Some(val) => val,
            None => return Err(LicenseError::InvalidCharacter(ch)),
        };

        buffer = (buffer << 5) | u32::from(value);
        bits += 5;

        while bits >= 8 {
            bits -= 8;
            let byte = ((buffer >> bits) & 0xFF) as u8;
            output.push(byte);
            buffer &= (1u32 << bits) - 1;
        }
    }

    if bits > 0 && (buffer & ((1 << bits) - 1)) != 0 {
        return Err(LicenseError::InvalidPadding);
    }

    Ok(output)
}

fn char_to_value(ch: u8) -> Option<u8> {
    BASE32_ALPHABET
        .iter()
        .position(|&item| item == ch)
        .map(|idx| idx as u8)
}

struct ParsedPayload {
    license_id: Uuid,
    order_id: Uuid,
    seats: u16,
    entitlements_checksum: u64,
    flags: u16,
    updates_until: Option<u64>,
}

fn parse_payload(bytes: &[u8]) -> Result<ParsedPayload, LicenseError> {
    let payload_len = license_payload_length();
    if bytes.len() != payload_len {
        return Err(LicenseError::InvalidLength);
    }

    let version = bytes[0];
    if version != 1 {
        return Err(LicenseError::UnsupportedVersion(version));
    }

    let license_id = Uuid::from_slice(&bytes[1..17])?;
    let order_id = Uuid::from_slice(&bytes[17..33])?;
    let seats = u16::from_be_bytes(bytes[33..35].try_into().unwrap());

    let checksum_high = u32::from_be_bytes(bytes[35..39].try_into().unwrap());
    let checksum_low = u32::from_be_bytes(bytes[39..43].try_into().unwrap());
    let checksum = ((checksum_high as u64) << 32) | checksum_low as u64;

    let flags = u16::from_be_bytes(bytes[43..45].try_into().unwrap());
    let updates_raw = u64::from_be_bytes(bytes[45..53].try_into().unwrap());
    let updates_until = if updates_raw == 0 {
        None
    } else {
        Some(updates_raw)
    };

    Ok(ParsedPayload {
        license_id,
        order_id,
        seats,
        entitlements_checksum: checksum,
        flags,
        updates_until,
    })
}

fn load_verifying_key() -> Result<VerifyingKey, LicenseError> {
    if let Ok(value) = std::env::var("HONEYMELON_LICENSE_PUBLIC_KEY") {
        return parse_public_key(&value);
    }
    if let Ok(value) = std::env::var("LICENSE_SIGNING_PUBLIC_KEY") {
        return parse_public_key(&value);
    }
    if let Some(value) = option_env!("LICENSE_SIGNING_PUBLIC_KEY") {
        return parse_public_key(value);
    }

    Err(LicenseError::MissingPublicKey)
}

fn parse_public_key(value: &str) -> Result<VerifyingKey, LicenseError> {
    let bytes = BASE64
        .decode(value)
        .map_err(|err| LicenseError::InvalidPublicKey(err.to_string()))?;

    let key_bytes: [u8; 32] = bytes
        .try_into()
        .map_err(|_| LicenseError::InvalidPublicKey("expected 32 bytes".into()))?;

    VerifyingKey::from_bytes(&key_bytes)
        .map_err(|err| LicenseError::InvalidPublicKey(err.to_string()))
}

const fn license_payload_length() -> usize {
    53
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
        let bytes = vec![0xBA; license_payload_length() + SIGNATURE_LENGTH];
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
