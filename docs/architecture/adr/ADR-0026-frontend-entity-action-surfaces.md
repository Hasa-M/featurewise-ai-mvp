# ADR-0026: Standardize Frontend Entity Action Surfaces and Edit Ownership

Date: 2026-07-30

Status: accepted

## Context

Entity actions must be reusable across route pages, lists, and the persistent
navigation shell without requiring every editable field to use the same
surface.
Feature context, generated-spec drafts, validation, and generation controls
need the dedicated Feature workspace. The generated-spec schema and
`schemaVersion` remain repository/backend owned under ADR-0013.

## Decision

Classify frontend actions as quick metadata actions, destructive confirmation
actions, or dedicated workspace editing.

| Entity/action | Surface | Values |
| --- | --- | --- |
| Organization edit | Contextual quick edit or quick-edit modal | Name |
| Project edit | Quick-edit modal | Name |
| Feature create | Creation modal | Title and origin |
| Feature edit | Quick-edit modal | Title, brief, include in project context |
| Feature delete | Destructive confirmation | No editable values |

Project creation/deletion remain excluded by ADR-0001 and ADR-0015.
FeatureUpdate actions are deferred.

Shared UI owns domain-neutral modal and menu mechanics. Workspace and Features
slices own DTOs, schemas, forms, mutations, cache updates, copy, and
provider-backed action hooks. `shared/api` remains generic HTTP transport;
there is no generic CRUD service or runtime entity registry.

Quick metadata actions default to the reusable modal when they must be
available from multiple surfaces. A consuming UI may instead present the same
narrow action contextually, such as an inline form in a dropdown or popover,
when that interaction is explicitly requested and remains accessible. The
owning feature keeps its modal action available so another surface can invoke
it without duplicating API or mutation behavior.

Use React Hook Form and Zod for forms and TanStack Query for pessimistic
mutations. Metadata changes never rewrite immutable run snapshots, change
validated specs, or automatically start a run. Feature origin is selected at
creation and remains immutable.

The authenticated app mounts action providers once. Creation opens the new
Feature by default; edit stays on the current surface; deletion redirects to
the parent Project only when the deleted Feature owns the current route.

Add a domain-neutral PageHeader registration provider. Lazy pages register
`PageHeaderProps`; AppShell passes the active registration to PageStructure.
Token ownership prevents an unmounting page from clearing a newer header.

## Consequences

- Entity actions behave consistently without leaking domain logic into shared
  UI.
- Quick metadata actions can match their immediate UI context while retaining
  a reusable modal entry point.
- Narrow inputs keep context, schema, spec, and generation fields out of quick
  edits.
- Brief and project-context metadata may affect future work but do not alter
  historical snapshots or validated specs.
- Future entities require explicit field classification, a narrow input type,
  an owner, cache/navigation policy, and tests.
