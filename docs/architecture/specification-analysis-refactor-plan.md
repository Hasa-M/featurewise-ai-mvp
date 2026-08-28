# Specification Analysis Engine Domain Refactor

Status: Phase 3 complete; Phase 4 ready
Repository inspected: `main` at `8930865` (`Merge PR #2 context-file-attachments`)
Product direction: `featurewise_final_architecture_refactor_handoff.md`
Implementation source of truth: the repository state described below
Scope: application/domain refactor only; analyzer, verification pipeline, and eval implementation are deferred

## Implementation progress

Tracked copy created from `C:\Users\Salvatore Fadda\Documents\featurewise_specification_analysis_refactor_plan.md`.

- Branch: `refactor/specification-analysis-engine`, based on `main` at `8930865`.
- Phase 1: **complete on 2026-08-28; committed as `0910c6b`**.
- Phase 2: **complete on 2026-08-28; committed as `d354b53`**.
- Phase 3: **complete on 2026-08-28; uncommitted pending user review**.
- Phase 4: **ready**. It is the next allowed implementation phase on this branch after Phase 3 is reviewed and committed.
- Later phases: pending and unchanged.
- Phase 1 implementation note: C4 sources were converted to canonical
  Markdown/Mermaid, obsolete Draw.io/PNG exports were removed, and the old
  generation sequence directory was renamed to `04-sequence-analysis-lifecycle`.
- Phase 1 verification: relative Markdown links resolve; current-facing old-domain hits are explicit removal/migration statements; no backend, frontend, Prisma, dependency, agent-instruction, skill, or generated-file diff exists; `git diff --check` passes.
- Runtime tests/builds were not run because Phase 1 changes documentation only.
- Phase 2 implementation note: root agent guidance and the local create-page/component
  guidance now follow ADR-0030 through ADR-0032. `frontend/AGENTS.md` and both skill
  metadata files were inspected and required no terminology changes.
- Phase 2 verification: the required obsolete-term search across AGENTS and `.agents`
  files is clean; both local skills pass the skill-creator `quick_validate.py` workflow
  with Python 3.11; `git diff --check` passes; no backend runtime, frontend runtime,
  Prisma, migration, package, Phase 1 architecture, or generated-file diff exists.
- Runtime tests/builds were not run because Phase 2 changes documentation and skill
  guidance only.
- Phase 3 implementation note: the public Feature API and Console now use
  `specificationContent`; the backend service alone maps it to the legacy `brief`
  column and supplies fixed legacy creation values. Generated-spec activity,
  alignment, origin, and project-context membership are absent from the public
  contract and active UI. The Feature workspace is now Specification, Context,
  and Analyses, with a request-free Analyses unavailable state.
- Phase 3 verification: backend unit tests passed (52/52), backend end-to-end tests
  passed (2/2), and backend lint and build passed. Frontend tests passed (335/335),
  and frontend lint and build passed with the existing oversized rich-text chunk
  warning. `git diff --check` and the forbidden-path audit passed; there is no
  Prisma, migration, dependency/package, Phase 1 ADR/diagram, or Phase 2
  agent/skill-guidance diff.
- Phase 3 manual smoke limitation: Docker Desktop's engine socket is unavailable
  and PostgreSQL is not listening on `localhost:5433`, so the local backend cannot
  start for the requested browser create/edit/list/open/delete workflow. The same
  workflow and routing/cache behavior are covered by backend e2e and frontend
  router tests.


## 1. Outcome and locked decisions

Featurewise becomes a Specification Analysis Engine. The web application is the Featurewise Console, its first-party control plane. A user supplies a feature specification plus supporting context; Featurewise eventually runs an analysis and returns individually addressable, evidence-backed findings. It no longer generates or maintains a canonical specification.

The following decisions were established while preparing this plan:

- Remove `FeatureOrigin` completely. Whether work is new or pre-existing belongs in the feature specification or supporting context, not a form field or domain discriminator.
- Remove `FeatureUpdate` completely. The primary analysis unit is a `Feature`; a change-set can be represented by the current feature specification and context without a nested update entity.
- Rename `Feature.brief` to `Feature.specificationContent`.
- Keep feature supporting context separate: one editable `ContextArtifact.content` plus selected uploaded files.
- Replace `ProjectContextSummary` with editable `ProjectContext.content`.
- Preserve the merged S3/context-file lifecycle and immutable object-version metadata.
- Replace `SpecRun`/`GeneratedSpec` with `AnalysisRun`, `AnalysisFinding`, and append-only `FindingReview` records.
- Use a forward migration after the existing migration history; do not rewrite applied migrations.
- There is no useful legacy database or S3 data to convert. Treat environments as empty or seeded, but add a preflight guard so destructive assumptions cannot silently discard unexpected data.
- During this refactor, define the application and engine boundaries and the future HTTP contracts. Do not add fake start/poll/findings endpoints before the real analyzer can back them.
- Do not design the analyzer, verifier, prompts, provider implementation, or eval harness beyond the interfaces the application refactor needs.

