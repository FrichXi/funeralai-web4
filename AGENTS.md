# 葬AI 知识图谱分析站点

> Last verified: 2026-09-06

## 项目概述

为中文 AI 行业评论媒体"葬AI"搭建公开知识图谱分析站点。当前文章语料增量提取实体与关系，API 按 DashScope → GLM → Kimi → MiniMax 自动切换，聚合为知识图谱（具体文章数、节点数、边数量见 `web-data/graph-view.json` 与 `web-data/article-index.json`）。纯静态部署，无后端。

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
| 框架 | Next.js (App Router, 静态导出) | 15.5.25 |
| UI | React + TypeScript | ^18.3 / ^5.5 |
| 样式 | Tailwind CSS | ^3.4 |
| 图谱渲染 | Cytoscape（预计算坐标） | ^3.33 |
| Markdown | react-markdown + remark-gfm | ^9.0 / ^4.0 |
| 提取 | Python 3 + 多供应商 OpenAI-compatible API | — |
| 部署 | Cloudflare Pages（纯静态） | — |
| 数据库 | **无**（纯 JSON 文件，无数据库） | — |

## 项目结构

```
.
├── AGENTS.md                          # 本文件 — 项目配置与架构指南
├── CHANGELOG.md                       # 变更日志
├── docs/
│   ├── frontend-layout-contracts.md   # 前端布局规则
│   ├── frontend-refactor-checkpoint.md # 前端大重构前工作区基线
│   ├── frontend-refactor-readiness.md # 文章排版/benchmark 改造前检查
│   ├── engineering-reliability-plan.md # 工程可靠性实施计划
│   ├── engineering-reliability-plan-audit.md # 可靠性计划独立审核
│   ├── release-operations.md           # 发布、验收、回滚运行手册
│   ├── kg-holistic-review-099-111.md  # 099-111 图谱整体复核记录
│   ├── ui-design-system.md            # 8-bit 视觉系统说明
│   └── data-formats.md               # 数据 JSON 格式定义
│
├── articles/                          # 原始 Markdown 文章
├── data/
│   ├── extracted/{id}.json            # 纳入 Git 的标准化提取结果，记录实际供应商/模型
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
│   ├── graph-view.json                # 完整图谱与证据（构建、数据下载）
│   ├── graph-shell.json               # 轻量首屏图谱，含预计算坐标
│   ├── entity-details/{id}.json       # 点击实体后按需读取的详情
│   ├── article-index.json             # 文章索引（含 count 包装）
│   ├── leaderboards.json              # 4 个分类排行榜
│   └── articles/{id}.json             # 单篇文章详情（含 body_markdown）
│
├── scripts/                           # 提取 + 后处理 + 构建管线（Python）
│   ├── extract_gemini.py              # 增量提取及供应商自动切换
│   ├── graph_builder.py               # 图谱聚合（多篇 → 单图）
│   ├── graph_utils.py                 # 实体类型/合并/关系配置
│   ├── graph_insights.py              # 构建时计算坐标、轻量图谱与实体详情
│   ├── pipeline_state.py              # 版本管理 + manifest
│   ├── build_graph.py                 # 聚合入口
│   ├── run_full_extraction.py         # 全量提取 runner
│   ├── run_pipeline.py                # update：导入、续跑提取、构建、按需发布、同步 Git
│   ├── overrides.py                   # 声明式后处理规则（纯数据）
│   ├── post_process.py                # 后处理执行引擎
│   ├── build_presentation.py          # 前端数据生成 → web-data/
│   ├── frontend_refactor_readiness.py # 前端重构前只读体检报告
│   ├── release_guard.py                # 发布契约、本地/远程产物验证
│   ├── rollback_pages.py               # Cloudflare production 回滚（默认 dry-run）
│   ├── worktree_policy.py              # 内容自动化 worktree 的受信边界校验
│   └── sync_github_repo.sh            # 将文章/图谱/公开统计安全提交并推送到 GitHub
│
└── site/                              # Next.js 前端项目
    ├── functions/                     # Cloudflare Pages Functions（静态站动态 API）
    │   └── api/test/votes.js          # /test 模型总榜投票收集 API
    ├── migrations/                    # Cloudflare D1 schema migrations
    │   └── 0001_benchmark_votes.sql   # benchmark 投票状态/事件表
    ├── wrangler.toml                  # Cloudflare Pages Functions/D1 binding 配置
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
│       ├── leaderboard/
│       │   └── page.tsx       # 排行榜 + ItemList JSON-LD
│       └── test/              # Web4 benchmark 展示页
│           ├── methodology/   # 当前模型逐项证据分析与口径
│           ├── multimodal-model-analysis/ # 3D / MG 单轮多模态分析
│           └── archive/       # 历史 benchmark 榜单入口
        ├── components/
        │   ├── layout/                # Navbar, Footer, PageContainer, StatusScreen
        │   ├── graph/                 # GraphCanvas, GraphControls, GraphLegend, EntityDrawer
        │   ├── leaderboard/           # LeaderboardPageClient, LeaderboardTabs, LeaderboardSidebar
        │   ├── article/               # ArticleList, ArticleBody, EntityTag
        │   ├── test/                  # /test 下载、方法论跳转、投票控件
        │   ├── theme/                 # ThemeProvider + celestial transition
        │   └── ui/                    # 通用 UI 原语（8bit 像素风 + shadcn 基础组件）
        ├── data/
        │   ├── web4-benchmark-current.json # /test 当前模型总榜（分数、耗时、调用数、成本）
        │   └── web4-benchmark-analysis.ts  # 当前模型有效 attempt 与 scorer/产物证据卡
        ├── hooks/
        │   ├── useGraphData.ts        # 轻量图谱加载（超时、取消、重试）
        │   └── useGraphInteraction.ts # 图谱交互逻辑（选中/高亮/过滤/tooltip）
        └── lib/
            ├── types.ts               # 全部 TS 类型定义
            ├── data.ts                # 数据加载工具（SSG 构建时用）
            ├── graph-config.ts        # Cytoscape 样式/布局配置/纯函数
            ├── constants.ts           # NODE_TYPE_REGISTRY、RELATION_STYLES 映射
            ├── visual-tokens.ts       # 前端品牌/语义/榜单/测试页视觉 token
            └── utils.ts               # 通用工具函数（cn 等）
```

