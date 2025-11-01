# Contributing to Honeymelon

Thank you for your interest in contributing to Honeymelon! This guide will help you get started with development and explain our contribution workflow.

## Code of Conduct

We are committed to providing a welcoming and inclusive environment. Please be respectful and constructive in all interactions.

## Getting Started

### Prerequisites

Before you begin, ensure you have:

- **macOS 13.0+** (Ventura or later)
- **Apple Silicon Mac** (M1, M2, M3, M4)
- **Node.js 18+** and npm
- **Rust** (latest stable)
- **Xcode Command Line Tools**

### Initial Setup

1. **Fork the repository** on GitHub

2. **Clone your fork**:

   ```bash
   git clone https://github.com/honeymelon-app/honeymelon.git
   cd honeymelon
   ```

3. **Install dependencies**:

   ```bash
   npm install
   ```

4. **Verify setup**:
   ```bash
   npm run tauri:dev
   ```

The app should launch successfully.

## Development Workflow

### Branch Strategy

- `main`: Stable, production-ready code
- `develop`: Integration branch for features (if used)
- `feature/feature-name`: Individual features
- `fix/bug-description`: Bug fixes

### Creating a Feature

1. **Create a branch**:

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make changes** with frequent commits:

   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

3. **Keep updated**:

   ```bash
   git fetch origin
   git rebase origin/main
   ```

4. **Push and create PR**:
   ```bash
   git push origin feature/your-feature-name
   ```

### Commit Messages

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**:

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting, no code change
- `refactor`: Code change without adding feature or fixing bug
- `perf`: Performance improvement
- `test`: Adding tests
- `chore`: Maintenance tasks

**Examples**:

```bash
feat(jobs): add pause/resume functionality
fix(ffmpeg): handle spaces in file paths
docs(architecture): update pipeline diagram
test(stores): add job state transition tests
```

## Project Structure

```
honeymelon/
├── src/                    # Vue frontend
│   ├── app.vue            # Root component
│   ├── lib/               # Core logic
│   ├── stores/            # Pinia stores
│   ├── composables/       # Vue composables
│   └── components/        # Vue components
│
├── src-tauri/             # Rust backend
│   ├── src/
│   │   ├── lib.rs        # Main entry
│   │   ├── ffmpeg_*.rs   # FFmpeg integration
│   │   └── ...
│   └── Cargo.toml        # Rust dependencies
│
├── docs/                  # Documentation
├── e2e/                   # E2E tests
└── public/                # Static assets
```

## Code Style

### TypeScript/Vue

We use ESLint and Prettier:

```bash
# Check linting
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
```

**Key conventions**:

- Use `<script setup lang="ts">` for components
- Prefer `const` over `let`
- Use type inference when possible
- Name components in PascalCase
- Use kebab-case for file names

**Example**:

```vue
<script setup lang="ts">
import { ref, computed } from 'vue';

interface Props {
  title: string;
  count?: number;
}

const props = withDefaults(defineProps<Props>(), {
  count: 0,
});

const doubled = computed(() => props.count * 2);
</script>
```

### Rust

We use Clippy and rustfmt:

```bash
# Check Rust code
npm run lint:rust

# Format Rust code
npm run format:rust
```

**Key conventions**:

- Follow Rust API guidelines
- Use `Result<T, E>` for error handling
- Prefer `async/await` over callbacks
- Document public APIs with `///` comments

**Example**:

```rust
/// Probes a media file using FFprobe
///
/// # Arguments
///
/// * `file_path` - Path to the media file
///
/// # Returns
///
/// * `Ok(ProbeResult)` - Parsed metadata
/// * `Err(String)` - Error message
pub async fn probe_media(file_path: &str) -> Result<ProbeResult, String> {
    // Implementation
}
```

## Testing

### Frontend Tests

**Run unit tests**:

```bash
npm run test:unit
```

**Watch mode**:

```bash
npm run test:unit:watch
```

**Coverage**:

```bash
npm run test:unit:coverage
```

**Writing tests**:

```typescript
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import JobQueueItem from '@/components/JobQueueItem.vue';

describe('JobQueueItem', () => {
  it('renders job information', () => {
    const wrapper = mount(JobQueueItem, {
      props: {
        job: {
          id: '1',
          status: 'queued',
          sourceFile: '/path/to/file.mp4',
        },
      },
    });

    expect(wrapper.text()).toContain('file.mp4');
  });
});
```

### Backend Tests

**Run Rust tests**:

