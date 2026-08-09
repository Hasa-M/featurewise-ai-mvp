# Sequence — Spec Runs: Generation (Feature / FeatureUpdate) and Consolidation

## Purpose

This diagram defines the behavior of the only complex flow in the MVP:
asynchronous spec runs executed inside the NestJS process (ADR-0012), for the
three run cases defined by ADR-0020/0021:

- `generation` on a Feature with `origin = brand_new` (direct run);
- `generation` on a FeatureUpdate (increment run, parent baseline included);
- `consolidation` on a Feature (absorb validated update specs into a new
  feature-level spec version).

All three share the same status lifecycle and pipeline; only preconditions,
snapshot composition, and the prompt template differ. The second diagram shows
the alignment loop that connects spec validation to consolidation.

CRUD flows (auth, project, feature, feature-update, context editing) are
intentionally not diagrammed.

## Run preconditions and inputs (ADR-0020/0021)

| runKind         | Target               | Allowed when (else 422)                                                                            | Snapshot contains                                                                  |
| --------------- | -------------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `generation`    | Feature              | `origin = brand_new`                                                                                | feature context                                                                    |
| `generation`    | FeatureUpdate        | usable parent baseline: non-empty parent ContextArtifact, or uploads on it, or a parent valid spec | update context + parent baseline + parent valid spec (if any)                      |
| `consolidation` | Feature (any origin) | ≥ 1 validated feature update spec not yet incorporated                                             | feature context + feature valid spec (if any) + all pending validated update specs |

The prompt template is selected by run kind and target — `new-feature`,
`feature-update`, `feature-consolidation` — all versioned in the repository
(ADR-0013). The project summary inclusion flag (`genSettings`) applies to all
three.

## Run Status Lifecycle

| Status              | Meaning                                                 | Terminal |
| ------------------- | ------------------------------------------------------- | -------- |
| `queued`            | Run created, snapshot persisted, generation not started | no       |
| `preparing_context` | Fetching images from S3, downscaling, assembling prompt | no       |
| `calling_llm`       | LLM request in flight (with transient-error retries)    | no       |
| `validating_output` | Validating JSON against schema version                  | no       |
| `repairing_output`  | Schema-repair round-trip with the LLM                   | no       |
| `checking_quality`  | Non-blocking quality checks (warnings only)             | no       |
| `persisting`        | Writing GeneratedSpec and logs                          | no       |
| `completed`         | GeneratedSpec available                                 | yes      |
| `failed`            | Error persisted, raw output logged when relevant        | yes      |

## API Contract

- `POST /features/:featureKey/spec-runs` body `{ runKind?: "generation" | "consolidation" }`
  (default `generation`) → `202 Accepted` + `SpecRun { publicKey, status }`.
  `422` when: `generation` on a `mapped_existing` Feature, or `consolidation`
  with nothing pending. `409 Conflict` if a non-terminal run exists for this
  target.
- `POST /feature-updates/:featureUpdateKey/spec-runs` (always `generation`) → `202` / `404` /
  `409`; `422` when the parent baseline is not usable.
- `GET /spec-runs/:specRunKey` → the `SpecRun`; when `completed`, the response embeds
  the full `GeneratedSpec` object.
- `GET /features/:featureKey/spec-runs/latest` and
  `GET /feature-updates/:featureUpdateKey/spec-runs/latest` → most recent run for the
  target, any status. **Recovery endpoint**: after a page reload the frontend
  rediscovers an active run and resumes polling.
- `POST /generated-specs/:generatedSpecKey/validate` → marks the spec valid: freezes its
  content and atomically clears the previously valid spec of the same target
  (ADR-0021). This is the event that can flip the parent Feature to
  `updates_pending`.
- `GET /features/:featureKey` → includes the computed
  `alignment: { status: "aligned" | "updates_pending", pendingUpdates: [...] }`.
- The 409 is ultimately enforced by the partial unique indexes on `spec_run`
  (see ERD), not by a check-then-insert — the pre-check is only a fast path.
- Generation is independent of the client connection. Closing the web app does
  not affect a run. Stopping the backend process kills in-flight runs
  (accepted ADR-0012 tradeoff, mitigated by the sweep).
