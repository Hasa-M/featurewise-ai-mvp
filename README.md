# Featurewise

Featurewise is a **Specification Analysis Engine for software product development**.

It analyzes a feature and its surrounding product and business context before implementation begins, identifying issues that could lead to rework, developer interruptions, delayed decisions, incorrect implementations, or avoidable product risk.

Featurewise does not evaluate a specification in isolation.

It is designed to reason across the available information that defines how the product is expected to behave, including:

- feature specifications;
- requirements and acceptance criteria;
- product documentation;
- design artifacts;
- project files;
- previous feature decisions and history;
- existing product behavior;
- source code, when relevant;
- business rules and domain constraints;
- organization-specific policies, standards, and conventions.

In the local-first MVP, this information enters Featurewise through the feature
specification, editable feature and project context, uploaded or pasted
artifacts, and the read-only GitHub repository adapter. Other dedicated
third-party source adapters remain deferred.

This allows Featurewise to identify not only problems inside a specification, but also problems that emerge when a proposed feature conflicts with the wider product, business logic, or organizational rules.

Featurewise looks for problems such as:

- missing information;
- ambiguous requirements;
- inconsistencies across sources;
- undefined edge cases, states, or behaviors;
- unresolved product decisions;
- requirements that are difficult to verify or test;
- assumptions left implicitly to developers;
- conflicts between a proposed feature and the existing product;
- violations of established business rules;
- conflicts with organization-specific policies or product conventions;
- behavior that is locally reasonable but inconsistent with previous product decisions.

For each relevant finding, Featurewise aims to provide:

- **what is wrong or missing;**
- **why it matters;**
- **the evidence supporting the finding;**
- **the relevant product, business, or policy context;**
- **severity and useful verification metadata;**
- **confidence only where evaluation shows that it is calibrated and useful;**
- **practical ways to resolve the issue.**

The goal is simple:

> **Find expensive ambiguity and inconsistency before implementation starts.**

## The engine is the product

Featurewise owns the analysis process: organizing context, preparing work for
models, managing analysis phases, processing and verifying outputs, and keeping
evidence-backed findings and human decisions with their history.

- **Engine:** the analysis method, orchestration, evidence, results, and history.
- **Inference:** the model reasoning capacity used by the process.
- **Interface:** the proprietary **Featurewise Console**, or a future API, CLI,
  or agent client.

The Console is the first-party web client and control plane for context,
analyses, evidence, reviews, and history. Future clients must use the same
application capability and authorized data without duplicating product logic.

## Intended core workflow

```text
Feature specification
        +
Relevant product, technical,
business, and organizational context
        ↓
Specification Analysis Engine
        ↓
Evidence-backed findings
        ↓
Human review / resolution
        ↓
Implementation
```

## Product direction

The future product is a cloud-accessible engine with its own Console and
integrations for API, CLI, and agent clients. It can be described as a
**superskill delivered as software**: a specialized capability combining
software, analysis method, context management, checks, persistence, and
history.

The approved product direction distinguishes these inference sources:

| Mode | Intended experience | Status |
| --- | --- | --- |
| Featurewise-managed inference (Featurewise Default) | Use the Console without personal AI connections; Featurewise supplies model access and pays for its use. | Mode for completing the MVP; not yet implemented. |
| Customer API account | The customer supplies provider access and is billed directly by that provider. | Future; implementation deferred. |
| Customer AI subscription | Use included subscription capacity through a supported integration, with an authorized Console connection also desired. | Product objective; provider support and mechanisms remain to be verified. |
| Customer local/private inference | Supply a model in the customer's environment, initially mainly through API/CLI integrations. | Advanced future direction; mechanism undecided. |

Application login, provider API accounts, and AI subscriptions are distinct.
Managed inference remains an independent choice; no automatic fallback or removal policy is decided.
Different models and integrations may offer different quality, functionality,
performance, and process control. Initial API/CLI emphasis for private
inference does not permanently exclude the Console.

## MVP boundary

The next objective is to complete the existing application. Using its existing
authentication, a user must be able to provide a feature specification and
context, start analysis from the Console, inspect individually addressable
findings with evidence and possible resolutions, record accepted, dismissed,
resolved, or deferred reviews, and consult analysis and review history. Zero
findings is a valid result.

The initial path uses one model configuration with Featurewise-managed
inference. Users do not need a personal AI subscription, API key, or local
model. Featurewise may use an external provider through its own API account.
One configuration may serve several calls or phases; an MVP model selector is not required.
The prototype remains local-first under ADR-0010. External inference is
compatible with that scope: local-first does not mean local inference. Cloud
distribution is a later phase, without authorization for public production
deployment or new MVP infrastructure.

Featurewise does not generate or maintain the canonical specification. It does
not become the customer's requirements system of record. GitHub repository
context is the single context integration authorized by ADR-0033; Jira, Figma,
and other direct context integrations remain deferred. Review persistence
does not imply continuous learning, fine-tuning, or cross-customer data use.

## Current product baseline

The current architecture is defined by
[ADR-0030](docs/architecture/adr/ADR-0030-specification-analysis-core-domain.md),
[ADR-0031](docs/architecture/adr/ADR-0031-feature-specifications-and-traceable-analysis-inputs.md),
and [ADR-0032](docs/architecture/adr/ADR-0032-analysis-application-boundary-and-lifecycle.md),
as amended for GitHub repository context by
[ADR-0033](docs/architecture/adr/ADR-0033-github-repository-context.md).

The implemented local-first baseline provides authentication, Organization and
Project workspaces, user-authored Feature specifications, editable feature and
project context, private uploaded context files, and read-only GitHub repository
configuration. The Featurewise Console exposes Specification, Context,
Repository, and honestly unavailable Analyses workspaces.

The backend also contains the non-executing analysis application boundary,
versioned contracts, reproducible input capture, and database definitions for
runs, findings, reviews, and call logs. Capture does not create an AnalysisRun.
Prepared context, analyzer execution, model-provider calls, analysis HTTP
endpoints, and findings/review workflows remain unimplemented work needed to
complete the MVP. Prompt content, specific provider/model choice, retries,
verification, and evaluation policy remain deferred decisions. The development
harness can inspect captured inputs; its CLI is developer tooling, not the
future product CLI.

## License

Featurewise is source-available software licensed under the
[PolyForm Noncommercial License 1.0.0](LICENSE).