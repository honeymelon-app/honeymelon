# Contributing to Honeymelon

Thank you for your interest in contributing to Honeymelon!

## IMPORTANT: Proprietary Software Notice

**Honeymelon is proprietary software.** By contributing to this project, you agree that:

1. All contributions will become the property of Jerome Thayananthajothy
2. Your contributions will be subject to Honeymelon's proprietary license
3. You grant Jerome Thayananthajothy perpetual, irrevocable, worldwide rights to use, modify, and distribute your contributions
4. You waive all rights to your contributions except for attribution

**Contributor License Agreement**: By submitting a pull request, you certify that you have the right to grant these terms and that your contribution is your original work.

---

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
   git clone https://github.com/honeymelon-app/honeymelon.git
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

2. **Set up pre-commit hooks** (recommended):

   ```bash
   npm run prepare
   ```

   This installs git hooks that automatically lint and format your code before each commit.

3. **Run in development mode**:

   ```bash
   npm run tauri:dev
   ```

4. **Build for production**:

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

### Automated Testing

We use both unit tests and E2E tests:

#### Unit Tests

Unit tests are written using [Vitest](https://vitest.dev/) and test individual functions and components.

```bash
# Run unit tests once
npm run test:unit

# Run unit tests in watch mode
npm run test:unit:watch

# Run unit tests with UI
npm run test:unit:ui

# Run unit tests with coverage
npm run test:unit:coverage
```

When adding unit tests:

- Write tests for utility functions in `src/lib/`
- Test complex business logic (planning, probing, etc.)
- Mock external dependencies (FFmpeg, Tauri commands)
- Keep tests fast and deterministic

#### E2E Tests

E2E tests are written using [Playwright](https://playwright.dev/) and test the complete application workflow.

```bash
# Run E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui

# Debug E2E tests
npm run test:e2e:debug
```

See [e2e/README.md](e2e/README.md) for more details on writing E2E tests.

#### Running All Tests

```bash
npm test
```

This runs both unit and E2E tests.

### Manual Testing

Before submitting a PR, please also test manually:

1. **Basic functionality**: Drag and drop files, select presets, convert
2. **Edge cases**: Large files, special characters in filenames, various formats
3. **UI responsiveness**: Different window sizes, user interactions
4. **Error handling**: Invalid files, canceled operations

### Pre-commit Hooks

We use [Husky](https://typicode.github.io/husky/) and [lint-staged](https://github.com/lint-staged/lint-staged) to automatically check your code before commits.

The pre-commit hook runs:

- **ESLint** on JavaScript/TypeScript/Vue files (with auto-fix)
- **Prettier** on all supported file types (with auto-format)
- **Rust fmt** on Rust files

To set up pre-commit hooks:

```bash
npm run prepare
```

After setup, the hooks will run automatically on every `git commit`. If there are issues, the commit will be blocked until they're fixed.

To bypass hooks (not recommended):

```bash
git commit --no-verify
```

#### Manual Linting and Formatting

You can also run these checks manually:

```bash
# Lint and fix all code
npm run lint:fix

# Format all code
npm run format

# Check formatting without changes
npm run format:check

# Type-check TypeScript
npm run type-check
```

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

Thank you for contributing to Honeymelon!
