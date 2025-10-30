# Testing Quick Reference

Quick reference for running tests and checks in Honeymelon.

## Quick Start

```bash
# First time setup
npm install
npm run prepare
npx playwright install

# Daily development
npm run test:unit:watch    # Keep running while coding
```

## Test Commands

### Unit Tests

```bash
npm run test:unit              # Run once
npm run test:unit:watch        # Watch mode (recommended for dev)
npm run test:unit:ui           # Interactive UI
npm run test:unit:coverage     # With coverage report
```

### E2E Tests

```bash
npm run test:e2e               # Run once
npm run test:e2e:ui            # Interactive UI
npm run test:e2e:debug         # Step-by-step debugging
```

### All Tests

```bash
npm test                       # Run both unit and E2E tests
```

## Code Quality

### Linting

```bash
npm run lint                   # Lint all code
npm run lint:js                # Lint JS/TS/Vue only
npm run lint:rust              # Lint Rust only
npm run lint:fix               # Auto-fix issues
```

### Formatting

```bash
npm run format                 # Format all code
npm run format:js              # Format JS/TS/Vue only
npm run format:rust            # Format Rust only
npm run format:check           # Check formatting without changes
```

### Type Checking

```bash
npm run type-check             # TypeScript type check
```

## Pre-commit Hooks

Pre-commit hooks run automatically on `git commit`:

- ESLint (auto-fix)
- Prettier (auto-format)
- Rust fmt

### Bypass Hooks (not recommended)

```bash
git commit --no-verify
```

## Before Submitting PR

```bash
npm run lint
npm run format:check
npm run type-check
npm test
```

Or just commit and let pre-commit hooks handle it!

## Troubleshooting

### Hooks not running

```bash
npm run prepare
chmod +x .husky/pre-commit
```

### Playwright errors

```bash
npx playwright install
```

### Test failures

```bash
npm run test:unit:ui       # Interactive debugging
npm run test:e2e:debug     # E2E step-by-step
```

## More Info

- Full testing guide: [TESTING.md](../TESTING.md)
- E2E testing: [e2e/README.md](../e2e/README.md)
- Contributing: [CONTRIBUTING.md](../CONTRIBUTING.md)
