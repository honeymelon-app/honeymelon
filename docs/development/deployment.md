# Deployment Checklist

This checklist describes the production release pipeline for Honeymelon desktop builds. Work through each section before distributing a new version to customers.

## 1. Versioning & Changelog

- [ ] Ensure `package.json` and `src-tauri/tauri.conf.json` contain the target semantic version.
- [ ] Run `npm run changelog` to append release notes and review the output.
- [ ] Confirm `CHANGELOG.md` highlights user-facing changes, migration notes, and known issues.

## 2. Source Control Hygiene

- [ ] All feature branches merged; `main` is green in CI.
- [ ] Tags from the prior release exist and match published binaries.
- [ ] `git status` is clean and submodules (if any) are up to date.

## 3. Build Artefacts

- [ ] Install dependencies (`npm ci`).
- [ ] Generate API documentation (`npm run docs:api`).
- [ ] Build the frontend bundle (`npm run build`).
- [ ] Produce the Tauri binary (`npm run tauri:build`).
- [ ] Verify the macOS bundle contents under `src-tauri/target/release/bundle/`.

## 4. Signing, Notarisation, and Packaging

- [ ] Codesign the `.app` bundle with the production Apple Developer certificate.
- [ ] Notarise the bundle using Apple notarisation tools and staple the ticket.
- [ ] Re-sign FFmpeg/FFprobe binaries if they changed since the last release.
- [ ] Verify the DMG background, license, and volume icon are correct.

## 5. QA & Testing

- [ ] Run automated checks: `npm run lint`, `npm run test:unit`, `npm run test:e2e`.
- [ ] Execute smoke tests on a clean macOS machine (launch, conversion flow, presets, licensing).
- [ ] Capture screenshots or screen recordings for release notes if UI changed.
- [ ] Validate automatic updates (if applicable) on a previous-version build.

## 6. Documentation & Support

- [ ] Publish updated documentation (`npm run docs:build`) and deploy to hosting.
- [ ] Update `docs/ROADMAP.md` if release scope shifted.
- [ ] Notify support team of changes, migration steps, and known issues.
- [ ] Prepare FAQ or troubleshooting entries for high-risk features.

## 7. Distribution

- [ ] Upload the notarised DMG to the distribution channel (e.g. Gumroad, internal S3, TestFlight alternative).
- [ ] Update release metadata (title, description, version) and attach checksums.
- [ ] Publish GitHub release with binaries, changelog excerpt, and verification steps.
- [ ] Announce release via the agreed marketing/support channels.

## 8. Post-release Monitoring

- [ ] Enable crash/telemetry dashboards and monitor for regressions.
- [ ] Track support tickets and triage within the defined SLA.
- [ ] Schedule a retrospective to capture improvements for the next cycle.

Maintain this document alongside the build scripts. Update it whenever the release pipeline changes so the team always has a current production checklist.
