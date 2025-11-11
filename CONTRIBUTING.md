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
- [Branch Protection Requirements](#branch-protection-requirements)
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

## Branch Protection Requirements

The main branch is protected to ensure code quality and stability. All changes must go through pull requests with the following requirements:

### Review Requirements

- **Require pull request reviews**: At least 1 approval from a code owner or maintainer
- **Dismiss stale reviews**: Reviews are automatically dismissed when new commits are pushed
- **Require review from code owners**: For changes to protected paths

### Status Checks

Before merging, the following checks must pass:

- **Lint**: ESLint and Prettier checks for TypeScript/Vue/JavaScript
- **Type Check**: TypeScript compilation without errors
- **Test**: All unit and E2E tests passing
- **Build**: Successful Vite and Tauri builds
- **Rust Tests**: All Cargo tests passing
- **Rust Lint**: Clippy checks passing

### Branch Requirements

- **Require branches to be up to date**: Branch must be current with main before merging
- **Require linear history**: No merge commits allowed (use squash or rebase)
- **Require signed commits**: All commits must be GPG/SSH signed (recommended)

### Restrictions

- **Do not allow force pushes**: Prevents history rewriting on main branch
- **Do not allow deletions**: Main branch cannot be deleted
- **Require deployments to succeed**: Before merging (when applicable)

### Enforcement

These protections apply to:

- **Administrators**: Include administrators in these restrictions
- **Apps**: Status checks must pass even for automated tools
- **Bypass list**: Only repository owner can bypass (emergency use only)

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

## Release Process

Honeymelon uses [semantic-release](https://semantic-release.gitbook.io/) to automate versioning and releases. Version numbers are determined automatically based on the commit messages using Conventional Commits.

### Version Scheme

- **MAJOR** version: Breaking changes (feat with `BREAKING CHANGE:` footer)
- **MINOR** version: New features (feat commits)
- **PATCH** version: Bug fixes (fix commits) and other changes

### Manual Release Trigger

To trigger a release manually:

1. Go to the **Actions** tab on GitHub
2. Select the **Release Build** workflow
3. Click **Run workflow**
4. The workflow will:
   - Analyze commit history since the last release
   - Determine the new version number
   - Update `package.json`, `Cargo.toml`, and `tauri.conf.json`
   - Generate/update `CHANGELOG.md`
   - Create a git tag and push to GitHub
   - Trigger the build and release process

### Automatic Release Trigger

When you manually create a GitHub Release (via the Releases page), the workflow automatically:

1. Validates the code (linting, tests, builds)
2. Signs FFmpeg binaries
3. Builds the macOS application
4. Uploads artifacts
5. Generates checksums
6. Notifies webhooks

### Version Synchronization

The following files are automatically kept in sync during releases:

- `package.json` (npm version field)
- `package-lock.json` (npm lock file)
- `src-tauri/Cargo.toml` (Rust package version)
- `src-tauri/tauri.conf.json` (Tauri app version)
- `CHANGELOG.md` (Release notes)

This is handled by the `scripts/update-version.js` script, which is called by the semantic-release plugin during the prepare phase.

### Creating a Release Locally (Advanced)

If you need to create a release locally:

```bash
# Make sure your branch is up to date
git pull origin main

# Run semantic-release locally (requires GITHUB_TOKEN)
GITHUB_TOKEN=your_token npm run release
```

### Notes

- Commits must follow the Conventional Commits format for automatic versioning
- The first release must have at least one conventional commit
- Multiple commits of the same type will increment version by 1 (e.g., two `fix:` commits = one patch bump)
- Pre-release versions (alpha, beta, rc) are not currently configured but can be enabled via `.releaserc.json`

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

## Changelog Management

We use [conventional-changelog](https://github.com/conventional-changelog/conventional-changelog) to automatically generate changelogs from commit messages.

### Generating Changelogs

After making commits following our [Commit Guidelines](#commit-guidelines), you can generate a changelog:

```bash
# Update CHANGELOG.md with new commits since last release
npm run changelog

# Generate complete changelog from all commits (first time only)
npm run changelog:first
```

### Changelog Workflow

1. **Make commits** following the [Conventional Commits](https://www.conventionalcommits.org/) specification
2. **Before creating a release**, run `npm run changelog` to update `CHANGELOG.md`
3. **Review the generated changelog** and make manual edits if needed
4. **Commit the updated changelog**: `git add CHANGELOG.md && git commit -m "chore: update changelog"`
5. **Create your release** using the standard release process

The changelog groups commits by type:

- **Features**: All commits with `feat:` prefix
- **Bug Fixes**: All commits with `fix:` prefix
- **Performance Improvements**: All commits with `perf:` prefix
- **Breaking Changes**: Any commit with `BREAKING CHANGE:` in the footer

### Example Changelog Entry

When you run `npm run changelog`, it will generate entries like:

```markdown
## [1.2.0] - 2025-11-11

### Features

- **ui**: add dark mode toggle to preferences ([#42](https://github.com/honeymelon-app/honeymelon/issues/42))
- **conversion**: support batch processing of multiple files

### Bug Fixes

- **conversion**: handle files with spaces in path ([#89](https://github.com/honeymelon-app/honeymelon/issues/89))
```

## Secret Scanning

We use [TruffleHog](https://github.com/trufflesecurity/trufflehog) to scan for accidentally committed secrets and credentials.

### Automated Scanning

All pull requests and pushes to main/develop branches are automatically scanned by our GitHub Actions workflow. The scan will:

- Check for API keys, tokens, passwords, and other secrets
- Block merging if verified secrets are found
- Report findings in the GitHub Actions logs

### Local Secret Scanning (Optional)

To catch secrets before committing, you can install and use TruffleHog locally:

#### Installation

**Using Homebrew (macOS):**

```bash
brew install trufflehog
```

**Using Docker:**

```bash
docker pull trufflesecurity/trufflehog:latest
```

**Using Go:**

```bash
go install github.com/trufflesecurity/trufflehog/v3@latest
```

#### Usage

**Scan the entire repository:**

```bash
trufflehog filesystem . --only-verified
```

**Scan uncommitted changes:**

```bash
git diff | trufflehog --only-verified --no-update
```

**Scan a specific commit:**

```bash
trufflehog git file://. --since-commit HEAD~1 --only-verified
```

#### Pre-commit Hook (Recommended)

Add a pre-commit hook to automatically scan before each commit:

```bash
# Create .husky/pre-commit-secrets file
cat > .husky/pre-commit-secrets << 'EOF'
#!/bin/sh
if command -v trufflehog >/dev/null 2>&1; then
  git diff --staged | trufflehog --only-verified --no-update
  if [ $? -ne 0 ]; then
    echo "Secret detected! Commit blocked."
    exit 1
  fi
fi
EOF

chmod +x .husky/pre-commit-secrets
```

Then modify `.husky/pre-commit` to include:

```bash
.husky/pre-commit-secrets
```

### What to Do If Secrets Are Found

If you accidentally commit a secret:

1. **Rotate the secret immediately** - assume it's compromised
2. **Remove it from git history** using tools like:
   - `git filter-branch`
   - [BFG Repo-Cleaner](https://rtyley.github.io/bfg-repo-cleaner/)
   - `git-filter-repo`
3. **Force push** the cleaned history (coordinate with team first)
4. **Update all dependent systems** with the new secret

### Best Practices

- Store secrets in environment variables or secret management tools
- Use `.env` files for local development (already in `.gitignore`)
- Never commit `.env` files, API keys, tokens, or credentials
- Use GitHub Secrets for CI/CD workflows
- Review code carefully before committing

## Questions?

If you have questions about contributing:

- Check existing [GitHub Discussions](../../discussions)
- Open a new discussion
- Ask in the relevant issue thread

## License

By contributing to Honeymelon, you agree that your contributions will be licensed under Honeymelon's Proprietary License and become the property of Jerome Thayananthajothy.

---

Thank you for contributing to Honeymelon!
