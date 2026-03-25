# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- Articles 070-072: "Mulerun借假修真Agent市场明牌竞争" (070), "小智AI才是真正的具身智能" (071), "Lovart狂做TapNow" (072). Full pipeline: extraction → graph aggregation → post-processing → frontend data → deploy.

### Changed
- Homepage "数据截至" subtitle is now dynamic — reads latest article info from `article-index.json` via `getSiteStats()` at build time, instead of being hardcoded.
- OG social sharing image metadata (og:image, twitter:image) — all pages inherit from root layout. Requires user to place `og-image.png` (1200×630) in `site/public/`.
- JSON-LD structured data for all page types: upgraded WebSite schema (root), Article (detail pages), CollectionPage (article list), Dataset (graph), WebPage+ItemList (leaderboard).
- Article list page metadata (title + description) for better search result display.
- `Sitemap:` directive in `robots.txt` for improved crawler discovery.
- Static asset caching headers (`_headers`) for images, fonts, Next.js bundles, and data files.
- Copyright notice in Footer: "© 2026 葬AI · MIT License".
- Production deployment to Cloudflare Pages (`funeral-ai-web4`) at `funeralai.cc`.
- Cloudflare security headers (`site/public/_headers`).
- Domain metadata updated from placeholder to `funeralai.cc` (layout.tsx, sitemap.ts, JSON-LD).
- Frontend maintainability contracts in `docs/frontend-layout-contracts.md`, plus shared layout shells (`PageContainer`, `CenteredScreen`, `StatusScreen`) and a small layout regression test for the 8bit table contract.
- SEO and site metadata support: route metadata, article metadata generation, sitemap, favicon, JSON-LD, and crawler-facing files (`robots.txt`, `llms.txt`).
- Frontend error handling and refactors: branded root/route error screens, graph config/hooks extraction, route-group cleanup, and responsive/mobile graph controls.
- Pipeline and data tooling: `run_pipeline.py`, `post_process.py`, `build_presentation.py`, `pipeline.toml`, Vitest/pytest/CI, and multi-key Gemini support.
- Knowledge graph/data-model upgrades: `vc_firm` type, declarative override buckets, article exclusions, sponsor data, article-index enrichment, and new/renumbered article coverage.

### Changed
- Replaced favicon.ico with 葬AI logo (was Vercel default), title shortened to "葬AI Web4", footer now links to funeralai.substack.com.
- Ranking formula upgraded: weights changed from 0.40/0.40/0.20 (degree/mentions/articles) to 0.50/0.35/0.15, with 180-day half-life exponential time decay on mentions and article count. Degree (structural relationships) does not decay. Affects both graph node sizes and all 4 leaderboard rankings.
- Hidden frontend layout rules are now explicit: navbar height uses `--navbar-height`, graph viewport and entity drawer offsets derive from that variable, and 8bit table layout uses explicit `layout`/`align` props.
- Leaderboard UI evolved from a simple title/list into the current tabbed table + sponsor table layout, with alignment and sizing fixes across desktop and mobile breakpoints.
- Graph and article UX refinements: sidebar sizing, entity drawer mobile behavior, touch targets, font sizing, homepage subtitle, and standard content-page shell reuse.
- Knowledge graph build behavior changed substantially: ranking formula was revised more than once, article index shape was normalized for the frontend, and display/ranking data now come from the presentation build step.

### Fixed
- Re-extracted article 069 ("一个山东套壳AI如何上桌对话Cherry Studio创始人") — previous extracted data was stale (0 entities). Now correctly has 20 entities and 18 relationships including Yinsen, Cherry Studio, 王谦, 高利明 etc. Graph: 433→441 nodes, 1083→1103 links.
- Article entity references are remapped to canonical graph node IDs during presentation build, fixing broken entity tags and relationship references in article JSON.
- Large batches of graph data issues were corrected: duplicate nodes merged, entity types normalized, missing or wrong edges repaired, bidirectional competitive links filled, and several high-mention outliers suppressed in rankings.
- Frontend bugs fixed across tabs, mobile drawers, article pages, metadata text, and leaderboard presentation.

### Removed
- Article 011 from aggregation and frontend outputs via `EXCLUDED_ARTICLES`.
- Unused/obsolete UI files, duplicate route files, audit artifacts, and duplicate generated data copies.

## [0.2.0] - 2026-03-13

### Added
- (main) route group + Navbar + Footer
- 品牌落地页 (/)
- 图谱页集成排行榜侧栏

### 架构备注
- 路由结构: / (落地页) + (main)/ 下 graph/articles/leaderboard
- 数据流: web-data/ → prebuild.sh → public/data/ → SSG/CSR
