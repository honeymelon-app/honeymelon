# Licensing Integration

The Honeymelon desktop app validates licenses that are issued from the Laravel marketing site. This document explains how the two applications exchange license information, how signatures are produced, and how to configure local development.

## Overview

1. The Laravel app issues licenses through `App\Services\LicenseService`. Each license contains:
   - A binary payload describing the license (UUIDs, seats, entitlements checksum, maintenance window).
   - An Ed25519 signature generated from a private key stored in environment secrets.
   - A Windows-style Base32 license key produced from the payload+signature bundle.
2. The license key is presented to end users. They enter the key inside Honeymelon for macOS.
3. The Tauri runtime decodes the key, validates the Ed25519 signature using the bundled public key, and stores a trusted copy of the license on disk.

The binary payload format and Base32 encoding are implemented in the PHP support classes (`App\Support\LicensePayload`, `LicenseBundle`, `LicenseCodec`, `LicenseSigner`) and mirrored in `src-tauri/src/license.rs`.

## Generating signing keys

Workflow in the Laravel project (run from `platform/`):

```bash
php artisan license:generate-keys
```

The command prints a base64 encoded Ed25519 public/private keypair. Store the values in infrastructure secrets. The public key is safe to embed in the desktop app; the private key must never leave the backend.

Update the Laravel environment:

```env
LICENSE_SIGNING_PUBLIC_KEY=base64_public_key
LICENSE_SIGNING_PRIVATE_KEY=base64_private_key
```

For the desktop app, inject the public key at build time. The verifier looks for one of:

- `LICENSE_PUBLIC_KEY`
- `LICENSE_SIGNING_PUBLIC_KEY`
- A compile-time value baked in via `option_env!` (set `LICENSE_SIGNING_PUBLIC_KEY` when running `cargo build` if you want a static key in CI).

## Issuing licenses

When an order is fulfilled the Laravel service calls `LicenseService::issue()`:

1. Generates the payload using `LicensePayload::fromLicense()`.
2. Signs the payload with `LicenseSigner::sign()`.
3. Produces a human-friendly key via `LicenseCodec::encode()`.
4. Persists the hashed key (`key`) and plain display key (`key_plain`) alongside the signature/payload metadata.

Admin APIs return `key_plain` while keeping the hashed value internal. All comparisons are performed against the SHA-256 hash to avoid leaking raw keys in logs.

## Desktop activation flow

Inside the Tauri project:

- `src-tauri/src/license.rs` implements decoding and Ed25519 verification.
- The following commands are exposed to the renderer via `tauri::invoke`:
  - `verify_license_key(key: String)` – returns decoded license info without storing it.
  - `activate_license(key: String)` – verifies, stores the license JSON in the app config directory, and emits `license://activated`.
  - `current_license()` – loads and re-validates any stored license.
  - `remove_license()` – deletes the stored license file and emits `license://removed`.
- `src/stores/license.ts` wraps those commands in a Pinia store and listens for activation/removal events.
- `src/components/LicenseActivationDialog.vue` handles activation gating and in-app license management.
- The renderer blocks the primary UI until activation succeeds and persists the verified license JSON for reuse on subsequent launches.

All license data is verified locally; no network calls are required during activation.

## Development checklist

1. Generate an Ed25519 keypair and share the public key with the desktop team.
2. Configure the Laravel app with both public & private keys.
3. Set the public key for the desktop app via env var before running `npm run tauri:dev`:

   ```bash
   export LICENSE_PUBLIC_KEY=base64_public_key
   npm run tauri:dev
   ```

4. Issue a license through the admin UI / console and copy the displayed key.
5. Launch Honeymelon; the activation dialog opens automatically. Paste the key and activate (or use the “Enter License Key” button in the placeholder card to reopen the dialog).

## Error handling

- Signature mismatches set a descriptive error banner in the dialog and prevent activation.
- Stored licenses are re-verified on every launch; a tampered or revoked key results in automatic removal and the app returns to activation mode.
- All filesystem writes use the per-app config directory (`AppHandle::path().app_config_dir()`), keeping sensitive data confined to the user profile.
