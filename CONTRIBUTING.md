# Contributing to Honeymelon

Thank you for your interest in contributing to Honeymelon! We appreciate your time and effort in helping make this project better.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Testing](#testing)
- [Documentation](#documentation)

## Code of Conduct

This project adheres to a Code of Conduct that all contributors are expected to follow. Please read [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) before contributing.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/honeymelon.git
   cd honeymelon
   ```
3. **Add the upstream repository**:
   ```bash
   git remote add upstream https://github.com/ORIGINAL_OWNER/honeymelon.git
   ```

## Development Setup

### Prerequisites

- macOS 13.0 (Ventura) or later
- Apple Silicon (M1, M2, M3, etc.)
- Xcode and Command Line Tools
- Rust (install via [rustup](https://rustup.rs/))
- Node.js 18+ and npm
- FFmpeg installed on your system

### Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Run in development mode**:
   ```bash
   npm run tauri:dev
   ```

3. **Build for production**:
   ```bash
   npm run tauri:build
   ```

For detailed build instructions, see [BUILD.md](BUILD.md).

## How to Contribute

### Reporting Bugs

Before creating a bug report, please check existing issues to avoid duplicates. When creating a bug report, include:

- **Clear title and description**
- **Steps to reproduce** the issue
- **Expected behavior** vs **actual behavior**
- **Screenshots** if applicable
- **Environment details**: macOS version, chip type (M1/M2/M3), app version
- **Log files** if available

Use the [Bug Report template](.github/ISSUE_TEMPLATE/bug_report.md) when creating an issue.

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, include:

- **Clear title and description**
- **Use cases** for the enhancement
- **Expected behavior** if implemented
- **Mockups or examples** if applicable

Use the [Feature Request template](.github/ISSUE_TEMPLATE/feature_request.md) when creating an issue.

### Contributing Code

We welcome code contributions! Here are some areas where you can help:

- **Bug fixes**: Fix reported bugs or issues you discover
- **Features**: Implement new features (discuss in an issue first for large changes)
- **Performance**: Optimize existing code
- **Documentation**: Improve or add documentation
- **UI/UX**: Enhance the user interface and experience
- **Tests**: Add or improve test coverage

## Pull Request Process

1. **Create a branch** for your work:
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/bug-description
   ```

2. **Make your changes** following our [Coding Standards](#coding-standards)

3. **Test your changes** thoroughly:
   ```bash
   npm run tauri:dev
   npm run build
   ```

4. **Commit your changes** following our [Commit Guidelines](#commit-guidelines)

5. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Open a Pull Request** on GitHub with:
   - Clear title describing the change
   - Description of what changed and why
   - Reference to any related issues (e.g., "Fixes #123")
   - Screenshots for UI changes

7. **Respond to feedback** from maintainers

8. **Ensure CI passes** - all checks must be green

### Pull Request Guidelines

- Keep PRs focused on a single feature or fix
- Update documentation for new features
- Add tests for new functionality
- Ensure backward compatibility when possible
- Keep the PR description up to date with changes
- Be responsive to review feedback

## Coding Standards

### TypeScript

- Use **TypeScript strict mode**
- Follow existing code style
- Use **meaningful variable and function names**
- Add **JSDoc comments** for complex functions
- Prefer **composition over inheritance**
- Use **Vue 3 Composition API** with `<script setup>`

### Vue Components

- Use **single-file components** (.vue)
- Follow **Vue 3 style guide**
- Use **TypeScript** for script sections
- Use **scoped styles** when appropriate
- Keep components **small and focused**

### Rust

- Follow **Rust conventions** and idioms
- Use **clippy** for linting
- Keep Tauri commands **minimal and auditable**
- Handle errors properly with `Result` types
- Document public APIs

### CSS/Styling

- Use **Tailwind CSS** utility classes
- Follow existing design patterns
- Ensure **accessibility** (WCAG 2.1 AA)
- Test on different screen sizes

## Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, no logic change)
- **refactor**: Code refactoring
- **perf**: Performance improvements
- **test**: Adding or updating tests
- **chore**: Maintenance tasks, dependency updates

### Examples

```
feat(ui): add dark mode toggle to preferences

Adds a dark/light/auto theme selector in the preferences window.
Users can now choose their preferred theme.

Closes #42
```

```
fix(conversion): handle files with spaces in path

Properly escape file paths with spaces when passing to FFmpeg.
Previously, conversions would fail for such files.

Fixes #89
```

## Testing

### Manual Testing

Before submitting a PR, please test:

1. **Basic functionality**: Drag and drop files, select presets, convert
2. **Edge cases**: Large files, special characters in filenames, various formats
3. **UI responsiveness**: Different window sizes, user interactions
4. **Error handling**: Invalid files, canceled operations

### Automated Testing

When adding tests:

- Write **unit tests** for utility functions
- Write **integration tests** for complex workflows
- Ensure tests are **deterministic** and **fast**
- Mock external dependencies (FFmpeg, file system)

## Documentation

Good documentation helps everyone:

- **Code comments**: Explain "why" not "what"
- **README.md**: Keep it up to date with changes
- **CLAUDE.md**: Update for architectural changes
- **Inline docs**: Add JSDoc/rustdoc for public APIs
- **Examples**: Provide examples for complex features

## Questions?

If you have questions about contributing:

- Check existing [GitHub Discussions](../../discussions)
- Open a new discussion
- Ask in the relevant issue thread

## License

By contributing to Honeymelon, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to Honeymelon! 🍈
