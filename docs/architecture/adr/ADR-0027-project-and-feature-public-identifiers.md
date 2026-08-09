# ADR-0027: Use Public Identifiers in Project and Feature URLs

Date: 2026-08-09

Status: superseded by ADR-0028

## Context

Project and Feature URLs expose internal UUID primary keys. Those UUIDs remain
appropriate for relationships and internal write operations, but they make
user-facing links difficult to read and share. The transition must preserve
existing bookmarked UUID URLs and all authorization and parent-child checks.

## Decision

Add an immutable, positive `publicNumber` to Project and Feature while keeping
their UUID primary and foreign keys unchanged. PostgreSQL generates each
entity's numbers from its own sequence, and unique indexes enforce uniqueness.
The API formats numbers centrally as `PRJ-{number}` and `FEAT-{number}` and
returns the resulting `publicKey` without exposing number generation to the
frontend.

Project and nested Feature read routes accept either the entity-specific public
key or a UUID. Public keys use strict uppercase, positive-integer syntax.
Malformed identifiers return 400 and well-formed unknown identifiers return
404. Nested Feature resolution always constrains the Feature by the resolved
Project and existing organization visibility checks.

Frontend route builders use only response `publicKey` values for new links.
After a legacy UUID route resolves, React Router replaces it with the canonical
public-key path while retaining its query, hash, and location state. Existing
UUID-only mutation endpoints remain unchanged.

## Consequences

- Shared links are readable while database relationships and internal API
  operations continue to use UUIDs.
- Concurrent inserts are safe without application-side `MAX(...) + 1` logic.
- Existing UUID bookmarks remain usable during the transition.
- Public keys improve usability only; they do not grant access or replace
  authorization.
- Changing an assigned public number is rejected by database triggers, so
  published URLs remain stable.
