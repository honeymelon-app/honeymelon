---
title: Repository Guidelines
description: Coding, testing, and security expectations for contributors and automation agents working on Honeymelon.
---

# Repository Guidelines

## Project Structure & Module Organization

Honeymelon pairs a Vue 3 frontend with a Tauri shell. `src/main.ts` bootstraps `app.vue`, with UI pieces in `src/components` and shared ffmpeg logic in `src/lib`. Static assets stay in `src/assets`; files served untouched belong in `public`. The Rust backend lives in `src-tauri/src`, with config and capability manifests in `tauri.conf.json` and `src-tauri/capabilities`.

## Build, Test, and Development Commands

- `npm install` — install dependencies using the tracked `package-lock.json`.
- `npm run dev` — start the Vite server for UI iteration.
- `npm run tauri dev` — run the desktop app with live reload.
- `npm run build` — type-check (`vue-tsc`) and emit production assets to `dist/`.
- `npm run tauri build` — compile the macOS bundle for distribution.

## Coding Style & Naming Conventions

Use TypeScript with Vue `<script setup>`. Keep 2-space indentation and group imports external → local. Name components and composables in PascalCase, utility modules in `src/lib` as kebab-case, and keep Tailwind classes grouped layout → spacing → color. Rust modules stay snake_case and expose Tauri commands with concise doc comments when behavior is non-obvious.

## Testing Guidelines

- Frontend unit suites live under `src/**/__tests__` and run with `npm run test:unit` (Vitest + happy-dom). Always run `npm run download-ffmpeg` first or set `HONEYMELON_FFMPEG_PATH` so planner/orchestrator tests can probe binaries.
- Orchestrator specs use a teardown helper—import it when spinning up `useJobOrchestrator` to avoid leaking mocked `listen` handles.
- Rust code requires inline `#[cfg(test)]` blocks plus `cargo test` (run from `src-tauri`). Use `cargo test -- --nocapture` when debugging FFmpeg fixtures.
- End-to-end coverage uses Playwright in `e2e/tests`; execute with `npm run test:e2e` while `npm run tauri dev` is serving the desktop shell.
- CI enforces `npm run lint`, `npm run type-check`, `npm run test:unit`, `npm run build`, and `cargo test`—mirror that locally before opening a PR.

## Commit & Pull Request Guidelines

Prefer Conventional Commit style (`feat:`, `fix:`, `chore:`) with imperative verbs and note affected presets or codecs. Keep commits focused and ensure `npm run build` stays clean before pushing. Pull requests must describe user impact, list manual verification steps, attach UI captures when visuals change, and link issues or configuration follow-ups (for example, signing or `tauri.conf.json`).

## Security & Configuration Tips

Do not commit signing secrets, local certificates, or custom FFmpeg binaries. Store temporary credentials in your keychain or an ignored `.env`. Call out new environment variables or capability files in PRs, and redact personal paths or media details from shared logs.
