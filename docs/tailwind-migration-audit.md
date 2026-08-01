# Tailwind migration audit

## Baseline

- Frontend: React 18 with Vite 5 and TypeScript.
- CSS entry point: `src/styles.css`, imported once by `src/main.tsx`.
- Current stylesheet: approximately 2,000 lines with 263 top-level class selectors.
- Component surface: 44 TSX files across shared UI, layouts, survey flows, and admin pages.
- Responsive behavior: three media-query blocks, including mobile table layout changes.
- Styling features requiring careful migration: CSS custom properties, gradients, shadows, keyframe animation, pseudo-elements, WebKit scrollbar selectors, dynamic status classes, Radix overlays/content, and responsive tables.

## Tailwind setup

Tailwind CSS is integrated through the official Vite plugin. Only Tailwind's theme and utilities layers are loaded for now. Preflight is deliberately omitted so Tailwind does not reset existing elements and change the current design before components are migrated.

The existing stylesheet remains authoritative. Tailwind utilities can now be introduced component by component, and both systems can coexist during the migration.

## Design tokens

Task 2 maps the existing `:root` variables into Tailwind using app-prefixed names. The original variables remain the single source of truth, so legacy selectors and Tailwind utilities resolve to identical values.

- Colors: `bg-app-background`, `bg-app-surface`, `border-app-border`, `text-app-text`, and the corresponding `soft`, `faint`, `strong`, and semantic variants.
- Shape and elevation: `rounded-app-sm`, `rounded-app-md`, `rounded-app-lg`, and `shadow-app`.
- Typography: `font-app-sans`.
- Exact legacy breakpoints: `app-mobile` (640px), `app-tablet` (900px), and `app-wide` (1080px). Use their `max-*` variants when reproducing the existing max-width queries.

The legacy stylesheet references `--text-muted` but never defines it. It was deliberately not added during token mapping because doing so would change the current computed styles. Resolve it later while visually comparing the affected elements.

## Risk areas and migration order

Tasks 1-3 have completed the Tailwind setup, token mapping, shared primitives, authentication layout, dashboard navigation/layout, restore screen, brand mark, and toast presentation. Their unused legacy selectors have been removed.

The remaining order is:

1. Convert regular pages in feature batches.
2. Convert the survey builder, response tables, page-level dialogs, animations, and pseudo-elements last.
3. Remove old selectors only after usage searches and visual verification.

Some page files still use legacy utility-like selectors such as `field`, `field-label`, `input`, `dialog-overlay`, `mobile-nav-header`, and `mobile-nav-close` directly. Those selectors remain intentionally until their owning pages are migrated.

## Verification baseline

For every migration batch, verify at minimum:

- Production build and TypeScript checks pass.
- Authentication, dashboard, survey builder/preview, public survey, tracking, settings, and admin routes render correctly.
- Desktop and narrow/mobile layouts match the pre-migration version.
- Dialogs, dropdowns, focus states, loading indicators, toasts, and dynamic status badges still behave correctly.

No existing selector or global element rule is removed in Tasks 1-2, so this setup and token mapping are intended to produce no visual change.