## 数据流

```
articles/*.md
  → extract_gemini.py → data/extracted/{id}.json     （记录实际供应商/模型）
  → build_graph.py    → data/graph/canonical.json     （聚合）
  → post_process.py   → data/graph/canonical_corrected.json  （后处理修正）
  → build_presentation.py → web-data/*.json           （前端数据）
  → prebuild.sh       → site/public/data/             （构建时拷贝）
  → next build        → site/out/                     （纯静态 HTML）
```

## 文章源

- 葬AI 实时文章源：`https://funeralai.substack.com/`
- Substack feed：`https://funeralai.substack.com/feed`
- 本机文章库：`/Users/xixiangyu/Documents/咸鱼写作文本/葬AI`（由 `pipeline.local.toml` 的 `[articles].source_dir` 配置）
- 导入新文章：`python -m scripts.import_substack_articles`
- pipeline 会先把本机文章库镜像到仓库内 `articles/`；新增文章应先进入本机文章库，避免构建时被镜像步骤覆盖。

## 路由结构

`(main)/` 是唯一路由组。根级路由仅保留 `page.tsx` 落地页和 `layout.tsx` 根布局。

| 路由 | 渲染 | 数据加载 | SEO |
|------|------|----------|-----|
| `/` | SSG | 无数据依赖 | 继承根 metadata |
| `/graph` | SSG shell + CSR canvas | graph-shell.json 预加载；实体详情按需 fetch | Dataset JSON-LD |
| `/leaderboard` | SSG | leaderboards.json 构建时读取 | ItemList JSON-LD |
| `/articles` | SSG | article-index.json 构建时读取 | CollectionPage JSON-LD |
| `/articles/[id]` | SSG（generateStaticParams） | 各 article JSON 构建时读取 | Article JSON-LD |
| `/test` | SSG + 客户端投票控件 | 当前总榜读取 `src/data/web4-benchmark-current.json`；产物/性价比读取 manifest.json；投票写入 D1 | noindex |
| `/test/methodology` | SSG | 当前模型 JSON + 逐模型 evidence card | noindex |
| `/test/multimodal-model-analysis` | SSG | 2026-08-04 多模态简报与站内图片 | noindex |
| `/test/archive` | SSG | 历史 manifest 构建时读取 | noindex |

