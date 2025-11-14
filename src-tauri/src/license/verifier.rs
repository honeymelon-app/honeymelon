use super::decoder::{decode_key, format_key, parse_payload};
use super::types::{LicenseError, LicenseInfo, PAYLOAD_LENGTH, SIGNATURE_LENGTH};
use base64::engine::general_purpose::STANDARD as BASE64;
use base64::Engine;
use ed25519_dalek::{Signature, Verifier, VerifyingKey};
use std::time::{SystemTime, UNIX_EPOCH};

pub fn verify(key: &str) -> Result<LicenseInfo, LicenseError> {
    let blob = decode_key(key)?;

    if blob.len() != PAYLOAD_LENGTH + SIGNATURE_LENGTH {
        return Err(LicenseError::InvalidLength);
    }

    let (payload_bytes, signature_bytes) = blob.split_at(PAYLOAD_LENGTH);
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
        max_major_version: parsed.max_major_version,
        issued_at: parsed.issued_at,
        payload: BASE64.encode(payload_bytes),
        signature: BASE64.encode(signature_bytes),
        activated_at: None,
    })
}

pub fn activate_timestamp() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

fn load_verifying_key() -> Result<VerifyingKey, LicenseError> {
    if let Ok(value) = std::env::var("LICENSE_PUBLIC_KEY") {
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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::license::{decoder, types};
    use ed25519_dalek::{SecretKey, Signer, SigningKey};
    use uuid::Uuid;

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
                output.push(types::BASE32_ALPHABET[index] as char);
            }
        }

        if bits > 0 {
            let index = ((buffer << (5 - bits)) & 0x1F) as usize;
            output.push(types::BASE32_ALPHABET[index] as char);
        }

        output
            .chars()
            .collect::<Vec<_>>()
            .chunks(5)
            .map(|chunk| chunk.iter().collect::<String>())
            .collect::<Vec<_>>()
            .join("-")
    }

    fn signed_license_blob() -> (String, String) {
        const SECRET: [u8; 32] = [9; 32];
        let secret_key = SecretKey::try_from(&SECRET[..]).expect("secret key");
        let signing_key = SigningKey::from_bytes(&secret_key);
        let verifying_key = signing_key.verifying_key();
        let verifying_b64 = BASE64.encode(verifying_key.to_bytes());

        let mut payload = Vec::with_capacity(types::PAYLOAD_LENGTH);
        payload.push(1);
        payload.extend_from_slice(Uuid::new_v4().as_bytes());
        payload.extend_from_slice(Uuid::new_v4().as_bytes());
        payload.push(4);
        let issued_at = 1_700_000_100u64;
        payload.extend_from_slice(&issued_at.to_be_bytes());

        let signature = signing_key.sign(&payload);
        let mut blob = payload.clone();
        blob.extend_from_slice(&signature.to_bytes());
        (encode_base32(&blob), verifying_b64)
    }

    #[test]
    fn verify_round_trip_with_valid_signature() {
        let (key, verifying_b64) = signed_license_blob();
        std::env::set_var("LICENSE_PUBLIC_KEY", &verifying_b64);

        let info = verify(&key).expect("valid license");
        assert_eq!(info.key.replace('-', "").len(), key.replace('-', "").len());
        assert_eq!(info.max_major_version, 4);
        assert_eq!(info.payload.len(), 4 * types::PAYLOAD_LENGTH.div_ceil(3));
    }

    #[test]
    fn verify_rejects_invalid_signature() {
        let (key, verifying_b64) = signed_license_blob();
        std::env::set_var("LICENSE_PUBLIC_KEY", &verifying_b64);

        let mut blob = decoder::decode_key(&key).expect("decode original");
        let last = blob.last_mut().expect("non-empty");
        *last ^= 0xFF;
        let corrupt = encode_base32(&blob);

        let result = verify(&corrupt);
        assert!(matches!(result, Err(LicenseError::InvalidSignature)));
    }

    #[test]
    fn activate_timestamp_returns_nonzero() {
        assert!(activate_timestamp() > 0);
    }
}
