# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- Repository hygiene guardrails: `doctor_repo.sh`, `deploy_site.sh`, and `check_no_secrets.py` now enforce the canonical deploy root, profile-specific release checks, generated-file tracking checks, and public secret scanning.
- Articles 107-108 imported from Substack: "网吧黑客松将于杭州风光大办" (107) and "深圳AI硬件特别正常" (108). Incremental pipeline run completed successfully with 4/3 and 12/5 entity/relationship counts; public stats updated to 108 articles / 619 entities / 1602 relationships.
- Article 106 imported from Substack: "我来给LibTV道喜了" (106). Incremental pipeline run completed successfully with 14 entities and 19 relationships extracted; public stats updated to 106 articles / 609 entities / 1594 relationships.
- `scripts/sync_github_repo.sh` to let the weekday Substack automation push article/graph/stat updates to GitHub while refusing to mix in unrelated local changes.
- Article 105 imported from Substack: "葬AI基准测试发布，GLM 5.2第一，超越Opus 4.8" (105). Incremental pipeline run completed successfully with 16 entities and 15 relationships extracted; public stats updated to 105 articles / 609 entities / 1578 relationships.

### Changed
- Frontend builds now require an explicit `/test` staging mode: `STAGE_TEST=skip` for clean CI builds, `STAGE_TEST=required` for benchmark updates, with local benchmark paths kept in ignored `site/benchmark.local.json`.
- `site/public/data/`, `site/public/test/`, and `data/graph/canonical_full.json` are treated as generated artifacts instead of tracked source.
- `/test` default ranking, value leaderboard, and round matrix now use the 2026-06-24 composite score: graph-weighted base score plus full graph-stability recheck. r6 Doubao is adjusted from 100 to 88.8 due to severe graph motion.

### Fixed
- CI frontend builds no longer render `/test` leaderboard PNGs when `STAGE_TEST=skip`; production rendering now scrolls each export target into view and waits for the logo image to load before screenshotting.
- `/test` leaderboard image downloads now fetch a manifest-versioned, cache-busted PNG on every click, so exported images follow the current public ranking instead of an older cached file.
- Substack importer now falls back to the local Chrome CDP proxy when direct requests are blocked by Cloudflare challenges.
- Article 093 source filename normalized so generated article metadata no longer picks up the `_副本` suffix during deployment.
- CI: upgrade Node.js from 18 to 20 in all frontend jobs — Vitest/rolldown requires `node:util.styleText` (Node 20+)

### Changed
- README: added live site link (funeralai.cc), updated stats to 93 articles / 556 entities / 1396 relationships, fixed git clone URL to `FrichXi/funeral-ai-web4`
- `llms.txt`: updated entity/relationship counts to match current graph data
- Weekday Substack automation should now deploy first, then sync the GitHub repo only when the working tree contains sync-scoped content/data changes.

### Added
- Article 104 imported from Substack: "生数鉴定为鸭腿吃多了" (104). Incremental pipeline run completed successfully with 12 entities and 14 relationships extracted; public stats updated to 104 articles / 605 entities / 1566 relationships.
- Environment templates for OpenAI-compatible local agent providers: Alibaba Cloud DashScope China, Kimi/Moonshot China, and DeepSeek.
- Articles 099-103 imported from Substack: "马卡龙开创AI短剧Neo Lab" (099), "网吧黑客松里有真黑客" (100), "AI圈神童杀死神人" (101), "腾讯做了一堆情感陪伴Agent" (102), and "Kimi看天讨饭吃" (103). Full pipeline: import → extraction → post-processing → frontend data → deploy.
- Articles 094-098 imported from Substack: "大部分男的聊天水平不如EVE" (094), "4K的可灵没能复兴残酷底层物语" (095), "葬AI一周年，我不再用AI写作" (096), "光帆耳机拒绝长发男" (097), and "HeyGen不是给人用的" (098). Full pipeline: import → extraction → post-processing → frontend data → deploy.
- Pre-deploy KG review gate (`scripts/kg_review_gate.py`) and `site` deploy hook. Deployment now rebuilds graph data, checks holistic review coverage, verifies extracted entities survive into frontend payloads, and surfaces relationship candidates before upload.
- Articles 073-077: "做个人吧，别做AI" (073), "我们决定代表全体人类向龙虾宣战" (074), "葬CLI如闪电般上线" (075), "OpenClaw气功纪录片今日上映" (076), "Flova和TapNow背对背拥抱" (077). Full pipeline: extraction → post-processing → frontend data → deploy.
- Articles 070-072: "Mulerun借假修真Agent市场明牌竞争" (070), "小智AI才是真正的具身智能" (071), "Lovart狂做TapNow" (072). Full pipeline: extraction → graph aggregation → post-processing → frontend data → deploy.

### Changed
- Knowledge graph canonical pruning now retains mentioned entities even when they have no surviving strong edge, so article pages do not lose entities after weak `related` edges are pruned.
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
- Holistic review for articles 070-093 added missing stable relationship overrides for M5Stack/小智AI, Monolith/Tripo, and Vivix/7verse/科比, while preserving standalone entities such as Somnia Lab and 自变量.
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
