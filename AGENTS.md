# AGENTS.md — Featurewise
 
Canonical instructions for all AI coding agents (Codex, Claude Code, and any future tool).
CLAUDE.md imports this file. Do not duplicate rules elsewhere.
 
## What this project is
 
Featurewise is a product-intent readiness layer: it turns messy feature intent and context
into structured, reviewable implementation-readiness specifications.
Phase 1 is a local-first MVP prototype built by a solo developer. It is NOT a production system.
 
## Architecture documentation is the source of truth
 
This is the most important rule in this file:
 
1. Before designing or implementing anything non-trivial, READ the relevant ADRs in
   `docs/architecture/adr/` and the diagrams in `docs/architecture/diagrams/`.
   Consider still they could be not perfect and with some errors or things to update/change.
   In particular the 'docs/architecture/diagrams/03-erd-core-mvp' is with impreciso e con lacune. 
3. When you have a doubt about structure, naming, flow, or scope: check the ADRs FIRST.
   Aske me considering them.
4. If a requested change conflicts with an accepted ADR: STOP. Do not silently diverge.
   Say which ADR conflicts and propose either a different approach or an ADR amendment.
5. If you are making a significant new architectural decision, propose a new ADR
   (same minimal style: Context / Decision / Consequences). Do not bury decisions in code.
6. The spec generation flow is fully defined in
   `docs/architecture/diagrams/04-sequence-generate-spec-new-feature/` and ADR-0019.
   Implement exactly that flow. Do not invent statuses, retries, or endpoints.
## Stack
 
- Backend: NestJS + TypeScript, modular monolith, REST/JSON (ADR-0002, ADR-0009 file).
- Frontend: React + Vite + TypeScript (separate app; backend owns all business logic).
- Database: PostgreSQL. GeneratedSpec content is JSONB with `schemaVersion` (ADR-0006).
- Object storage: AWS S3 for images and raw context artifacts; Postgres stores metadata
  and keys only (ADR-0011 file).
- LLM: external provider called ONLY from the backend. The frontend never calls the LLM.
## Domain model (do not improvise on this)
 
- Organization → Project → Feature → (FeatureUpdate 0..N) → SpecRun → GeneratedSpec (ADR-0003, ADR-0020).
- Feature.origin: brand_new | mapped_existing (ADR-0020). Feature has NO type column; ADR-0004/0005 are superseded.
- FeatureUpdate = one increment inside a Feature. Exactly one nesting level. Own ContextArtifact, own runs and specs.
- Each Feature AND each FeatureUpdate has exactly ONE editable ContextArtifact (ADR-0016).
- SpecRun: featureId always set, featureUpdateId nullable (target). runKind: generation | consolidation (feature-target only).
- Preconditions (else 422): generation on Feature requires origin=brand_new; generation on FeatureUpdate requires a usable
 parent baseline (non-empty parent context, or uploads, or parent valid spec); consolidation requires >=1 validated,
  not-yet-incorporated update spec.
- At most one non-terminal run per TARGET → 409, enforced by partial unique indexes (ADR-0019/0020).
- GeneratedSpec versions are sequential per target (last+1). A valid spec is FROZEN; edits require a new version.
  Marking valid atomically un-validates the previous one. At most one valid spec per TARGET (ADR-0018/0021).
- Feature alignment (aligned | updates_pending) is COMPUTED from incorporatedUpdates vs current valid update specs —
  never stored, never auto-resolved by regeneration (ADR-0021).
## Hard invariants (violating these = wrong implementation)
 
- Module boundaries: each NestJS module exposes a public API; other modules must not
  import its internals (ADR-0002). Keep generation extractable to a worker later.
- At most ONE non-terminal SpecRun per feature; concurrent start → 409 (ADR-0019).
- SpecRun statuses are exactly: queued, preparing_context, calling_llm, validating_output,
  repairing_output, checking_quality, persisting, completed, failed (ADR-0019).
- SpecRun snapshots are immutable. S3 object keys are NEVER overwritten; uploads always
  create new keys (ADR-0017).
- Transient LLM errors: max 3 attempts. Schema-invalid output: max 2 repair round-trips,
  then failed. Log every LLM attempt (ADR-0019).
- Prompt templates are versioned files in this repository. No DB prompt management.
  Generated JSON is runtime-validated against its schema version (ADR-0013).
- A new GeneratedSpec is created as version 1 with `valid = false`. At most one valid
  spec per feature. Marking valid is a user action, never automatic (ADR-0018 file).
- Quality checks are non-blocking: warnings only, never a failed run (ADR-0019).
- Passwords: Argon2id via a standard library. NEVER write custom hashing/salting (ADR-0015).
## Phase 1 scope guards (do NOT build these, even if they seem useful)
 
No queue/worker/separate AI service (ADR-0012). No real third-party integrations —
Figma/GitHub/Jira context arrives as uploaded or pasted artifacts (ADR-0014).
No teams, roles, permissions, invitations, 2FA, password reset (ADR-0015).
No public production deployment (ADR-0010 file). If a task seems to require one of
these, flag it instead of building it.
 
## Git workflow (ADR-0008 file)
 
Trunk-based development on `main`, short-lived branches deleted after merge.
Conventional Commits: `type(scope): imperative description`.
Allowed types: feat, fix, docs, test, refactor, chore, build, ci, perf, style, revert, spike.
 
## Commands
 
The project is not scaffolded yet. After scaffolding, replace this section with the real
commands (install, dev, test, lint, migrations). Until then, ask before assuming any command.
 
## General behavior
 
- Prefer small, reviewable changes that map to one conventional commit.
- Do not add dependencies without stating why; prefer what NestJS/Vite already provide.
- TypeScript strict mode; no `any` unless justified in a comment.
- When uncertain between two approaches, present both with tradeoffs instead of picking silently.
