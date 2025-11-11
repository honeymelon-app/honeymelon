---
title: Getting Support
description: Where to get help, report issues, and follow Honeymelon's development updates.
---

# Getting Support

Need help with Honeymelon? This page outlines all available support channels and resources.

## Support Channels

### Documentation

Start with our comprehensive documentation:

- **[User Guide](/guide/getting-started)** – Get started with Honeymelon
- **[Troubleshooting](/guide/troubleshooting)** – Common issues and solutions
- **[Architecture](/architecture/overview)** – Understanding how Honeymelon works
- **[Developer Guide](/development/contributing)** – Contributing to the project

### Issue Tracker

For bugs and feature requests, use our GitHub issue tracker:

- **[Report a Bug](https://github.com/honeymelon-app/honeymelon/issues/new?template=bug_report.md)** – Found a problem? Let us know
- **[Request a Feature](https://github.com/honeymelon-app/honeymelon/issues/new?template=feature_request.md)** – Have an idea? Share it with us
- **[Browse Issues](https://github.com/honeymelon-app/honeymelon/issues)** – See what's already reported

::: tip Search First
Before opening a new issue, please search existing issues to avoid duplicates.
:::

### GitHub Discussions

For questions, ideas, and community discussion:

- **[Q&A](https://github.com/honeymelon-app/honeymelon/discussions/categories/q-a)** – Ask questions and get help from the community
- **[Ideas](https://github.com/honeymelon-app/honeymelon/discussions/categories/ideas)** – Share feature ideas and discuss future direction
- **[Show and Tell](https://github.com/honeymelon-app/honeymelon/discussions/categories/show-and-tell)** – Share your workflows and use cases

### Email Contact

For specific inquiries:

- **Security vulnerabilities**: See our [Security Policy](https://github.com/honeymelon-app/honeymelon/security/policy)
- **Licensing questions**: Contact [tjthavarshan@gmail.com](mailto:tjthavarshan@gmail.com)
- **Commercial support**: Contact [tjthavarshan@gmail.com](mailto:tjthavarshan@gmail.com)

## Expected Response Times

We strive to respond to all inquiries promptly:

| Issue Type               | Response Time     |
| ------------------------ | ----------------- |
| Security Vulnerabilities | Within 48 hours   |
| Critical Bugs            | 3-5 business days |
| Regular Bugs             | 1-2 weeks         |
| Feature Requests         | 2-3 weeks         |
| Questions                | 1-2 weeks         |

::: warning Community Project
Honeymelon is maintained by a small team. Response times may vary depending on workload and complexity.
:::

## Troubleshooting First Steps

Before reaching out, try these troubleshooting steps:

### 1. Verify FFmpeg Installation

```bash
# Check if FFmpeg is accessible
ffmpeg -version

# Check Honeymelon's bundled FFmpeg
ls -la ~/Library/Application\ Support/com.honeymelon.desktop/
```

### 2. Check Logs

Enable debug logging in Preferences to see detailed error messages.

### 3. Test with Sample File

Try converting a simple test file to isolate the issue:

```bash
# Create a test video (requires FFmpeg)
ffmpeg -f lavfi -i testsrc=duration=5:size=640x480:rate=30 test.mp4
```

### 4. Review Common Issues

Check our [Troubleshooting Guide](/guide/troubleshooting) for solutions to common problems.

## Community Guidelines

When asking for help:

1. **Be respectful** – Follow our [Code of Conduct](https://github.com/honeymelon-app/honeymelon/blob/main/CODE_OF_CONDUCT.md)
2. **Provide context** – Include:
   - macOS version
   - Honeymelon version
   - FFmpeg version
   - Steps to reproduce
   - Error messages
   - Sample files (if relevant)
3. **Search first** – Check if your question has been answered
4. **One issue per report** – Don't bundle multiple issues together
5. **Follow up** – Let us know if a solution worked

## Contributing

Want to contribute? See our [Contributing Guide](/development/contributing) to get started.

## Privacy & Security

- **All processing is local** – Your files never leave your computer
- **No telemetry** – We don't collect usage data
- **No network access** – Core functionality works offline

See our [Privacy Policy](/guide/privacy) for details.

## Acknowledgements

Thank you to everyone who:

- Reports bugs and issues
- Contributes code and documentation
- Helps other users in discussions
- Shares feedback and ideas

Your contributions make Honeymelon better for everyone!

---

For the complete support documentation, see [SUPPORT.md](https://github.com/honeymelon-app/honeymelon/blob/main/.github/SUPPORT.md) in the repository.
