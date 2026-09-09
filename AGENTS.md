# AGENTS.md — Featurewise
 
Canonical instructions for all AI coding agents (Codex, Claude Code, and any future tool).
CLAUDE.md imports this file. Do not duplicate rules elsewhere.
 
## What this project is
 
Featurewise is a Specification Analysis Engine for software product development. It analyzes
user-authored feature specifications and supporting context and returns individually addressable,
evidence-backed findings. The Featurewise Console is its first-party control plane and client.
The MVP is a local-first prototype built by a solo developer. It is NOT a production system.
 
## Architecture documentation is the source of truth
 
This is the most important rule in this file:
 
1. Before designing or implementing anything non-trivial, READ the relevant ADRs in
   `docs/architecture/adr/` and the diagrams in `docs/architecture/diagrams/`.
   Consider that they may still contain errors or need amendment.
2. ADR-0030, ADR-0031, and ADR-0032 are authoritative for the product domain, traceable
   analysis inputs, and analysis lifecycle. Superseded terminology remains only where
   historical ADRs and migrations preserve the decisions and schema they originally recorded.
3. When you have a doubt about structure, naming, flow, or scope, check the ADRs FIRST and
   ask the user with the relevant architectural context.
4. If a requested change conflicts with an accepted ADR: STOP. Do not silently diverge.
   Say which ADR conflicts and propose either a different approach or an ADR amendment.
5. If you are making a significant new architectural decision, propose a new ADR
   (same minimal style: Context / Decision / Consequences). Do not bury decisions in code.
6. The accepted analysis boundary and lifecycle are defined by ADR-0030 through ADR-0032
   and `docs/architecture/diagrams/04-sequence-analysis-lifecycle/`. Do not invent deferred
   endpoints, analyzer behavior, retries, prompts, provider policy, or verification policy.

## Stack
 
- Backend: NestJS + TypeScript, modular monolith, REST/JSON (ADR-0002, ADR-0009 file).
- Frontend: React + Vite + TypeScript Featurewise Console (separate app; backend owns all
  business logic).
- Database: PostgreSQL. Analysis runs, findings, and reviews are relational; versioned
  analysis settings and immutable snapshots use JSON where defined by ADR-0031/0032.
- Object storage: private AWS S3 for uploaded context originals and prepared derivatives;
  Postgres stores metadata and immutable keys/version identifiers only (ADR-0011/0029/0031).
- LLM/model providers are called ONLY from the backend analysis boundary. The frontend never
  calls a provider directly.

## Domain model (do not improvise on this)
 
- Organization → Project → Feature → AnalysisRun → AnalysisFinding → FindingReview
  (ADR-0030/0032).
- Feature is the sole analysis unit. Whether work is new or pre-existing belongs in the
  specification or supporting context, not in a discriminator or nested update entity.
- `Feature.specificationContent` is the user-authored canonical feature specification.
- Each Feature owns exactly one editable `ContextArtifact`. Its `content` and selected uploaded
  files are supporting context, separate from the specification (ADR-0031).
- Each Project owns at most one editable `ProjectContext`; it is a distinct analysis source,
  not a generated summary or feature-membership projection.
- An AnalysisRun returns zero or more immutable, evidence-backed AnalysisFindings. Evidence
  resolves only inside that run's exact prepared-context snapshot.
- FindingReview records are append-only. Accepting, dismissing, resolving, or deferring a
  finding never mutates the original model assertion; current disposition is a projection of
  the latest review.

## Hard invariants (violating these = wrong implementation)
 
- Module boundaries: each NestJS module exposes a public API; other modules must not import its
  internals (ADR-0002). Keep analysis extractable from the in-process MVP later.
- At most ONE non-terminal AnalysisRun per Feature, enforced race-safely by a PostgreSQL partial
  unique index; an application pre-check is only a fast path (ADR-0032).
- AnalysisRun statuses are exactly: queued, preparing_context, analyzing, validating_output,
  repairing_output, verifying_findings, persisting, completed, failed (ADR-0032).
- `inputSnapshot` is immutable from run creation. `preparedContextSnapshot` may transition once
  from null to a value during context preparation and is write-once afterward (ADR-0031/0032).
- Only selected, ready files enter a new input snapshot. Capture exact original and prepared S3
  keys, version IDs, checksums, MIME types, sizes, and preparation versions, and atomically set
  `StorageObject.firstUsedAt` only if it is unset. Used objects cannot be physically purged.
- S3 object keys are NEVER overwritten. Uploads and prepared derivatives always create immutable,
  versioned keys; SQL migrations never delete S3 objects (ADR-0029/0031).
- Prompt templates are versioned repository files. Engine output is runtime-validated against
  the schema version recorded by the AnalysisRun, and every LLM attempt is logged. Retry limits,
  provider/model selection, prompt content, verification, deduplication, and evaluation policy
  are deferred (ADR-0032).
- Future analysis start/status/history, finding, and review endpoints must not be implemented
  until a real analyzer vertical slice backs them (ADR-0032).
- External API identities use immutable public keys under ADR-0028 as amended by ADR-0030–0032.
  The frontend never receives, stores, derives, routes with, or sends domain UUIDs.
- Passwords: Argon2id via a standard library. NEVER write custom hashing/salting (ADR-0015).

## MVP scope guards (do NOT build these, even if they seem useful)
 
No queue, worker, dedicated AI service, or multi-agent orchestration. Analysis is asynchronous
from the client perspective but remains inside the NestJS process for the local-first MVP
(ADR-0032). GitHub repository context is the sole real third-party integration
authorized by ADR-0033, which amends ADR-0014/0031/0032. Figma/Jira context arrives
as uploaded or pasted artifacts; other connectors remain deferred.
No teams, roles, permissions, invitations, 2FA, password reset (ADR-0015).
No public production deployment (ADR-0010 file). If a task seems to require one of
these, flag it instead of building it.
 
## Git workflow (ADR-0008 file)
 
Trunk-based development on `main`, short-lived branches deleted after merge.
Conventional Commits: `type(scope): imperative description`.
Allowed types: feat, fix, docs, test, refactor, chore, build, ci, perf, style, revert, spike.
 
## Commands
 
Backend commands are run from `backend/`:

- Install dependencies: `npm install`
- Development server: `npm run start:dev`
- Build: `npm run build`
- Unit tests: `npm test`
- End-to-end tests: `npm run test:e2e`
- Lint: `npm run lint`

Prisma is wired under `backend/prisma/`. The backend package provides `prisma:generate` and
`prisma:seed` scripts but no npm migration script; inspect the current schema, migrations,
and package scripts before database work.
 
## General behavior

### Development harness and browser verification

Use [the harness runbook](docs/testing/development-harness.md) for isolated
fixtures, API/database inspection, input capture, and integration tests.
Use Chrome DevTools MCP from Codex CLI when a task heavily affects a user-visible
workflow, navigation, forms, or browser-specific behavior, or when browser
verification is requested. The Claude Code Chrome extension is an optional desktop
alternative if we are using Claude Code. Skip unrelated browser exploration
when focused backend tests suffice.
Record expected/actual results and useful evidence; repeat only after relevant
changes, failures, or unresolved concerns. Never report an unavailable browser
check as passed. The harness capture command can set `firstUsedAt`; it is not a
read-only preview. Keep fixture data and generated artifacts in the harness.

- Prefer small, reviewable changes that map to one conventional commit.
- Do not add dependencies without stating why; prefer what NestJS/Vite already provide.
- TypeScript strict mode; no `any` unless justified in a comment.
- When uncertain between two approaches, present both with tradeoffs instead of picking silently.
