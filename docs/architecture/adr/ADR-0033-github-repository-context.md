# ADR-0033: Add GitHub Repository Context as a Traceable Analysis Source

Date: 2026-08-31

Status: accepted

Amends: [ADR-0014](ADR-0014-defer-real-integration.md),
[ADR-0028](ADR-0028-public-identifiers-at-the-api-boundary.md),
[ADR-0031](ADR-0031-feature-specifications-and-traceable-analysis-inputs.md),
[ADR-0032](ADR-0032-analysis-application-boundary-and-lifecycle.md)

## Context

Featurewise needs exact source-code context without turning a repository into
uploaded files or pretending that the analyzer already exists. GitHub App
installation identifiers and mutable branch names alone are insufficient for
reproducible evidence: capture must resolve one immutable commit and exact
blobs, while connection setup must not retain GitHub credentials.

## Decision

GitHub is the sole real third-party integration authorized for the local-first
MVP. All other integrations remain deferred under ADR-0014. A Project may own
one GitHub repository connection and a base branch. A Feature may inherit that
branch or override it and may select bounded textual paths.

The connection owns an internal `configurationVersion`, initialized to 1 and
incremented only when `baseBranch` changes. Health checks and refreshed GitHub
metadata do not increment it. Feature updates, base-branch changes, and
analysis-input capture use this version for optimistic concurrency without
treating operational health refreshes as configuration changes.

The NestJS `RepositoryContextModule` exposes provider-neutral application
contracts and contains a GitHub adapter based on `@octokit/app`. The GitHub App
requests no selectable permission other than repository Contents: read. User
OAuth is transient and used to discover and verify App installations visible
to the connecting user. User and installation tokens are never
persisted. Installation tokens are created and refreshed inside the adapter.

Connection starts with user OAuth so existing installations can return directly
to repository selection. **Connect GitHub** starts authorization; **Continue
with GitHub** is the recovery action while connecting, starting a fresh
authorization attempt and replacing the previous attempt. An attempt retains
the verified installation IDs and account labels, not the tokens, from that
OAuth exchange; the user chooses an account when multiple installations are
available, then selects a repository. Listing and connecting recheck the chosen
installation against that attempt.

**Install or manage GitHub App access** is an independent external link with an
external-link icon, opening a new tab with `noopener noreferrer`. It remains
enabled in loaded setup and connected states, independently of pending
connection mutations. It manages App installation, permission approval, and
repository access on GitHub; it does not start or replace a Featurewise attempt
or disconnect a repository. Returning from this link does not itself complete
authorization. The user can use Connect GitHub or Continue with GitHub when
setting up or recovering a connection. Once connected, App access management
remains available without displaying the authorization-recovery action.

**Cancel connection** expires the user's attempt without uninstalling the App
or disconnecting an existing repository. Attempts expire after ten minutes;
late callbacks cannot revive cancelled, replaced, or expired attempts. The
Console refreshes once at the attempt deadline, without polling.

Repository metadata and selected paths remain relational. Repository bytes are
not `StorageObject` records and never enter S3. A new prepared source type,
`repository_revision`, identifies one `REPO-*` connection captured at one
commit SHA. Input and prepared-context contract v2 add this source without
changing v1 semantics. This narrowly amends ADR-0031's repository-source and
direct-integration deferral for GitHub only; existing uploaded-file and S3
lifecycle guarantees and other source/integration deferrals remain unchanged.

Repository capture resolves the effective branch, then the commit SHA, tree,
and blobs at that revision. Selected Feature files are mandatory and are
resolved first through cached non-recursive directory trees, independently of
bounded manifest traversal. Automatic root files are then read in policy
priority order. The filtered, deterministically ordered manifest is processed
last. The manifest is bounded to 20,000 paths or 512 KiB, root files to 20
files/1 MiB (256 KiB each), and Feature selection to 50 files/5 MiB (1 MiB
each). Recursive Git tree truncation triggers deterministic non-recursive
traversal bounded to 100,000 inspected entries and 2,000 fallback tree calls.
Manifest content inspection has a separate budget of 2,000 blob calls. Either
budget may mark the manifest truncated, but neither may omit or make
unresolvable a mandatory selected file or an already-prioritized root file.
Sensitive paths, binary content, symlinks, submodules, Git LFS pointers,
vendor, build, and generated content are rejected with no override.

Configuration validation resolves the target commit once, reuses directory
and blob caches across affected Features, and downloads only selected blobs;
it does not construct the manifest or root allowlist. Full repository capture
runs before the final PostgreSQL transaction. That transaction locks and
rechecks the internal consistency token, captures local text and selected S3
inputs, sets `StorageObject.firstUsedAt`, and validates snapshot v2. Any
failure rolls back the S3 usage markers and no PostgreSQL transaction remains
open during GitHub calls.

This extends ADR-0032's input-capture boundary and versioned contracts, not its
analysis lifecycle. Its statuses, one-active-run constraint, immutable input
snapshot, and write-once prepared-context snapshot remain unchanged.

Retrieval, vector indexing, AI-generated internal documentation, analyzer
behavior, prompts, provider policy, and evaluation policy remain deferred and
require dedicated evaluation before adoption. No analysis HTTP endpoint is
authorized by this ADR.

ProjectRepositoryConnection is externally addressable as `REPO-*`.
Connection attempts and Feature configuration/join rows are subordinate
records addressed through Project and Feature routes; they do not receive
frontend identities. This is a narrow amendment to ADR-0028's table-wide
public-number wording.

## Consequences

- Private repositories can supply reproducible analysis inputs without
  copying mutable repository state into S3.
- Before an analysis, Featurewise retains only connection metadata, branch
  choices, selected paths, and transient non-secret attempt audit metadata.
- GitHub availability and rate limits are explicit operational states.
- Capturing repository content costs GitHub API requests and may produce an
  explicitly truncated manifest, but never silently omits a selected file.
- No webhook, polling loop, queue, worker, LLM/model-provider call, or analyzer
  is added.