## 2. Current repository state

The repository is clean on `main`. The merged implementation is materially smaller than the old ADR set suggests:

- Prisma contains the old complete persistence model: `FeatureOrigin`, `FeatureUpdate`, `SpecRun`, `GeneratedSpec`, generation/consolidation states, generated-spec versioning, and alignment data.
- No production generation module, SpecRun controller, GeneratedSpec controller, analyzer, prompt pipeline, or LLM provider implementation exists. The legacy product is therefore mostly schema, projections, documentation, and UI terminology rather than a working generation subsystem.
- `FeaturesService` still calculates generated-spec activity (`currentValidSpecVersion`, `generationRunCount`, `latestFeatureRun`) and generated-spec alignment/pending updates, and prevents deletion while an active `SpecRun` exists.
- Feature create/update contracts still expose `brief`, `origin`, and `includeInProjectContext`.
- Feature context contracts expose `promptContent` and contain feature-update routes and ownership branches.
- `FeatureUpdatesService` is only a lookup/authorization service. There is no feature-update creation API or Console flow.
- The Console mirrors the old feature fields and projections. Feature pages expose `Generations`, `Updates`, and `Specifications` tabs as placeholders, while project cards and tests still use old activity/alignment language.
- `ProjectContextSummary` exists in Prisma but has no application write path. `includeInProjectContext` therefore models an unfinished membership mechanism rather than useful behavior.
- The newly merged S3/context implementation is real and useful: immutable upload/prepared keys and version IDs, checksums, processing states, selected/archive behavior, access URLs, purge coordination, and `firstUsedAt` protection.
- The only runtime coupling from context files to the old generation model is `ContextService.buildContextArtifactSnapshot`, which creates an exact metadata snapshot and marks selected ready objects as first used. There is no production caller yet.

Baseline verification completed before planning:

- Backend unit tests: 52/52 passed.
- Backend end-to-end tests: 2/2 passed.
- Backend build passed.
- Backend non-fixing ESLint passed.
- Frontend tests: 333/333 passed.
- Frontend build and lint passed; the existing Vite chunk-size warning remains.
- `prisma validate` passed.
- `prisma migrate status` could not connect because local PostgreSQL on `localhost:5433` was offline. This is an environment limitation, not a detected migration error.

## 3. Concrete conflict inventory

### 3.1 Product and terminology conflicts

| Current repository | Target | Action |
|---|---|---|
| Generated specification is treated as the primary output | Evidence-backed findings are the primary output | Remove generated-spec behavior and redesign around findings |
| Featurewise-generated versions are validated and consolidated | User-authored feature specification is analyzed | Remove validation/version/consolidation semantics |
| `Feature.origin` drives generation eligibility | New/existing status is ordinary specification/context information | Remove enum, column, DTO fields, forms, and tests |
| `FeatureUpdate` is a nested analysis/generation target | `Feature` is the sole analysis target | Remove model, service/module, routes, public keys, UI, and tests |
| Alignment means generated update specs were incorporated | Any future readiness state must derive from analysis findings | Remove alignment and pending-update projections |
| Console navigation says Generations/Updates/Specifications | Console manages Specification/Context/Analyses | Rename and redesign tabs; default to Specification |

### 3.2 Documentation and agent-instruction conflicts

- Root `AGENTS.md` mandates the old hierarchy, exact SpecRun statuses, generation preconditions, GeneratedSpec validity/version invariants, and ADR-0019 generation sequence. Those instructions actively prevent the target refactor and must be changed immediately after the architectural decision is recorded.
- `docs/architecture/README.md`, the ERD, generation sequence, frontend-navigation diagram, and multiple ADRs still define the old product.
- `README.md` already introduces the engine-first product direction, but repository implementation and deeper architecture documentation do not yet match it.
- `.agents/skills/create-page/SKILL.md` directs page work toward accepted generation/validation/consolidation flows.
- `.agents/skills/create-component/references/component-design-guidelines.md` mandates `Aligned`/`Updates pending` labels and refers to generation progress. These local skill instructions would reintroduce obsolete UI semantics.

### 3.3 Prisma and migration conflicts

