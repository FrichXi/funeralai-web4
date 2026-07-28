# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

- Added a versioned release contract with article/graph/benchmark invariants, key-file hashes, a full static-tree digest, Git/runtime identity, local verification, and retrying remote verification.
- Added a two-phase Cloudflare Pages release flow that validates an immutable preview before promoting the same `site/out` tree to production, then verifies both the unique deployment URL and `funeralai.cc` and writes an ignored release receipt.
- Added a dry-run-first Cloudflare Pages rollback CLI with post-rollback production-contract verification, a deterministic 160-entry CI benchmark fixture, release-guard/rollback tests, and the engineering reliability plan, audit, and operations runbook.

### Changed

- CI now uses Node 22, builds against the deterministic `STAGE_TEST=ci` fixture, and verifies the finalized static artifact contract.
- Production releases now run repository hygiene, KG review, readiness checks, Python tests, frontend lint/tests, full Graph V2 staging, preview verification, and production verification as one fail-closed transaction.
- Pinned the production framework to Next.js 15.5.21, PostCSS 8.5.24, and Wrangler 4.114.0; raw Pages deploys are restricted to a diagnostics-only preview branch.
- Presentation timestamps now derive from the newest durable article extraction, and unchanged extraction manifests are no longer rewritten, making no-content pipeline builds byte-reproducible.
- Graph shell preset coordinates now build spring-layout graphs in sorted node/edge order, removing cross-process hash-order drift while preserving the existing seeded layout algorithm.

### Fixed

- Repository hygiene now rejects source-tree backup copies and nested `node_modules` caches in addition to duplicate `site/public/test *` directories; existing copies/caches were moved to the ignored recovery area.
- Vitest now writes its cache to `site/node_modules/.vite` instead of recreating `site/src/node_modules` after every test run.
- Remote release verification now retries complete contract mismatches, including temporary old hashes during custom-domain propagation, instead of retrying only transport errors.
- Rollback dry-runs can now validate a production target and its release manifest through the existing Wrangler login without write credentials; execution still requires an explicit Pages Write API token and project confirmation.

- Holistic knowledge-graph review for articles 112-125, including corrections for benchmark-participant/product-user false positives and durable ownership edges for Kimi K3 and LingBot.
- Article 125 imported from Substack: "建议百度文心一言申请非遗" (125). Incremental pipeline run completed successfully with 19 entities and 20 relationships extracted; post-review public stats are 125 articles / 699 entities / 1860 relationships.
- Article 124 imported from Substack: "骡子马，TapNow想把你困在系统里" (124). Incremental pipeline run completed successfully with 12 entities and 13 relationships extracted; public stats updated to 124 articles / 694 entities / 1851 relationships.
- Article 123 imported from Substack: "阶跃软的不行来硬的" (123). Incremental pipeline run completed successfully with 20 entities and 20 relationships extracted; public stats updated to 123 articles / 690 entities / 1837 relationships.
- Article 122 imported from Substack: "Kimi K3打响前端闪电战" (122). Incremental pipeline run completed successfully with 17 entities and 13 relationships extracted; public stats updated to 122 articles / 681 entities / 1811 relationships.
- `/test` Graph V2 first-official benchmark release: 16 models × 10 audited tasks, downloadable byte-preserving raw archives with SHA-256 manifests, path-compatible browser copies, and a versioned `/test/archive/` route for the previous 80-site leaderboard.
- `site/scripts/stage-graph-v2-benchmark.mjs` builds and validates a complete candidate tree before an atomic `/test` activation, including model/round/slot identity checks and independent leaderboard re-aggregation.
- Article 121 imported from Substack: "骡子马，蚂蚁把世界模型作为一场儿戏" (121). Incremental pipeline run completed successfully with 16 entities and 18 relationships extracted; public stats updated to 121 articles / 677 entities / 1797 relationships.
- Article 120 imported from Substack: "Raft说明AI应用不会亡！" (120). Incremental pipeline run completed successfully with 10 entities and 13 relationships extracted; public stats updated to 120 articles / 670 entities / 1773 relationships.
- Article 119 imported from Substack: "视频Agent进入大致敬时代" (119). Incremental pipeline run completed successfully with 11 entities and 12 relationships extracted; public stats updated to 119 articles / 667 entities / 1756 relationships.
- Articles 116-118 imported from Substack: "民办大模型MiniMax努力专升本" (116), "我来给MiniMax道歉了" (117), and "第一届AI恐怖片黑客松开办" (118). Incremental pipeline run completed with 30/27, 22/18, and 2/1 entity/relationship counts; public stats updated to 118 articles / 667 entities / 1743 relationships.
- Article 115 imported from Substack: "网吧黑客松为西湖醋鱼平反" (115). Incremental pipeline run completed successfully with 11 entities and 6 relationships extracted; public stats updated to 115 articles / 654 entities / 1705 relationships.
- `/test` model leaderboard voting: viewers can mark a model as underrated or overrated with export-hidden 8-bit controls, backed by a Cloudflare Pages Function and D1 vote tables.
- Knowledge graph insights pipeline: presentation builds now generate `graph-insights.json`, lightweight `graph-shell.json`, and per-entity lazy detail payloads with deterministic communities, bridge nodes, preset coordinates, and suggested non-fact associations.
- Article readability pipeline: presentation builds now normalize soft-wrapped article Markdown for readable `body_markdown`, and article detail pages use a centered typography-first reading layout with graph context moved after the body.
- Article 114 imported from Substack: "硬件转转大会来了" (114). Incremental pipeline run completed successfully with 11 entities and 7 relationships extracted; public stats updated to 114 articles / 649 entities / 1699 relationships.
- Article 113 imported from Substack: "世界模型走了一些弯路" (113). Incremental pipeline run completed successfully with 22 entities and 18 relationships extracted; public stats updated to 113 articles / 644 entities / 1693 relationships.
- Article 112 imported from Substack: "老天保佑Qwen救救阿里巴巴" (112). Re-extracted with `qwen3.7-max`; public stats updated to 112 articles / 633 entities / 1668 relationships.
- Extraction pipeline now loads `/Users/xixiangyu/.env` before repo-local `.env`, so the weekday workflow can reuse the shared DashScope API key without copying secrets into the repository.
- Holistic KG review record for articles 099-111, with `pipeline.toml` coverage advanced to article 111 after verifying that advisory co-mention candidates do not require new stable overrides.
- Frontend readiness audit script (`scripts/frontend_refactor_readiness.py`, with optional live-site metadata checks) and documentation for upcoming article typography and multi-benchmark work.
- Frontend refactor checkpoint (`docs/frontend-refactor-checkpoint.md`) and shared visual token layer (`site/src/lib/visual-tokens.ts`) to separate visual-system work from content/data refreshes.
- Articles 109-111 imported from Substack: "智谱与Anthropic是母凭子贵" (109), "葬AI基准测试更新：Seed 2.1 Pro急需摆脱平庸的重力" (110), and "用豆包办公得坐小孩那桌" (111). Incremental pipeline run completed successfully with 23/24, 16/18, and 12/15 entity/relationship counts; public stats updated to 111 articles / 629 entities / 1656 relationships.
- Repository hygiene guardrails: `doctor_repo.sh`, `deploy_site.sh`, and `check_no_secrets.py` now enforce the canonical deploy root, profile-specific release checks, generated-file tracking checks, and public secret scanning.
- Articles 107-108 imported from Substack: "网吧黑客松将于杭州风光大办" (107) and "深圳AI硬件特别正常" (108). Incremental pipeline run completed successfully with 4/3 and 12/5 entity/relationship counts; public stats updated to 108 articles / 619 entities / 1602 relationships.
- Article 106 imported from Substack: "我来给LibTV道喜了" (106). Incremental pipeline run completed successfully with 14 entities and 19 relationships extracted; public stats updated to 106 articles / 609 entities / 1594 relationships.
- `scripts/sync_github_repo.sh` to let the weekday Substack automation push article/graph/stat updates to GitHub while refusing to mix in unrelated local changes.
- Article 105 imported from Substack: "葬AI基准测试发布，GLM 5.2第一，超越Opus 4.8" (105). Incremental pipeline run completed successfully with 16 entities and 15 relationships extracted; public stats updated to 105 articles / 609 entities / 1578 relationships.

