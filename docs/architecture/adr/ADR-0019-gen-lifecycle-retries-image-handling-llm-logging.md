# ADR-0019: Spec Generation Run Lifecycle, Retries, Image Handling, and LLM Call Logging

Date: 2026-06-11

Status: accepted

## Context

Spec generation is asynchronous but runs inside the NestJS process. Eeach run snapshots the feature context. The run's behavior: statuses, concurrency rules, failure handling, image delivery to the LLM, or what is logged per call are still not defined.

These decisions are needed before implementing the SpecGeneration module, because the frontend polling contract and the failure paths depend on them.

## Decision

### Concurrency

At most one non-terminal run per feature. A second start request is rejected with `409 Conflict`. The frontend also disables the trigger while a run is active.

### Status lifecycle (granular)

```
queued
preparing_context
calling_llm
validating_output
repairing_output   (only when schema validation fails)
checking_quality
persisting
completed | failed
```

`completed` and `failed` are the only terminal statuses.

### API contract

`POST /features/:id/spec-runs` returns `202` with the created `SpecRun`. The polling endpoint `GET /spec-runs/:id` returns the `SpecRun`; when `completed`, it embeds the full `GeneratedSpec` object.

Generation is independent of the client connection. Closing the web app does not affect a run. Stopping the backend process kills in-flight runs (accepted ADR-0012 tradeoff).

### Stale-run sweep

On backend startup, all non-terminal runs older than `STALE_RUN_TIMEOUT` are marked `failed`. The timeout value is configurable and will be tuned after observing real generation durations, to avoid killing good runs.

### Retries and schema repair

- Transient LLM errors (timeout, 429, 5xx): up to 3 attempts with exponential backoff.
- Schema-invalid output: up to 2 repair round-trips. The previous output plus the validation errors are sent back to the LLM with a fix instruction, under status `repairing_output`. If still invalid, the run is `failed` and the raw output is preserved in the call log.

### Image handling

The backend downloads image artifacts from S3, downscales them to a maximum dimension (~1500 px), and sends them base64-inline to the provider. Rationale: token cost depends on image resolution, not on delivery method; inline delivery keeps the bucket fully private and avoids presigned URL lifetime handling.

### LLM call log

One log row per LLM attempt:

- `specRunId`;
- `purpose` (`generation` | `schema_repair`);
- `attempt`;
- `promptVersion`, `schemaVersion`, `model`;
- `inputTokens`, `outputTokens`, `latencyMs`;
- `outcome` (`success` | `error`), `errorMessage` (nullable);
- `rawResponse` only for attempts that failed schema validation or repair;
- `createdAt`.

### Quality checks and result persistence

Quality checks are non-blocking: they produce warnings stored with the `GeneratedSpec`, never a failed run. The new `GeneratedSpec` is created as version 1 with `valid = false`; marking it valid is a separate user action (ADR-0018).

## Consequences

- The frontend polling contract is fully defined and the status enum must stay in sync between backend and frontend.
- Storing raw output only on failures limits database bloat, but "valid yet bad" outputs are not raw-logged; acceptable for phase 1.
- The repair loop adds LLM cost on bad outputs, but converts the most common failure mode into a recoverable state.
- The sweep prevents permanently stuck runs without introducing a queue or worker.
