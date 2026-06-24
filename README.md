<p align="center">
  <img src="https://raw.githubusercontent.com/FrichXi/funeralai/main/assets/logo.png" alt="葬AI" width="400">
</p>

# 葬AI Knowledge Graph / 葬AI 知识图谱

An open-source pipeline that turns a collection of Chinese AI industry commentary articles into an interactive knowledge graph. 108 articles are processed by Gemini to extract entities and relationships, then aggregated into a browsable graph with leaderboards. **619 entities, 1602 relationships** — the most comprehensive Chinese AI industry knowledge graph.

一个开源的知识图谱管线：将中文 AI 行业评论文章集合转化为可交互的知识图谱可视化站点。108 篇文章经 Gemini 提取实体与关系，聚合为包含排行榜的可浏览图谱。**619 个实体、1602 条关系** — 最全面的中文 AI 行业知识图谱。

**Live site / 在线站点**: [funeralai.cc](https://funeralai.cc)

**Benchmark / 模型实测**: [funeralai.cc/test](https://funeralai.cc/test) publishes the 8-model / 80-site Web4 rebuild benchmark. The default score is the 2026-06-24 composite standard: graph-weighted base score plus full graph-stability recheck.

## Architecture / 架构

```
articles/*.md                    # Source articles (markdown)
        │
        ▼
scripts/extract_gemini.py        # Gemini entity/relationship extraction
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
site/                            # Next.js 14 static site (Cytoscape graph + leaderboards)
```

## Quick Start / 快速开始

### Prerequisites

- Python 3.10+
- Node.js 18+
- A [Gemini API key](https://aistudio.google.com/apikey)

### Setup

```bash
git clone https://github.com/FrichXi/funeral-ai-web4.git
cd funeral-ai-web4

# Python dependencies
pip install -r requirements.txt

# Frontend dependencies
cd site && npm install && cd ..

# Configure API key
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY
```

### Run the Pipeline

```bash
# Full pipeline: extract → post-process → generate frontend data
python -m scripts.run_pipeline

# Or run individual steps:
python -m scripts.run_pipeline extract     # Gemini extraction only
python -m scripts.run_pipeline build       # Post-process + generate frontend data
python -m scripts.run_pipeline present     # Regenerate frontend JSON only

# Process specific articles:
python -m scripts.run_pipeline --articles 069 070

# Pre-deploy graph review gate:
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
├── articles/              # Source markdown articles (001-108)
├── scripts/               # Python pipeline
│   ├── run_pipeline.py    # Unified CLI entry point
│   ├── extract_gemini.py  # Gemini extraction
│   ├── graph_builder.py   # Graph aggregation
│   ├── graph_utils.py     # Entity normalization, merge maps, blacklists
│   ├── pipeline_state.py  # Manifest management, config loading
│   ├── overrides.py       # Declarative post-processing rules
│   ├── post_process.py    # Apply overrides to graph
│   ├── kg_review_gate.py  # Pre-deploy entity/relationship review gate
│   └── build_presentation.py  # Generate frontend data
├── data/
│   ├── config/            # display_registry.json, schema config
│   ├── extracted/         # Per-article extraction artifacts (generated)
│   └── graph/             # Canonical graphs (generated)
├── web-data/              # Frontend-ready JSON (generated)
├── site/                  # Next.js 14 frontend
├── pipeline.toml          # Pipeline configuration
├── requirements.txt       # Python dependencies
└── tests/                 # pytest + vitest tests
```

## Configuration / 配置

Pipeline settings are in `pipeline.toml`. Fork users can adjust model, prompt version, concurrency, etc. without editing Python source code.

The `[kg_review]` section records the last holistic relationship review coverage. `site/npm run deploy` rebuilds the graph, runs `scripts/kg_review_gate.py`, builds the static site, then uploads. If new articles accumulate past `max_unreviewed_articles` or extracted entities disappear from frontend data, deployment fails until `overrides.py` and `last_holistic_review_article` are updated.

## Article Source / 文章源

The canonical live source for 葬AI articles is Substack: `https://funeralai.substack.com/`.
This repository mirrors the configured local article corpus into `articles/` before pipeline runs; on this machine the local corpus is configured in `pipeline.local.toml` as `/Users/xixiangyu/Documents/咸鱼写作文本/葬AI`.

To import new Substack posts into the configured corpus and refresh the repo mirror:

```bash
python -m scripts.import_substack_articles
```

To push a completed content/data refresh to GitHub without accidentally mixing unrelated local edits:

```bash
./scripts/sync_github_repo.sh --profile content "content: sync articles 106"
```

The helper only stages paths allowed by the selected profile. Use `content` for article/data refreshes, `test-benchmark` for `/test` benchmark work, `site-ui` for frontend/theme changes, and `release` only for intentionally combined releases. If other local files are dirty, it exits with a blocker instead of pushing a mixed commit.

## Repository Hygiene

This repo is deployed only from `/Users/xixiangyu/Documents/葬AI Web4` on the local machine. Before release-sensitive work, run:

```bash
./scripts/doctor_repo.sh --profile release
```

Deploy through the guarded wrapper:

```bash
./scripts/deploy_site.sh --profile release
```

`site/public/data/` and `site/public/test/` are generated build artifacts and must stay untracked. `/test` benchmark staging is explicit: use `STAGE_TEST=required npm run stage:test` when updating benchmark data, and `STAGE_TEST=skip npm run build` for clean CI-style builds that should not depend on the external benchmark workspace.

## Frontend Maintainability

Frontend layout and hidden UI contracts are documented in [`docs/frontend-layout-contracts.md`](docs/frontend-layout-contracts.md).

That document is frontend-only: it covers page shells, navbar offsets, leaderboard alignment, and primitive layout boundaries. It does not change the pipeline or generated data.

## Contributing / 贡献

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to:
- Add new articles
- Fix entity extraction errors
- Add new entity/relationship types

## License

[MIT](LICENSE)