- `FeatureOrigin`, `SpecRunKind`, and old `SpecRunStatus` encode generation rather than analysis.
- `Feature.brief`, `origin`, and `includeInProjectContext` do not match the target feature model.
- `FeatureUpdate` and its relations duplicate the target and complicate context ownership.
- `ContextArtifact` has mutually optional `featureId`/`featureUpdateId`; after removing updates it should be feature-owned and unambiguous.
- `ContextArtifact.promptContent` is generation-oriented naming; the value is supporting context, so use `content`.
- `ProjectContextSummary` sounds derived and is not editable through the app; it should become `ProjectContext`.
- `SpecRun` lacks analyzer identity, uses generation/consolidation kind, and has only one `contextSnapshot` stage.
- `GeneratedSpec` contains content/version/valid/warnings/derivation/incorporated-update behavior that has no place in the target product.
- `LlmCallLog` points to `SpecRun`, uses generation purposes, and requires token/latency values that providers may not always return.
- Public identifier registrations include `UPD` and `SPEC`, with no finding/review identifiers.
- The old migration history predates and is referenced by the merged S3 migration. Editing old migrations would make fresh and already-applied databases disagree.

### 3.4 Backend conflicts

- Feature DTOs and responses expose obsolete fields.
- `FeaturesService` imports `SpecRunKind`/`SpecRunStatus`, reads GeneratedSpec state, computes old alignment, and uses old run state in delete rules.
- `ContextController` and `ContextService` expose duplicate feature-update context/file/archive paths.
- `FeatureUpdatesModule` and `FeatureUpdatesService` exist solely to support obsolete ownership checks.
- The current context snapshot function is named and messaged around SpecRuns. Its exact S3 metadata behavior should be preserved but moved behind analysis-context terminology.
- There is no explicit application boundary that a Console controller and future adapters could share.
- There are no analysis entities or repositories yet; this is an opportunity to create a small clean boundary without preserving generation abstractions.

### 3.5 Frontend conflicts

- API DTOs, domain models, form schemas, action providers, and fixtures require `origin` and expose `brief`/`includeInProjectContext`.
- Project and feature pages display generated-spec counts, alignment, and placeholder generation/update/specification tabs.
- Context models and forms expose `promptContent` instead of `content`.
- Existing tests lock old wording and shapes in place.
- No project-context editor exists even though the database has a project context row.
- There must be no active analysis UI or query hooks until backed by real endpoints; placeholder copy may explain that analysis execution is not implemented yet.

### 3.6 S3/context lifecycle interaction

Preserve:

- `StorageObject` lifecycle states and metadata.
- immutable `uploadKey`, `s3Key`, prepared key, S3 version IDs, ETags, checksums, preparation version, and timestamps;
- selected/archive semantics, access URLs, processing, cleanup, and purge behavior;
- private storage and organization/project/feature authorization;
- `firstUsedAt` as the protection boundary once an object is captured by an immutable analysis input.

Redesign:

- Remove feature-update-owned `ContextArtifact` branches.
- Rename prompt-centric context fields and responses.
- Replace the old single SpecRun snapshot builder with analysis input/prepared-context snapshot types.
- Ensure evidence references resolve only within the exact prepared context stored for a run.

Do not let the SQL migration delete S3 objects. Before removing FeatureUpdate rows, assert that no update-owned context/storage metadata exists. If it unexpectedly exists, stop and purge it through the application lifecycle or reset the disposable environment explicitly; otherwise SQL deletion would leave S3 orphans.

## 4. Target architecture

```text
Featurewise Console
        |
        v
REST controllers (first-party adapter)
        |
        v
Analysis application boundary
        |
        +--> Analysis engine port (implemented later)
        |
        +--> Context/evidence preparation port
        |       +--> PostgreSQL repositories
        |       +--> private S3 storage adapter
        |
        +--> Analysis persistence
                +--> AnalysisRun
                +--> AnalysisFinding
                +--> FindingReview
                +--> LlmCallLog
```

Domain hierarchy:

```text
Organization
`-- Project
    |-- ProjectContext
    `-- Feature
        |-- specificationContent
        |-- ContextArtifact
        |   `-- StorageObject[]
        `-- AnalysisRun[]
            |-- AnalysisFinding[]
            |   `-- FindingReview[]
            `-- LlmCallLog[]
```

Module responsibilities:

- `workspace`: organization, project, and editable project context ownership.
- `features`: feature identity, title, user-authored specification, and lifecycle.
- `context`: supporting feature text, selected files, exact storage versions, and source preparation. It does not decide findings.
- `storage`: S3 lifecycle implementation; unchanged except terminology at its callers.
- `analysis`: run/finding/review application boundary and ports. The HTTP controller and analyzer implementation are deferred until a real vertical slice exists.
- `auth` and `database`: preserved.

The engine use case must not depend on React, Console route state, or HTTP DTOs. It accepts a versioned prepared input and returns structured finding drafts. The later model provider is an adapter behind that boundary, not a dependency of the domain.

## 5. Target Prisma/domain model

The following is the intended logical model; exact Prisma relation names can follow repository conventions.

### Preserved core models

