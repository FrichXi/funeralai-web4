# Launch Fix Plan

## Goal

Make the website and the open-source knowledge-graph pipeline reproducible, maintainable, and safe for incremental article updates.

## Decisions

- A contributor may keep a separate local article source directory and mirror it into `articles/` before running the pipeline.
- Repository `articles/` remains the committed mirror used by the pipeline, frontend, and GitHub.
- Generated article payloads and indexes must be rebuilt from source articles plus extraction artifacts on every presentation build.
- Broken graph references and duplicate article IDs must fail the build instead of silently shipping.

## Work Items

1. Sync canonical article source into repository `articles/` before loading articles.
2. Reject duplicate article IDs during pipeline article discovery.
3. Rebuild `web-data/articles/*.json` from source markdown and extracted artifacts.
4. Rebuild `web-data/article-index.json` from the rebuilt article payloads instead of copying stale indexes.
5. Validate article payload graph references and graph metadata counts during presentation build.
6. Fix frontend schema drift so TypeScript matches real generated JSON.
7. Add tests for duplicate IDs, article payload generation, and integrity validation.