### 动态 API

站点主体仍是 `output: 'export'` 纯静态。少量动态能力通过 Cloudflare Pages Functions 提供：

| API | 用途 | 存储 |
|-----|------|------|
| `/api/test/votes` | `/test` 模型总榜“偏低/偏高”反馈收集 | Cloudflare D1 `BENCHMARK_VOTES_DB` |

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
- **布局**: `preset`，直接使用 `graph-shell.json` 的 `x/y`；坐标由 `graph_insights.py` 在构建时生成，浏览器不运行力导向迭代。
- **节点大小**: `nodeSize()` — 基于 `composite_weight` 线性映射到 [20, 80]
- **缩放标签**: `ZOOM_THRESHOLDS` 控制三个档位，只在跨档时批量更新。筛选和高亮使用 `cy.batch()`；移动视口时暂隐连线，画布像素比上限 1.5。
- **详情**: `useEntityDetails.ts` 在选中实体时读取对应 JSON；关闭或切换实体会取消请求，失败可重试。浏览器 HTTP 缓存负责重新验证，不保留无限期的内存详情缓存。
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
- **仓库**: `https://github.com/FrichXi/funeralai-web4`（public，分支 `main`）

### Next.js 配置

```js
// next.config.mjs
{ output: 'export', images: { unoptimized: true }, trailingSlash: true }
```

- prebuild 脚本: `web-data/` → `site/public/data/`
- `next build` → 纯静态 `out/`

### 更新与部署

详细命令、故障定位、回滚和维护说明统一放在 `docs/release-operations.md`。

- 日常内容：`git fetch origin main`、`git merge --ff-only origin/main`，然后 `python3 -m scripts.run_pipeline update`。任务使用与 canonical repo 共用 git common dir 的隔离 worktree；不能因“没有新导入”跳过未完成提取/发布/推送。
- 人工正式发布：在 `/Users/xixiangyu/Documents/葬AI Web4/site` 运行 `npm run deploy`。先生成好需要发布的 `web-data/`；发布只构建一次、校验实际产物、上传一次并检查线上结果。不再重复执行 doctor、KG review、readiness、全套测试或 preview 上传。
- 内容 worktree 发布使用 `WEB4_AUTOMATION_WORKTREE=1` 和 `content` profile；普通副本和 append 目录不能部署 production。共享 git 目录上的进程锁避免两个内容任务同时发布。
- `TEST_BENCHMARK_DIR` 指向 canonical `site/public/test` 已发布资源，供 worktree 复用；内容更新不依赖旧 benchmark 原始目录和 Chrome。更换 benchmark 时才显式运行 staging。下载图片复用当前榜单 JSON 中绑定的版本化 PNG。
- `site/public/data/`、`site/public/test/`、`site/public/release-manifest.json` 与 `site/out/` 是 ignored 生成物；`data/extracted/*.json` 是必须纳入 Git 的构图输入。
- GitHub Actions 使用 Node 22，只执行检查、测试和 `STAGE_TEST=ci` 的构建，不自动发布 production。正式构建使用 `STAGE_TEST=required`。
- GitHub 同步使用 `scripts/sync_github_repo.sh --profile content|test-benchmark|site-ui|release`；推送失败后，即使工作树干净也重试推送。已存在的无关本地文件不要混入提交。
- Cloudflare 凭据保留在 Wrangler 本机配置，不复制进仓库。发布脚本去掉代理变量以避免 OAuth 刷新时 TLS 失败。
- `/api/test/votes` 使用 `site/functions` 与 D1 binding；schema 变化时才执行 D1 migrations。无需为内容更新改数据库。
- 复核工具作为按需诊断使用；不得把复核日期、目录命名、文档手动统计或无关 UI 工作重新变成文章停更条件。

