# Frontend Layout Contracts

> Scope: frontend maintainability only. This document does not change or govern the knowledge graph pipeline, extraction scripts, or generated data.

## TL;DR

- Do not touch `scripts/`, `data/`, `web-data/`, or `pipeline.toml` for frontend maintainability work.
- Page shells own width, gutters, grids, sticky/fixed placement, and cross-section alignment.
- Feature components own internal layout only.
- Primitives may style themselves, but must not silently decide page-level layout.
- `--navbar-height` is the only navbar height source of truth.
- Keep current visuals unchanged unless a task explicitly asks for redesign.

## Ownership Model

### Page shell

Owns `max-width`, gutters, vertical spacing, page grid, sticky/fixed placement, and shared row/column alignment.

Shared shells:

- `PageContainer`: standard content pages
- `CenteredScreen` / `StatusScreen`: full-screen 404/error/empty states

### Feature component

Owns internal section spacing and layout inside one feature.

Examples:

- `LeaderboardPageClient`: leaderboard title/table alignment
- `GraphClient`: graph canvas + sidebar split

### Primitive

May own borders, retro framing, font treatment, and local padding.  
Must not silently own viewport math, page centering, sticky/fixed placement, or cross-section alignment.

If a primitive needs layout behavior, expose it as an explicit prop or variant.

## Shared Layout Contracts

### Navbar height

- Source of truth: `--navbar-height` in `site/src/app/globals.css`
- Consumers: navbar height, graph viewport height, desktop entity drawer offset
- Do not hardcode `2.5rem` or `h-10` elsewhere

### Standard content pages

- Use `PageContainer`
- Default contract: centered, `max-w-7xl`, `px-4`, `py-6`
- If a page needs a different width, override `PageContainer`; do not copy the shell

### Full-screen status pages

- Use `CenteredScreen` or `StatusScreen`
- Covers 404, root error, route-group error, and similar empty/fatal states

### Leaderboard alignment contract

- Row 1: left tabs, right sponsor title
- Row 2: left main table, right sponsor table
- Sponsor title centered over sponsor table
- Sponsor table top aligned with main table top
- Do not reintroduce nested centering wrappers for title/table

### Graph page exception

- `/graph` is not a standard content page
- It intentionally owns viewport-height layout, canvas/sidebar split, and overlays
- Do not force it into `PageContainer`

## Primitive Contracts

### 8bit Table

- The wrapper is decorative, but layout behavior must be explicit:

- `layout="intrinsic" | "fill"`
- `align="start" | "center"`

Do not hide page-level layout behavior inside a primitive default.

## Refactor Checklist

1. Verify whether the change is page-shell, feature-layout, or primitive-level.
2. If it affects alignment across sections, implement it at page or feature level.
3. If a primitive needs new layout behavior, add an explicit prop/variant instead of changing hidden defaults.
4. Reuse `PageContainer` and `StatusScreen` before adding another one-off shell.
5. Keep current visuals unchanged unless the task explicitly requests a redesign.

## Validation

- `npm run build`
- `npm run test`
- manual check of `/`, `/leaderboard`, `/articles`, and `/graph`
