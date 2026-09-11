# C4 System Context — Featurewise

## Purpose

This diagram shows Featurewise as a Specification Analysis Engine and the
Featurewise Console as its first-party client. It distinguishes the current
product and system boundaries from the analyzer and analysis endpoints needed
to complete the MVP, which remain unimplemented under ADR-0032. Finding and
review interactions below describe that completion target, not availability.

[ADR-0036](../../adr/ADR-0036-product-direction-and-inference-sources.md)
defines the initial inference as Featurewise-managed. Cloud distribution,
additional clients, and customer-provided inference are later product
directions; this view adds no future execution infrastructure.

## Diagram

```mermaid
C4Context
  title Featurewise Specification Analysis Engine — system context

  Person(operator, "Product operator", "Supplies feature intent and context, reviews findings, and records decisions")
  Person(engineer, "Engineer / QA / designer", "Contributes context and consumes evidence-backed findings")

  System(featurewise, "Featurewise", "Specification Analysis Engine with the first-party Featurewise Console")

  System_Ext(sources, "Context sources", "Specifications, requirements, designs, history, product behavior, code, business rules, policies, and future adapters")
  System_Ext(github, "GitHub", "Read-only repository source authorized through a GitHub App")
  System_Ext(llm, "External LLM provider", "Planned MVP inference supplied and funded by Featurewise; provider/model undecided")
  System_Ext(consumers, "Future clients", "CLI, API clients, coding agents, workflow integrations, or embedded surfaces")

  Rel(operator, featurewise, "Manages specifications/context; analysis reviews await MVP completion", "Console")
  Rel(engineer, featurewise, "Contributes context; findings await MVP completion", "Console or shared output")
  Rel(sources, featurewise, "Provides source-addressable context", "Uploaded or pasted artifacts in MVP")
  Rel(featurewise, github, "Reads authorized repositories on demand", "GitHub App; Contents read-only")
  Rel(featurewise, llm, "Sends versioned prepared context", "Backend only; MVP work, unimplemented")
  Rel(llm, featurewise, "Returns structured candidate findings", "MVP work, unimplemented")
  Rel(consumers, featurewise, "Uses the same analysis capability and authorized data", "Future adapters")
```

## Boundaries

- Featurewise analyzes existing product intent; it does not generate or own the
  canonical specification.
- A Feature is the sole analysis unit. Findings are individually addressable
  and cite exact evidence.
- No context type is the product. Requirements, code, business rules, and
  policies use the same context/evidence architecture rather than separate
  product centers or bespoke pipelines.
- MVP context arrives through specifications, editable context, uploaded or
  pasted artifacts, and the GitHub adapter accepted by ADR-0033. Other source
  adapters remain deferred.
- Human disposition is separate from model output.
- The Console is a client/control plane; engine business logic remains in the
  backend application boundary.
- Other third-party context integrations, customer inference connections,
  public API products, CLI, MCP, and embedded distribution remain deferred.
