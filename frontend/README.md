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
- `shared`: domain-neutral HTTP infrastructure, configuration, UI, utilities, and assets.
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

## Styling and Stories

`src/styles/index.css` is the only global style entry point. The app and Storybook both import it, so fonts, tokens, reset rules, and component rendering remain aligned.

Use CSS Modules for component styles and semantic CSS variables for product decisions. Foundation stories document raw and semantic tokens without maintaining a separate Storybook theme.

Reusable UI components colocate `Component.tsx`, `Component.module.css`, `Component.test.tsx`, and `Component.stories.tsx`.

## Icons

Import Lucide icons by name:

```tsx
import { Plus } from 'lucide-react';
```

Decorative icons use `aria-hidden="true"`. Icon-only controls require an accessible name. Avoid the dynamic icon loader so Vite can tree-shake unused icons.
