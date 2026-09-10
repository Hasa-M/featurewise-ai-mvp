# Integration strategy and future preparation acceptance

## Current layers

| Layer | Evidence and boundary |
| --- | --- |
| Unit | Contracts, repository filtering/traversal, adapter/service branches; existing Jest/Vitest suites |
| PostgreSQL integration | Real constraints, authorization inputs, concurrent first use, rollback, reproducibility |
| HTTP integration | Real Nest modules, authentication, validation and database; deterministic external adapters |
| Chrome DevTools MCP | Codex CLI uses Chrome on demand for visual/workflow verification with recorded expected/actual results; desktop extension is optional |
| Live providers | Separately invoked GitHub/S3 checks; OAuth remains human-assisted |
| Deferred | Prepared context, model requests, analyzer lifecycle, finding quality |

Run the [harness workflow](development-harness.md). Backend integration tests
must not be reported as verification of rendered UI, actual OAuth, or AWS
transport. A skipped/unavailable layer is reported as not run. No automatic
browser suite or new CI service is introduced in this milestone.

Core checks: cross-organization rejection; editable content persistence;
selected-ready eligibility; exact immutable representation identities;
first-use concurrency and rollback; repository capture through the real
reader/service; selected-path enforcement and configuration conflicts;
active-run uniqueness; fresh migration application; reset target protection;
and representative OpenAPI request/response compatibility. Existing reader
unit tests cover detailed filtering, truncation, and traversal budgets.

## Future prepared-context test specification (not implemented)

Before starting this implementation, propose a context-preparation ADR resolving
text versus visual representations, normalization and segmentation versions,
source budgeting, unsupported-input behavior, and replay artifacts. ADR-0029
preserves document visuals; do not silently treat text extraction as equivalent.
Align the preparation, engine, and persistence ports with the accepted v2
repository source model while preserving historical v1 contracts.

| Scenario | Required acceptance evidence |
| --- | --- |
| Repeated preparation | Same captured bytes and preparation version produce equivalent content/segments, excluding explicitly documented execution IDs |
| Mutable source changed | Preparation still reads captured S3 versions and repository commit, not current data |
| Missing/corrupt bytes | Explicit failure identifying the affected source; no silent latest-version fallback |
| Stable identities | Every prepared segment belongs to exactly one source and has a stable ordered identity |
| Repository evidence | File paths/commit and segment locators resolve within that prepared snapshot |
| Unsupported/oversized inputs | Explicit policy outcome; no invisible source loss |
| Visual sources | Tests prove retained visual input or the explicitly accepted representation policy |
| Budget/truncation | Included/excluded material and truncation are inspectable and reproducible |
| Evidence isolation | References into another snapshot or missing segments fail validation |
| Write-once persistence | Prepared snapshot can transition null to value once, then cannot be rewritten |
| Run transaction | Input capture/firstUsedAt and run creation commit together or roll back together |
| Request dry run | Rendering is shared with the sending path; messages/schema/attachments/settings can be inspected without calling a model |

Do not implement pending analyzer endpoints to exercise these tests. Provider
selection, prompts, retries, verification policy, and finding-quality evaluation
require the real analyzer vertical slice and its separately recorded decisions.

The development harness means agent visibility/control of the app. It is
distinct from a future model-quality evaluation runner and does not add
multi-agent orchestration or a product MCP adapter.
