# ADR-0028: Use Public Identifiers at the API Boundary

Date: 2026-08-09

Status: accepted

Amended by: [ADR-0030](ADR-0030-specification-analysis-core-domain.md),
[ADR-0031](ADR-0031-feature-specifications-and-traceable-analysis-inputs.md),
[ADR-0032](ADR-0032-analysis-application-boundary-and-lifecycle.md)

> The identifier format and API-boundary rules remain accepted. The target
> registry removes `UPD` and `SPEC`, keeps `RUN` and `CALL` for AnalysisRun and
> LlmCallLog, adds `FND` and `FREV`, and uses `PCTX` if ProjectContext receives
> a public endpoint. The historical table below reflects the pre-refactor
> schema until the database phase applies the new registry.

Supersedes ADR-0027 and the external-identifier portions of ADR-0015 and
ADR-0019. UUID use inside the backend, database relations, authorization, and
immutable snapshots remains unchanged.

## Context

ADR-0027 introduced readable identifiers for Project and Feature URLs while
temporarily retaining mixed UUID/public-key API behavior. Applying that model
one entity at a time would repeatedly change contracts and allow internal
database identifiers to leak into frontend state, routes, and requests.

Every domain entity needs the same durable external identity model, including
entities whose HTTP endpoints have not been implemented yet.

## Decision

Every domain table has an immutable, positive integer publicNumber. Each table
owns an independent PostgreSQL sequence, the column default calls nextval, a
unique index enforces table-local uniqueness, a check constraint enforces
positivity, and an update trigger rejects changes. UUID primary and foreign
keys remain the only identifiers used for internal relations and backend
business operations.

The central public-identifier registry defines these external prefixes:

| Entity | Prefix |
| --- | --- |
| Organization | ORG |
| User | USR |
| Project | PRJ |
| ProjectContext | PCTX (when exposed directly) |
| Feature | FEAT |
| ContextArtifact | CTX |
| StorageObject | OBJ |
| AnalysisRun | RUN |
| AnalysisFinding | FND |
| FindingReview | FREV |
| LlmCallLog | CALL |

External identifiers are formatted as PREFIX-positive_integer. Formatting and
strict parsing are centralized in the backend. Keys are uppercase, contain no
leading zero, and are bounded by PostgreSQL's positive integer range. Malformed
or wrong-prefix keys return 400; valid but unknown or invisible keys return
404.

All Project and Feature HTTP routes, including reads and mutations, accept only
public keys. Organization routes and authentication responses also expose only
public keys. JWT sub contains a User public key. Previously issued UUID-subject
tokens are invalid and require normal reauthentication.

DTO identity fields use publicKey for the represented resource and
entity-specific names such as organizationKey, projectKey, featureKey, or
createdByKey for relationships. The frontend does not receive, store, derive,
route with, or send domain UUIDs. A backend module resolves an incoming public
key under the existing authorization and parent constraints, then uses the
resolved UUID internally. Nested resolution must constrain the child to the
resolved parent.

Future external endpoints for ContextArtifact, StorageObject, AnalysisRun,
AnalysisFinding, FindingReview, LlmCallLog, and ProjectContext must follow the
same registry and resolution boundary from their first implementation.
Internal snapshots may retain UUID references because they never cross the API
boundary.

## Consequences

- Frontend and API contracts have one consistent identifier model with no UUID
  compatibility fallback.
- Existing UUID URLs and old JWTs stop working when backend and frontend are
  deployed together.
- Authorization and visibility rules remain unchanged; public keys are
  identifiers, not security controls.
- Concurrent inserts remain safe without application-side number allocation.
- Public identifiers are stable but enumerable, which is acceptable because
  access control continues to be enforced independently.
- New domain endpoints must include public-key resolution and UUID-leakage
  contract tests.
