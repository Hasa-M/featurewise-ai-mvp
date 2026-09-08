# ADR-0034: Use an isolated, inspectable development harness

Date: 2026-09-07

Status: proposed (implementation requested through the approved harness plan)

## Context

The local-first Console needs repeatable integration checks and inspectable
analysis inputs before an analyzer exists. Database columns alone do not make
captures visible: the current capture capability returns an input snapshot
without inserting an AnalysisRun. Coding agents also need explicit environment
identity, fixtures, and evidence rather than guessing which application is running.

## Decision

Provide repository-local development commands, a dedicated PostgreSQL 16
database, and a separate Console/API instance. A test composition root uses
the real application modules with deterministic provider substitutes; a
separately selected live mode uses explicitly configured GitHub/S3 resources.
The deterministic storage substitute cannot invoke AWS. Background file cleanup
is disabled in the interactive harness so fixtures remain inspectable; cleanup
behavior remains covered by its dedicated tests.

The commands are developer tooling, not a supported product CLI or MCP adapter.
They do not expose analysis endpoints or implement analysis execution. Actual
capture invokes the existing v2 application capability, may set firstUsedAt,
and exports immutable local artifacts without inventing AnalysisRun records.
Object inspection uses exact captured versions. No SQL reset deletes S3 bytes.

Use local opt-in Swagger/OpenAPI for implemented HTTP contracts and Prisma
Studio for persisted data. Use the Chrome extension for relevant agent-led UI
verification, with one connection smoke check during setup. Browser use is
triggered by affected user workflows, browser-specific failures, or explicit
requests; it is not an unconditional step for every edit. No new Playwright
suite, browser MCP server, queue, or agent orchestration is introduced.

## Consequences

- Inputs, provider mode, fixture identities, and failure evidence are inspectable.
- The fixed harness database identity guards destructive reset operations.
- Local artifacts can contain specification/repository content and remain ignored
  by Git; credentials and signed URLs are excluded from reports.
- Deterministic tests do not prove live OAuth/S3 transport or rendered UI behavior.
- Real-service smoke checks and browser observations report their own status.
- ADR-0032's prepared context, analyzer, and execution endpoints remain deferred.

See [the harness runbook](../../testing/development-harness.md) and
[the testing strategy](../../testing/integration-strategy.md).
