# 葬AI 知识图谱分析站点

> Last verified: 2026-03-19

## 项目概述

为中文 AI 行业评论媒体"葬AI"搭建公开知识图谱分析站点。72 篇文章（编号 001-072，003 缺）经 Gemini 提取实体与关系，聚合为知识图谱（具体节点/边数量见 `web-data/graph-view.json`）。纯静态部署，无后端。

## 品牌风格

- **品牌色**: `#7351cf`（紫色）
- **辅助色**: 粉色/珊瑚色（来自 logo 物料）
- **风格关键词**: 非主流、大胆、叛逆、像素风元素
- **品牌物料位置**: `葬ai物料/`
- **Logo**: "@葬AI"，有像素风按钮版本
- 暗色主题为主，紫色背景 + 强对比

## 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 框架 | Next.js (App Router, 静态导出) | ^14.2 |
| UI | React + TypeScript | ^18.3 / ^5.5 |
| 样式 | Tailwind CSS | ^3.4 |
| 图谱渲染 | Cytoscape + cytoscape-fcose | ^3.30 / ^2.2 |
| Markdown | react-markdown + remark-gfm | ^9.0 / ^4.0 |
| 提取 | Python 3 + Gemini API | — |
| 部署 | Cloudflare Pages（纯静态） | — |
| 数据库 | **无**（纯 JSON 文件，无数据库） | — |

## 项目结构

```
.
├── CLAUDE.md                          # 本文件 — 项目配置与架构指南
├── CHANGELOG.md                       # 变更日志
├── docs/
│   ├── frontend-layout-contracts.md   # 前端布局规则
│   └── data-formats.md               # 数据 JSON 格式定义
│
├── articles/                          # 原始 Markdown 文章（001-070，003 缺）
├── data/
│   ├── extracted/{id}.json            # Gemini 提取结果（每篇文章）
│   ├── graph/
│   │   ├── canonical.json             # 聚合后原始图谱
│   │   ├── canonical_corrected.json   # 后处理修正后图谱
│   │   └── canonical_full.json        # 完整图谱（含弱边）
│   ├── config/
│   │   └── display_registry.json      # 节点展示配置（visualMode、featured）
│   └── state/
│       └── articles_manifest.json     # 文章提取状态追踪
│
├── web-data/                          # 前端数据（由 build_presentation.py 生成）
│   ├── graph-view.json                # 主图谱数据（nodes + links）
│   ├── article-index.json             # 文章索引（含 count 包装）
│   ├── leaderboards.json              # 4 个分类排行榜
│   └── articles/{id}.json             # 单篇文章详情（001-069，含 body_markdown）
│
├── scripts/                           # 提取 + 后处理 + 构建管线（Python）
│   ├── extract_gemini.py              # Gemini API 提取（支持多 key 轮询）
│   ├── graph_builder.py               # 图谱聚合（多篇 → 单图）
│   ├── graph_utils.py                 # 实体类型/合并/关系配置
│   ├── pipeline_state.py              # 版本管理 + manifest
│   ├── build_graph.py                 # 聚合入口
│   ├── run_full_extraction.py         # 全量提取 runner
│   ├── run_pipeline.py                # 端到端管线 runner
│   ├── overrides.py                   # 声明式后处理规则（纯数据）
│   ├── post_process.py                # 后处理执行引擎
│   ├── build_presentation.py          # 前端数据生成 → web-data/
│   └── enrich_graph.py                # (legacy) 旧后处理脚本，待移除
│
└── site/                              # Next.js 前端项目
    ├── next.config.mjs                # { output: 'export', trailingSlash: true }
    ├── prebuild.sh                    # web-data/ → public/data/ 拷贝脚本
    ├── public/
    │   ├── data/                      # prebuild 拷贝的前端数据
    │   ├── logo.png                   # 站点 logo
    │   ├── og-image.png               # OG 社交分享图（1200×630，需用户创建）
    │   ├── robots.txt                 # 爬虫规则 + Sitemap 指令
    │   ├── llms.txt                   # AI 爬虫引导文件
    │   ├── _headers                   # Cloudflare Pages 安全头 + 缓存策略
    │   └── fonts/                     # 本地字体（GeistMono）
    └── src/
        ├── app/
        │   ├── layout.tsx             # 根布局（元数据 + WebSite JSON-LD + OG 配置）
        │   ├── globals.css            # 全局样式 + CSS 变量（--navbar-height 等）
        │   ├── page.tsx               # 品牌落地页（/）— 无导航栏
        │   ├── not-found.tsx          # 品牌 404 页面
        │   ├── sitemap.ts             # 动态生成 sitemap.xml
        │   └── (main)/               # Route Group — 有导航的页面
        │       ├── layout.tsx         # Navbar 布局
        │       ├── error.tsx          # 路由级错误边界
        │       ├── graph/
        │       │   ├── page.tsx       # 服务端组件 + Dataset JSON-LD
        │       │   └── GraphClient.tsx  # 客户端：图谱 + 侧栏
        │       ├── articles/
        │       │   ├── layout.tsx     # 宽度包装 + Footer
        │       │   ├── page.tsx       # 文章列表 + CollectionPage JSON-LD
        │       │   └── [id]/page.tsx  # 文章详情（SSG）+ Article JSON-LD
        │       └── leaderboard/
        │           └── page.tsx       # 排行榜 + ItemList JSON-LD
        ├── components/
        │   ├── layout/                # Navbar, Footer, PageContainer, StatusScreen
        │   ├── graph/                 # GraphCanvas, GraphControls, GraphLegend, EntityDrawer
        │   ├── leaderboard/           # LeaderboardPageClient, LeaderboardTabs, LeaderboardSidebar
        │   ├── article/               # ArticleList, ArticleBody, EntityTag
        │   └── ui/                    # 通用 UI 原语（8bit 像素风 + shadcn 基础组件）
        ├── hooks/
        │   ├── useGraphData.ts        # 图谱数据加载（fetch + error/retry）
        │   └── useGraphInteraction.ts # 图谱交互逻辑（选中/高亮/过滤/tooltip）
        └── lib/
            ├── types.ts               # 全部 TS 类型定义
            ├── data.ts                # 数据加载工具（SSG 构建时用）
            ├── graph-config.ts        # Cytoscape 样式/布局配置/纯函数
            ├── constants.ts           # NODE_TYPE_REGISTRY、RELATION_STYLES 映射
            └── utils.ts               # 通用工具函数（cn 等）
```

