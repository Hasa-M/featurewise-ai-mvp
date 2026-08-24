# Featurewise

Featurewise is a **Specification Analysis Engine for software product development**.

It analyzes feature specifications and their surrounding product context before implementation begins, identifying issues that could lead to developer interruptions, rework, delayed decisions, or incorrect implementations.

Featurewise looks for problems such as:

- missing information;
- ambiguous requirements;
- inconsistencies across sources;
- undefined edge cases or states;
- unresolved product decisions;
- requirements that are difficult to verify or test;
- conflicts between a proposed feature and the existing product.

For each relevant finding, Featurewise aims to explain:

- **what is wrong or missing;**
- **why it matters;**
- **the evidence supporting the finding;**
- **how the issue could be resolved practically.**

The goal is simple:

> **Find expensive ambiguity before implementation starts.**

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

## Core workflow

```text
Feature specification
        +
Product context
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
        validated product intent
                  ↓
       Humans / Codex / Claude /
       Cursor / other agents
```

## Analysis output

```text
Finding
├── category
├── severity
├── description
├── why it matters
├── evidence
├── suggested resolutions
└── review state
```