- `Organization`, `User`, `Project`, `Feature`, `ContextArtifact`, and `StorageObject` remain.
- Existing tenant scoping and private S3 metadata remain.
- Existing soft deletion for Feature remains unless a separate ADR later changes it.

### Changed models

```text
ProjectContext
  id, publicNumber, projectId (unique), content
  createdAt, updatedAt

Feature
  id, publicNumber, projectId, title
  specificationContent String @default("")
  createdById, createdAt, updatedAt, deletedAt?
  contextArtifact, analysisRuns

ContextArtifact
  id, publicNumber
  featureId (unique, non-null)
  content String @default("")
  createdAt, updatedAt
  storageObjects
```

`Feature.origin`, `Feature.includeInProjectContext`, all `FeatureUpdate` fields/relations, and `ContextArtifact.featureUpdateId` are removed. A feature may be created with an empty specification for draft ergonomics, but a future analysis-start use case must reject blank effective input.

### New enums

```text
AnalysisRunStatus
  queued
  preparing_context
  analyzing
  validating_output
  repairing_output
  verifying_findings
  persisting
  completed
  failed

FindingReviewDecision
  accepted
  dismissed
  resolved
  deferred

LlmCallPurpose
  candidate_analysis
  finding_verification
  schema_repair

LlmCallOutcome
  success
  error
```

### New analysis models

```text
AnalysisRun
  id, publicNumber
  featureId
  status
  analyzerVersion
  promptVersion
  schemaVersion
  analysisSettings Json
  inputSnapshot Json
  preparedContextSnapshot Json?
  errorMessage?
  createdById
  createdAt, startedAt?, finishedAt?, updatedAt
  findings[], llmCallLogs[]

AnalysisFinding
  id, publicNumber
  analysisRunId
  position
  category String
  severity String
  title
  description
  whyItMatters
  evidence Json
  suggestedResolutions Json
  verificationMetadata Json
  createdAt
  reviews[]

FindingReview
  id, publicNumber
  findingId
  decision FindingReviewDecision
  reason?
  createdById
  createdAt

LlmCallLog
  id, publicNumber
  analysisRunId
  purpose LlmCallPurpose
  attempt
  provider, model
  promptVersion, schemaVersion
  inputTokens?, outputTokens?, latencyMs?
  estimatedCostMicros?
  outcome, errorMessage?, rawResponse?
  createdAt
```

Constraints and indexes:

- At most one non-terminal `AnalysisRun` per Feature, enforced by a PostgreSQL partial unique index; Prisma schema comments must point to migration-owned SQL.
- `AnalysisFinding` has a unique `(analysisRunId, position)` pair and an index on `analysisRunId`.
- Findings are immutable model assertions after persistence. Human decisions are append-only `FindingReview` rows; the current disposition is a projection of the latest review, not a mutated finding.
- `inputSnapshot` is fixed at run creation. `preparedContextSnapshot` may transition once from null to a value during `preparing_context`; it is write-once afterward. Lifecycle status/timestamps/error remain mutable.
- Category and severity remain strings governed by the versioned runtime output schema, avoiding a database migration whenever the evaluated taxonomy changes.
- Initial categories: `missing_information`, `ambiguity`, `inconsistency`, `unresolved_decision`, `missing_edge_case`, `testability`, and `context_mismatch`.
- Initial severity vocabulary: `low`, `medium`, `high`, and `critical`; changes require a schema-version change rather than a database enum change.
- Public keys retain `RUN` for analysis runs and `CALL` for LLM calls, add `FND` and `FREV`, and remove `UPD` and `SPEC`. Use `PCTX` if project context is exposed directly; keep all other existing prefixes.

Removed Prisma concepts:

- `FeatureOrigin`
- `FeatureUpdate`
- `SpecRunKind`
- `SpecRunStatus`
- `SpecRun`
- `GeneratedSpec`
- generation/consolidation target logic
- spec version, validity, parent derivation, warnings, and incorporated-update alignment

## 6. Reproducible context and evidence boundary

Use two immutable stages rather than the old overloaded `contextSnapshot`:

1. `inputSnapshot`, created with the run, captures the feature title and specification, feature context text, project context text, selected ready file identities, exact S3/prepared version IDs and checksums, settings, and source IDs.
2. `preparedContextSnapshot`, written once while preparing, captures the exact normalized documents/segments presented to analysis, including stable source IDs, segment IDs, titles, source types, metadata, and locators.

Conceptual internal contracts:

```ts
interface AnalysisInputSnapshot {
  feature: { publicKey: string; title: string; specificationContent: string };
  projectContext: { publicKey: string; content: string } | null;
  featureContext: { publicKey: string; content: string };
  files: readonly SnapshotStorageObject[];
  analysisSettings: Readonly<Record<string, unknown>>;
}

interface ContextDocument {
  sourceId: string;
  sourceType: 'feature_specification' | 'feature_context' | 'project_context' | 'uploaded_file';
  title: string;
  metadata: Readonly<Record<string, unknown>>;
  segments: readonly ContextSegment[];
}

interface EvidenceReference {
  sourceId: string;
  segmentId: string;
  locator?: string;
}
```

