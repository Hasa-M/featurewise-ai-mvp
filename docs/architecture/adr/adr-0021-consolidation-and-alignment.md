# ADR-0021: Validity Freeze, Sequential Spec Versions, Consolidation Runs, and Computed Alignment

Date: 2026-06-13

Status: accepted

Amends: ADR-0017, ADR-0018, ADR-0019. Depends on: ADR-0020.

## Context

With FeatureUpdates as separate spec targets (ADR-0020), the feature-level
spec goes stale whenever an update spec is validated. The system needs a
defined way to (a) know when an update is ready to be absorbed, (b) bring the
feature spec back in line with its validated updates, and (c) tell the
operator when it is not aligned.

ADR-0018 also contained an internal inconsistency: "runs always create
version 1" cannot coexist with multiple generation attempts per target and a
unique (target, version) constraint, and it does not define what version a
consolidated spec gets.

## Decision

### 1. Validity freeze

A GeneratedSpec's `content` is editable only while `valid = false`. Marking a
spec valid freezes its content and atomically clears the `valid` flag on the
previously valid spec of the same target. Validated specs are therefore
stable, immutable references — safe to copy into snapshots and to track by id.

### 2. Sequential versions per target (amends ADR-0018)

Every new GeneratedSpec — run-produced or manually created — gets
`version = last + 1` for its target; the first is 1. `parentSpecId` records
derivation; manually created versions copy `incorporatedUpdates` from their
parent. There is no special "runs create version 1" rule anymore.

### 3. Run kinds (amends ADR-0019)

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
  (no cherry-picking in phase 1). The output is a draft successor version
  with `incorporatedUpdates` recorded from the snapshot.
- A third prompt template, `feature-consolidation`, is versioned in the
  repository like the others (ADR-0013).

### 4. Incorporation tracking

Feature-target GeneratedSpecs store
`incorporatedUpdates: [{ featureUpdateId, generatedSpecId, version }]` (JSONB).
This is the only persisted record of what a feature spec has absorbed.

### 5. Alignment is computed, never stored

A Feature is `updates_pending` when at least one non-deleted FeatureUpdate has
a current valid spec whose id is not in the feature's current valid spec
`incorporatedUpdates` (a feature with validated updates and no valid spec of
its own is also `updates_pending`). Otherwise `aligned`. The API computes this
on feature reads and exposes it as a warning with the list of pending updates.

### 6. Consolidation is user-triggered only

Validating an update spec never starts a run automatically. Automatic
regeneration would spend LLM cost on unreviewed drafts and contradict the
principle that validity is a user action (ADR-0018). The `updates_pending`
warning is the prompt to act.

## Consequences

- The baseline-drift loop is closed without hidden automation: validate
  update → computed warning → explicit consolidation → review → validate.
- Comparing spec ids (not timestamps) makes the mechanism self-healing:
  re-validating an update with a new version re-flags the feature
  automatically, and soft-deleted updates drop out of the computation.
- `mapped_existing` Features gain a legitimate path to a feature-level spec
  (their first consolidation), without weakening the "no direct generation on
  mapped_existing" rule.
- Snapshots grow because they copy spec contents; accepted, since draft specs
  are editable and id references would not be byte-stable (ADR-0017
  philosophy: copy text, reference immutable keys).
- "Incorporated" badges in the UI are derived state — no status field to
  drift out of sync.
- LLM cost is incurred only on explicit operator action.
