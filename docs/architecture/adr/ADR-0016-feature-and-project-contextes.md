# ADR-017: Model Context as Feature and Project Context Artifacts

Date: 2026-06-04

Status: accepted

## Context

Featurewise depends on contextual input such as product notes, design files, code files, architecture notes, API documentation, and execution rules.

Some context is specific to the feature being generated. Other context describes the broader project and can help the LLM understand constraints, conventions, and existing knowledge.

## Decision

Create `ContextArtifact` as a first-class entity.

A context artifact can be scoped to:

- `project`;
- `feature`.

Feature-level context is the core input for a generation.

Project-level context provides broader background knowledge, constraints, and execution rules.

The system may also maintain a derived `ProjectContextSummary` as a generated background summary of useful project knowledge.

## Consequences

- Context becomes reusable instead of being hidden inside prompts.
- The system can distinguish current feature context from broader project context.
- Project context can be included or excluded during generation.
