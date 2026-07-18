# Featurewise Frontend

React + Vite + TypeScript frontend for the local-first Featurewise MVP.

## Commands

```bash
npm install
npm run dev
npm run lint
npm test -- --run
npm run build
npm run storybook
npm run build-storybook
```

Vite listens on `http://localhost:5173` by default. Storybook listens on `http://localhost:6006`.

Copy `.env.example` to `.env` only when the backend URL differs from the local default.

## Structure

Dependencies flow in one direction:

```text
app -> pages -> features -> shared
```

- `app`: startup, routing, and application-wide providers.
- `pages`: route-level composition.
- `features`: user capabilities and their API, model, UI, and private utilities.
- `shared`: domain-neutral HTTP infrastructure, configuration, UI, utilities, hooks, and assets.
- `styles`: the single global CSS entry point, design tokens, base styles, and token stories.

Create only the slice segments a page or feature actually needs:

```text
features/example/
  api/       REST functions and wire DTOs
  model/     UI models, mappings, hooks, and state
  ui/        React components and CSS Modules
  lib/       Private pure utilities
  index.ts   Public slice exports
```

Use `@/` imports across slices and import from a slice's `index.ts`, not its internals. Page and feature UI must not call `shared/api` directly.

## Utilities and Custom Hooks

Before adding frontend logic, inspect the owning feature's `lib` and `model` segments and the corresponding shared segments. Reuse an existing implementation when its contract fits, and place new logic at its narrowest valid owner:

```text
features/<feature>/lib/    Feature-specific pure utilities
features/<feature>/model/  Feature-specific hooks, mappings, and state
shared/lib/                Domain-neutral pure utilities
shared/model/              Domain-neutral reusable React hooks
```

Give every extracted utility or hook one implementation file, with a separate colocated test when needed. Use descriptive kebab-case filenames such as `format-date.ts` and `use-debounce.ts`. Export shared contracts through `shared/lib/index.ts` or `shared/model/index.ts`; do not add a global `shared/index.ts` or empty speculative segments.

Extract reusable, independently testable, duplicated, or complexity-reducing logic. Trivial render-only helpers and handlers tightly coupled to one component may remain colocated. Keep pages focused on route-level composition.

`shared/api` is the generic HTTP transport, not a home for product endpoints. Endpoint functions and wire DTOs belong to the owning feature's `api` segment. For example, login endpoints belong to `features/auth/api`, session state and authentication hooks belong to `features/auth/model`, and application-wide provider or router wiring belongs to `app`. Roles and permissions are outside the Phase 1 scope.

## Styling and Stories

`src/styles/index.css` is the only global style entry point. The app and Storybook both import it, so fonts, tokens, reset rules, and component rendering remain aligned.

Use CSS Modules for component styles and semantic CSS variables for product decisions. Foundation stories document raw and semantic tokens without maintaining a separate Storybook theme.

Reusable UI components colocate `Component.tsx`, `Component.module.css`, `Component.test.tsx`, and `Component.stories.tsx`.

### Global layout components

Standard reusable controls stay neutral, plain, and content-first. Persistent global layout components may use stronger brand-primary surfaces to give the application frame a distinct Featurewise identity. Use the amber accent only as a restrained structural detail, such as an edge, divider, or active-layout marker. It must not become a competing surface or imply a readiness status.

Layout components use the same typography, spacing, focus, motion, accessibility, and semantic-token foundation as ordinary controls; they are not a separate theme. Keep domain-neutral layout building blocks in `shared/ui` and route data or shell orchestration in higher layers. Place their stories under `Layout/*`; ordinary reusable controls remain under `Shared/*`.

Do not carry the stronger layout treatment into content cards or form controls without a separate design decision. Avoid gradients, decorative glows, and large accent-colored surfaces.

## Icons

Import Lucide icons by name:

```tsx
import { Plus } from 'lucide-react';
```

Decorative icons use `aria-hidden="true"`. Icon-only controls require an accessible name. Avoid the dynamic icon loader so Vite can tree-shake unused icons.
