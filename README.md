<p align="center">
  <img src="https://raw.githubusercontent.com/FrichXi/funeralai/main/assets/logo.png" alt="葬AI" width="400">
</p>

# 葬AI Knowledge Graph / 葬AI 知识图谱

An open-source pipeline that turns a collection of Chinese AI industry commentary articles into an interactive knowledge graph. Articles are incrementally extracted with automatic DashScope → GLM → Kimi → MiniMax failover, then aggregated into a browsable graph. Current counts live in [`web-data/article-index.json`](web-data/article-index.json) and [`web-data/graph-view.json`](web-data/graph-view.json).

一个开源的知识图谱管线：将中文 AI 行业评论文章集合转化为可交互的知识图谱可视化站点。文章增量提取支持 DashScope → GLM → Kimi → MiniMax 自动切换。实时规模以 [`article-index.json`](web-data/article-index.json) 和 [`graph-view.json`](web-data/graph-view.json) 为准。

**Live site / 在线站点**: [funeralai.cc](https://funeralai.cc)

**Benchmark / 模型实测**: [funeralai.cc/test](https://funeralai.cc/test) publishes the Graph V2 first-official benchmark: 16 models × 10 frozen engineering tasks, with compatible viewers and byte-preserving raw archives.

## Architecture / 架构

```
articles/*.md                    # Source articles (markdown)
        │
        ▼
scripts/extract_gemini.py        # Entity/relationship extraction with provider failover
        │
        ▼
data/extracted/{id}.json         # Per-article extraction artifacts
        │
        ▼
scripts/post_process.py          # Apply declarative overrides (overrides.py)
        │
        ▼
scripts/build_presentation.py    # Generate frontend-ready JSON
        │
        ▼
web-data/                        # graph-view.json, leaderboards.json, article-index.json
        │
        ▼
site/                            # Next.js 15 static site (Cytoscape graph + leaderboards)
```

## Quick Start / 快速开始

### Prerequisites

- Python 3.10+
- Node.js 20–25 (CI uses Node 22)
- A DashScope API key for `qwen3.7-max`

### Setup

```bash
git clone https://github.com/FrichXi/funeralai-web4.git
cd funeralai-web4

# Python dependencies
pip install -r requirements.txt

# Frontend dependencies
cd site && npm ci && cd ..

# Configure API key
cp .env.example .env
# Edit .env or ~/.env and add your DASHSCOPE_API_KEY
```

### Run the Pipeline

```bash
# Full pipeline: extract → post-process → generate frontend data
python -m scripts.run_pipeline

# Or run individual steps:
python -m scripts.run_pipeline extract     # Incremental extraction only
python -m scripts.run_pipeline build       # Post-process + generate frontend data
python -m scripts.run_pipeline present     # Regenerate frontend JSON only

# Process specific articles:
python -m scripts.run_pipeline --articles 069 070

# Optional graph diagnostics:
python scripts/kg_review_gate.py
```

### Run the Frontend

```bash
cd site
npm run dev        # Dev server at http://localhost:3000
npm run build      # Static export to site/out/
```

## Data Flow / 数据流

| Step | Input | Output | Script |
|------|-------|--------|--------|
| Extract | `articles/*.md` | `data/extracted/{id}.json` | `extract_gemini.py` |
| Aggregate | `data/extracted/*.json` | `data/graph/canonical.json` | `graph_builder.py` |
| Post-process | `canonical.json` + `overrides.py` | `canonical_corrected.json` | `post_process.py` |
| Present | `canonical_corrected.json` | `web-data/*.json` | `build_presentation.py` |
| Frontend | `web-data/*.json` → `site/public/data/` | Static HTML/JS | Next.js SSG |

## Project Structure / 项目结构

```
├── articles/              # Source markdown articles
├── scripts/               # Python pipeline
│   ├── run_pipeline.py    # Unified CLI entry point
│   ├── extract_gemini.py  # Extraction with provider failover
│   ├── graph_builder.py   # Graph aggregation
│   ├── graph_utils.py     # Entity normalization, merge maps, blacklists
│   ├── pipeline_state.py  # Manifest management, config loading
│   ├── overrides.py       # Declarative post-processing rules
│   ├── post_process.py    # Apply overrides to graph
│   ├── kg_review_gate.py  # Optional entity/relationship diagnostics
│   ├── release_guard.py   # Release identity + local/remote verification
│   ├── rollback_pages.py  # Dry-run-first Cloudflare rollback
│   └── build_presentation.py  # Generate frontend data
├── data/
│   ├── config/            # display_registry.json, schema config
│   ├── extracted/         # Versioned per-article extraction inputs
│   └── graph/             # Canonical graphs (generated)
├── web-data/              # Frontend-ready JSON (generated)
├── site/                  # Next.js 15 frontend
├── pipeline.toml          # Pipeline configuration
├── requirements.txt       # Python dependencies
└── tests/                 # pytest + vitest tests
```

## Configuration / 配置

Pipeline settings are in `pipeline.toml`. Fork users can adjust model, prompt version, concurrency, etc. without editing Python source code. On this machine the extractor loads `~/.env` first, then allows repo-local `.env` values to override it.

The `[kg_review]` section records optional review coverage. Review age does not stop publication. Existing extraction results remain valid when the default model changes; use `--force` only for a deliberate re-extraction.

## Updating articles / 内容更新

```bash
git fetch origin main
git merge --ff-only origin/main
python3 -m scripts.run_pipeline update
```

The update command imports Substack posts, resumes missing/changed extractions, rebuilds data when necessary, compares it with production, deploys only when different, and retries GitHub synchronization even after a previous push failure. It never treats “zero new imports” as evidence that publication is complete.

Keys and provider URLs/models are loaded from `~/.env`, with optional repo-local `.env` overrides. Fallback order is DashScope → GLM → Kimi → MiniMax. Permanent provider errors switch immediately; transient errors receive bounded retries. Each artifact records the actual provider/model. Normalized `data/extracted/*.json` files are committed so new worktrees can rebuild without rerunning historical API calls. Raw API responses and credentials stay ignored.

The local article source is configured by `pipeline.local.toml` or `ZANGAI_ARTICLES_SOURCE_DIR`; the default in a clean clone is `articles/`. The importer preserves existing source files and uses Ego Lite if direct Substack access fails. Historical draft 139 is retained but excluded because 140 is the published version of the same article.

## Deployment / 发布

For an intentional combined release, from the canonical repository:

```bash
cd site
npm run deploy
```

Publication builds once, checks the exported files, uploads once to Cloudflare Pages, then verifies the unique deployment URL and `funeralai.cc`. Tests belong in CI and development; doctor, KG review and refactor-readiness tools are optional diagnostics, not repeated deployment prerequisites.

Scheduled content updates use a linked worktree and the `content` profile. They reuse the canonical `site/public/test` bundle through `TEST_BENCHMARK_DIR`; they do not rebuild benchmark source material or run a browser to regenerate unchanged leaderboard pictures. Code, graph and article changes remain separate from generated `site/public/data`, `site/public/test` and `site/out`.

The release manifest and ignored receipt retain the deployed content hashes and previous production ID. Recovery commands and incident details live in the [release runbook](docs/release-operations.md). GitHub Actions checks the code; it does not deploy the local-only benchmark bundle.

## Frontend Maintainability

Frontend layout and hidden UI contracts are documented in [`docs/frontend-layout-contracts.md`](docs/frontend-layout-contracts.md).

That document is frontend-only: it covers page shells, navbar offsets, leaderboard alignment, and primitive layout boundaries. It does not change the pipeline or generated data.

Before large article typography or benchmark-page work, run the read-only readiness audit:

```bash
python3 scripts/frontend_refactor_readiness.py
# Include live funeralai.cc metadata when cloud-state visibility matters:
python3 scripts/frontend_refactor_readiness.py --live
# Fail fast for local frontend-refactor prerequisites:
python3 scripts/frontend_refactor_readiness.py --strict
# Fail fast for release/cloud readiness:
python3 scripts/frontend_refactor_readiness.py --release-strict
```

The detailed readiness notes live in [`docs/frontend-refactor-readiness.md`](docs/frontend-refactor-readiness.md). They call out the article rendering chain (`body_markdown` → `ArticleBody`) and the benchmark expansion chain (`/test` routes → `stage-test-sites.mjs` → staged manifest/export images).

## Contributing / 贡献

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to:
- Add new articles
- Fix entity extraction errors
- Add new entity/relationship types

## License

[MIT](LICENSE)
