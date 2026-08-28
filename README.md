# Featurewise

Featurewise is a **Specification Analysis Engine for software product development**.

It analyzes a feature and its surrounding product and business context before implementation begins, identifying issues that could lead to rework, developer interruptions, delayed decisions, incorrect implementations, or avoidable product risk.

Featurewise does not evaluate a specification in isolation.

It is designed to reason across the available information that defines how the product is expected to behave, including:

- feature specifications;
- requirements and acceptance criteria;
- product documentation;
- design artifacts;
- project files;
- previous feature decisions and history;
- existing product behavior;
- source code, when relevant;
- business rules and domain constraints;
- organization-specific policies, standards, and conventions.

In the local-first MVP, this information enters Featurewise through the feature
specification, editable feature and project context, and uploaded or pasted
artifacts. Dedicated repository and third-party source adapters remain future
capabilities.

This allows Featurewise to identify not only problems inside a specification, but also problems that emerge when a proposed feature conflicts with the wider product, business logic, or organizational rules.

Featurewise looks for problems such as:

- missing information;
- ambiguous requirements;
- inconsistencies across sources;
- undefined edge cases, states, or behaviors;
- unresolved product decisions;
- requirements that are difficult to verify or test;
- assumptions left implicitly to developers;
- conflicts between a proposed feature and the existing product;
- violations of established business rules;
- conflicts with organization-specific policies or product conventions;
- behavior that is locally reasonable but inconsistent with previous product decisions.

For each relevant finding, Featurewise aims to provide:

- **what is wrong or missing;**
- **why it matters;**
- **the evidence supporting the finding;**
- **the relevant product, business, or policy context;**
- **severity and useful verification metadata;**
- **confidence only where evaluation shows that it is calibrated and useful;**
- **practical ways to resolve the issue.**

The goal is simple:

> **Find expensive ambiguity and inconsistency before implementation starts.**

## The engine is the product

Featurewise is designed as infrastructure rather than as a standalone product-management application.

The Specification Analysis Engine is the core capability.

It is intended to be consumable through different interfaces and workflows:

- API;
- CLI;
- AI-agent protocols and tools;
- integrations with systems such as Jira, Linear, GitHub, Figma, Azure DevOps, and others;
- the first-party Featurewise Console.

The **Featurewise Console** is the control interface provided by Featurewise for teams that want a richer way to manage context, inspect analyses, review evidence, resolve findings, configure behavior, and inspect analysis history.

The Console is one interface to the engine, not the engine itself.

The engine/application boundary is adapter-neutral. Future API, CLI, agent,
integration, or embedded clients must call the same analysis capability rather
than own separate product logic.

## Core workflow

```text
Feature specification
        +
Relevant product, technical,
business, and organizational context
        ↓
Specification Analysis Engine
        ↓
Evidence-backed findings
        ↓
Human or AI review / resolution
        ↓
Implementation
```

## Product direction

```text
Jira / Linear / Docs / Figma / Code
                  ↓
             Featurewise
                  ↓
         analyzed product intent
      and evidence-backed findings
                  ↓
       Humans / Codex / Claude /
       Cursor / other agents
```

## MVP boundary

The MVP is complete when a user can provide a software feature specification
plus relevant context, run analysis, receive a small set of structured and
evidence-backed findings, understand why they matter, and record whether each
finding is accepted, dismissed, resolved, or deferred.

Featurewise does not generate or maintain the canonical specification. It does
not become the customer's requirements system of record, and it does not add
real Jira, GitHub, Figma, or similar integrations in the local-first MVP.

## Current implementation state

The accepted target architecture is defined by
[ADR-0030](docs/architecture/adr/ADR-0030-specification-analysis-core-domain.md),
[ADR-0031](docs/architecture/adr/ADR-0031-feature-specifications-and-traceable-analysis-inputs.md),
and
[ADR-0032](docs/architecture/adr/ADR-0032-analysis-application-boundary-and-lifecycle.md).

The repository is being migrated to that model in reviewable phases. The
current runtime still contains pre-refactor generated-spec terminology and
does not yet contain an analyzer, analysis execution endpoints, or a working
findings workflow. Architecture documentation describes the accepted target;
the tracked
[refactor plan](docs/architecture/specification-analysis-refactor-plan.md)
records implementation progress.
