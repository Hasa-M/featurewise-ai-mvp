# ADR-0013: Store Prompt Templates in the Repository and Validate Generated Specs in Backend Code

Date: 2026-06-02

Status: accepted

## Context

Featurewise needs prompt/schema versioning, structured outputs, and basic quality control.

A database-backed prompt management system would be too much for phase 1, but prompt versions still need to be explicit and traceable.

Generated specs are stored as JSONB, but the system should not accept arbitrary unvalidated JSON.

## Decision

Prompt templates will be stored as versioned files in the backend repository.

Generated spec schemas will be defined in backend code using TypeScript types and runtime validation.

Each `SpecRun` stores the prompt version used.

Each `GeneratedSpec` stores the schema version used.

## Consequences

- Prompts are versioned through Git.
- Prompt changes remain explicit and reviewable.
- The MVP avoids building a prompt management UI.
- Generated JSONB content remains flexible but still validated.
- The backend remains responsible for structured output validation and schema compatibility.