The internal source model is deliberately extensible to later organization context, project files, repository revisions, or connectors. None of those sources is implemented in this refactor.

When a selected ready file enters `inputSnapshot`, preserve the current transaction that sets `StorageObject.firstUsedAt` without changing an already-set value. Purge eligibility must continue to consult this field. Evidence must never resolve against the latest mutable context or an overwritten object.

## 7. Target API boundaries

Implement during the application/domain refactor:

```text
POST   /projects/:projectKey/features
GET    /projects/:projectKey/features
GET    /projects/:projectKey/features/:featureKey
GET    /features/:featureKey
PATCH  /features/:featureKey
DELETE /features/:featureKey

GET    /features/:featureKey/context
PATCH  /features/:featureKey/context
POST   /features/:featureKey/context/files
GET    /features/:featureKey/context/files/archive

GET    /projects/:projectKey/context
PATCH  /projects/:projectKey/context

existing storage-object confirm/selection/access/purge endpoints
```

Feature create/update/response contracts use `specificationContent`; they do not expose `brief`, `origin`, `includeInProjectContext`, activity based on generated specs, or alignment. Context contracts use `content`.

Remove all `/feature-updates/...` context/file endpoints and their backend service/module support.

Document, but do not implement until the analyzer vertical slice:

```text
POST /features/:featureKey/analysis-runs
GET  /analysis-runs/:analysisRunKey
GET  /features/:featureKey/analysis-runs
GET  /analysis-runs/:analysisRunKey/findings
POST /analysis-findings/:findingKey/reviews
```

The future controller will call one analysis application service. That service owns authorization, the one-active-run invariant, immutable snapshot creation, orchestration, persistence, and review recording. The engine port only analyzes a prepared input; it does not know HTTP, Prisma, S3 URLs, or Console concerns.

## 8. ADR disposition

Do not erase history. Add supersession metadata and links so an agent can distinguish historical rationale from current rules.

### Add

- `ADR-0030 Make Specification Analysis the Core Product Domain`: engine/Console distinction, Feature as sole unit, findings as output, generated specs removed, human review separate, reproducible runs, modular-monolith scope.
- `ADR-0031 Model Feature Specifications and Traceable Analysis Inputs`: `specificationContent`, ProjectContext, ContextArtifact, exact S3 versions, two-stage snapshots, source/segment/evidence identity.
- `ADR-0032 Define the Analysis Application Boundary and Lifecycle`: statuses, one active run per Feature, run/finding/review ownership, engine/context ports, deferred HTTP execution endpoints, and deferred analyzer details.

### Supersede

- ADR-0003 core domain hierarchy
- ADR-0006 GeneratedSpec JSONB
- ADR-0012 asynchronous spec generation inside Nest
- ADR-0013 prompts/schema validation (replace its product-specific rule in ADR-0032 while retaining the general pattern)
- ADR-0016 feature/update/project contexts
- ADR-0017 SpecRun snapshot model
- ADR-0018 GeneratedSpec versions
- ADR-0019 generation lifecycle/retries/quality/persistence
- ADR-0020 FeatureUpdate entity
- ADR-0021 consolidation and alignment

### Amend, preserving still-valid decisions

- ADR-0007: context intake serves analysis rather than spec generation.
- ADR-0009: Console wording; React/Vite decision remains.
- ADR-0010: local-first prototype remains.
- ADR-0011: S3 remains; historical references now belong to analysis input snapshots.
- ADR-0014: integrations remain deferred; describe future context adapters neutrally.
- ADR-0015: auth remains minimal; terminology only.
- ADR-0022: frontend architecture remains; feature surfaces become Specification/Context/Analyses.
- ADR-0024 and ADR-0025: form/server-state choices remain; examples/contracts change.
- ADR-0026: entity action surfaces remove update/alignment/generated-spec concepts.
- ADR-0028: public identifier boundary adds analysis/finding/review identifiers and removes old types.
- ADR-0029: preserve the context-file lifecycle; update SpecRun wording and snapshot ownership.

### Preserve as accepted history/current architecture

- ADR-0001 lightweight organization wrapper
- ADR-0002 modular monolith
- ADR-0008 trunk-based development
- ADR-0023 reusable frontend logic
- ADR-0025 TanStack Query, except examples if needed
- ADR-0027 project/feature public identifiers

ADR-0004 and ADR-0005 remain historical/superseded. Their old alternatives should not be revived.

## 9. Migration strategy recommendation

