# Architectural Decision Records

Architectural Decision Records (ADRs) capture the context, decision, and consequences behind significant technical choices in Honeymelon. Each ADR lives in this folder with a sequential identifier so we can track the evolution of the architecture.

## When to create an ADR

Create a new ADR when you:

- Introduce or replace a major dependency (FFmpeg build variants, state management libraries, CI providers).
- Change architectural boundaries (splitting Tauri commands, reorganising planners/builders, altering persistence layers).
- Modify security or privacy posture (capability ACLs, filesystem access, data retention policies).
- Commit to cross-cutting conventions that affect future work (error handling strategy, logging/tracing, job orchestration).

Minor refactors, bug fixes, or purely cosmetic changes usually do **not** require an ADR.

## File naming convention

Use the pattern `NNNN-short-title.md`, where `NNNN` is the next sequential number (zero-padded). Example:

```
adr/
├── 0001-initial-architecture.md
├── 0002-job-orchestrator-design.md
└── README.md
```

Keep titles short, descriptive, and lowercase with hyphens.

## Template

Create new ADRs by copying the template below.

```markdown
---
status: proposed | accepted | superseded | rejected
created: YYYY-MM-DD
authors: [Name]
---

# Title (Decision Summary)

## Context

Describe the problem or forces that led to this decision. Mention relevant constraints, stakeholders, and previous attempts.

## Decision

State the decision clearly. Explain the chosen approach and the key reasons for selecting it over the alternatives.

## Consequences

- Positive outcomes that result from this decision.
- Potential drawbacks, risks, or follow-up tasks.

## Alternatives Considered

- Option A — Why it was rejected.
- Option B — Why it was rejected.

## References

- Links to issues, PRs, design docs, benchmarks, or external resources.
```

## Index

Maintain the running index here whenever a new ADR is added.

| ID  | Title | Status | Date |
| --- | ----- | ------ | ---- |
| —   | —     | —      | —    |

Update the table with each new ADR so the documentation site references every decision chronologically.
