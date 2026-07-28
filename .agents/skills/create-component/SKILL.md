---
name: create-component
description: Implement or substantially revise reusable Featurewise React design-system components in frontend/src/shared/ui, including typed APIs, CSS Module styles using shared CSS variables, Lucide icons, colocated Storybook stories, focused Vitest and Testing Library tests, and public exports. Use when asked to create, add, implement, or update a reusable UI component, its variants, or its states in the Featurewise design system or Storybook.
---

# Create Component

Build one requested reusable component as a complete, reviewable design-system unit. Keep Storybook aligned with the app; it is a workbench, not a second UI environment.

## Gather context

1. Read the repository AGENTS.md.
2. Read docs/architecture/adr/ADR-0009-ract-vite-webapp.md and docs/architecture/adr/ADR-0022-frontend-layered-vertical-slices.md.
3. Read [references/component-design-guidelines.md](references/component-design-guidelines.md).
4. Inspect the semantic variables in frontend/src/styles/, .storybook/preview.ts, and the closest component in frontend/src/shared/ui/.
5. Inspect the worktree and preserve unrelated changes.

Stop and report an accepted ADR conflict. Ask for direction only when an unresolved choice materially changes the public component API; otherwise follow established repository patterns.

## Confirm scope and placement

- Implement exactly the requested component and necessary states. Do not add adjacent components merely to enrich a demo.
- Put domain-neutral reusable primitives in frontend/src/shared/ui/<component-name>/.
- Keep product-specific orchestration, API calls, and backend DTOs out of shared/ui. Feature-specific components belong in the feature ui segment and are outside this workflow.
- When a platform use case needs new table behavior, generalize the domain-neutral capability in `shared/ui/table` first. Keep use-case columns, cell content, data mapping, and orchestration in the consuming slice; do not fork sorting, row-action, sizing, or state behavior into a page-specific table.
- Avoid dependencies. State the reason before adding one when the existing React, Lucide, CSS, Storybook, and test stack cannot meet the requirement.

Use this colocated structure:

    frontend/src/shared/ui/<component-name>/
      Component.tsx
      Component.module.css
      Component.stories.tsx
      Component.test.tsx
      index.ts

Use a lowercase kebab-case folder, PascalCase component files, and a small public surface in index.ts. Do not create unused files.

## Design the contract

- Prefer native HTML semantics and extend the relevant native React attributes.
- Define explicit TypeScript unions for variants, sizes, and modes. Keep strict typing; do not use any.
- Preserve normal native behavior unless the contract explicitly changes it.
- Model only meaningful states. Include default, hover, focus-visible, pressed, disabled, selected, loading, error, and empty states when they apply.
- Keep business rules and API access outside the component.
- Require an accessible name for icon-only controls. Keep decorative icons hidden from assistive technology.

## Implement

- Use CSS Modules for component-local styling.
- Use existing semantic CSS variables before palette variables. Do not hardcode a color when a semantic variable exists.
- Use the existing spacing, typography, radius, elevation, focus, duration, and easing variables instead of duplicating values.
- Add a global variable only for a genuinely reusable design decision, then update the token story.
- Keep selectors local and state names explicit. Do not add component styles to the global stylesheet.
- Use named lucide-react imports. Use currentColor, strokeWidth={1.75}, and a control-appropriate icon size. Do not use emoji, Unicode glyphs, or hand-drawn SVG control icons.
- Use sentence-case operational copy and the exact Featurewise vocabulary from the reference.
- Keep motion functional, use existing transitions, and retain compatibility with the global reduced-motion setup.

## Add Storybook coverage

- Colocate a Component Story Format story typed with satisfies Meta<typeof Component> and StoryObj.
- Use the Shared/Component title convention and tags: ['autodocs'].
- Add a representative default story plus separate stories for relevant variants, sizes, and states.
- Use realistic content and accessible labels. Demonstrate icon placement and icon-only use when supported.
- Include error and empty states only when they belong to the contract.
- Assess whether the component needs a Storybook interaction test. Add a `play` function when real-browser execution or the Interactions debugger materially improves confidence, including components with keyboard navigation, popovers or dialogs, complex selection, multi-step state transitions, focus management, rich editing, drag/pointer behavior, or browser APIs.
- When an interaction test is warranted, implement it in the most representative story with Storybook's instrumented `userEvent` and `expect`. Assert observable behavior through roles, accessible names, visible state, and focus. Add another interaction story only for a distinct contract-critical workflow.
- Do not add a `play` function merely to duplicate simple prop rendering, a basic callback assertion, or behavior already covered adequately by the focused Vitest test. Record the intentional omission in the final report when interaction testing was considered but not useful.
- Import no global CSS in the story. .storybook/preview.ts already loads src/styles/index.css.
- Do not create Storybook-only tokens, themes, providers, wrappers, or behavior.

## Add focused tests

- Test observable behavior and accessibility with Vitest, Testing Library, and userEvent.
- Cover the primary interaction, disabled or loading behavior when applicable, accessible naming, and contract-critical variants or state transitions.
- Query by role and accessible name. Use test IDs only when no suitable semantic query exists.
- Avoid snapshots and CSS Module class-name assertions unless a class is the only public behavior under test.

## Verify

Run from frontend/:

    npm run lint
    npm test -- --run
    npm run test-storybook -- --run
    npm run build
    npm run build-storybook

Fix failures caused by the change. For layout-sensitive or interactive work, run Storybook and inspect relevant desktop and mobile widths, keyboard focus, and disabled states.

Before finishing, confirm:

- the component is exported only through its local index.ts;
- TypeScript and CSS have no unused variants or placeholders;
- every visual decision uses variables shared by the app and Storybook;
- stories expose each state a reviewer needs to inspect;
- the need for a Storybook interaction test was assessed and any warranted `play` test passes in browser mode;
- no API, domain, or Storybook-only logic leaked into the component.

Report the component contract, stories, unit tests, the interaction-test decision and coverage, verification results, and any intentionally omitted state.
