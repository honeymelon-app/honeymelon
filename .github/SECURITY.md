# Security Policy

## Reporting a Vulnerability

The Honeymelon project takes security vulnerabilities seriously. If you discover a security vulnerability, please report it responsibly.

### Do Not

- Do not open a public GitHub issue for a security vulnerability
- Do not disclose the vulnerability publicly until a fix is available
- Do not attempt to exploit the vulnerability beyond research necessary to confirm it

### Do

1. **Email the maintainers** at the project's security contact address
2. **Include details** about the vulnerability:
   - Description of the vulnerability
   - Steps to reproduce (if applicable)
   - Potential impact
   - Suggested fix (if you have one)
3. **Allow reasonable time** for response and remediation

### Contact

Please report security vulnerabilities by emailing the project maintainers. You can identify current maintainers in the [CONTRIBUTING.md](../CONTRIBUTING.md) file.

For responsible disclosure inquiries or if you're unsure about reporting, open a [GitHub Discussion](../../discussions) marked as private/confidential.

## Security Considerations

### FFmpeg Integration

Honeymelon runs FFmpeg as an out-of-process command. This provides:

- **Process isolation**: FFmpeg runs in a separate process, limiting potential code execution impact
- **LGPL compliance**: No static linking; FFmpeg can be updated independently
- **Configurable path**: Users can point to their own FFmpeg installation

However, be aware:

- Ensure FFmpeg is from a trusted source (official builds or reputable package managers)
- Keep FFmpeg updated to the latest security patches
- Honeymelon does not validate FFmpeg output before processing

### User-Supplied Input

- **File paths**: Honeymelon properly escapes file paths when passing to FFmpeg
- **Media metadata**: FFmpeg-generated metadata is displayed as-is; untrusted sources may contain harmful data
- **FFmpeg arguments**: User-selected presets are designed to prevent arbitrary code execution

### Platform Security

Honeymelon is designed for **macOS 13+ on Apple Silicon only**:

- Leverages macOS security features (code signing, sandboxing compatibility)
- Does not support other platforms (no Windows/Linux ports)
- Notarization available for distribution builds (see [BUILD.md](../BUILD.md))

## Supported Versions

We support security updates for:

| Version | Status | End of Life |
| ------- | ------ | ----------- |
| 0.1.x   | Active | TBD         |

Once the security policy is more established, this table will be updated to reflect long-term support timelines.

## Security Updates

- Security patches will be released as soon as practical after confirmation and fix
- Critical vulnerabilities will trigger an urgent release
- All security updates will be documented in [CHANGELOG.md](../CHANGELOG.md)
- Users will be notified through GitHub releases and security advisories

## Dependencies

Honeymelon uses several third-party libraries and frameworks:

- **Vue 3**: Frontend framework
- **Tauri 2**: Desktop application framework
- **Rust ecosystem**: Backend logic and FFmpeg integration

We use automated dependency scanning (Dependabot) to identify and patch vulnerable dependencies. See [dependabot.yml](.github/dependabot.yml) for configuration.

### Keeping Dependencies Updated

To check for security vulnerabilities in your local environment:

```bash
# npm audit for Node.js dependencies
npm audit

# Cargo audit for Rust dependencies
cd src-tauri && cargo audit
```

## Security Best Practices for Users

If you use Honeymelon:

1. **Keep it updated**: Always use the latest version from the official repository
2. **Trust your FFmpeg**: Use FFmpeg from official sources or reputable package managers
3. **Verify file integrity**: Check file hashes if distributing builds
4. **Report suspicious behavior**: If you notice unusual activity, report it as a security issue

## Third-Party Code

This project includes code and dependencies from third-party sources. Please see [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md) for a complete list of dependencies and their licenses.

## License Compliance

Honeymelon is proprietary software. See [LICENSE](../LICENSE) for terms. FFmpeg is licensed under LGPL v2.1+ and runs out-of-process (process-separated, no linking).

---

Thank you for helping keep Honeymelon secure.
