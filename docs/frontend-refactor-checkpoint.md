# Frontend Refactor Checkpoint

> Recorded: 2026-07-01

This checkpoint captures the repository state before the frontend visual-system refactor groundwork. It is intentionally frontend-focused and does not treat content/data refreshes as part of UI refactoring.

## Current Baseline

- Site data currently builds with 111 articles, 629 graph nodes, and 1656 graph links.
- Frontend baseline checks passed before this cleanup: `pytest tests/ -q`, `npm run lint` with two warnings, `npx vitest run`, and `STAGE_TEST=skip npm run build`.
- The canonical deploy path remains `/Users/xixiangyu/Documents/葬AI Web4/site` with `npm run deploy`; production deploys must not bypass `doctor_repo.sh`, KG review gate, or release profile.

## Dirty Worktree Groups

- Content/data refresh: `articles/109-111`, `data/`, `web-data/`, `README.md`, and `site/public/llms.txt`.
- Frontend/theme work: `site/src/app/globals.css`, `ThemeToggle.tsx`, `MethodologyTransitionLink.tsx`, `ThemeProvider.tsx`, `CelestialThemeTransition.tsx`, and `ui/8bit/badge.tsx`.
- Documentation/release notes: `AGENTS.md` and `CHANGELOG.md`.

## Refactor Guardrails

- Keep frontend visual refactors separate from article import, extraction, graph rebuild, or `web-data` refresh work.
- Use `site/src/lib/visual-tokens.ts` for shared visual constants before adding new hardcoded color clusters.
- Keep graph data contracts unchanged: `web-data/*.json` is copied into `site/public/data/` by `prebuild.sh`, then read through `site/src/lib/data.ts`.
- For visual-only batches, verify with `bash scripts/doctor_repo.sh --profile site-ui --ci`, `pytest tests/ -q`, `cd site && npm run lint && npx vitest run && STAGE_TEST=skip npm run build`.

## Manual Acceptance Pages

- `/`
- `/graph`
- `/graph?focus=<known-node-id>`
- `/articles`
- `/articles/001`
- `/leaderboard`
- `/test`
- `/test/methodology`