Create one new forward migration after `20260812000000_context_file_lifecycle`. Do not edit the four existing migrations.

Recommended sequence inside migration work:

1. Run a read-only preflight against the target database. Confirm counts for `feature_update`, update-owned `context_artifact`, their `storage_object` rows, `spec_run`, `generated_spec`, and `llm_call_log` are zero. If not zero, stop; this plan intentionally contains no legacy generated-output conversion.
2. Preserve Feature, feature-owned ContextArtifact, and StorageObject rows.
3. Rename/backfill `feature.brief` to non-null `specification_content` using empty string for nulls.
4. Rename `project_context_summary` to `project_context` and related IDs/sequences/indexes, or recreate it only if the preflight proves the environment empty. Insert missing project-context rows where necessary.
5. Rename `context_artifact.prompt_content` to `content`; delete obsolete update ownership only after the zero-data assertion; make `feature_id` non-null and unique.
6. Drop generated-spec/run/update foreign keys, tables, enums, sequences, and obsolete columns.
7. Create analysis enums, sequences, tables, foreign keys, indexes, partial active-run uniqueness, and immutable/write-once guards that are practical at the database boundary.
8. Rewire `LlmCallLog` as a new analysis-owned table rather than pretending generation calls have compatible meaning.
9. Regenerate Prisma Client and test both a fresh migration chain and an upgrade from the prior migration head.

No SQL migration should call S3, delete S3 keys, or synthesize fake evidence. The zero-data preflight is what makes removal of update-owned metadata safe. Feature-owned file rows and every lifecycle field are retained exactly.

Why not squash: the context-file migration was just merged and may already be applied. A forward migration proves that the repository can evolve safely and avoids divergent migration checksums. The absence of valuable legacy output keeps the migration simple without rewriting history.

## 10. Implementation phases and commits

Each phase below is independently reviewable. Do not begin analyzer implementation as part of these commits.

### Phase 1 — `docs(architecture): adopt specification analysis domain`

Status: **complete; committed as `0910c6b`**

Purpose: establish the architectural source of truth before code changes.

Affected files:

- `README.md`
- `docs/architecture/README.md`
- new ADR-0030, ADR-0031, ADR-0032
- supersession/amendment headers in the ADRs listed above
- `docs/architecture/diagrams/01-c4-system-context/**`
- `docs/architecture/diagrams/02-c4-container/**`
- `docs/architecture/diagrams/03-erd-core-mvp/entity-relation-diagram.md`
- renamed `docs/architecture/diagrams/04-sequence-analysis-lifecycle/sequence-diagram.md` with an analysis-boundary/lifecycle diagram; all links were updated atomically
- `docs/architecture/diagrams/05-c4-frontend-navigation/README.md`

Checks:

- Repository search confirms current docs no longer instruct implementation of GeneratedSpec, FeatureUpdate, consolidation, or alignment; historical ADR text remains clearly marked superseded.
- Verify all ADR and diagram links manually.
- No runtime or Prisma diff.

Dependencies: none.

### Phase 2 — `docs(agents): align guidance with analysis engine`

Status: **complete; user-approved**

Purpose: prevent coding-agent instructions and local UI skills from enforcing the superseded model.

Affected files:

- `AGENTS.md`
- `frontend/AGENTS.md` if examples or page rules need terminology updates
- `.agents/skills/create-page/SKILL.md`
- `.agents/skills/create-component/references/component-design-guidelines.md`
- skill metadata only if descriptions mention obsolete behavior

Checks:

- Search agent/skill files for old mandatory generation, alignment, FeatureUpdate, and GeneratedSpec rules.
- Validate both local skills using the skill validation workflow.
- No runtime or Prisma diff.

Dependencies: Phase 1, because instructions must cite accepted ADRs.

### Phase 3 — `refactor(product): center features on specification analysis`

Status: **complete on 2026-08-28; uncommitted pending user review**

Purpose: cut the public backend/Console product contract over before the destructive schema replacement, using a short-lived compatibility mapping to old columns.

Behavior:

- API and frontend use `specificationContent` while the service temporarily maps it to `brief`.
- Feature creation temporarily writes a fixed internal `brand_new` value and `includeInProjectContext=false` only to satisfy the old schema; neither value appears in the public contract.
- Remove generated-spec activity/alignment projections.
- Console tabs become `Specification | Context | Analyses`, defaulting to Specification. Analyses remains an honest unavailable/empty state; no fake request is made.

Affected files:

