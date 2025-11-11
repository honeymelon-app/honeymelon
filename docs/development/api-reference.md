# API Reference

This page explains how to generate and publish API documentation for both the TypeScript (frontend) and Rust (backend) portions of Honeymelon.

Honeymelon treats API documentation as a build artefact rather than committed output. The generated files live under `reference/api/` in the project root and are rebuilt whenever the public API changes.

## TypeScript Reference (TypeDoc)

We use [TypeDoc](https://typedoc.org/) so the public surface area of the Vue/TypeScript code stays discoverable.

### Generate documentation

```bash
npm run docs:api:ts
```

The command reads configuration from `typedoc.json` and emits Markdown documentation to `reference/api/typescript`. The configuration expands the modules under `src/lib`, `src/composables`, `src/stores`, `src/repositories`, and `src/services`, ignores private/internal members, and groups output by namespace.

### Publish or preview

- When working locally, open `reference/api/typescript/index.html` (or the Markdown files if using another presenter).
- For VitePress, you can symlink or copy the generated Markdown into the documentation site before running `npm run docs:build` if you want to publish the reference.

> **Tip:** Run `npm run docs:api:ts` as part of the release checklist whenever you change exported types or composables.

## Rust Reference (rustdoc)

Rust documentation is generated via `cargo doc` from the `src-tauri` workspace. We surface only public items to avoid leaking implementation details from the Tauri backend.

### Generate documentation

```bash
npm run docs:api:rust
```

The script runs `cargo doc --no-deps --workspace` inside `src-tauri/`, producing HTML output under `src-tauri/target/doc/`. Open `src-tauri/target/doc/honeymelon/index.html` in a browser to explore the API.

### CI integration

- `npm run docs:api` executes both TypeDoc and rustdoc generation and is safe to call in CI before publishing artefacts.
- If you host documentation, publish the contents of `reference/api/typescript/` and `src-tauri/target/doc/`. For GitHub Pages, you can copy both trees into the published branch or upload as build artefacts.

## Maintenance checklist

1. Ensure new public modules export the types and functions you intend to document.
2. Prefer `/** ... */` JSDoc or Rustdoc comments so the generated reference contains helpful descriptions.
3. Keep `typedoc.json` and the `docs:api:*` scripts aligned with the project structure as the codebase grows.
4. Consider automating publication in CI once the documentation cadence stabilises.