```bash
cd src-tauri
cargo test
```

**Writing tests**:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_ffprobe_output() {
        let json = r#"{"format": {"duration": "10.5"}}"#;
        let result = parse_probe_result(json).unwrap();
        assert_eq!(result.duration, 10.5);
    }

    #[tokio::test]
    async fn test_async_function() {
        let result = probe_media("test.mp4").await;
        assert!(result.is_ok());
    }
}
```

### E2E Tests

**Run E2E tests**:

```bash
npm run test:e2e
```

**UI mode**:

```bash
npm run test:e2e:ui
```

**Writing E2E tests**:

```typescript
import { test, expect } from '@playwright/test';

test('converts a video file', async ({ page }) => {
  await page.goto('http://localhost:1420');

  // Add file to queue
  await page.click('[data-testid="add-file"]');
  // ... interact with app

  await expect(page.locator('.job-completed')).toBeVisible();
});
```

## Pull Request Process

### Before Submitting

1. **Update tests**: Add/update tests for your changes
2. **Run linters**: `npm run lint` and `npm run lint:rust`
3. **Run tests**: `npm run test`
4. **Update docs**: Document new features or API changes
5. **Test manually**: Ensure the app works as expected

### PR Checklist

- [ ] Code follows style guidelines
- [ ] Tests pass locally
- [ ] New features have tests
- [ ] Documentation is updated
- [ ] Commit messages follow convention
- [ ] No console errors or warnings
- [ ] PR description explains changes

### PR Template

```markdown
## Description

Brief description of changes

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing

How was this tested?

## Screenshots

If applicable

## Related Issues

Closes #123
```

### Review Process

1. **Automated checks** must pass (linting, tests)
2. **Code review** by maintainer(s)
3. **Changes requested** (if needed)
4. **Approval** from maintainer
5. **Merge** to main branch

## Development Guidelines

### Adding a New Feature

1. **Plan**: Discuss the feature in an issue first
2. **Design**: Consider architecture and user experience
3. **Implement**: Write code with tests
4. **Document**: Update relevant documentation
5. **Review**: Submit PR for review

### Fixing a Bug

1. **Reproduce**: Ensure you can reproduce the bug
2. **Write test**: Create a failing test that demonstrates the bug
3. **Fix**: Implement the fix
4. **Verify**: Ensure the test passes
5. **Submit**: Create PR with fix

### Refactoring

1. **Tests first**: Ensure existing tests pass
2. **Small changes**: Make incremental refactorings
3. **Test coverage**: Maintain or improve test coverage
4. **Document**: Explain why the refactor was needed

## Common Tasks

### Adding a New Preset

1. Edit [src/lib/presets.ts](../../src/lib/presets.ts)
2. Add preset definition
3. Add tests for the preset
4. Update documentation

### Adding a New Codec

1. Update [src/lib/container-rules.ts](../../src/lib/container-rules.ts)
2. Add codec compatibility rules
3. Update capability detection if needed
4. Add tests
5. Update supported formats documentation

### Updating Dependencies

**Frontend**:

```bash
npm update
npm audit fix
```

**Backend**:

```bash
cd src-tauri
cargo update
cargo audit
```

**Verify**:

```bash
npm run test
npm run build
```

## Debugging

### Frontend Debugging

**Browser DevTools**:

- Press `Cmd + Option + I` in the app
- Use Vue DevTools extension
- Check console for errors

**VS Code**:

```json
{
  "type": "chrome",
  "request": "launch",
  "name": "Debug Honeymelon",
  "url": "http://localhost:1420",
  "webRoot": "${workspaceFolder}/src"
}
```

### Backend Debugging

**Rust debugging**:

```rust
// Add debug prints
println!("Debug: {:?}", value);

// Or use dbg! macro
dbg!(value);
```

**Logs**:

```bash
# Run with debug logging
RUST_LOG=debug npm run tauri:dev
```

## Getting Help

- **Documentation**: Check our [docs](https://docs.honeymelon.app)
- **Issues**: Search existing issues on GitHub
- **Discussions**: Start a discussion for questions
- **Email**: tjthavarshan@gmail.com

## Resources

- [Tauri Documentation](https://tauri.app/v1/guides/)
- [Vue 3 Documentation](https://vuejs.org/)
- [Rust Book](https://doc.rust-lang.org/book/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [FFmpeg Documentation](https://ffmpeg.org/documentation.html)

## License

By contributing, you agree that your contributions will be licensed under the same license as the project (Proprietary).