- `backend/src/features/dto/create-feature.dto.ts`
- `backend/src/features/dto/update-feature.dto.ts`
- `backend/src/features/features.service.ts`
- `backend/src/features/features.service.spec.ts`
- relevant `backend/test/app.e2e-spec.ts` fixtures/assertions
- `frontend/src/features/features/api/**`
- `frontend/src/features/features/model/**`
- `frontend/src/features/features/lib/**`
- `frontend/src/features/features/ui/FeatureActionsProvider.tsx`
- `frontend/src/pages/projects/ui/**`
- `frontend/src/pages/project/ui/**`
- `frontend/src/pages/feature/ui/**`
- router/page tests affected by labels or DTO fixtures

Checks:

- Backend unit tests, e2e tests, lint, and build.
- Frontend tests, lint, and build.
- Contract assertions confirm old fields are absent from API responses and requests.
- Manual smoke: create, edit, list, open, and delete a Feature; specification and context tabs navigate correctly.

Dependencies: Phase 2.

### Phase 4 — `refactor(db): replace generated specs with analysis findings`

Status: **ready; do not start until Phase 3 is reviewed and committed**

Purpose: make persistence match the accepted domain and remove the compatibility layer.

Affected files:

- `backend/prisma/schema.prisma`
- one new `backend/prisma/migrations/<timestamp>_specification_analysis_domain/migration.sql`
- `backend/prisma/seed.ts`
- `backend/src/common/public-identifiers.ts`
- `backend/src/common/public-identifiers.spec.ts`
- `backend/src/app.module.ts`
- remove `backend/src/feature-updates/**`
- `backend/src/features/**` to use actual `specificationContent` and AnalysisRun deletion guard
- `backend/src/context/context.controller.ts`
- `backend/src/context/context.module.ts`
- `backend/src/context/context.service.ts`
- `backend/src/context/context.service.spec.ts`
- affected context policy/processor tests and e2e fixtures

Checks:

- `prisma format`, `prisma validate`, and Prisma Client generation.
- Apply the full migration chain to a fresh empty database.
- Apply only the new migration to a database at the previous migration head.
- Inspect constraints, sequences, partial indexes, and write-once guards from PostgreSQL catalog output.
- Prove the migration preflight stops if obsolete rows or update-owned storage metadata exist.
- Backend unit, e2e, lint, and build.
- Frontend tests, lint, and build because generated Prisma/API changes can expose drift.
- S3 integration smoke: upload, confirm/process, select/archive, access, purge unused, and prevent purge after snapshot usage.

Dependencies: Phase 3. This commit removes the temporary `brief`/origin mapping atomically with the schema migration.

### Phase 5 — `feat(context): add editable project context`

Purpose: expose the project-level text input required by future analysis.

Affected files:

- new backend project-context DTO(s), service methods, and tests under `backend/src/workspace/**` or a context public API consistent with ADR-0002
- `backend/src/workspace/workspace.controller.ts`
- `backend/src/workspace/workspace.service.ts`
- `backend/src/workspace/workspace.service.spec.ts`
- e2e tests for tenant scoping and update validation
- new frontend project-context API/model/form/panel under `frontend/src/features/context/**`
- `frontend/src/pages/project/ui/**`

Checks:

- Backend unit/e2e/lint/build.
- Frontend focused tests plus full test/lint/build.
- Manual smoke: read/update empty and non-empty project context; reject cross-project access; preserve text after reload.

Dependencies: Phase 4 creates/renames the target table. It can be developed independently after that schema contract exists.

### Phase 6 — `refactor(analysis): establish reproducible engine inputs`

Purpose: define and test the boundary required by the later analyzer without implementing the analyzer or HTTP execution routes.

Affected files:

- new `backend/src/analysis/` domain contracts, application port, engine port, snapshot/evidence types, and focused tests
- `backend/src/context/context.service.ts` or a context module public service to build exact `AnalysisInputSnapshot`
- context snapshot tests covering mutable text and exact S3/prepared versions
- `backend/src/app.module.ts` only if a non-executing AnalysisModule is registered
- new architecture contract documentation for deferred analysis HTTP endpoints and response shapes

Checks:

- Type-level and unit tests prove the analysis boundary does not import controllers, React concepts, provider SDKs, or storage implementation internals.
- Snapshot tests prove later edits do not change an existing snapshot.
- File tests prove only selected, ready objects are captured and exact versions/checksums are retained.
- Transaction test proves `firstUsedAt` is set once when captured and is not reset.
- Prepared-context tests prove evidence source/segment IDs resolve within one immutable snapshot.
- Backend unit/e2e/lint/build; Prisma validation.

Dependencies: Phase 4 for analysis persistence and Phase 5 for project context.

### Phase 7 — `test(ui): align fixtures with analysis terminology`

Purpose: final repository-wide removal of executable old-domain assumptions and a regression pass. Most tests change with their owning phase; this commit is only for cross-cutting fixtures, stories, or snapshots that could not move earlier cleanly.

Affected files:

- remaining frontend/backend fixtures, Storybook stories, test helpers, and documentation examples found by repository-wide search
- shared component guidance/stories only where they encode alignment/generation-specific product text

