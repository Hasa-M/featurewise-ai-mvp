# C4 Component — Featurewise Console Navigation

## Purpose and implementation status

This document describes the accepted target navigation for the Featurewise
Console while preserving the current React architecture, route ownership,
persistent shell, and TanStack Query boundaries. The product terminology and
tabs are implemented in later refactor phases; analysis execution and findings
UI remain unavailable until a real backend vertical slice exists.

## Target routes and workspaces

- `/` renders Projects and remains the application home.
- `/projects/:projectKey` renders a Project workspace with `features` and
  `context` tabs. ProjectContext becomes editable only after the corresponding
  backend contract is implemented.
- `/projects/:projectKey/features/:featureKey` renders a Feature workspace with
  `specification`, `context`, and `analyses` tabs. Missing or invalid values
  resolve to `specification`.

The Specification tab edits the user's canonical
`Feature.specificationContent`. Context edits separate supporting
`ContextArtifact.content` and selected/archived files. Analyses honestly shows
an unavailable or empty state until real endpoints exist; it must not issue a
fake request.

Project and Feature public keys (`PRJ-*` and `FEAT-*`) remain the only frontend
identifiers. Central route builders create links from response `publicKey`
values. UUIDs stay backend-internal under ADR-0028.

## Persistent layout and ownership

`AppShell` and `PageStructure` remain mounted above lazy route pages.
`PageStructure` owns the single `main` landmark. Header, Sidebar, user menu,
action providers, query observers, and PageHeader registration survive child
navigation.

The Sidebar hierarchy remains:

```text
Projects
└── Project
    └── Features
        └── Feature
```

Workspace and Features slices own typed API contracts, mappings, queries,
forms, actions, and cache updates. Context owns supporting text and the private
file lifecycle. A later Analysis slice will own runs, findings, evidence, and
review behavior; it must call the backend application boundary rather than
contain engine rules.

## Server-state boundaries

TanStack Query remains the Console server-state cache and React Router remains
the URL/navigation owner. Existing organization, project, feature, feature
context, and file-archive query policies stay in force until their owning
implementation phase changes the corresponding contract.

Removed product projections include generated-spec version/count, generation
activity, FeatureUpdate state, and alignment. Analysis query keys, polling,
findings, and review mutations are added only with real endpoints. No
placeholder cache entry is introduced during the documentation reset.

## Component diagram

```mermaid
C4Component
  title Featurewise Console target navigation components

  Person(user, "Authenticated user", "Manages feature specifications/context and reviews analyses")

  Container_Boundary(console, "React + Vite Featurewise Console") {
    Component(auth, "AuthProvider", "React context", "Restores session and clears cached data on logout/failure")
    Component(router, "React Router", "Data router", "Matches URLs and lazy-loads route modules")
    Component(shell, "AppShell + PageStructure", "React components", "Keeps Header, Sidebar, and Outlet mounted")
    Component(actions, "Entity action providers", "React context", "Own reusable organization, project, and feature actions")
    Component(header, "PageHeader registration", "React context", "Connects lazy route breadcrumbs/actions to the persistent shell")
    Component(pages, "Projects, Project, and Feature pages", "Lazy route modules", "Compose Specification, Context, and Analyses workspaces")
    Component(query, "TanStack QueryClient", "In-memory server-state cache", "Caches, deduplicates, retries, seeds, and prefetches REST data")
    Component(slices, "Workspace, Features, Context, and future Analysis slices", "Typed feature boundaries", "Own API DTOs, mappings, hooks, uploads, findings, and reviews")
    Component(http, "Shared HTTP client", "Fetch wrapper", "Adds API base URL, auth, JSON parsing, and normalized errors")
  }

  Container(api, "Backend API", "NestJS REST/JSON", "Owns authorization, context lifecycle, and analysis business logic")
  Container(storage, "Private AWS S3", "Object storage", "Stores immutable context originals and prepared derivatives")

  Rel(user, router, "Activates links", "Browser history")
  Rel(router, shell, "Renders authenticated layout")
  Rel(shell, pages, "Renders active child", "Outlet")
  Rel(pages, header, "Registers breadcrumb and actions")
  Rel(header, shell, "Supplies active PageHeader props")
  Rel(shell, actions, "Invokes shared entity actions")
  Rel(shell, query, "Observes navigation resources")
  Rel(pages, query, "Observes route resources")
  Rel(auth, query, "Clears on logout/session failure")
  Rel(query, slices, "Executes stable query options")
  Rel(slices, http, "Calls typed endpoint functions")
  Rel(http, api, "GET/POST/PATCH/DELETE", "REST/JSON + bearer token")
  Rel(slices, storage, "Uploads bytes", "Backend-authorized presigned POST")
  Rel(api, storage, "Confirms, prepares, signs access, and cleans up", "AWS SDK")
```

## Performance and failure boundaries

- Lazy child routes remain separate production chunks and the persistent shell
  avoids global remounts.
- Cached server data remains the source of truth; local state is limited to
  explicit editing drafts.
- Prefetch remains intent-based and freshness determines repeat requests.
- Authorization and resource visibility stay backend-owned.
- Errors remain local to their owning shell, page, context/file, or future
  analysis surface.
