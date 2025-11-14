use super::types::{LicenseError, LicenseInfo, LICENSE_FILE_NAME};
use super::verifier::verify;
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

/// Abstraction for resolving where license data should be stored.
pub trait LicensePathProvider {
    fn license_store_path(&self) -> Result<PathBuf, LicenseError>;
}

impl LicensePathProvider for AppHandle {
    fn license_store_path(&self) -> Result<PathBuf, LicenseError> {
        self.path()
            .app_config_dir()
            .map_err(|_| LicenseError::StoragePath)
            .map(|dir| dir.join(LICENSE_FILE_NAME))
    }
}

pub fn persist(
    provider: &impl LicensePathProvider,
    info: &LicenseInfo,
) -> Result<(), LicenseError> {
    let path = provider.license_store_path()?;

    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }

    let data = serde_json::to_vec_pretty(info)?;
    fs::write(&path, data)?;
    Ok(())
}

pub fn load(provider: &impl LicensePathProvider) -> Result<Option<LicenseInfo>, LicenseError> {
    let path = provider.license_store_path()?;

    if !path.exists() {
        return Ok(None);
    }

    let data = fs::read(&path)?;
    let stored: LicenseInfo = serde_json::from_slice(&data)?;

    let mut verified = verify(&stored.key)?;
    verified.activated_at = stored.activated_at;

    Ok(Some(verified))
}

pub fn remove(provider: &impl LicensePathProvider) -> Result<(), LicenseError> {
    let path = provider.license_store_path()?;

    match fs::remove_file(path) {
        Ok(_) => Ok(()),
        Err(err) if err.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(err) => Err(err.into()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use base64::engine::general_purpose::STANDARD as BASE64;
    use base64::Engine;
    use ed25519_dalek::{SecretKey, Signer, SigningKey};
    use tempfile::TempDir;
    use uuid::Uuid;

    #[derive(Clone)]
    struct TempProvider {
        path: PathBuf,
    }

    impl LicensePathProvider for TempProvider {
        fn license_store_path(&self) -> Result<PathBuf, LicenseError> {
            Ok(self.path.clone())
        }
    }

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
                output.push(super::super::types::BASE32_ALPHABET[index] as char);
            }
        }

        if bits > 0 {
            let index = ((buffer << (5 - bits)) & 0x1F) as usize;
            output.push(super::super::types::BASE32_ALPHABET[index] as char);
        }

        output
            .chars()
            .collect::<Vec<_>>()
            .chunks(5)
            .map(|chunk| chunk.iter().collect::<String>())
            .collect::<Vec<_>>()
            .join("-")
    }

    fn make_license_info() -> (LicenseInfo, TempProvider) {
        use core::convert::TryFrom;

        const SECRET: [u8; 32] = [9; 32];
        let secret_key = SecretKey::try_from(&SECRET[..]).expect("secret key");
        let signing_key = SigningKey::from_bytes(&secret_key);
        let verifying_key = signing_key.verifying_key();
        std::env::set_var(
            "LICENSE_PUBLIC_KEY",
            BASE64.encode(verifying_key.to_bytes()),
        );

        let mut payload = Vec::with_capacity(super::super::types::PAYLOAD_LENGTH);
        payload.push(1);
        payload.extend_from_slice(Uuid::new_v4().as_bytes());
        payload.extend_from_slice(Uuid::new_v4().as_bytes());
        payload.push(5);
        let issued_at = 1_700_000_000u64;
        payload.extend_from_slice(&issued_at.to_be_bytes());

        let signature = signing_key.sign(&payload);
        let mut blob = payload.clone();
        blob.extend_from_slice(&signature.to_bytes());
        let key = encode_base32(&blob);

        let mut info = super::super::verifier::verify(&key).expect("verify works");
        info.activated_at = Some(issued_at + 5);

        let dir = TempDir::new().expect("temp dir");
        let provider = TempProvider {
            path: dir.path().join("license.json"),
        };

        (info, provider)
    }

    #[test]
    fn persist_load_and_remove_cycle() {
        let (info, provider) = make_license_info();

        persist(&provider, &info).expect("persist succeeds");
        let loaded = load(&provider)
            .expect("load ok")
            .expect("license should exist");
        assert_eq!(loaded.key, info.key);
        assert_eq!(loaded.license_id, info.license_id);
        assert_eq!(loaded.activated_at, info.activated_at);

        remove(&provider).expect("remove succeeds");
        let missing = load(&provider).expect("load without file");
        assert!(missing.is_none());
    }
}
