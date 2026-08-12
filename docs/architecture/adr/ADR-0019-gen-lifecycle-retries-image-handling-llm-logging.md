# ADR-0019: Spec Generation Run Lifecycle, Retries, Image Handling, and LLM Call Logging

Date: 2026-06-14

Status: accepted

Amended by: ADR-0020, ADR-0021, ADR-0029

## Context

Spec generation is asynchronous but runs inside the NestJS process. Eeach run snapshots the feature context. The run's behavior: statuses, concurrency rules, failure handling, image delivery to the LLM, or what is logged per call are still not defined.

These decisions are needed before implementing the SpecGeneration module, because the frontend polling contract and the failure paths depend on them.

## Decision

### Concurrency

At most one non-terminal run per target. A target is either a direct Feature
run or a FeatureUpdate run (ADR-0020). A second start request for the same
target is rejected with `409 Conflict`. The frontend also disables the trigger
while a run is active.

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

The backend sends image artifacts base64-inline to the provider. ADR-0029 moves
the deterministic downscale to attachment preparation: the original remains
untouched and an immutable model derivative is capped at approximately 1500 px.
SpecRun preparation downloads the exact derivative version recorded by the
snapshot. Inline delivery keeps the bucket fully private and avoids presigned
URL lifetime handling.

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

Quality checks are non-blocking: they produce warnings stored with the
`GeneratedSpec`, never a failed run. The new `GeneratedSpec` is created as a
draft with `version = 0` and `valid = false`; marking it valid is a separate
user action that assigns the next validated version (ADR-0018/0021).

## Consequences

- The frontend polling contract is fully defined and the status enum must stay in sync between backend and frontend.
- Storing raw output only on failures limits database bloat, but "valid yet bad" outputs are not raw-logged; acceptable for phase 1.
- The repair loop adds LLM cost on bad outputs, but converts the most common failure mode into a recoverable state.
- The sweep prevents permanently stuck runs without introducing a queue or worker.

## Amendments (ADR-0020, ADR-0021)

The original lifecycle, retry, image-handling, and logging decisions above
remain in force. The following are added or changed.

### Run target and kind

- `SpecRun` gains `featureUpdateId` (nullable): a run targets a Feature
  (direct) or a FeatureUpdate. `featureId` is always set as the scope (ADR-0020).
- `SpecRun` gains `runKind: generation | consolidation`. Consolidation runs are
  feature-target only (DB CHECK) and absorb validated update specs into a new
  feature-level spec version (ADR-0021).

### Preconditions (return 422 before a run is created)

- `generation` on a Feature: only when `origin = brand_new` (ADR-0021).
- `generation` on a FeatureUpdate: only with a usable parent baseline —
  non-empty parent ContextArtifact, or an upload on it, or a parent valid spec
  (ADR-0020).
- `consolidation` on a Feature: only when at least one validated update spec is
  not yet incorporated by the feature's current valid spec (ADR-0021).

### Concurrency

- "At most one non-terminal run per feature" becomes "per **target**" (Feature
  direct, and FeatureUpdate), enforced by **partial unique indexes** on
  `spec_run` (see ERD). The pre-insert check is only a fast path; the index is
  the race-safe source of the 409.

### Prompt templates

- A third versioned template, `feature-consolidation`, joins `new-feature` and
  `feature-update` (ADR-0013/0021).

### Stale-run sweep

- The startup sweep also runs on a **periodic interval**, so a run orphaned by
  an in-process crash is reaped without waiting for the next restart. Still no
  queue or worker (ADR-0012 preserved).

### Terminal-status guarantee

- The async pipeline is wrapped in a top-level guard: any unhandled exception
  writes `status = failed` (+ errorMessage). A run can never remain non-terminal
  while the process is alive.

### API additions

- `POST /features/:id/spec-runs` accepts `{ runKind }` (default `generation`).
- `POST /feature-updates/:id/spec-runs` (always `generation`).
- `GET /features/:id/spec-runs/latest` and
  `GET /feature-updates/:id/spec-runs/latest` — recovery endpoints so the
  frontend can rediscover an active run after a reload.
- `POST /generated-specs/:id/validate` — marks a spec valid: freezes its content
  and atomically clears the previously valid spec of the same target (ADR-0021).
- `GET /features/:id` includes computed
  `alignment: { status: aligned | updates_pending, pendingUpdates[] }`
  (ADR-0021); alignment is never stored.