Checks:

- Search executable code and current docs for all old terms. Remaining hits must be migration history or explicitly superseded ADR history.
- Full backend unit/e2e/lint/build.
- Full frontend test/lint/build and Storybook build if stories changed.
- `prisma validate`, fresh migration, and upgrade migration smoke.
- `git diff --check` and clean generated artifacts policy.

Dependencies: Phases 3-6.

## 11. Dependency graph and implementation order

```text
Phase 1 architecture ADRs/docs
  -> Phase 2 agent/skill guidance
      -> Phase 3 public product contract and Console cutover
          -> Phase 4 Prisma/domain replacement
              -> Phase 5 editable project context
                  -> Phase 6 analysis/context/evidence boundary
                      -> Phase 7 cross-cutting cleanup and regression
```

Phase 3 must precede Phase 4 so users do not see deleted database concepts after the migration. Phase 4 must atomically remove the compatibility mapping. Phase 6 waits for project context because its snapshot contract must capture the real editable source rather than a placeholder.

After Phase 7, the repository is stable for separate work on analyzer v0, finding verification, evals, and finally real analysis endpoints/Console workflows.

## 12. Risky intermediate states and mitigations

| Risk | Unsafe intermediate state | Mitigation |
|---|---|---|
| Docs vs instructions | New ADR accepted while AGENTS still forbids divergence | Phase 2 immediately follows Phase 1; no product code between them |
| API vs database | API uses `specificationContent` while DB requires old fields | Short-lived explicit service mapping in Phase 3; remove in Phase 4 |
| Prisma/client mismatch | Schema/migration changed but generated client or service still references removed models | Treat Phase 4 as atomic and run generation/build before commit |
| Destructive legacy removal | Unexpected old runs/specs or update files are dropped | Read-only preflight and fail/reset decision before migration |
| S3 orphaning | SQL removes update-owned StorageObject metadata but leaves private objects | Require zero update-owned files; never delete S3 from migration |
| Historical file protection | Dropping old run snapshots makes `firstUsedAt` meaning ambiguous | Require no old runs; retain feature file `firstUsedAt`; analysis snapshot owns future usage |
| Snapshot reproducibility | Run reads mutable project/feature context after creation | Separate immutable input and prepared snapshots; evidence resolves only inside prepared snapshot |
| Partial uniqueness | Prisma schema alone cannot express one active run | Migration-owned partial unique index plus concurrency test |
| Required one-to-one context | Prisma parent relation cannot require a child row | Create Feature+ContextArtifact transactionally, backfill, and test invariant through service APIs |
| Taxonomy churn | DB enums force migrations during analyzer evaluation | Store category/severity as schema-versioned strings |
| Review history loss | Updating finding status overwrites model output or feedback | Immutable finding plus append-only FindingReview |
| Fake product surface | Placeholder analysis endpoint implies capability and freezes a premature contract | Document contract only until real analyzer vertical slice |
| Oversized migration commit | Many removed relations fail in an opaque order | Hand-author/review SQL, test fresh and upgrade paths, inspect catalogs |
| UI cache drift | Query keys retain removed fields or stale projections | Update contracts/models/cache tests in the same Phase 3 commit |

## 13. Risks and open decisions

No unresolved decision blocks the first implementation task. The following must remain explicit and deferred:

- Analyzer/provider/model selection, prompt contents, retry limits, verifier behavior, deduplication, and eval design are out of scope.
- Exact external HTTP response shapes for run progress and findings should be documented provisionally in Phase 6 and finalized with the analyzer vertical slice, not implemented now.
- Confidence may later join severity/verification metadata only if evals show it is calibrated and useful.
- Organization context, project files, repository sources, and connectors are future source adapters; the internal source model must accommodate them without adding their persistence now.
- Whether ProjectContext needs a visible public key can be settled when its endpoint DTO is implemented; if exposed, use `PCTX` consistently.
- Database triggers for snapshot immutability should be added only where they do not prevent legitimate lifecycle transitions; application tests remain mandatory.
- If migration preflight finds any unexpected update-owned S3 objects, choose explicitly between lifecycle purge and a full disposable-environment reset before applying the migration.

## 14. Exact suggested next implementation task

After the user reviews and commits Phase 3, implement Phase 4 on the existing
`refactor/specification-analysis-engine` branch. Do not create a commit
automatically.

The next task is exactly the Phase 4 database/domain replacement documented
above: add the guarded forward migration and target Prisma model, remove the
temporary Feature service compatibility mapping and obsolete FeatureUpdates
runtime boundary, preserve the context-file lifecycle, and add analysis
persistence without implementing analyzer execution or deferred HTTP endpoints.

Stop after Phase 4 and request confirmation before Phase 5.
