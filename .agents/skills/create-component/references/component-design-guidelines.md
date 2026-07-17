# Featurewise Component Design Guidelines

Use this reference as the visual and content source of truth for reusable Featurewise components. Apply it through the current semantic variables in frontend/src/styles/; current project variables and accepted ADRs take precedence over duplicated literal values.

## Product character

Make uncertainty visible, structure information clearly, and help users move product intent toward an implementation-ready specification. Components should feel calm, engineered, warm, and content-first.

- Prefer clarity over decoration.
- Expose readiness, uncertainty, and blocking issues immediately.
- Keep technical layouts dense, readable, and breathable.
- Avoid visual noise, decorative metrics, and unnecessary motion.

## Content

- Address the user as you.
- Refer to the product as Featurewise, never as we.
- Use precise, calm, operational language. State gaps and conflicts directly.
- Use sentence case for controls, titles, menus, labels, and messages.
- Use imperative, specific actions such as Generate spec, Add context, Export, Mark valid, and Validate. Avoid Submit, OK, and Go.
- Use Geist Mono for versions, IDs, schema versions, run statuses, origins, filenames, and other structured system values.
- Show counts only when they support a decision or action. Do not add vanity statistics.

Use these readiness labels exactly: Ready, Needs attention, Blocked, In progress, and Draft.

Use these alignment labels exactly: Aligned and Updates pending.

Use the established domain terms feature, spec run, context artifact, checkpoint, and readiness. Do not invent synonyms for statuses or domain concepts.

## Color and surfaces

- Use --brand for primary actions, links, focus, active navigation, selection, section accents, and in-progress or informational states.
- Use --accent only for restrained expressive emphasis. Never use it as a status color.
- Use --status-* aliases for readiness: green for Ready, amber for Needs attention, red for Blocked or destructive, cobalt for In progress or information, and graphite for Draft.
- Reserve amber for attention states.
- Prefer warm off-white pages, white cards, warm graphite text, and opaque product surfaces.
- Prefer elevation and surface contrast over borders. Use borders for controls, separators, dense lists, and outlined variants.
- Use flat, quiet surfaces. Do not add textures, patterns, standard-product gradients, decorative glows, or excessive transparency.

## Typography and layout

- Use Geist for UI and prose and Geist Mono only for structured or technical content.
- Use current --type-*, --font-*, --weight-*, --leading-*, and --tracking-* variables. Do not recreate typography with literals.
- Render metadata overlines with the existing mono, uppercase, and tracking variables.
- Use the 4px spacing system through --space-* variables.
- Keep specification prose readable and constrained. Avoid oversized display text inside compact component surfaces.
- Use stable dimensions for controls, icon buttons, counters, and other fixed-format elements so state changes do not shift layout.

## Shape and elevation

- Use --radius-control for controls, --radius-card for cards and panels, --radius-surface for large surfaces, and --radius-pill for badges and tags.
- Default cards are borderless with soft layered elevation.
- Support card variants only when requested: floating, outlined, tinted, or inverse.
- Show selection with a brand ring and restrained brand-tinted surface.
- Allow interactive floating cards to lift only when the interaction is meaningful.

## Interaction and motion

- Keep focus clearly visible with shared focus-ring variables.
- Let primary buttons use a brand-tinted shadow and at most a 1px hover lift; settle them on press.
- Darken neutral surfaces on hover and use the blocked solid status color for destructive controls.
- Use existing 130-200ms transition variables and easing tokens.
- Reserve continuous animation for meaningful live progress, such as an in-progress dot or generation stepper.
- Respect the global prefers-reduced-motion behavior.

## Icons and imagery

- Use named icons from lucide-react, with currentColor, rounded rendering, and a 1.75 stroke width.
- Use approximately 16px icons in dense controls, 17-18px for navigation and body actions, and 12px in tags.
- Hide decorative icons from assistive technology. Give icon-only controls an accessible name and a tooltip for unfamiliar actions.
- Do not use emoji or Unicode characters as interface icons.
- Prefer no photography in data-dense product views. When imagery is necessary, keep it structural and relevant.

## Component state checklist

Represent every state relevant to the component contract in implementation and Storybook: default, hover, focus-visible, pressed, disabled, selected, loading, error, and empty.

Do not fabricate states that the component cannot own. Keep copy specific, information hierarchy clear, and animation functional.
