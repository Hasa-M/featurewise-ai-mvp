# ADR-006: Store GeneratedSpec as JSONB with schema version in MVP

Date: 2026-05-26

Status: proposed

## Context

The generated spec will contain many sections, such as product, design, development, QA, assumptions, risks, open questions, and test scenarios.

The final structure is not stable yet, and fully relational modeling could create unnecessary migrations and overbuilding during MVP discovery.

## Decision

For MVP, `GeneratedSpec` will store its main content as structured JSONB in PostgreSQL.

Each generated spec will include a `schemaVersion`.

Stable entities can be extracted into relational tables later if querying, filtering, or reporting requires it.

## Consequences

This keeps the generated output flexible while the spec schema evolves.

It makes some future queries harder at first, but avoids premature relational modeling.

The JSON structure must still be validated and versioned to avoid becoming unstructured random data.