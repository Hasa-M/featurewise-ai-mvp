# ADR-0021: Internal Spec Versioning, Consolidation Runs, and Computed Alignment

Date: 2026-06-14

Status: superseded

Superseded by: [ADR-0030](ADR-0030-specification-analysis-core-domain.md)

> Historical record only. Generated-spec validation, consolidation,
> incorporation tracking, and alignment are removed by ADR-0030.

Amends: ADR-0017, ADR-0018, ADR-0019. Depends on: ADR-0020.

## Context

With FeatureUpdates as separate spec targets (ADR-0020), the feature-level
spec goes stale whenever an update spec is validated. The system needs a
defined way to (a) know when an update is ready to be absorbed, (b) bring the
feature spec back in line with its validated updates, and (c) tell the
operator when it is not aligned.

Versioning is internal to a GeneratedSpec and starts at validation.

## Decision

### 1. Version assignment (amends ADR-0018)

Generated specs created by a run or by manual editing start as drafts with
`version = 0` and `valid = false`.

When the user marks a spec valid, the system assigns the next target-local
validated version: `1` for the first validation, otherwise `last + 1`. The
same transaction clears the previous valid spec for that target.

Only validated versions (`version > 0`) must be unique per target. Drafts can
repeat `version = 0`.

### 2. Run kinds (amends ADR-0019)

`SpecRun.runKind = generation | consolidation`. Consolidation runs are
feature-target only (DB CHECK).

- `generation` on a Feature: allowed only when `origin = brand_new`
  (ADR-0020).
- `generation` on a FeatureUpdate: requires a usable parent baseline
  (ADR-0020); the snapshot includes the parent baseline and, when present, a
  copy of the parent's valid spec.
- `consolidation` on a Feature (any origin): requires at least one validated
  update spec not yet incorporated by the feature's current valid spec,
  otherwise `422`. The snapshot includes the feature baseline, the feature's
  valid spec when one exists, and **all** pending validated update specs
  (no cherry-picking in phase 1). The output is a draft GeneratedSpec with
  `incorporatedUpdates` recorded from the snapshot.
- A third prompt template, `feature-consolidation`, is versioned in the
  repository like the others (ADR-0013).

### 3. Incorporation tracking

Feature-target GeneratedSpecs store
`incorporatedUpdates: [{ featureUpdateId, generatedSpecId, version }]` (JSONB).
This is the only persisted record of what a feature spec has absorbed.

### 4. Alignment is computed, never stored

A Feature is `updates_pending` when at least one non-deleted FeatureUpdate has
a current valid spec whose id is not in the feature's current valid spec
`incorporatedUpdates` (a feature with validated updates and no valid spec of
its own is also `updates_pending`). Otherwise `aligned`. The API computes this
on feature reads and exposes it as a warning with the list of pending updates.

### 5. Consolidation is user-triggered only

Validating an update spec never starts a run automatically. Automatic
regeneration would spend LLM cost on unreviewed drafts and contradict the
principle that validity is a user action (ADR-0018). The `updates_pending`
warning is the prompt to act.

## Consequences

- The baseline-drift loop is closed without hidden automation: validate
  update → computed warning → explicit consolidation → review → validate.
- `mapped_existing` Features gain a legitimate path to a feature-level spec
  (their first consolidation), without weakening the "no direct generation on
  mapped_existing" rule.
- "Incorporated" badges in the UI are derived state — no status field to
  drift out of sync.
- LLM cost is incurred only on explicit operator action.