- All identifiers in these HTTP paths and response identity fields are the
  entity-specific public keys from ADR-0028. Controllers resolve them to UUIDs
  before service and database operations. Snapshot UUID references stay
  internal and are never returned to the frontend.

## Diagram — run execution

```mermaid
sequenceDiagram
    autonumber
    actor U as Web App (Operator)
    participant API as Backend API (SpecRun controller)
    participant GEN as SpecGeneration module
    participant CTX as ContextIntake module
    participant DB as PostgreSQL
    participant S3 as Object Storage
    participant LLM as LLM Provider

    U->>API: POST /features/:featureKey/spec-runs { runKind } (or /feature-updates/:featureUpdateKey/spec-runs)
    API->>DB: resolve public target key within existing visibility constraints
    API->>GEN: startRun(target, runKind)
    GEN->>DB: resolve target, check preconditions, find non-terminal run for target
    alt precondition failed (missing target / wrong origin / unusable baseline / nothing to consolidate)
        GEN-->>API: InvalidRunRequest
        API-->>U: 404 / 422
    else active run exists for target
        GEN-->>API: RunAlreadyInProgress
        API-->>U: 409 Conflict
    else target valid, no active run
        GEN->>CTX: buildContextSnapshot(target, runKind)
        CTX->>DB: read target ContextArtifact (+ StorageObject keys)
        opt generation run on a FeatureUpdate
            CTX->>DB: read parent Feature ContextArtifact (baseline)
            CTX->>DB: read parent Feature valid GeneratedSpec (if any)
        end
        opt consolidation run
            CTX->>DB: read feature valid GeneratedSpec (if any)
            CTX->>DB: read validated update specs pending incorporation
        end
        CTX-->>GEN: snapshot (texts + spec contents copied, immutable S3 keys, external refs, summary flag)
        GEN->>DB: insert SpecRun (status=queued, runKind, snapshot, promptVersion, schemaVersion)
        Note right of DB: Partial unique indexes make the insert race-safe:<br/>a concurrent duplicate violates the index and maps to 409.
        GEN-->>API: SpecRun created
        API-->>U: 202 Accepted + SpecRun { publicKey, status: queued }
    end

    Note over GEN: Async execution inside the NestJS process (ADR-0012),<br/>wrapped in a top-level guard: any unexpected exception<br/>marks the run failed. No run may stay non-terminal.

    GEN->>DB: status = preparing_context
    opt genSettings.includeProjectSummary = true
        GEN->>DB: read current ProjectContextSummary
    end
    GEN->>S3: fetch image artifacts by snapshot keys
    S3-->>GEN: image binaries
    GEN->>GEN: downscale + base64 images, select template by runKind + target<br/>(feature | feature-update | feature-consolidation), assemble prompt (template vX)

    GEN->>DB: status = calling_llm
    loop up to 3 attempts (transient errors only: timeout / 429 / 5xx)
        GEN->>LLM: prompt + images + structured output schema
        LLM-->>GEN: response or transient error
        GEN->>DB: append LLM call log (purpose=generation, attempt, tokens, latency, outcome)
    end

    alt transient retries exhausted, or permanent provider error (4xx)
        GEN->>DB: status = failed (+ errorMessage)
    else response received
        GEN->>DB: status = validating_output
        GEN->>GEN: validate JSON against schema version
        alt schema invalid
            GEN->>DB: status = repairing_output
            loop up to 2 repair attempts
                GEN->>LLM: previous output + validation errors ("fix to match schema")
                LLM-->>GEN: corrected output
                GEN->>DB: append LLM call log (purpose=schema_repair)
                GEN->>GEN: re-validate
            end
        end
        alt output valid
            GEN->>DB: status = checking_quality
            GEN->>GEN: non-blocking quality checks -> warnings<br/>(e.g. thin baseline on an update run)
            GEN->>DB: status = persisting
            GEN->>DB: insert GeneratedSpec (valid=false,<br/>incorporatedUpdates when consolidation, schemaVersion, warnings)
            GEN->>DB: status = completed
        else repair attempts exhausted
            GEN->>DB: status = failed (+ errorMessage, raw output stored in log)
        end
    end

    loop poll until terminal status
        U->>API: GET /spec-runs/:specRunKey
        API->>DB: read SpecRun (+ GeneratedSpec when completed)
        API-->>U: SpecRun { status } or full SpecRun + GeneratedSpec
    end

    Note over GEN,DB: Stale-run sweep runs at startup AND on a periodic interval:<br/>non-terminal runs older than STALE_RUN_TIMEOUT are marked failed<br/>(timeout tuned after observing real generation durations).
```

