# Frontend Layout Contracts

> Scope: frontend maintainability only. This document does not change or govern the knowledge graph pipeline, extraction scripts, or generated data.

## TL;DR

- Do not touch `scripts/`, `data/`, `web-data/`, or `pipeline.toml` for frontend maintainability work.
- Check `docs/frontend-refactor-checkpoint.md` before large visual refactors and keep content/data refreshes separate from UI work.
- Use `docs/frontend-refactor-readiness.md` and `python3 scripts/frontend_refactor_readiness.py` before article typography or benchmark expansion work.
- Page shells own width, gutters, grids, sticky/fixed placement, and cross-section alignment.
- Feature components own internal layout only.
- Primitives may style themselves, but must not silently decide page-level layout.
- Shared colors and visual constants live in `site/src/lib/visual-tokens.ts`; graph semantic colors still flow through `constants.ts`.
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
- `ArticleBody`: markdown component mapping and article-reading internals
- `/test` components/scripts: benchmark-era presentation and export internals

### Primitive

May own borders, retro framing, font treatment, and local padding.  
Must not silently own viewport math, page centering, sticky/fixed placement, or cross-section alignment.

If a primitive needs layout behavior, expose it as an explicit prop or variant.

## Shared Layout Contracts

### Visual tokens

- Use `site/src/lib/visual-tokens.ts` for shared brand, semantic, leaderboard, test-page, and theme-transition color constants.
- Keep graph data semantics in `NODE_TYPE_REGISTRY` and `RELATION_STYLES`; those registries may import token values, but feature components should not duplicate the same hex maps.
- If a visual decision applies to more than one feature, add a named token or local visual config module instead of another page-level `text-[#...]` / `bg-[#...]` cluster.
- Feature-local decorative maps may live beside the feature, as in `components/leaderboard/leaderboard-visuals.ts`, when moving them into global tokens would mix business-specific presentation with shared design primitives.

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

1. Read `docs/frontend-refactor-checkpoint.md` and confirm the work is not mixing article/data refreshes with UI changes.
2. Run `python3 scripts/frontend_refactor_readiness.py` when the change touches article typography, `/articles`, `/test`, benchmark staging, or benchmark exports.
3. Verify whether the change is page-shell, feature-layout, primitive-level, or visual-token work.
4. If it affects alignment across sections, implement it at page or feature level.
5. If a primitive needs new layout behavior, add an explicit prop/variant instead of changing hidden defaults.
6. Reuse `PageContainer` and `StatusScreen` before adding another one-off shell.
7. Keep current visuals unchanged unless the task explicitly requests a redesign.

## Validation

- `bash scripts/doctor_repo.sh --profile site-ui --ci`
- `python3 scripts/frontend_refactor_readiness.py`
- `pytest tests/ -q`
- `npm run build`
- `npm run test`
- manual check of `/`, `/leaderboard`, `/articles`, `/articles/001`, `/graph`, `/graph?focus=<known-node-id>`, `/test`, and `/test/methodology`
