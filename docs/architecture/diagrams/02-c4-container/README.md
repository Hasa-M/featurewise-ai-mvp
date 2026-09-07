# C4 Container — Featurewise

## Purpose

This diagram shows the container architecture for the local-first MVP. The
React, NestJS, PostgreSQL, and AWS S3 containers implement the current product
boundary; the analysis engine adapter and provider calls remain deferred.

## Diagram

```mermaid
C4Container
  title Featurewise local-first containers

  Person(user, "Authenticated user", "Manages specifications/context and reviews findings")

  System_Boundary(featurewise, "Featurewise") {
    Container(console, "Featurewise Console", "React, Vite, TypeScript", "First-party client for Specification, Context, and Analyses workflows")
    Container(api, "Backend API", "NestJS, TypeScript, REST/JSON", "Modular monolith owning authorization, context lifecycle, analysis application boundary, persistence, and future analyzer orchestration")
    Container(repository, "Repository Context Module", "NestJS + provider-neutral port", "Owns GitHub connection, filtering, navigation, and exact repository revision capture")
    ContainerDb(db, "PostgreSQL", "PostgreSQL", "Ownership data, editable context, immutable analysis runs, findings, reviews, and call logs")
    ContainerDb(storage, "Private object storage", "AWS S3", "Immutable original and prepared context objects")
  }

  System_Ext(llm, "External LLM provider", "Future model-provider adapter used only by the backend")
  System_Ext(github, "GitHub API", "Authorized GitHub App installation with Contents read-only")
  System_Ext(integrations, "Deferred context/client adapters", "Jira, Linear, Figma, Azure DevOps, CLI, MCP, or embedded clients")

  Rel(user, console, "Uses", "Browser")
  Rel(console, api, "Calls first-party adapter", "HTTPS REST/JSON")
  Rel(console, storage, "Uploads bytes", "Backend-authorized presigned POST")
  Rel(api, db, "Reads and writes domain state", "Prisma/PostgreSQL")
  Rel(api, repository, "Uses public repository-context API", "In-process port")
  Rel(repository, github, "Lists and reads repositories at a resolved commit", "Temporary installation token")
  Rel(repository, db, "Stores metadata, branches, selected paths, and immutable snapshot JSON", "Prisma/PostgreSQL")
  Rel(api, storage, "Confirms, prepares, versions, signs, and cleans objects", "AWS SDK")
  Rel(api, llm, "Sends prepared context and receives structured findings", "Deferred backend adapter")
  Rel(integrations, api, "Uses the same application capability", "Future adapters")
```

## Container responsibilities

### Featurewise Console

The React application is the first-party control plane. Its Feature
workspace exposes Specification, Context, and Analyses. It never calls an LLM
provider directly and does not own analysis business logic.

### Backend API

The NestJS modular monolith owns authentication, tenant/project/feature
authorization, feature and project context, the private-file lifecycle, and
the analysis application boundary from ADR-0032. Analysis remains extractable
behind ports, but no queue, worker, dedicated AI service, or microservice is
introduced in the MVP.

### PostgreSQL and S3

PostgreSQL stores relational domain state and immutable analysis metadata. S3
stores private original and prepared file bytes under immutable, versioned
keys. PostgreSQL stores their exact keys, versions, checksums, and lifecycle
metadata; SQL migrations never delete S3 objects.

### External systems

GitHub is the only implemented external repository adapter. It is separated
from S3-backed uploaded artifacts and never creates `StorageObject` rows. The
LLM provider and every other integration remain architectural boundaries only
until separately accepted vertical slices implement them.