## Diagram — alignment loop (overview)

```mermaid
flowchart TD
    A["Operator marks an update spec valid"] --> B["Version is set to 1;<br/>previous valid spec of that updated as valid=false"]
    B --> C{"Is its specId inside the feature<br/>valid spec incorporatedUpdates?"}
    C -- "no, or no feature valid spec yet" --> D["Feature alignment = updates_pending<br/>warning shown on the Feature"]
    C -- "yes" --> H["Feature alignment = aligned"]
    D --> E["Operator starts a consolidation run<br/>runKind = consolidation"]
    E --> F["Draft feature spec<br/>incorporatedUpdates recorded from the snapshot"]
    F --> G["Operator reviews, edits, marks valid<br/>previous feature valid spec updated as valid=false"]
    G --> H
    H -. "an update gets a new valid spec later" .-> C
```

## Notes

- **Consolidation is user-triggered only.** Validating an update spec never
  starts a run automatically: automatic regeneration would spend LLM cost
  without review and contradict "valid is a user action" (ADR-0018/0021). The
  computed `updates_pending` warning is the prompt to act.
- **Alignment vs warnings:** `warnings` on a GeneratedSpec are quality checks
  frozen at generation time. Alignment is computed live on every feature read,
  because it changes when updates are validated _after_ the spec was created.
  Do not store alignment.
- The new `GeneratedSpec` is always a draft (`version = 0`, `valid = false`).
  Marking it valid assigns the next target-local validated version, starting at
  version 1, and atomically swaps the `valid` flag for that target.
- Quality checks never fail a run; an update run with a thin baseline that
  still passed the usable-baseline gate produces a warning, not a failure.
- Raw LLM output is persisted in the log only for failed validation/repair
  attempts, to limit DB bloat while keeping failures debuggable.
- Errors are classified before retrying: only timeout/429/5xx are transient.
  4xx provider errors (e.g. payload too large from inline images) fail the run
  immediately.
- Consolidation snapshots copy the spec contents they consume (ADR-0017/0021):
  draft specs are editable, so copying is the only byte-stable option.

## TLDR

### Synchronous part (the HTTP request)

The operator hits "generate" on a Feature (with a runKind) or on a
FeatureUpdate. The module resolves the target and checks the precondition for
that run kind: missing target → 404; unusable parent baseline, or consolidation 
with nothing pending → 422; non-terminal run already on the target → 409. 
Otherwise ContextIntake builds the snapshot: copies the target's context text, 
records immutable S3 keys and external refs, and adds the extra inputs per run kind
— parent baseline plus parent valid spec for update runs; feature valid spec plus all
pending validated update specs for consolidation. The SpecRun is inserted with
status `queued` (the partial unique index guarantees the one-active-run rule
even under a race) and the API answers 202.

### Asynchronous part (inside the Nest process)

The pipeline runs inside a guard that converts any unexpected exception into
`failed`, then walks the statuses, writing each transition to Postgres:
`preparing_context` (summary if flagged, images fetched/downscaled, template
selected by runKind + target, prompt assembled) → `calling_llm` (max 3
transient attempts, one log row each) → `validating_output` → optional
`repairing_output` (max 2) → `checking_quality` (warnings only) →
`persisting` (valid=false, with incorporatedUpdates when consolidating) → 
`completed`; any exhausted branch → `failed`.

### Closing the loop

Validating an update spec mark it as v1 and may flip the Feature to
`updates_pending` (computed by comparing spec ids against the feature valid
spec's `incorporatedUpdates`). The operator runs a consolidation, reviews the
draft, marks it valid — the Feature is `aligned` again until the next update
is validated. Changing an update with a new version re-flags the Feature
automatically.

### Polling, recovery, safety net

The frontend polls `GET /spec-runs/:specRunKey` until a terminal status;
after a reload it rediscovers an active run via the target's public-key latest
run endpoint.
The stale-run sweep (startup + periodic) marks non-terminal runs older than
`STALE_RUN_TIMEOUT` as failed, so a stuck run can never block its target with
eternal 409s.
