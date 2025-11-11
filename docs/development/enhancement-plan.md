---
title: Codebase Enhancement Plan
description: Multi-phase roadmap for raising Honeymelon code quality, testing coverage, and automation maturity
editLink: false
---

**Objective:** Raise quality from **B+ (85/100)** to **A+ (95/100)** by closing gaps in testing, legal docs, automation, and project management.
**Timeline:** ~8 weeks for all critical + high-priority items.

---

## At-a-Glance Timeline

| Phase | Focus                     | Window    |
| ----: | ------------------------- | --------- |
|     1 | Critical Foundation       | Weeks 1–2 |
|     2 | Testing Coverage          | Weeks 3–4 |
|     3 | Code Quality & Automation | Weeks 5–6 |
|     4 | Documentation & API       | Weeks 7–8 |
|     5 | Advanced (Optional)       | Week 9+   |

---

## Phase 1 — Critical Foundation (Weeks 1–2) ✅ COMPLETE

### Legal & Documentation ✅

- [x] **`BUILD.md`** — Complete build/signing/notarization guide (17KB)
- [x] **`EULA.md`** — End-user license for commercial distribution (15KB)
- [x] **`PRIVACY.md`** — Privacy policy (11KB)
- [x] **License consistency** — Fixed MIT references in `CONTRIBUTING.md` line 378
- [x] **`third-party-notices.md`** — Fixed date typo (2025-10-30 → 2024-10-30)
- [x] **`.github/SUPPORT.md`** — Support channels and SLAs (5.9KB)

### Git & Repository ✅

- [x] **`.gitattributes`** — Line endings, diff behavior, binary files configured
- [x] **Branch protection** — Documented required settings in `CONTRIBUTING.md`

### CI/CD Critical Fixes ✅

- [x] **Coverage gates are blocking** — Added coverage threshold check (fails if < 80%)
- [x] **E2E tests are blocking** — Removed `continue-on-error: true` from `ci.yml`
- [x] **Security audits are blocking** — Removed `|| true` from npm/cargo audit
- [x] **CodeQL** — Created `.github/workflows/codeql.yml` for security scanning

### VitePress Integration ✅

- [x] **Updated config** — Added Roadmap, Support, Privacy, EULA, ADR, Build to navigation
- [x] **Created pages** — 6 new VitePress docs pages linking to root documentation
- [x] **`docs/ROADMAP.md`** — Version roadmap through 2.0+ (12KB)
- [x] **`docs/adr/README.md`** — ADR template and guidelines (6.3KB)

---

## Phase 2 — Testing Coverage (Weeks 3–4)

**Goal:** Lift coverage from **34.82% → 80%+**

### Unit & Integration

- [ ] **Vue composables** — Tests for `use-job-orchestrator`, `use-app-orchestration` (**0% → covered**)
- [ ] **`ffmpeg-probe`** — Add unit tests (**0% → covered**)
- [ ] **`error-handler`** — Add unit tests (**0% → covered**)
- [ ] **Capabilities** — Improve tests (**~20% → higher**)
- [ ] **File discovery** — Improve tests (**~18% → higher**)
- [ ] **E2E scaffolds** — Convert **200+** placeholders to real tests
- [ ] **Rust integration tests** — Backend integration suite

### Test Infrastructure

- [ ] **Perf benchmarks** — Automated performance regression detection
- [ ] **Docs** — `docs/development/testing.md` (how to run, debug, write tests)

---

## Phase 3 — Code Quality & Automation (Weeks 5–6)

### Code Quality

- [ ] **commitlint** — Enforce Conventional Commits (pre-commit hook)
- [ ] **eslint-plugin-import** — Import ordering rules
- [ ] **Stricter TypeScript** — `no-explicit-any: error`
- [ ] **ts-prune** — Detect/remove unused exports
- [ ] **Complexity budgets** — `max-complexity`, `max-lines`, etc.

### Automation

- [ ] **Bundle size tracking** — `size-limit` in CI
- [ ] **Changelog automation** — `conventional-changelog`
- [ ] **semantic-release** — Auto version bumps/tags
- [ ] **git-secrets** — Block accidental secret commits
- [ ] **Stale bot** — Auto-close inactive issues/PRs

---

## Phase 4 — Documentation & API (Weeks 7–8)

### Documentation

- [ ] **API docs** — TypeDoc (TS) + `rustdoc` (Rust)
- [ ] **ADRs** — `docs/adr/` for architectural decisions
- [ ] **`ROADMAP.md`** — Public feature roadmap
- [ ] **Commercial license template** — For paid distribution
- [ ] **`SUPPORT.md`** — Support policy & channels
- [ ] **Deployment guide** — Production checklist

### GitHub Project Hygiene

- [ ] **`FUNDING.yml`** — Configure or remove if unused
- [ ] **Issue templates** — Docs, performance, security
- [ ] **Projects board** — Milestones & tracking

---

## Phase 5 — Advanced (Optional, Week 9+)

### Advanced Testing

- [ ] **Visual regression** — Percy/Chromatic for UI diffs
- [ ] **Security test suite** — Dedicated coverage
- [ ] **3rd-party security audit** — Pen-test for 1.0

### Advanced Tooling

- [ ] **SonarCloud / CodeClimate** — Code quality dashboard
- [ ] **Feature flags** — Gradual rollouts
- [ ] **Beta/Alpha channels** — Pre-release distribution
- [ ] **Dependabot** — Auto-merge safe updates

---

## Success Metrics

- **Testing:** Coverage **34.82% → 80%+**
- **CI/CD:** All checks blocking; no `continue-on-error`
- **Legal:** EULA, Privacy Policy, copyright
- **Docs:** `BUILD.md`, API docs, ADRs, `ROADMAP.md`
- **Security:** CodeQL on; audits blocking; `git-secrets` active
- **Code Quality:** commitlint, import ordering, stricter TS

---

## Notes

- **Risk:** Coverage & E2E stabilization may surface flakiness—prioritize deterministic tests.
- **Dependency:** Legal templates may require brief review by counsel prior to release.
