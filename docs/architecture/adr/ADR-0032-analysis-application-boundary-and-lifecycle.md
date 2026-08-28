# ADR-0032: Define the Analysis Application Boundary and Lifecycle

Date: 2026-08-28

Status: accepted

Supersedes: ADR-0012, ADR-0013, ADR-0019

## Context

The engine must be callable by the Featurewise Console and future adapters
without coupling domain behavior to controllers, React route state, a model
provider SDK, or S3 implementation details. The application also needs stable
run ownership and lifecycle concepts before analyzer implementation begins.

Creating placeholder endpoints before a real analyzer can satisfy them would
freeze a misleading contract. Conversely, leaving run state, concurrency, and
structured output boundaries undefined would invite incompatible
implementations.

## Decision

Add an `analysis` module to the NestJS modular monolith in a later refactor
phase. Its application service will be the single entry point used by the
first-party REST controller and future adapters. It owns authorization, run
creation, concurrency, lifecycle transitions, context preparation,
engine invocation, output validation, persistence, and review recording.

The application boundary depends on explicit ports:

- an analysis engine port accepting a versioned prepared input and returning
  structured finding drafts;
- a context/evidence preparation port returning the immutable snapshot model
  from ADR-0031;
- analysis persistence interfaces for runs, findings, reviews, and LLM call
  logs.

`AnalysisRunStatus` has exactly these values:

```text
queued
preparing_context
analyzing
validating_output
repairing_output
verifying_findings
persisting
completed
failed
```

`completed` and `failed` are terminal. At most one non-terminal AnalysisRun may
exist per Feature. PostgreSQL must enforce the race-safe invariant with a
partial unique index; an application pre-check is only a fast path.

An AnalysisRun records `analyzerVersion`, `promptVersion`, `schemaVersion`,
analysis settings, immutable input snapshot, write-once prepared-context
snapshot, creator, lifecycle timestamps, and failure details. Findings are
immutable after persistence. Finding reviews are append-only, and the current
human disposition is a projection of the latest review.

Prompt templates remain versioned repository files. Engine output is runtime
validated against its recorded schema version. LLM attempts are logged against
the AnalysisRun with purpose, attempt, provider/model, prompt/schema versions,
available usage/latency/cost data, outcome, and failure details. Initial call
purposes are `candidate_analysis`, `finding_verification`, and `schema_repair`.

Analysis executes asynchronously from a client perspective inside the NestJS
process for the local-first MVP. No queue, worker, dedicated AI service, or
multi-agent orchestration is introduced. Module boundaries must keep later
extraction possible.

The intended future REST adapter will expose start, run status/history,
findings, and finding-review operations. Those endpoints are documented as
deferred contracts and must not be implemented until a real analyzer vertical
slice backs them.

Provider/model selection, prompt content, retry limits, verification and
deduplication policy, taxonomy evolution, confidence scoring, and evaluation
design are explicitly deferred.

## Consequences

- Console, CLI, integrations, and other future adapters can share one use case.
- Run state and concurrency are stable before provider-specific code exists.
- Reproducibility and evidence preparation remain outside controller and model
  provider concerns.
- The modular-monolith MVP avoids premature AI infrastructure.
- The repository gains no fake analysis endpoint or analyzer implementation as
  part of the architecture reset.
