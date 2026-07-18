# ADR-0023: Keep Frontend Reusable Logic at the Narrowest Valid Owner

Date: 2026-07-18

Status: accepted

## Context

ADR-0022 organizes the frontend as one React application with layered vertical slices. This is independent from ADR-0002's backend modular-monolith boundaries: a future backend extraction into microservices does not require microfrontends. The frontend can remain one deployable application as long as it consumes stable REST/JSON contracts and does not depend on the backend's internal deployment topology.

As pages and features grow, reusable logic must have predictable ownership. Keeping meaningful orchestration and transformation logic inside route components makes pages difficult to read and encourages duplication. Putting every helper and hook in `shared`, however, would weaken feature ownership and turn `shared` into a collection of product-specific code.

Agents and contributors therefore need an explicit rule for inspecting, extracting, locating, and exposing utilities and custom hooks.

## Decision

Keep the dependency direction and slice structure from ADR-0022:

`app -> pages -> features -> shared`

Before adding frontend logic, inspect the owning feature's `lib` and `model` segments and the corresponding shared segments for an existing utility or hook whose contract fits. Reuse it instead of duplicating its behavior.

Place extracted logic at the narrowest valid owner:

- domain-neutral pure utilities live in `shared/lib/<utility-name>.ts`;
- domain-neutral reusable React hooks live in `shared/model/<use-hook-name>.ts`;
- feature-specific pure utilities live in `features/<feature>/lib/`;
- feature-specific hooks, mappings, and state live in `features/<feature>/model/`.

Each extracted utility or custom hook has one implementation file. Use descriptive kebab-case filenames, and prefix custom-hook filenames and exports with `use`, for example `format-date.ts` and `use-debounce.ts`. Tests may be colocated in separate `<name>.test.ts` or `<name>.test.tsx` files.

Expose cross-slice shared contracts through `shared/lib/index.ts` and `shared/model/index.ts`. Do not create a single `shared/index.ts`. Create a segment and its public index only when the first real implementation requires them; do not add empty speculative structure.

Extract logic when it is reused, independently testable, duplicated, or materially reduces page or component complexity. Trivial event handlers and helpers tightly coupled to one component's rendering may remain colocated. Pages remain route-level composition and must not become collections of product logic.

Frontend utilities and hooks must not own backend business rules. Feature API functions and wire DTOs remain in the feature's `api` segment. The generic HTTP transport remains in `shared/api`, and page or feature UI must not call it directly.

## Consequences

- Pages remain focused on route-level composition.
- Reusable logic is easier to discover, test, and reuse without duplicating code.
- Feature-specific behavior retains clear ownership instead of leaking into `shared`.
- Shared utilities and hooks remain domain-neutral and can be consumed by any higher layer.
- One implementation file per extracted unit provides a predictable search and review surface.
- Contributors must make an ownership decision before extracting logic, which adds a small amount of review discipline.
