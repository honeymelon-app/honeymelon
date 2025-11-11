---
title: Architectural Decision Records (ADRs)
description: Guidelines for Architectural Decision Records used to document major technical decisions
editLink: false
---

# Architectural Decision Records (ADRs)

This page provides an introduction to Architectural Decision Records (ADRs) used in the Honeymelon project. ADRs document important technical decisions made during development, including the context, rationale, and consequences.

## What are ADRs?

An **Architectural Decision Record** is a short document that captures a single architectural decision. It describes:

1. **Context** – The issue or situation requiring a decision
2. **Decision** – What was chosen and why
3. **Consequences** – Benefits, drawbacks, and implications

ADRs help future developers (including your future self) understand the **reasoning** behind design choices, not just what was built.

::: tip Why Use ADRs?
ADRs create a searchable, time-stamped record of decisions that can be referenced years later. They prevent "why did we do this?" questions and make it easier to revisit and potentially reverse decisions with understanding.
:::

## When to Create an ADR

Create an ADR when you:

- Introduce or replace a **major dependency** (FFmpeg builds, state libraries, CI tooling)
- Change **architectural boundaries** (new Tauri commands, planner layout, persistence model)
- Modify the application's **security or privacy posture** (capability ACLs, filesystem access, retention policies)
- Commit to **cross-cutting conventions** that future work must honour (error handling, logging, orchestration strategy)

Routine bug fixes, cosmetic tweaks, or minor refactors usually do **not** need an ADR.

## Naming & Location

Store ADR files in `docs/adr/` using the pattern `NNNN-short-title.md`, where `NNNN` is the next zero-padded number:

```
docs/adr/
├── 0001-initial-architecture.md
├── 0002-job-orchestrator-design.md
└── 0003-new-dependency-policy.md
```

Keep titles concise, lowercase, and hyphen-separated so URLs remain friendly.

## How to Propose a New ADR

1. **Create** `docs/adr/NNNN-short-title.md` using the next sequential number
2. **Write** following the [ADR template](#adr-template-format) below
3. **Submit** as a pull request with title: `docs: add ADR-NNNN: Your Decision Title`
4. **Discuss** in code review—incorporate feedback
5. **Accept** and merge once approved
6. **Update** the ADR index table at the end of this page with the new entry

## ADR Template Format

Use the following template for new ADRs:

```markdown
---
status: proposed | accepted | superseded | rejected
created: YYYY-MM-DD
authors: [Name]
---

# NNNN. Short Title (Imperative Mood)

## Context

Describe the problem or forces that led to this decision. Include constraints, stakeholders, and previous attempts.

## Decision

State the decision clearly. Explain the chosen approach and why it beat the alternatives.

## Consequences

- Positive outcomes that result from this decision
- Potential drawbacks, risks, or follow-up tasks

## Alternatives Considered

- Option A — why it was rejected
- Option B — why it was rejected

## References

- Links to issues, PRs, benchmarks, design docs, or external resources
```

## ADR Best Practices

### Writing ADRs

- **Be concise** – Aim for 1-2 pages maximum
- **Use clear language** – Avoid jargon; explain trade-offs
- **Document decisions, not implementation** – Focus on "why," not "how"
- **Consider alternatives** – Show what you decided against and why
- **Include metrics** – Reference benchmarks or performance data if relevant

### Reviewing ADRs

- Ensure context clearly explains the problem
- Verify the decision is well-reasoned
- Check that consequences are realistic
- Confirm it doesn't contradict existing decisions
- Suggest improvements respectfully

### Maintaining ADRs

- **Don't modify accepted ADRs** – Create a new ADR to supersede
- **Mark superseded ADRs** – Update status and link to replacement
- **Keep links current** – Update cross-references when ADRs change
- **Deprecate outdated ADRs** – Mark as deprecated with explanation

## Example ADR

Here's a realistic example:

```markdown
# 001. Use Tauri for Desktop Framework

Date: 2024-10-15

## Status

Accepted

## Context

We needed to build a native macOS application for media conversion. Key requirements:

- Cross-platform potential (though targeting macOS first)
- Direct FFmpeg integration for media processing
- Native performance and integration with macOS
- Small bundle size for distribution
- Active maintenance and community support

Alternatives considered:

- Electron (larger bundle, less performant)
- SwiftUI (macOS-only, different tech stack)
- Qt (C++ dependency, more complex)

## Decision

We chose Tauri 2.x as our desktop framework because:

- Lightweight wrapper around system WebView (smaller bundle)
- Rust backend provides type safety and performance
- Excellent IPC for communicating with FFmpeg processes
- Strong async/await support via Tokio
- Clear separation of concerns (Vue frontend, Rust backend)

## Consequences

**Positive**:

- Smaller app size (~50MB vs 200MB+ for Electron)
- Fast startup and responsive UI
- Type-safe backend with Rust
- Good documentation and community support

**Negative**:

- Smaller ecosystem than Electron
- Fewer off-the-shelf UI components initially
- Rust learning curve for new developers

**Risks**:

- Tauri project evolution could impact stability
- Mitigation: Stay current with releases and monitor community
```

## ADR Index

Track every decision chronologically in this index. Update it whenever a new ADR is accepted.

| ID  | Title | Status | Date |
| --- | ----- | ------ | ---- |
| —   | —     | —      | —    |

## References & Resources

Learn more about ADRs:

- **Original ADR Format**: [Documenting Architecture Decisions](https://adr.github.io/) by Michael Nygard
- **ADR Templates**: [GitHub - ADR Template](https://github.com/adr/adr-template)
- **Examples**: Many open-source projects maintain ADR directories—search GitHub for "docs/adr"
- **Decision-Making**: [RACI Matrix](https://en.wikipedia.org/wiki/Responsibility_assignment_matrix) for decision ownership

## Related Architecture Documentation

For other architecture information, see:

- **[Architecture Overview](./overview.md)** – System design summary
- **[Pipeline Architecture](./pipeline.md)** – Probe → Plan → Execute workflow
- **[Technical Stack](./tech-stack.md)** – Technology choices overview
- **[State Management](./state.md)** – Job state machine design

**Questions about ADRs?** See the [original ADR format guide](https://adr.github.io/) or start a discussion in [GitHub Discussions](https://github.com/honeymelon-app/honeymelon/discussions).

**Last Updated**: November 2025
