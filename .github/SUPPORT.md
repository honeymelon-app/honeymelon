# Support & Getting Help

Thank you for using Honeymelon! We're here to help if you encounter any issues or have questions.

## How to Get Help

### Documentation

Start with our comprehensive documentation:

- **[User Guide](../docs/guide/)** – Step-by-step instructions for using Honeymelon
  - [Getting Started](../docs/guide/getting-started.md)
  - [Converting Files](../docs/guide/converting-files.md)
  - [Preferences & Configuration](../docs/guide/preferences.md)
  - [Supported Formats](../docs/guide/supported-formats.md)
  - [Troubleshooting](../docs/guide/troubleshooting.md)

- **[README](../README.md)** – Project overview, key features, and system requirements

- **[Architecture Documentation](../docs/architecture/)** – Deep dive into how Honeymelon works
  - [Pipeline Overview](../docs/architecture/pipeline.md)
  - [Technical Stack](../docs/architecture/tech-stack.md)

- **[Developer Guide](../docs/development/)** – For contributors and developers
  - [Building from Source](../docs/development/building.md)
  - [Contributing Guidelines](../docs/development/contributing.md)
  - [Testing](../docs/development/testing.md)

### Issue Tracker

Found a bug or have a feature request? Check our [GitHub Issues](https://github.com/honeymelon-app/honeymelon/issues):

1. **Search first** – Your question may already be answered
2. **Create a new issue** if needed:
   - **Bug Reports**: Use the bug report template and include:
     - macOS version and chip type (e.g., M1, M2, M3)
     - Honeymelon version
     - File details (format, codec, resolution, duration)
     - FFmpeg version (`ffmpeg -version`)
     - Full error message or logs from Console.app (filter: "Honeymelon")
     - Steps to reproduce

   - **Feature Requests**: Describe:
     - What you want to do
     - Why it's important to you
     - Any examples or use cases

### GitHub Discussions

Have a question or want to discuss ideas? Use [GitHub Discussions](https://github.com/honeymelon-app/honeymelon/discussions):

- Ask questions in the **Discussions** tab
- Share tips and workarounds
- Discuss features and roadmap
- Connect with other users

### Email

For security vulnerabilities or confidential matters, see [SECURITY.md](.github/SECURITY.md).

For licensing inquiries, contact: **tjthavarshan@gmail.com**

## Expected Response Times

We strive to respond to community inquiries based on priority:

| Type                                                  | Expected Response                                        |
| ----------------------------------------------------- | -------------------------------------------------------- |
| **Security vulnerabilities**                          | Within 48 hours (see [SECURITY.md](.github/SECURITY.md)) |
| **Critical bugs** (app crashes, data loss)            | Within 5 business days                                   |
| **Regular bugs** (incorrect output, missing features) | Within 2 weeks                                           |
| **Feature requests**                                  | Within 3 weeks                                           |
| **Questions/Discussions**                             | No SLA (community-driven, best-effort)                   |

**Note**: Response times depend on maintainer availability. This project is maintained by a small team, and we appreciate your patience.

## Community Guidelines

Please follow these guidelines when interacting with the Honeymelon community:

### Be Respectful

- Treat other users and maintainers with respect and kindness
- Disagree constructively without personal attacks
- Remember that everyone is volunteering their time

### Provide Context

- Include relevant information (OS, versions, file details, error messages)
- Use proper formatting for code and logs (code blocks, GitHub syntax highlighting)
- Describe what you expected vs. what actually happened

### Search Before Asking

- Check closed and open issues to avoid duplicates
- Read documentation first—many common questions are answered there
- Search existing discussions for similar topics

### Don't Cross-Post Excessively

- Ask in one place (Issues, Discussions, or Email)—don't spam multiple channels
- If you post in Discussions, you can reference it in an issue if needed

### Follow the Code of Conduct

See [CODE_OF_CONDUCT.md](../CODE_OF_CONDUCT.md) for our community standards. Violations will be addressed respectfully but firmly.

## Troubleshooting First Steps

Before reporting an issue, try these common solutions:

### FFmpeg-Related Issues

```bash
# Check if FFmpeg is installed and accessible
which ffmpeg
ffmpeg -version

# Check available encoders
ffmpeg -encoders | grep <codec_name>

# Verify bundled FFmpeg in Honeymelon
file /Applications/Honeymelon.app/Contents/Resources/ffmpeg
```

### Logs & Debugging

1. Open **Console.app**
2. Filter by **"Honeymelon"**
3. Reproduce the issue and check for error messages
4. Include these logs when reporting bugs

### Performance Issues

- Check concurrent job settings (Preferences → Concurrent Jobs)
- Try reducing concurrent jobs or setting to 1
- Monitor CPU usage with Activity Monitor
- Check available disk space

### File-Specific Issues

- Try with a different file to isolate the problem
- Test with a simpler format (e.g., H.264/AAC in MP4)
- Verify the input file isn't corrupted: `ffprobe -v error <file>`

## Contributing

Want to help fix a bug or add a feature? See [CONTRIBUTING.md](../CONTRIBUTING.md) for:

- Development setup
- Coding standards
- Commit message format
- Pull request workflow

## Privacy & Security

Honeymelon is privacy-first:

- **100% local processing** – All conversions happen on-device
- **No telemetry** – We don't collect any usage data
- **No tracking** – No analytics, no cookies, no external calls
- **Open security** – Report vulnerabilities responsibly via [SECURITY.md](.github/SECURITY.md)

## Acknowledgements

Thanks for being part of the Honeymelon community! We're grateful for:

- Bug reports and detailed issue descriptions
- Feature suggestions and use-case feedback
- Pull requests and code contributions
- Documentation improvements
- Testing on different macOS versions and hardware
- Sharing Honeymelon with others

---

**Last Updated**: November 2025
**Questions?** Start with [Troubleshooting](../docs/guide/troubleshooting.md) or [GitHub Discussions](https://github.com/honeymelon-app/honeymelon/discussions)