## 数据流

```
articles/*.md
  → extract_gemini.py → data/extracted/{id}.json     （Gemini 提取）
  → build_graph.py    → data/graph/canonical.json     （聚合）
  → post_process.py   → data/graph/canonical_corrected.json  （后处理修正）
  → build_presentation.py → web-data/*.json           （前端数据）
  → prebuild.sh       → site/public/data/             （构建时拷贝）
  → next build        → site/out/                     （纯静态 HTML）
```

## 路由结构

`(main)/` 是唯一路由组。根级路由仅保留 `page.tsx` 落地页和 `layout.tsx` 根布局。

| 路由 | 渲染 | 数据加载 | SEO |
|------|------|----------|-----|
| `/` | SSG | 无数据依赖 | 继承根 metadata |
| `/graph` | SSG shell + CSR canvas | graph-view.json 客户端 fetch | Dataset JSON-LD |
| `/leaderboard` | SSG | leaderboards.json 构建时读取 | ItemList JSON-LD |
| `/articles` | SSG | article-index.json 构建时读取 | CollectionPage JSON-LD |
| `/articles/[id]` | SSG（generateStaticParams） | 各 article JSON 构建时读取 | Article JSON-LD |

## SEO 与社交分享

### 元数据继承

根 `layout.tsx` 定义全局 metadata（title、description、OG、Twitter Card），所有子页面自动继承。各页面可覆盖自己的 title/description。

### 结构化数据（JSON-LD）

| 页面 | Schema 类型 | 数据来源 |
|------|-------------|----------|
| 根布局 | `WebSite` + `SearchAction` | 静态 + `?focus=` 参数 |
| 文章详情 | `Article` | `article` 变量（标题/日期/作者/摘要） |
| 文章列表 | `CollectionPage` | 静态 |
| 知识图谱 | `Dataset` | `stats` 变量（文章数/节点数/关系数） |
| 排行榜 | `WebPage` + `ItemList` | 静态（4 个排行分类） |

### 社交分享图

- `site/public/og-image.png`（1200×630）— 需用户手动创建
- 所有页面通过 metadata 继承自动引用

