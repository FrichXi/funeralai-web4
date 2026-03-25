<div align="center">
  <img src="site/public/logo.png" alt="葬AI Web4 logo" width="360" />
  <p><a href="https://funeralai.cc"><strong>funeralai.cc</strong></a></p>
</div>

# 葬AI Knowledge Graph / 葬AI 知识图谱

An open-source pipeline that turns a collection of Chinese AI industry commentary articles into an interactive knowledge graph. 68 articles are processed by Gemini to extract entities and relationships, then aggregated into a browsable graph with leaderboards.

一个开源的知识图谱管线：将中文 AI 行业评论文章集合转化为可交互的知识图谱可视化站点。68 篇文章经 Gemini 提取实体与关系，聚合为包含排行榜的可浏览图谱。

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
git clone https://github.com/FrichXi/funeralai-web4.git
cd funeralai-web4

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
├── articles/              # Source markdown articles (001-068)
├── scripts/               # Python pipeline
│   ├── run_pipeline.py    # Unified CLI entry point
│   ├── extract_gemini.py  # Gemini extraction
│   ├── graph_builder.py   # Graph aggregation
│   ├── graph_utils.py     # Entity normalization, merge maps, blacklists
│   ├── pipeline_state.py  # Manifest management, config loading
│   ├── overrides.py       # Declarative post-processing rules
│   ├── post_process.py    # Apply overrides to graph
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
