# ADR-0036: Separate Product Responsibility, Inference Sources, and Clients

Date: 2026-09-11

Status: accepted (MVP completion and product direction; future integration designs deferred)

Amends: [ADR-0032](ADR-0032-analysis-application-boundary-and-lifecycle.md)
for initial inference provisioning only.

## Context

Featurewise is the Specification Analysis Engine defined by ADR-0030. The
local-first baseline includes the Console, specifications, context, GitHub
repository access, and input capture. Product direction must distinguish completing that MVP
from subsequent cloud distribution and customer-provided inference.

## Decision

### Product responsibility

The engine is the product. Featurewise owns the analysis method and process:
organizing context, preparing model work, managing analysis phases, processing
and verifying outputs, grounding evidence, and maintaining findings and human
decisions with their history. Inference is a resource used by that process.

The future product can be described as a **superskill delivered as cloud
software**: a specialized capability combining software, method, context
management, checks, persistence, and history. Superskill is a product
description, not an entity, protocol, or capability obtained merely by loading
a `SKILL.md` file.

Keep three responsibilities distinct:

- **Engine:** analysis method, orchestration, evidence, results, and history.
- **Inference:** model reasoning capacity, potentially supplied by different parties.
- **Interface:** the proprietary Featurewise Console or future API, CLI, and
  agent clients, using the same application capability and authorized data
  without duplicating product logic.

### Complete the existing MVP

The next product objective remains a working Console analysis path. Users
authenticate with the existing application auth, provide a specification and
context through MVP capabilities, start analysis, inspect individually
addressable findings with evidence and possible resolutions, record reviews,
and consult analysis and review history. Zero findings is a valid result.

Use **one initial model configuration with Featurewise-managed inference**
(conceptually, **Featurewise Default**). Featurewise configures and provides
model access and pays for its use. Users need no personal AI connection,
API key, subscription, or local model setup for this mode. There is no MVP
model selector. The configuration may serve several calls or analysis phases;
it does not impose a single LLM call.

Featurewise may use an external provider through its own API account. Managed
inference does not require training, owning, or hosting foundation-model
weights. No specific provider or model is selected by this decision.

This narrowly amends ADR-0032's deferred provider policy by deciding who
provides the initial inference and how many initial configurations to support.
Specific provider/model choice, prompts, retry limits, verification,
deduplication, and evaluation policy remain deferred. The analyzer and its
endpoints still require a real vertical slice; they are not available merely
because this product decision is accepted.

### Future inference sources

The approved destination is a cloud-accessible engine with multiple clients
and inference sources. Their intended experiences and status are distinct:

| Mode | Intended experience | Status |
| --- | --- | --- |
| Featurewise-managed inference | Use the Console without personal AI connections; Featurewise supplies model access and pays for its use. | Required to complete the MVP; not yet implemented. |
| Customer API account | The customer supplies provider access; the provider bills consumption directly to that account. | Future direction; implementation deferred. |
| Customer AI subscription | Use capacity included in an AI application subscription through a supported integration, including an authorized connection from the Console. | Product objective; concrete support depends on the provider and remains to be verified. |
| Customer local/private inference | Supply a model in the customer's environment through a technical integration, initially aimed mainly at API/CLI users. | Advanced future direction; mechanism undecided. |

Featurewise authentication, a provider API account, and an AI application
subscription are separate concepts. Subscription credentials are not
interchangeable with API keys. No subscription tier is assumed to provide a
general-purpose API usable by Featurewise. Native-agent integration and direct
model calls may differ in process control, availability, and functionality.
Provider support and terms must be verified before specifying an integration;
authentication workarounds are not a design assumption.

Local/private protocols, runners, connectivity, credential handling, and
remote execution remain open. Initial API/CLI emphasis does not permanently
exclude Console support. No future integration contract is defined here.

Managed inference remains an independent choice after other modes arrive.
Neither its removal nor an automatic fallback policy is decided. Process
portability does not promise equal quality, functionality, or performance
across models. Recommendations, comparisons, and public benchmarks are
possible later work, not MVP requirements.

## Consequences

- ADR-0030/0031 domain and evidence guarantees and ADR-0032 lifecycle,
  concurrency, and in-process NestJS execution remain unchanged. MVP provider
  calls originate only in the backend; the Console owns no engine logic.
- Cloud is a later product destination. ADR-0010's local-first prototype can
  use external inference and storage; local-first does not mean local
  inference. No public deployment, production platform, architectural
  extraction, or additional infrastructure is authorized.
- GitHub remains the sole authorized third-party context integration under
  ADR-0033. Customer inference connections and additional product clients are
  deferred. ADR-0034's harness CLI remains developer tooling.
- Specifications, context, immutable findings, and append-only human reviews
  remain separate. History does not make Featurewise the customer's
  requirements system of record or authorize specification generation and
  maintenance, continuous learning, fine-tuning, or cross-customer data use.
- Console ownership implies no pricing or monetization decision. Prices,
  quotas, plans, paywalls, licensing, and commercial terms remain outside this
  decision.