### 爬虫文件

| 文件 | 用途 |
|------|------|
| `robots.txt` | 爬虫规则 + Sitemap 指令 |
| `sitemap.ts` | 动态生成 sitemap.xml（所有路由） |
| `llms.txt` | AI 爬虫引导 |
| `_headers` | 安全头（X-Frame-Options 等）+ 静态资源缓存策略 |

## 节点类型系统

节点类型由 `NODE_TYPE_REGISTRY`（`constants.ts`）统一管理。

### 如何新增节点类型

1. `site/src/lib/types.ts` — 在 `NodeType` union 中添加新类型
2. `site/src/lib/constants.ts` — 在 `NODE_TYPE_REGISTRY` 中添加新条目（color, label, badgeClass）

所有其他引用（`NODE_COLORS`、`NODE_TYPE_LABELS`、`NODE_BADGE_CLASSES`、`ALL_NODE_TYPES`、GraphLegend、GraphControls 筛选、LeaderboardTabs/Sidebar badge）均从 registry 自动派生。

### 如何新增关系类型

1. `site/src/lib/types.ts` — 在 `RelationType` union 中添加新类型
2. `site/src/lib/constants.ts` — 在 `RELATION_STYLES` 中添加新条目

## 图谱实现要点

### Cytoscape 配置（`graph-config.ts`）
- **布局**: `fcose`（快速力导向），参数见 `FCOSE_LAYOUT_OPTIONS`
- **节点大小**: `nodeSize()` — 基于 `composite_weight` 线性映射到 [20, 80]
- **缩放标签**: `ZOOM_THRESHOLDS` 控制不同缩放级别的标签显示策略
- **动态导入**: `dynamic(() => import('./GraphCanvas'), { ssr: false })`

### 交互（`useGraphInteraction.ts`）
1. 点击节点 → EntityDrawer + 高亮邻居
2. 搜索 → 匹配 name + aliases，聚焦节点
3. 类型筛选 → checkbox 过滤
4. URL 参数 `?focus=nodeId` → 初始化定位

## 15 种关系类型

acquires, co_founded, collaborates_with, compares_to, competes_with, criticizes, develops, founder_of, integrates_with, invests_in, mentors, partners_with, praises, works_at, works_on

## 构建与部署

### 线上环境

- **域名**: `https://funeralai.cc`
- **托管**: Cloudflare Pages（项目名 `funeral-ai-web4`）
- **仓库**: `https://github.com/FrichXi/funeral-web4`（public，分支 `main`）

### Next.js 配置

```js
// next.config.mjs
{ output: 'export', images: { unoptimized: true }, trailingSlash: true }
```

- prebuild 脚本: `web-data/` → `site/public/data/`
- `next build` → 纯静态 `out/`

### 部署方式

**方式一：CLI 部署（当前使用）**
```bash
cd site && npm run build                              # 构建
wrangler pages deploy out --project-name funeral-ai-web4  # 部署
```

**方式二：推送自动部署（待配置）**
在 Cloudflare Dashboard 的 funeral-ai-web4 项目中连接 GitHub 仓库后，每次 `git push origin main` 会自动触发构建部署。构建配置：
- Build command: `cd site && npm install && npm run build`
- Build output directory: `site/out`
- Environment variable: `NODE_VERSION` = `20`

### 安全头与缓存

