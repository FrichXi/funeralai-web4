# Frontend Refactor Readiness

> Scope: preparation for article typography and benchmark expansion work. This document does not redesign either area by itself.

## Readiness Command

Run the read-only audit before large frontend work:

```bash
python3 scripts/frontend_refactor_readiness.py
```

Add `--live` when cloud-state visibility matters:

```bash
python3 scripts/frontend_refactor_readiness.py --live
```

Use strict modes when a command should fail instead of only reporting:

```bash
# Frontend-refactor gate: entrypoints and benchmark manifest shape must be valid.
python3 scripts/frontend_refactor_readiness.py --strict

# Release/cloud gate: also requires live article metadata to match local web-data and KG gate to pass.
python3 scripts/frontend_refactor_readiness.py --release-strict
```

The report shows:

- current article/node/link totals from `web-data`
- required article and benchmark entrypoints
- article payloads with high single-newline paragraph risk
- staged `/test` benchmark snapshot metadata
- optional live `funeralai.cc` article/test metadata
- dirty worktree groups, split into content/data, frontend, docs/contracts, generated public, and other

## Current State Notes

As of 2026-07-02:

- Local `web-data` has 111 articles / 629 nodes / 1656 links, latest article 111.
- Live `funeralai.cc` article data has 108 articles, latest article 108.
- `/test` benchmark metadata is aligned locally and live at 80/80 entries with `playwright-recheck-composite-stability-20260624`.
- `python3 scripts/kg_review_gate.py` blocks release because holistic review is stale: 13 articles after 098. Entity presence checks pass, but relationship review still needs work before publishing the 111-article content refresh.

Implication: frontend refactor prep can continue locally, but deploying or syncing the current 111-article content state requires a separate KG review/content release transaction.

Expected gate behavior in this state:

- `python3 scripts/frontend_refactor_readiness.py --strict` should pass for local frontend refactor readiness.
- `python3 scripts/frontend_refactor_readiness.py --release-strict` should fail until live article data matches local content and `kg_review_gate.py` passes.

## Article Typography Track

Current source of truth:

- Import formatting: `scripts/import_substack_articles.py`
- Presentation payload: `scripts/build_presentation.py` writes `body_markdown`
- Render component: `site/src/components/article/ArticleBody.tsx`
- Detail page shell: `site/src/app/(main)/articles/[id]/page.tsx`

Known current risk:

- Some early article payloads contain many single newlines but very few blank-line paragraph breaks. ReactMarkdown treats those as fewer paragraphs, which can make article pages look unsegmented.
- A future typography norm should decide whether to normalize markdown during import/presentation, render single newlines as visual breaks in `ArticleBody`, or migrate existing article source text. Do not silently change all three layers at once.

Guardrails:

- Preserve `raw_markdown` and `body_markdown` in article JSON until a migration plan explicitly changes the payload contract.
- Add fixtures/tests for paragraph normalization before changing all article rendering.
- Manually check `/articles/001`, one recent long article, and one article with tables/lists after typography changes.

## Benchmark Expansion Track

Current source of truth:

- Public route: `site/src/app/(main)/test/page.tsx`
- Methodology route: `site/src/app/(main)/test/methodology/page.tsx`
- Staging script: `site/scripts/stage-test-sites.mjs`
- Export image renderer: `site/scripts/render-leaderboard-image.mjs`
- Download client: `site/src/components/test/LeaderboardImageDownload.tsx`
- Staged manifest: `site/public/test/manifest.json` generated from ignored local benchmark inputs

Known current risk:

- `/test` is a single benchmark-era page, not yet a multi-benchmark index.
- Score comparability depends on a fixed snapshot and scoring standard. New benchmark runs should get explicit `scoreStandard`, `dataVersion`, and `snapshotDate` boundaries instead of being appended into old rankings by default.

Guardrails:

- Keep `STAGE_TEST=skip` working for CI-style builds without local benchmark inputs.
- Use `STAGE_TEST=required npm run stage:test` for release validation or when benchmark artifacts must be regenerated.
- Treat any changed article/node/link snapshot as a new benchmark epoch unless there is a deliberate compatibility note.
- Update both route code and `stage-test-sites.mjs` when adding benchmark labels, versions, or manifest fields.

## Verification Before Big Frontend Work

```bash
bash scripts/doctor_repo.sh --profile site-ui --ci
python3 scripts/frontend_refactor_readiness.py --strict --live
pytest tests/ -q
cd site && npm run lint && npx vitest run && STAGE_TEST=skip npm run build
```
