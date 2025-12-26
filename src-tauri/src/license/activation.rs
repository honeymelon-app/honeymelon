//! HTTP client for license activation against the platform API.
//!
//! This module handles the one-time online activation of licenses.
//! After successful activation, the app stores the activation data locally
//! and never calls this API again.

use super::types::{ActivationResponse, LicenseError, LicenseInfo};
use base64::engine::general_purpose::STANDARD as BASE64;
use base64::Engine;
use serde::Serialize;

/// Base URL for the platform API.
const PLATFORM_API_URL: &str = env!("PLATFORM_API_URL");

/// Request body for license activation.
#[derive(Debug, Serialize)]
struct ActivationRequest<'a> {
    license_key: &'a str,
    app_version: &'a str,
    device_id: Option<&'a str>,
}

/// Activate a license by calling the platform API.
///
/// This should only be called once per installation. After successful activation,
/// the returned LicenseInfo should be stored locally and used for all future
/// license checks without calling the network.
pub async fn activate_online(
    key: &str,
    app_version: &str,
    device_id: Option<&str>,
) -> Result<LicenseInfo, LicenseError> {
    let client = reqwest::Client::new();

    let request = ActivationRequest {
        license_key: key,
        app_version,
        device_id,
    };

    let url = format!("{}/api/licenses/activate", PLATFORM_API_URL);

    let response = client
        .post(&url)
        .json(&request)
        .send()
        .await
        .map_err(|e| LicenseError::NetworkError(e.to_string()))?;

    let status = response.status();
    let body: ActivationResponse = response
        .json()
        .await
        .map_err(|e| LicenseError::NetworkError(format!("Failed to parse response: {}", e)))?;

    if !body.success {
        // Prefer 'error' field, but fall back to 'message' for validation errors
        let error_msg = body
            .error
            .or(body.message)
            .unwrap_or_else(|| "Unknown error".to_string());
        let error_code = body.error_code.as_deref().unwrap_or("unknown");

        return Err(match error_code {
            "license_not_found" => LicenseError::NotFound,
            "license_not_active" => {
                if error_msg.contains("refunded") {
                    LicenseError::Refunded
                } else {
                    LicenseError::Revoked
                }
            },
            "license_already_activated" => LicenseError::AlreadyActivated,
            "license_version_not_allowed" => {
                let max_major_version = error_msg
                    .split_whitespace()
                    .rev()
                    .next()
                    .and_then(|token| {
                        token
                            .trim_end_matches(".x.")
                            .trim_end_matches(".x")
                            .parse::<u8>()
                            .ok()
                    })
                    .unwrap_or(0);

                LicenseError::AppVersionNotAllowed { max_major_version }
            },
            _ => LicenseError::ActivationServerError(format!(
                "{}: {} (status: {})",
                error_code, error_msg, status
            )),
        });
    }

    let license_data = body
        .license
        .ok_or_else(|| LicenseError::ActivationServerError("No license data in response".into()))?;

    // Build LicenseInfo from the activation response
    Ok(LicenseInfo {
        key: license_data.key,
        license_id: license_data.id,
        order_id: license_data.order_id,
        max_major_version: license_data.max_major_version,
        issued_at: license_data.activated_at, // Use activated_at as issued_at for simplicity
        payload: license_data.payload.unwrap_or_default(),
        signature: license_data.signature.unwrap_or_default(),
        activated_at: Some(license_data.activated_at),
    })
}

/// Generate a device identifier for this installation.
/// This is a privacy-respecting random identifier, not derived from hardware.
pub fn generate_device_id() -> String {
    let bytes: [u8; 16] = rand::random();
    BASE64.encode(bytes)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn device_id_is_unique() {
        let id1 = generate_device_id();
        let id2 = generate_device_id();
        assert_ne!(id1, id2);
        assert!(!id1.is_empty());
    }
}
