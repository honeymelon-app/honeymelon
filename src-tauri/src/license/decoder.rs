use super::types::LicenseError;
use super::types::{BASE32_ALPHABET, PAYLOAD_LENGTH};
use uuid::Uuid;

pub(super) struct ParsedPayload {
    pub license_id: Uuid,
    pub order_id: Uuid,
    pub max_major_version: u8,
    pub issued_at: u64,
}

pub(super) fn format_key(key: &str) -> String {
    normalized_key(key)
        .chars()
        .collect::<Vec<_>>()
        .chunks(5)
        .map(|chunk| chunk.iter().collect::<String>())
        .collect::<Vec<_>>()
        .join("-")
}

pub(super) fn decode_key(key: &str) -> Result<Vec<u8>, LicenseError> {
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

pub(super) fn parse_payload(bytes: &[u8]) -> Result<ParsedPayload, LicenseError> {
    if bytes.len() != PAYLOAD_LENGTH {
        return Err(LicenseError::InvalidLength);
    }

    let version = bytes[0];
    if version != 1 {
        return Err(LicenseError::UnsupportedVersion(version));
    }

    let license_id = Uuid::from_slice(&bytes[1..17])?;
    let order_id = Uuid::from_slice(&bytes[17..33])?;
    let max_major_version = bytes[33];
    let issued_at_bytes: [u8; 8] = bytes[34..42]
        .try_into()
        .map_err(|_| LicenseError::InvalidLength)?;
    let issued_at = u64::from_be_bytes(issued_at_bytes);

    Ok(ParsedPayload {
        license_id,
        order_id,
        max_major_version,
        issued_at,
    })
}

fn normalized_key(key: &str) -> String {
    key.chars()
        .filter(|ch| ch.is_ascii_alphanumeric())
        .map(|ch| ch.to_ascii_uppercase())
        .collect()
}

fn char_to_value(ch: u8) -> Option<u8> {
    BASE32_ALPHABET
        .iter()
        .position(|&item| item == ch)
        .map(|idx| idx as u8)
}

#[cfg(test)]
mod tests {
    use super::super::types::{BASE32_ALPHABET, PAYLOAD_LENGTH, SIGNATURE_LENGTH};
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

    #[test]
    fn parse_payload_handles_truncated_timestamp() {
        let mut bytes = vec![0u8; PAYLOAD_LENGTH - 1];
        bytes[0] = 1;
        let result = parse_payload(&bytes);
        assert!(matches!(result, Err(LicenseError::InvalidLength)));
    }
}