`site/public/_headers` 由 Cloudflare Pages 自动读取，包含：
- **安全头**: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`
- **长期缓存**: `logo.png`, `og-image.png`, 字体, `_next/static/*`（1 年 immutable）
- **短期缓存**: `data/*`（1 小时客户端，1 天 CDN）

## 前端布局契约

前端维护规则统一写在 `docs/frontend-layout-contracts.md`。做 UI/布局相关改动时，先看这个文档。

速记规则：

- 不要为了前端维护去改 `scripts/`、`data/`、`web-data/`、`pipeline.toml`
- 页面壳管 `max-width`、gutter、grid、sticky/fixed、跨区块对齐
- feature 组件只管本功能内部布局
- primitive 如需影响布局，必须暴露显式 prop/variant
- `--navbar-height` 是导航高度唯一来源
- 排行榜对齐规则以该文档为准，不要再用嵌套 `justify-center` 拼凑

## 提取管线

### 全链路命令
```bash
python3 scripts/run_full_extraction.py --force   # 提取 + 聚合 → canonical.json
python3 scripts/post_process.py                  # 后处理 → canonical_corrected.json
python3 scripts/build_presentation.py            # 生成前端数据 → web-data/
cd site && npm run build                         # 构建前端
```

### 多 key 支持
在 `.env` 中设置 `GEMINI_API_KEY=key1,key2,key3`（逗号分隔），自动轮询。

### 后处理规则
所有领域知识集中在 `scripts/overrides.py`（纯数据文件）：
- MISSING_NODES: 补充 Gemini 未提取的节点（step0b）
- NODE_MERGES: 同义节点合并
- TYPE_CORRECTIONS: 实体类型修正
- DESCRIPTION_OVERRIDES: 节点描述中性化改写（step3b）
- EDGE_TYPE_FIXES: 关系类型/端点修正
- MISSING_EDGES: 补充 Gemini 无法推导的关系
- BIDIRECTIONAL_RELATION_TYPES: 对称关系双向补全
- COMPANY_SUBSIDIARIES: 公司排行榜子公司合并规则（仅排行榜，不影响图谱）
- EXCLUDED_ARTICLES: 排除的文章ID集合（聚合和文章索引均跳过）

### 排序公式（composite_weight）

**公式**（三个独立维度 + 时间衰减，各自归一化后加权求和）：

`cw = 0.50 * (degree/max_d) + 0.35 * (tw_mc/max_tw_mc) + 0.15 * (tw_ac/max_tw_ac)`

- **degree（连接数）权重 50%**：体现在知识图谱中的网络枢纽性，**不衰减**（关系是结构性知识）
- **time_weighted_mc（时间加权提及数）权重 35%**：体现被深度讨论的程度，近期文章权重更高
- **time_weighted_ac（时间加权文章数）权重 15%**：体现跨文章的广泛性，近期文章权重更高

**时间衰减**：`decay(article) = 2^(-age_days / 180)`（半衰期 180 天）

- `time_weighted_mc = Σ min(每篇提及数, 25) × decay(article)`
- `time_weighted_ac = Σ decay(article)`
- 每篇文章最多计 25 次有效提及（抑制单篇专访高频提及），在此基础上乘以时间衰减系数

**标题提及奖励**：文章标题中出现的实体，每篇文章额外 +5 mention_count（在 `graph_builder.py` 聚合阶段添加）。不修改 extracted 数据，仅影响聚合后的 mention_count。

**两种归一化场景**：

- **图谱节点大小**：使用全局 composite_weight（`post_process.py` step7），所有节点共用同一组 max 值。这决定图谱中节点的视觉大小。
- **排行榜排名**：使用分类内 composite_weight（`build_presentation.py`），每个排行榜独立计算 max 值归一化。产品榜用产品的最大值，创始人榜用创始人的最大值，互不干扰。

**公司排行榜子公司合并**（仅排行榜，不影响图谱可视化）：
- 合并前汇总子公司的 degree（求和）、mention_count（求和）、source_articles（合并后用于时间加权计算）、article_count（文章集合取并集去重）
- 子公司从公司排行榜中移除，其数据并入母公司
- 合并规则见 `overrides.py` 的 `COMPANY_SUBSIDIARIES`

**排行榜排除规则**：见 `overrides.py` 的 `LEADERBOARD_EXCLUDE`（如葬AI作者从创始人榜排除）

## 变更规范

每次改动必须：
1. 在 `CHANGELOG.md` 的 `[Unreleased]` 下添加条目
2. 如涉及架构变更（新文件/目录、路由变更、数据流变更），同步更新 `CLAUDE.md`
3. 如涉及前端布局/组件边界变更，同步检查 `docs/frontend-layout-contracts.md` 是否需要更新
4. 新增节点类型 → 只改 `constants.ts` 的 `NODE_TYPE_REGISTRY` + `types.ts` 的 `NodeType`
5. 新增关系类型 → 只改 `constants.ts` 的 `RELATION_STYLES` + `types.ts` 的 `RelationType`
6. 新增后处理规则 → 只改 `overrides.py`
7. 新增实体类型 → 同时改 `graph_utils.py` 的 `ALLOWED_ENTITY_TYPES` + `TYPE_ALIASES`