### 安全头与缓存

`site/public/_headers` 由 Cloudflare Pages 自动读取，包含：
- **安全头**: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`
- **长期缓存**: `logo.png`, `og-image.png`, 字体, `_next/static/*`（1 年 immutable）
- **数据缓存**: `data/*` 每次请求重新验证，避免发布后继续使用旧图谱和文章数据。

## 前端布局契约

前端维护规则统一写在 `docs/frontend-layout-contracts.md`。做 UI/布局相关改动时，先看这个文档。

速记规则：

- 不要为了前端维护去改 `scripts/`、`data/`、`web-data/`、`pipeline.toml`
- 页面壳管 `max-width`、gutter、grid、sticky/fixed、跨区块对齐
- feature 组件只管本功能内部布局
- primitive 如需影响布局，必须暴露显式 prop/variant
- 共享视觉常量优先放在 `site/src/lib/visual-tokens.ts`；图谱节点/关系语义色仍通过 `constants.ts` 的 registry 暴露
- `--navbar-height` 是导航高度唯一来源
- 排行榜对齐规则以该文档为准，不要再用嵌套 `justify-center` 拼凑
- 大规模视觉重构前先看 `docs/frontend-refactor-checkpoint.md`，不要把文章导入、图谱数据刷新和 UI 重构混在一个事务里
- 文章排版规范或 benchmark 扩展前先跑 `python3 scripts/frontend_refactor_readiness.py --strict`；需要核对线上状态时加 `--live`，发布/云端就绪检查用 `--release-strict`，并参考 `docs/frontend-refactor-readiness.md`
- 文章排版主入口是 `ArticleBody.tsx` + `build_presentation.py` 的 `body_markdown`；benchmark 主入口是 `/test` routes + `site/scripts/stage-test-sites.mjs`

## 提取管线

### 全链路命令
```bash
python3 -m scripts.run_pipeline                # 增量提取 + 聚合 + 展示数据
python3 scripts/post_process.py                  # 后处理 → canonical_corrected.json
python3 scripts/build_presentation.py            # 生成前端数据 → web-data/
cd site && npm run build                         # 构建前端
```

### 提取模型与密钥
主模型由 `pipeline.toml` 控制，当前为 `qwen3.7-max`，失败时按下述供应商顺序切换。
提取脚本优先读取 `~/.env` 中的 `DASHSCOPE_API_KEY` / `DASHSCOPE_BASE_URL`，再允许仓库内 `.env` 覆盖。

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

### 提取可靠性与图谱复核

- 全局 `~/.env` 提供 `DASHSCOPE_*`、`ZHIPUAI_*`、`MOONSHOT_*` / `KIMI_*`、`MINIMAX_*`，仓库 `.env` 可覆盖。密钥不入 Git。
- 默认 Qwen 模型来自 `pipeline.toml`；备用供应商模型/URL 来自全局环境。欠费、鉴权/模型不可用立即切换；超时/限流/服务异常最多两次尝试后切换。
- 失败返回非零退出码，退出前同步已有进度到 Git；每篇成功后原子保存结果和状态，后续任务仅补缺失或内容改变的文章。模型默认值变更不触发历史全量重提取，显式 `--force` 才重跑。
- `scripts/kg_review_gate.py` 是可选诊断：实体丢失仍报告为错误，复核日期过旧仅提示。确定的领域事实继续集中维护在 `scripts/overrides.py`。

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
2. 如涉及架构变更（新文件/目录、路由变更、数据流变更），同步更新 `AGENTS.md`
3. 如涉及前端布局/组件边界变更，同步检查 `docs/frontend-layout-contracts.md` 是否需要更新
4. 新增节点类型 → 只改 `constants.ts` 的 `NODE_TYPE_REGISTRY` + `types.ts` 的 `NodeType`
5. 新增关系类型 → 只改 `constants.ts` 的 `RELATION_STYLES` + `types.ts` 的 `RelationType`
6. 新增后处理规则 → 只改 `overrides.py`
7. 新增实体类型 → 同时改 `graph_utils.py` 的 `ALLOWED_ENTITY_TYPES` + `TYPE_ALIASES`