### Changed
- `/test/methodology/` 增加 Sol、Fable、Kimi K3 与 Qwen 3.8 的跨批四强分析，以巅峰一致性、单步效率、上限确定性和各自失败模式补充当前正式榜，并明确与榜单计分隔离。
- `/test/methodology/` now analyzes only the Graph V2 first-official 16×10 release, with scorer 3.1 weights and penalties, score distributions, value-index boundaries, replacement audit, raw-artifact guarantees, and current limitations; the `/test` header now keeps only GitHub, 模型分析, and 旧榜单 actions.
- `/test` now presents the public schema 1.3 “模型总榜” as S–E score bands without within-band ranking, keeps an explicitly ranked value table, and links each round to both a compatibility viewer and its untouched raw archive.
- `/graph` now loads the lightweight shell payload by default, uses preset Cytoscape coordinates instead of rerunning force layout on every visit, and adds community/type coloring plus weak dashed suggested links for the selected node.
- Knowledge graph now defaults to a connected-node view, with controls for connected/core/full topology modes to reduce isolated-node clutter while keeping the complete graph accessible.
- Frontend dependencies now resolve with zero `npm audit` findings by upgrading Next.js to the patched 15.x line, refreshing frontend tooling, and overriding Next's nested PostCSS to the safe project version.
- Article detail pages now place the knowledge graph summary in the former opening excerpt slot and omit the top excerpt panel.
- Default extractor provider switched from Gemini to DashScope OpenAI-compatible Chat Completions with `qwen3.7-max`; pipeline config, CLI validation, and setup docs now point at `DASHSCOPE_API_KEY`.
- GitHub sync profiles now include frontend governance docs, readiness checks, and tests so release/site-ui commits can carry the refactor groundwork without bypassing `sync_github_repo.sh`.
- Frontend visual groundwork now routes shared brand/semantic colors through `visual-tokens.ts`, extracts leaderboard sponsor visuals into a feature-local module, and moves celestial theme-transition CSS out of `globals.css`.
- CI GitHub Actions now use Node 24-compatible action runtimes (`checkout@v7`, `setup-node@v6`, `setup-python@v6`) and run frontend jobs on Node.js 24.
- Frontend builds now require an explicit `/test` staging mode: `STAGE_TEST=skip` for clean CI builds, `STAGE_TEST=required` for benchmark updates, with local benchmark paths kept in ignored `site/benchmark.local.json`.
- `site/public/data/`, `site/public/test/`, and `data/graph/canonical_full.json` are treated as generated artifacts instead of tracked source.
- `/test` default ranking, value leaderboard, and round matrix now use the 2026-06-24 composite score: graph-weighted base score plus full graph-stability recheck. r6 Doubao is adjusted from 100 to 88.8 due to severe graph motion.

### Fixed
- Production deploy preflight now rejects duplicate `site/public/test *` backup directories and static exports at or above 19,000 files, preventing Cloudflare Pages' 20,000-file cap from silently blocking article updates.
- `/test` 模型总榜与性价比榜的下载图片改用接近网页桌面表格的宽幅布局，避免模型数量增加后继续导出过长的手机细条图。
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
