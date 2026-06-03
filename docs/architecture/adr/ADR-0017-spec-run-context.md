# ADR-018: Snapshot Selected Context for Each Spec Run

Date: 2026-06-04

Status: pending

## Context

A `SpecRun` represents one generation attempt at a specific point in time.

Context artifacts may change after a generation run. Without a snapshot, it would be difficult to understand which exact inputs produced a generated specification.

## Decision

Each `SpecRun` stores a snapshot of the selected context used during generation.

This is modeled through `SpecRunContext`, which records the context artifacts and relevant copied content used for that run.

## Consequences

- Generated specs remain traceable to the inputs used at generation time.
- Later edits to context artifacts do not break historical understanding of previous runs.
- The system can support better debugging, evaluation, and user trust.
- This adds some data duplication, but it is acceptable for traceability.