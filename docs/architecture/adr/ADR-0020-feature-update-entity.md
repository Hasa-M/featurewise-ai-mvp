# ADR-0020: Model Feature Updates as FeatureUpdate Child Entities

Date: 2026-06-12

Status: accepted

Supersedes: ADR-0004, ADR-0005

## Context

ADR-0004 modeled `feature_update` as a Feature type and ADR-0005 added an
`intentType`, but neither defined where the baseline link lives, which
`type × intentType` combinations are legal, or whether an update is a new
Feature row or a re-run on an existing one. The schema could not be
implemented from those documents.

The real workflow is also different from what they described: large product
features already exist (inside or outside Featurewise), and most spec work is
a small increment inside one of them — a new control, a new page, a new data
visualization. The system must know the baseline of the parent feature when
generating the spec for such an increment.

## Decision

`Feature` represents one product capability. It has **no `type` column**.
It has an `origin`:

- `brand_new` — a capability that does not exist yet. It is specified through
  SpecRuns on the Feature itself.
- `mapped_existing` — a capability that already exists in the real product and
  is added to Featurewise only to capture its current state. Its
  ContextArtifact describes what exists (the baseline); nothing new is defined
  at this level.

`FeatureUpdate` is a new child entity of `Feature`:

- represents one increment/change inside the parent feature (conceptually a
  task inside a very big feature);
- has exactly one editable ContextArtifact of its own (extends ADR-0016);
- is the target of its own SpecRuns and GeneratedSpecs;
- exactly one nesting level: a FeatureUpdate cannot have children. If an
  increment grows too large, it is manually promoted to a new Feature.

`SpecRun` and `GeneratedSpec` become target-polymorphic: `featureId` is always
set (the scope), `featureUpdateId` is set when the target is an update.

Rules:

- Direct generation runs on a Feature are allowed only when
  `origin = brand_new`. A generation request on a `mapped_existing` Feature
  without an update is rejected with `422`; the baseline alone is not a spec
  subject. (Consolidation runs on the Feature are a separate kind — ADR-0021.)
- FeatureUpdates can be created on any Feature regardless of origin
  (`brand_new` features receive updates after they ship). Creating the
  FeatureUpdate record and drafting its context is never blocked.
- A FeatureUpdate does **not** require the parent to have a valid
  GeneratedSpec. Starting a run on it requires a **usable parent baseline**:
  non-empty parent ContextArtifact content, or at least one upload on it, or
  a parent valid spec. Otherwise `422`. The gate sits at run start, not at
  update creation.
- When a run targets a FeatureUpdate, the context snapshot includes the
  update's ContextArtifact, the parent Feature's ContextArtifact as baseline,
  and — when one exists — a copy of the parent's valid GeneratedSpec, which is
  the most precise description of current intended behavior (extends
  ADR-0017).
- Concurrency (ADR-0019) applies per target: at most one non-terminal run per
  Feature (direct) and per FeatureUpdate, enforced with partial unique
  indexes.
- "At most one valid GeneratedSpec" (ADR-0018) applies per target.

## Consequences

- The type/intent ambiguity is removed; identity (Feature) and unit of work
  (FeatureUpdate) are separate concepts, and the baseline is structural
  (parent FK) instead of a convention.
- Baseline staleness after updates ship is a real phenomenon; it is addressed
  by the consolidation and alignment loop defined in ADR-0021 instead of
  being left to convention.
- A `mapped_existing` Feature is only as useful as the baseline the operator
  writes for it; mapping is real work, not a checkbox.
- Update-run prompts grow when a parent valid spec exists (its content is
  copied into the snapshot and sent to the LLM); accepted for output quality
  and traceability.
- ADR-0003 (hierarchy), ADR-0016, ADR-0017, ADR-0018, ADR-0019, AGENTS.md,
  the ERD, and the spec-run sequence diagram must be amended to match this
  decision.
