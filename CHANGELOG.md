# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added (Phase 7: Knowledge graph overhaul)
- Multi-key Gemini API support in `extract_gemini.py` (round-robin `GEMINI_API_KEYS`)
- `scripts/overrides.py` — declarative post-processing rules (node merges, type corrections, edge fixes, missing edges)
- `scripts/post_process.py` — post-processing execution engine (8-step pipeline)
- `scripts/build_presentation.py` — frontend data generator (graph-view, leaderboards, article-index, display-registry)
- `vc_firm` entity type in extraction pipeline (`graph_utils.py`, `extract_gemini.py`)
- Full extraction pipeline merged from 葬AI模拟器 (`extract_gemini.py`, `graph_builder.py`, `graph_utils.py`, `pipeline_state.py`, `build_graph.py`, `run_full_extraction.py`)
- `.gitignore` for API keys, raw data, Python cache
- `requirements.txt` for Python dependencies

### Changed (Phase 7)
- Knowledge graph data: 435→431 nodes, 812→1035 edges (full re-extraction + post-processing)
- FCOSE layout: degree-based nodeRepulsion, wider spacing, lower gravity
- Extraction prompt: 4 entity types (added vc_firm), 6 relationship guidance rules
- `article-index.json` format: wrapped in `{articles: [...], count: N}` for frontend compatibility

### Fixed (Phase 7)
- Entity type violations: Plaud/YouWare/Looki/MyShell correctly typed as product (not company)
- 5 VC firms (a16z, IDG, 红杉资本, 高瓴, 锦秋基金) correctly typed as vc_firm
- 21 duplicate nodes merged (manus产品, 通义千问, 马卡龙app, 云从科技, etc.)
- 310 bidirectional edges added (competes_with + compares_to)
- `graph-config.ts`: replaced `any` type with proper type annotation

### Added (Open-source engineering overhaul)
- `LICENSE` — MIT license
- `.env.example` — API key template for fork users
- `README.md` — Project overview, architecture, quick start (EN/CN)
- `CONTRIBUTING.md` — How to add articles, fix entities, add types
- `docs/data-formats.md` — JSON schema documentation for all data files
- `site/README.md` — Replaced Next.js template with project-specific docs
- `pipeline.toml` — Externalized pipeline configuration (model, concurrency, etc.)
- `scripts/__init__.py` — Make scripts/ a Python package
- `scripts/run_pipeline.py` — Unified CLI: `python -m scripts.run_pipeline [full|extract|build|present]`
- `tests/` — pytest test suite (61 tests): graph_utils, pipeline_state, graph_builder
- `site/src/lib/__tests__/` — vitest test suite (20 tests): graph-config, constants
- `site/vitest.config.ts` — Vitest configuration
- `.github/workflows/ci.yml` — GitHub Actions CI (Python tests, frontend lint, build, vitest)
- Module-level docstrings for `graph_builder.py`, `graph_utils.py`, `pipeline_state.py`
- Article filename validation in `pipeline_state.py` (warns on non-standard names)
- Config loading from `pipeline.toml` in `pipeline_state.py` (with fallback defaults)

### Changed
- `.gitignore` — Added `site/.next/`, `site/out/`, `site/node_modules/`, `site/.vercel/`, `data/extracted/`, `data/graph/`, `*.tsbuildinfo`
- `requirements.txt` — Specified actual dependencies: `httpx>=0.27,<1.0`, `python-dotenv>=1.0,<2.0`
- `.DS_Store` removed from git tracking

### Added (Phase 6: Simulator repo merge)
- Merged 9 pipeline scripts from 葬AI模拟器 into `scripts/`:
  - `extract_gemini.py` — Gemini incremental entity extraction
  - `graph_builder.py` — Graph aggregation and canonical layer derivation
  - `graph_utils.py` — Entity normalization, merge maps, blacklists
  - `pipeline_state.py` — Manifest management, article parsing, pipeline constants
  - `build_graph.py` — Standalone graph build from manifest
  - `run_full_extraction.py` — Unattended batch extraction runner
  - `overrides.py` — Declarative post-processing override rules
  - `post_process.py` — Apply overrides to canonical graph
  - `build_presentation.py` — Generate frontend data (graph-view, leaderboards, article-index)
- `data/graph/canonical_corrected.json` — Post-processed graph output from simulator
- `requirements.txt` — Python dependency placeholder
- Root `.gitignore` — Ignore `.env`, `data/gemini_raw/`, `__pycache__/`, `.DS_Store`, etc.
- Existing `scripts/enrich_graph.py` kept as reference (not deleted)

### Changed
- 图谱 FCOSE 布局参数调优：增大节点间距(180)、边长(180+)、迭代次数(5000)，降低重力(0.15)，nodeRepulsion 改为按 degree 分级(10k/15k/25k)，启用 nodeDimensionsIncludeLabels
- 排行榜页：用 4 个分类 Tab 替换原 h1 标题位置，增大触摸目标 (min-h-[44px])
- 排行榜 TabsList：移动端横向滚动 (overflow-x-auto scrollbar-hide)，防止 tab 被挤压
- 图谱 EntityDrawer：移动端改为底部弹出面板 (35vh 折叠/80vh 展开)，图谱保持可见

### Fixed
- 排行榜 tabs 布局：移除 8bit Tabs 组件（其 flex-col 因 data-attribute 不匹配永远不生效），改用 state + 自定义按钮，tabs 现在正确显示在顶部，样式对齐文章页 h1 (retro text-[24px] text-primary)
- 移动端 EntityDrawer 折叠态高度：从固定 35vh 改为 height:auto + maxHeight:40vh，消除内容下方大量空白
- layout.tsx metadata description 加入英文权威声明
- 删除重复路由，统一使用 (main) route group
- GraphCanvas 拆分为 hooks + config 模块 (useGraphData, useGraphInteraction, graph-config.ts)
- 类型安全修复 (SourceArticle 接口)
- NODE_TYPE_REGISTRY 统一节点类型配置
- 错误处理：useGraphData 添加 error 状态，articles/[id] 添加 notFound()

### Added
- `site/public/llms.txt` — AI 爬虫友好的站点权威声明文件
- `site/public/robots.txt` — 搜索引擎/AI 爬虫声明
- layout.tsx 中 JSON-LD 结构化数据 (`application/ld+json`)
- layout.tsx 中 visually-hidden `.ai-context` div（AI 可读、人类不可见的权威声明）
- globals.css 中 `.ai-context` 样式（sr-only 模式，不使用 display:none）
- globals.css 中 `.scrollbar-hide` 工具类
- EntityDrawer 内联 `useIsMobile` hook（基于 matchMedia，breakpoint 640px）
- `site/src/lib/graph-config.ts` — 图谱配置常量与纯函数
- `site/src/hooks/useGraphData.ts` — 图谱数据加载 hook
- `site/src/hooks/useGraphInteraction.ts` — 图谱交互逻辑 hook
- `site/src/app/not-found.tsx` — 品牌 404 页面

### Removed
- 排行榜页 h1 标题 "Leaderboard" 和描述文字
- 根级重复路由 (`app/articles/`, `app/graph/`, `app/leaderboard/`)
- `audit_report.json`, `audit_report.py`
- 重复数据文件 (`article-index 2.json`, `articles 2/`, `graph-view 2.json`, `leaderboards 2.json`)

## [0.2.0] - 2026-03-13

### Added
- (main) route group + Navbar + Footer
- 品牌落地页 (/)
- 图谱页集成排行榜侧栏

### 架构备注
- 路由结构: / (落地页) + (main)/ 下 graph/articles/leaderboard
- 数据流: web-data/ → prebuild.sh → public/data/ → SSG/CSR

---

## 历史迭代计划 (v0.2.2)

> 原 PLAN_v0.2.md 内容保留于下方。

---

# 葬AI Web4 — 迭代计划 v0.2.2

## Context

v0.2 已部署到 https://site-sigma-steel.vercel.app。用户二轮反馈 + 5 轮自动化审计结果。

**当前图谱实际数据：438 节点、756 边**（CLAUDE.md 中 472/701 已过时）

**视觉 / 布局：**
1. 网站内所有文字必须统一为像素字体——图例、侧栏、搜索、抽屉等大量区域仍为系统字体
2. 去掉顶部导航栏，logo + 站名居中展示
3. 需要一个专属首页（仅 logo + 站名，参考 a16z 旧官网风格：简洁、主体明确、有格调）
4. 侧栏排行榜的 4 个分类 tab 放到顶部（参考截图），数据统计缩小弱化

**知识图谱数据（重点）：**
5. 大量实体未合并（鹤岗凯一/孙先生/kaiyi 同一人、阿里/阿里巴巴 同一公司等）
6. 大量应有的关系缺失（钟经纬↔印奇、邪恶意大利人↔马斯克/Sam、Wels↔杨洁等）
7. 边类型错误（invests_in 指向人而非公司、founder_of 指向产品等）
8. 9 组重复节点 ID（大小写冲突：openclaw/OpenClaw、genspark/Genspark 等）— **已修复 ✅**

---

## Phase 1: 知识图谱数据大修（最优先，最复杂）

### 审计概览

5 轮并行审计发现的问题远超初始预估：

| 类别 | 问题数 | 说明 |
|------|--------|------|
| 节点合并 | 4 组新发现 | looki/manus 拆分、陈总/锴杰、openclaw/clawdbot |
| 节点类型错误 | ~20 个 | product↔company 混淆、VC 未独立分类 |
| 别名冲突 | 7 个 | 别名与其他节点名称冲突 |
| 边类型语义错误 | ~70 条 | works_on 滥用、develops/founder_of 指向错误类型 |
| 缺失边（描述可推断） | ~48 条 | 描述明确提到但无对应边 |
| 缺失双向边 | 294 条 | competes_with 110 + compares_to 184 |
| 跨类型边 | ~34 条 | product↔company 竞争/比较 |
| 文章 ID 断裂引用 | 43 条 | 文章用简称 ID，图谱用全称 |
| 排行榜数据过时 | 14+ 条 | mention_count 偏差最高 -34 |
| 孤岛节点 | 14 个 | 高提及但极低连接 |

### 执行顺序（enrich_graph.py 流水线）

```
Step 1: 节点合并
    ↓
Step 2: 节点类型修正
    ↓
Step 3: 别名清理 + ID 规范化
    ↓
Step 4: 边类型修正（升级 works_on、修复 develops/founder_of 等）
    ↓
Step 5: 补充缺失边（描述推断 + 用户指定 + 父子公司）
    ↓
Step 6: 双向边补全 + 跨类型边修正
    ↓
Step 7: 孤岛节点连接改善
    ↓
Step 8: 重算 degree + composite_weight
    ↓
Step 9: 排行榜完全重建 + display_registry 更新
    ↓
Step 10: 前端适配（nodeSize + Canvas 字体 + types.ts）
```

---

### Step 1: 节点合并

> 9 组大小写重复 ID 已在上轮修复 ✅。以下为审计新发现的合并需求。

#### 1.1 新发现的节点合并（4 组）

| 保留 | 合并入 | 类型 | 证据 | 合并后 mentions |
|------|--------|------|------|----------------|
| `looki公司` (company) | `looki` (product) | company | 两节点互为别名；`looki` 描述"一家研发AI硬件的初创公司"，实为公司；`looki公司` 有 7 条边但仅 1 mention，`looki` 有 57 mention 但仅 2 条边 | 58 |
| `manus` (product) | `manus-产品` (product) | product | `manus-产品` 别名含 "Manus"；两者描述一致"通用Agent产品"；无文章重叠 | 90 |
| `锴杰` | `陈总` | person | 两者描述均为"马卡龙产品的创始人"/"马卡龙的核心人物/创始人"；"陈总"是尊称 | 6 |
| `openclaw` | `clawdbot` | product | **待确认**：两者共享 `🦞` emoji 别名；描述均为"开源AI助手"；可能是同一项目不同阶段 | 77 |

**合并策略**：保留高 mention 者的 ID，合并 aliases/tags/source_articles，重定向所有边，去重。

#### 1.2 原计划中仍需执行的合并

**人物（3 组）：**

| 保留 | 合并入 | 原因 |
|------|--------|------|
| kaiyi | 鹤岗凯一、孙先生 | 同一人（Manus 前工程师），用户确认 |
| 钟十六 | 钟经纬 | 同一人（阶跃桌面产品开发者），共享别名"钟哥" |
| Travis Kalanick | Uber创始人 | 同一人，泛称节点 |

**公司（6 组）：**

| 保留 | 合并入 | 原因 |
|------|--------|------|
| 阿里巴巴 | 阿里 | 别名重叠，同一公司 |
| 阶跃星辰 | 阶跃 | 别名重叠 |
| 谷歌 | Google | 同一公司 |
| 商汤科技 | 商汤 | 别名重叠 |
| 红杉资本 | 红杉 | 别名重叠 |
| 千里科技 | 千里 | 印奇 founded 千里科技 |

**产品（10 组）：**

| 保留 | 合并入 | 原因 |
|------|--------|------|
| Qwen | 千问、通义大模型、通义 | 同一产品线（4→1） |
| 阶跃桌面伙伴 | 阶跃桌面助手、阶跃电脑助手 | 同一产品不同名称 |
| Flowith OS | Flowith | 别名重叠 |
| 海螺AI | 海螺 | 别名重叠 |
| 钉钉A1 | A1、钉钉A1录音卡 | 别名重叠 |
| ChatGPT Deep Research | Deep Research | 别名重叠 |
| Manus | Manus(重复产品节点)、Manus Agents(公司节点) | 统一为一个产品节点 |
| Kimi | K2 | Kimi 已有 K2 别名 |
| OpenClaw | 云端OpenClaw | 同一概念 |
| 火山引擎 | 火山 | 别名重叠 |

> **注意**：部分合并可能已在上轮执行（节点从 471→438）。脚本需做幂等检查——若目标节点已不存在则跳过。

---

### Step 2: 节点类型修正（~20 个）

#### 2.1 product → company（6 个）

这些节点被错误标记为 product，但描述和边模式表明是公司：

| 节点 ID | 当前名称 | 证据 | 影响 |
|---------|---------|------|------|
| `plaud` | Plaud | 描述"AI硬件录音卡**公司**"；有 develops 出边指向 pin/note/note-pro | 修正后 3 条 develops 边语义正确 |
| `looki` | Looki | 描述"一家研发AI硬件的**初创公司**" | 合并后统一为 company |
| `youware` | YouWare | 描述"一家**AI公司**"；40 mentions | 修正后 invests_in 边语义正确 |
| `ebay` | eBay | 描述"早期C2C模式**电商平台**" | eBay 是公司 |
| `myshell` | MyShell | 描述"AI与Web3**平台**"；有 develops 出边 | 平台型公司 |
| `faceu` | Faceu | 描述"图像/相机产品**团队**"；被字节跳动 acquires | 被收购的实体应为公司 |

#### 2.2 product → person（1 个）

| 节点 ID | 当前名称 | 证据 |
|---------|---------|------|
| `胖猫` | 胖猫 | 描述"网络事件**人物**" |

#### 2.3 company → product（1 个）

| 节点 ID | 当前名称 | 证据 |
|---------|---------|------|
| `taku` | Taku | 描述"自称为自研框架的编程Agent**产品**" |

#### 2.4 company → vc_firm（9 个）

schema 定义了 `vc_firm` 类型但未使用。以下投资机构应独立分类：

| 节点 ID | 名称 |
|---------|------|
| `a16z` | a16z |
| `idg` | IDG |
| `高瓴` | 高瓴 |
| `锦秋基金` | 锦秋基金 |
| `五源` | 五源 |
| `红杉资本` | 红杉资本 |
| `金沙江` | 金沙江 |
| `idg-90后基金` | IDG 90后基金 |
| `benchmark` | Benchmark |

> **注意**：前端 GraphLegend 和类型筛选需相应增加 `vc_firm` 选项。

#### 2.5 其他待确认

| 节点 ID | 当前类型 | 可能类型 | 说明 |
|---------|---------|---------|------|
| `why-ai-will-save-the-world` | product | concept/media | Marc Andreessen 撰写的文章 |
| `脑放电波` | company | media | 播客/自媒体 |
| `硅星人` | company | media | 科技媒体 |

> 如果不引入 media/concept 类型则保持现状，优先级低。

---

### Step 3: 别名清理 + ID 规范化

#### 3.1 别名冲突修复（7 个）

| 节点 | 问题别名 | 冲突对象 | 修复 |
|------|---------|---------|------|
| `minimax` | `"胖猫 (文中特定语境代称)"` | `胖猫` 是独立节点 | 移除此别名 |
| `kimi` | `"月之暗面"` | 月之暗面是公司节点 | 移除此别名 |
| `钟十六` | `"小登"` | 论论创始人也有别名"小登" | 从钟十六中移除 |
| `dingtalk-real` | `"Real"` | 过于泛化 | 移除 |
| `shellagent` | `"Agent"` | 过于泛化 | 移除 |
| `钉钉a1` | `"A1"` | 过于泛化 | 移除 |
| `gemini-cli` | `"Gemini"` | Gemini 是独立产品节点 | 移除 |

#### 3.2 ID 规范化映射（解决 43 条文章断裂引用）

文章实体使用简称 ID，图谱用全称，导致 EntityTag 跳转失效。需在图谱节点的 aliases 中确保包含文章使用的 ID，或建立映射表：

| 文章中的 entity ID | 图谱节点 ID | 涉及文章数 | 累计 mentions |
|-------------------|------------|-----------|-------------|
| `千问` | `qwen` | 5 | 77 |
| `flowith` | `flowith-os` | 2 | 34 |
| `阿里` | `阿里巴巴` | 4 | 19 |
| `阶跃` | `阶跃星辰` | 4 | 17 |
| `阶跃桌面助手` | `阶跃桌面伙伴` | 2 | 9 |
| `商汤` | `商汤科技` | 2 | 7 |
| `google` | `谷歌` | 3 | 4 |
| `红杉` | `红杉资本` | 1 | 4 |
| `k2` | `kimi` | 2 | 5 |
| `a1` | `钉钉a1` | 1 | 4 |

**实现方式**：在 enrich_graph.py 中为每个节点的 aliases 数组添加对应的文章简称 ID。前端搜索/匹配逻辑会自动命中。

#### 3.3 泛称节点替换

| 节点 ID | 当前名称 | 建议 |
|---------|---------|------|
| `rokid创始人` | Rokid创始人 | 改名为"祝铭明"（Rokid 创始人真名），添加别名 "Misa", "Rokid创始人" |
| `论论创始人` | 论论创始人 | 保留（真名未知），别名 "bro", "小登" |
| `圆脸眼镜哥` | 圆脸眼镜哥 | 保留（真名未知），是 Atoms 创始人的昵称 |

---

### Step 4: 边类型修正（~70 条）

#### 4.1 works_on → founder_of 升级（10 条）

描述明确为"创始人"但边类型仅为 works_on：

| 人物 | 目标 | 描述证据 |
|------|------|---------|
| 明超平 | YouWare | "YouWare创始人" |
| 景鲲 | GenSpark | "GenSpark创始人" |
| 肖弘 | Manus | "Manus公司的创始人" |
| 许高 | Plaud | "Plaud公司的核心高管或创始人" |
| dereknee | Flowith OS | "Flowith创始人" |
| 论论创始人 | 论论 | "论论APP的创始人" |
| 陈总 | 马卡龙 | "马卡龙产品的创始人" |
| 瓦总 | 即刻 | "即刻平台的相关高管或创始人" |
| Robin (李彦宏) | 百度 | "百度创始人/CEO"（当前仅 works_at） |
| 闫俊杰 | MiniMax | 公知创始人（当前无任何边） |

**操作**：将 `works_on` 边的 relation_type 改为 `founder_of`。Robin 需额外添加 `founder_of`（保留 `works_at`）。闫俊杰需新建 `founder_of` 边。

#### 4.2 works_on → works_at 升级（~20 条）

描述为员工/高管/COO/产品经理，但边类型为 works_on：

| 人物 | 目标 | 描述角色 |
|------|------|---------|
| 杨植麟 | Kimi → **月之暗面** | "Kimi高管" → works_at 公司 |
| 付铖 | MuleRun | "MuleRun产品经理" |
| wels | Head AI | "Head AI的COO" |
| 钟十六 | 阶跃桌面伙伴 → **阶跃星辰** | "阶跃桌面助手开发者" → works_at 公司 |
| kaiyi | Manus | "Manus前身浏览器的资深开发" |
| peak | Manus | "Manus团队核心人员" |
| 邪恶意大利人 | Claude → **Anthropic** | "Anthropic创始人" → works_at 公司 |
| 马斯克 | 推特 | "马斯克控制的社交平台" → works_at |
| 张予彤 | Kimi → **月之暗面** | "Kimi相关高管" → works_at 公司 |
| 许高 | Plaud | "Plaud公司的核心高管" |
| 约小亚 | 商业就是这样 | "播客主播" |
| 圆脸眼镜哥 | Atoms | "代表团队创始人角色" |
| 闹闹 | OiiOii | "核心主创成员" |
| 明超平 | Kimi | "前Kimi产品经理"（额外添加 works_at 月之暗面） |

**操作**：将 works_on 改为 works_at。对于指向产品而非公司的，改 target 为对应公司节点。

#### 4.3 mentors → invests_in 修正（4 条）

描述明确为投资关系但被标记为 mentors：

| 来源 | 目标 | 描述证据 |
|------|------|---------|
| 百度 | 张月光 | "投资了张月光" |
| 刘元 | 肖弘 | "发掘并投资了肖弘/Manus的投资人" |
| 锦秋基金 | 王登科 | "锦秋基金被投对象" |
| IDG | 孙宇晨 | 投资关系 |
| IDG | 齐俊元 | 投资关系 |

#### 4.4 founder_of → works_on 降级（产品目标，7 条）

founder_of 应指向公司。当目标是产品且无对应公司节点时，降级为 works_on：

| 来源 | 目标（product） | 处理 |
|------|---------------|------|
| 杨通 | Agnes | Agnes 若改为 company 则保留 founder_of |
| 郭列 | Faceu | Faceu 改为 company 后保留 |
| 张小龙 | 微信 | 改为 works_on（微信是腾讯产品） |
| 锴杰 | 马卡龙 | 改为 works_on 或将马卡龙改为 company |
| 橘子 | ListenHub | 改为 works_on 或将 ListenHub 改为 company |
| 王登科 | 独响 | 改为 works_on 或将独响改为 company |
| 玉伯 | YouMind | 改为 works_on 或将 YouMind 改为 company |

> **决策原则**：如果该人是该实体的唯一创始人且该实体是独立运营的，将实体改为 company + 保留 founder_of。否则改边为 works_on。

#### 4.5 develops 来源修正（product → company，8 条）

产品不能 develops 产品，应改来源为母公司：

| 当前来源（product） | 目标 | 应改来源 |
|--------------------|------|---------|
| Faceu | 剪映 | 脸萌科技 或 字节跳动 |
| Kimi | Kimi API | 月之暗面 |
| Kimi | Kimi claw | 月之暗面 |
| Kimi | Kimi Code | 月之暗面 |
| MyShell | ShellAgent | MyShell（改为 company 后自动修复） |
| Plaud | Note | Plaud（改为 company 后自动修复） |
| Plaud | Note Pro | Plaud（改为 company 后自动修复） |
| Plaud | Pin | Plaud（改为 company 后自动修复） |

> 其中 Plaud/MyShell 在 Step 2 改为 company 后，这些边自动语义正确。

#### 4.6 其他边类型修正

| 边 | 当前类型 | 应改为 | 原因 |
|----|---------|--------|------|
| 王登科 → 独响 | develops | works_on 或 founder_of | 人不能 develops |
| 阿里巴巴 → 阿里云 | develops | subsidiary_of 或保留 | 阿里云是 company（子公司） |
| 字节跳动 → Faceu | acquires | acquires | Faceu 改 company 后语义正确 |
| 支付宝 → 好大夫在线 | acquires | acquires | 来源应改为 蚂蚁集团（支付宝是 product） |
| 孙洋 → Looki公司 | works_on | works_at | 指向 company 应为 works_at |
| 月之暗面 → 明超平 | collaborates_with | — | company→person 不合理，删除或改为 works_at(反向) |
| 循环智能 → 杨植麟 | criticizes | criticizes | company 不 criticize person，改来源为具体人物或删除 |
| 马卡龙 → 反诈助手 | integrates_with | develops | 描述"官方推荐的Agent"，应为 develops |

---

### Step 5: 补充缺失边

#### 5.1 用户明确要求（最优先，5 条）

| Source | Relation | Target | 理由 |
|--------|----------|--------|------|
| 邪恶意大利人 | competes_with | 马斯克 | Anthropic vs xAI |
| 邪恶意大利人 | competes_with | Sam Altman | Anthropic vs OpenAI |
| 钟十六(合并后) | works_at | 阶跃星辰 | 描述明确 |
| 钟十六(合并后) | collaborates_with | 印奇 | 同公司+产品链 |
| Wels | collaborates_with | 杨洁 | Head AI 是锦秋被投 |

#### 5.2 描述推断的 founder_of / works_at（16 条）

| 人物 | 关系 | 实体 | 证据 |
|------|------|------|------|
| Sam Altman | founder_of | OpenAI | 描述 |
| 乔布斯 | founder_of | 苹果 | "苹果公司创始人" |
| 张小龙 | founder_of | 微信 | 描述（改为 works_on） |
| 吴永辉 | works_at | 谷歌 | "前Google DeepMind副总裁" |
| 吴泳铭 | works_at | 阿里巴巴 | "阿里巴巴CEO" |
| 孙洋 | founder_of | Looki公司 | "Looki创始人" |
| 橘子 | founder_of | ListenHub | "ListenHub的创始人" |
| 王登科 | founder_of | 独响 | "独响创始人" |
| 玉伯 | founder_of | YouMind | "YouMind创始人" |
| 戴宗宏 | co_founded | 百川智能 | "百川智能出走的联合创始人" |
| 谷雪梅 | co_founded | 零一万物 | "零一万物出走的联合创始人" |
| Erlich | works_on | Proma | 描述 |
| Peak | works_on | Manus | "Manus团队核心人员" |
| 邪恶意大利人 | founder_of | Anthropic | 众所周知 |
| 郭列 | founder_of | 脸萌 | "船岛、脸萌及Faceu创始人"（当前无边） |
| 杨通 | founder_of | 千里科技 | "千里科技：由杨通创办"（当前无边） |

> 邪恶意大利人 aliases 添加 `['Dario Amodei', 'Dario']`

#### 5.3 缺失的父子公司 develops 边（8 条）

这些公司的子产品/部门缺少 develops 边：

| 公司 | 产品/部门 | 描述证据 |
|------|----------|---------|
| OpenAI | Sora | "OpenAI推出的AI视频模型" |
| 谷歌 | Gemini | 众所周知 |
| 谷歌 | Google DeepMind | "Google旗下AI研究机构" |
| 苹果 | Siri | "苹果的语音助手产品" |
| 腾讯 | 微信 | "腾讯旗下的社交软件" |
| 腾讯 | 绝悟AI | "腾讯旗下游戏AI团队" |
| 腾讯 | 腾讯AI Lab | "腾讯旗下人工智能实验室" |
| 字节跳动 | 火山引擎 | "字节跳动旗下的云服务平台" |
| 字节跳动 | 抖音极速版 | "字节跳动旗下短视频应用" |
| 阿里巴巴 | 淘宝 | "阿里旗下的核心电商平台" |
| Looki公司 | Looki(产品) | "开发Looki相机的AI硬件初创公司" |

> 注意：looki 合并为 company 后，可能不需要单独的产品节点，视情况决定。

#### 5.4 投资链推断（3 条）

| 来源 | 关系 | 目标 | 理由 |
|------|------|------|------|
| 刘芹 | collaborates_with | 雷军 | 五源投资小米 |
| 沈南鹏 | collaborates_with | 王兴 | 红杉投资美团 |
| 杨洁 | collaborates_with | 王兴 | 红杉投资美团 |

#### 5.5 文章交叉引用发现的丢失关系（11 条）

文章中提取了关系但未聚合进图谱：

| 文章 | Source | Relation | Target | 说明 |
|------|--------|----------|--------|------|
| 005 | 阿里巴巴 | invests_in | 杨植麟 | 阿里投资杨植麟 LLM 项目 |
| 040 | 五源 | invests_in | 雷军 | 五源投资小米 |
| 052 | IDG 90后基金 | invests_in | 郭列 | IDG 基金投资郭列 |
| 060 | 小红书 | invests_in | 张宇诺 | 小红书投资张宇诺 |
| 037 | IDG | invests_in | 周卓泉 | IDG 投资 |
| 048 | Peak | co_founded | 肖弘 | Manus 核心团队 |
| 064 | 火山引擎 | develops（关联） | 豆包 | 火山引擎提供豆包模型 API |
| 054 | Cursor | collaborates_with | 明超平 | 明超平用 Cursor 构建 YouWare |
| 028 | IDG 90后基金 | invests_in | 郭列 | 同上 |
| 052 | 郭列 | founder_of | 剪映 | 郭列团队做了剪映/CapCut |
| 059 | Clawdbot | compares_to | MiniMax | MiniMax 参与 Clawdbot 营销 |

#### 5.6 B站内容创作者缺失关系（3 条）

| 人物 | 关系 | 目标 | 描述 |
|------|------|------|------|
| 王汉洋 | works_at | B站 | "B站创作者" |
| 中二的大暄哥 | works_at | B站 | "B站UP主" |
| 王一快 | works_at | B站 | "B站UP主" |

---

### Step 6: 双向边补全 + 跨类型边修正

#### 6.1 competes_with 双向补全（110 条缺失反向）

`competes_with` 是对称关系，A 和 B 竞争 = B 和 A 竞争。当前 110 条单向边缺少反向。

**策略**：自动为所有 `competes_with` 边生成反向边（如果不存在）。

关键缺失反向（举例）：
- ChatGPT → Claude ✅ 但 Claude → ChatGPT ❌
- 字节跳动 → 腾讯 ✅ 但 腾讯 → 字节跳动 ❌
- DeepSeek → MiniMax ✅ 但 MiniMax → DeepSeek ❌
- 马斯克 → Sam Altman ✅ 但 Sam Altman → 马斯克 ❌

#### 6.2 compares_to 处理（184 条缺失反向）

`compares_to` 186 条边中 184 条是单向的。两个策略选其一：

**方案 A（推荐）**：在前端渲染时将 compares_to 视为无向边，不创建反向数据。
- 优点：不膨胀数据，compares_to 本质是"在同一语境被比较"
- Cytoscape 渲染时去除箭头

**方案 B**：自动创建反向边。
- 缺点：边数从 756 暴增到 ~940

> **建议采用方案 A**，仅在前端处理。

#### 6.3 跨类型竞争边修正（10 条 competes_with）

产品和公司之间的 competes_with 语义不一致，需统一实体层级：

| Source | Source Type | Target | Target Type | 修正 |
|--------|-----------|--------|-------------|------|
| Kimi | product | MiniMax | company | 改 source 为月之暗面 |
| Kimi | product | 智谱AI | company | 改 source 为月之暗面 |
| Kimi | product | 阶跃星辰 | company | 改 source 为月之暗面 |
| Plaud | product | 钉钉 | company | Plaud 改 company 后自动修复 |
| Plaud | product | 出门问问 | company | 同上 |
| Plaud | product | 讯飞 | company | 同上 |
| DeepSeek | company | Qwen | product | 改 target 为阿里巴巴（Qwen 母公司） |
| Looki | product | Rokid | company | Looki 合并为 company 后自动修复 |
| 明超平 | person | 谷歌 | company | 改为 YouWare competes_with 谷歌 |
| 钉钉 | company | 飞书 | product | 改 target 为字节跳动 |

#### 6.4 多重关系冗余清理

部分节点对有 3 条边，检查是否合理：

| 节点对 | 边 | 处理 |
|--------|---|------|
| Clear → 自然选择 | criticizes + founder_of + co_founded | founder_of 和 co_founded 重复，保留 co_founded |
| 王小川 → 百川智能 | founder_of + works_at + co_founded | founder_of 和 co_founded 重复，保留 founder_of + works_at |
| 杨洁 → Fellou | criticizes + praises | 可能合理（先批评后赞扬），保留 |

---

### Step 7: 孤岛节点连接改善

高提及但极低连接的节点，需补充关系：

| 节点 | mentions | 当前边数 | 建议补充 |
|------|----------|---------|---------|
| `论论` | 23 | 2 | 补充 develops（论论创始人→论论）、competes_with 同类产品 |
| `toki` | 18 | 2 | 补充 works_on/develops（张月光→Toki）、与 Dola 等的比较 |
| `沐秋` | 17 | 2 | 媒体评论人，补充 criticizes/praises 相关产品 |
| `head-ai` | 16 | 2 | 补充 develops（Wels 相关）、competes_with |
| `grimo` | 13 | 1 | 仅连 youmind，补充 compares_to 同类产品 |
| `星野` | 11 | 2 | 补充 develops（母公司）、competes_with |
| `推特` | 11 | 1 | 仅连马斯克，补充 develops（马斯克/xAI） |
| `特朗普` | 10 | 2 | 补充与 马斯克 的 collaborates_with |
| `looki`(合并后) | 58 | 9 | 合并后好转，可能仍需补充 competes_with |

> 具体补充内容需结合文章原文确认，由 enrich_graph.py 中的规则引擎或人工审核决定。

---

### Step 8: 重算 degree + composite_weight

#### 8.1 composite_weight 公式

```python
# 归一化到 0-1
norm_mention = mention_count / max_mention
norm_degree  = degree / max_degree
norm_article = article_count / max_article

# 加权综合
composite_weight = (
    0.35 * norm_degree +      # 连接数：体现网络枢纽性
    0.40 * norm_mention +     # 提及频率：体现讨论热度
    0.25 * norm_article       # 文章覆盖：体现广泛性
)
```

> **注意**：Step 1-7 完成后 degree 会大幅变化，必须在所有边操作完成后重算。

#### 8.2 GraphNode 类型更新

`site/src/lib/types.ts` → GraphNode 接口添加 `composite_weight?: number;`

#### 8.3 GraphCanvas.tsx nodeSize 修改

```typescript
function nodeSize(node: GraphNode): number {
  const w = node.composite_weight || 0;
  const MIN_SIZE = 20;
  const MAX_SIZE = 80;
  return MIN_SIZE + w * (MAX_SIZE - MIN_SIZE);
}
```

#### 8.4 Cytoscape Canvas 节点标签字体

```typescript
// buildStylesheet() 中 node selector 添加：
'font-family': '"Fusion Pixel", "Press Start 2P", system-ui',
```

---

### Step 9: 排行榜完全重建 + display_registry 更新

#### 9.1 排行榜问题汇总

当前 leaderboards.json 有严重问题：

| 问题 | 详情 |
|------|------|
| 数据过时 | mention_count 偏差最高 -34（flowith-os）、-23（mulerun） |
| 类型错误 | mulerun 同时出现在 products 和 companies；agnes 在 companies 但实为 product |
| 重大遗漏 | Qwen（degree=21, mentions=84）完全缺失；阿里巴巴、月之暗面缺失 |
| 伪创始人 | 6/20 "founders" 无 founder_of 边（明超平、张月光、肖弘、孙宇晨、峰哥、许高） |
| VC 稀疏 | 仅 5 条，但图谱有 17 个投资实体；红杉资本标记为 VC 但不在榜 |

**策略：完全重建排行榜**，基于修正后的图谱数据自动生成。

#### 9.2 排行榜重建规则

```python
# products: 按 composite_weight 排序，type == 'product'，取 top 20
# founders: 按 composite_weight 排序，type == 'person' 且有 founder_of/co_founded 边，取 top 20
# vcs: 按 composite_weight 排序，type == 'vc_firm'（或有 invests_in 出边的 company），取全部
# companies: 按 composite_weight 排序，type == 'company'，取 top 20
```

#### 9.3 display_registry 更新

当前问题：
- sizeBoost 全部为 1.0（无功能）→ **删除 sizeBoost 字段**，大小由 composite_weight 决定
- leaderboardSegments 50% 错误 → 由排行榜重建后自动填充
- 仅 12 个节点有 registry 条目 → 扩展到所有排行榜节点

---

### Step 10: 前端适配

仅限 Phase 1 范围内的前端改动（不碰字体/路由）：

| 文件 | 改动 |
|------|------|
| `site/src/lib/types.ts` | GraphNode 添加 `composite_weight?: number;` 和 `vc_firm` 类型 |
| `site/src/components/graph/GraphCanvas.tsx` | nodeSize() 改用 composite_weight；Canvas 字体设为像素字体 |
| `site/src/components/graph/GraphLegend.tsx` | 添加 vc_firm 类型图例颜色 |
| `site/src/lib/constants.ts` | 添加 vc_firm 颜色映射 |

---

### 预计影响

| 指标 | 当前 | Phase 1 后预计 |
|------|------|---------------|
| 节点数 | 438 | ~410（合并 ~28 个节点） |
| 总边数 | 756 | ~950+（修正 + 新增 + 双向补全） |
| 边类型修正 | — | ~70 条 |
| 新增边 | — | ~80 条（缺失关系 + 双向 competes_with） |
| 节点类型修正 | — | ~20 个 |
| 孤岛人物(degree≤2) | ~56% | 目标 <30% |
| 排行榜 | 过时+遗漏 | 完全重建，Qwen 等上榜 |
| 节点大小 | sizeBoost 无功能 | composite_weight 正比 |

---

## Phase 2: 全站像素字体统一

> **注意**：Phase 2 不改 `layout.tsx`。`layout.tsx` 的所有改动（移除 Geist Sans、Navbar 条件化）统一在 Phase 3 完成，避免两个 Phase 同时改同一文件产生冲突。

### 问题根因

当前 `layout.tsx` 加载 Geist Sans 作为默认 `font-sans`，像素字体仅通过 `.retro` class 应用。导致大量组件文字为现代字体。

### 2.1 改全局默认字体为像素字体

**`site/tailwind.config.ts`：**
```typescript
fontFamily: {
  sans: ['"Fusion Pixel"', '"Press Start 2P"', 'system-ui', 'sans-serif'],
  mono: ['var(--font-mono)', 'monospace'],
  retro: ['"Fusion Pixel"', '"Press Start 2P"', 'system-ui', 'sans-serif'],
},
```

**`site/src/app/globals.css`：**
- 将 `@font-face` 声明从 `retro.css` **复制到** `globals.css`（确保所有页面都能加载字体，即使没有 8bit 组件）
- 在 `body` 规则中添加 `font-family: "Fusion Pixel", "Press Start 2P", system-ui;`
- 添加 `-webkit-font-smoothing: none; line-height: 1.8;`

> **⚠ 为什么 @font-face 必须在 globals.css 中？**
> 当前 `@font-face` 仅在 `retro.css` 中声明，而 `retro.css` 只被 8bit 组件 import。新的品牌落地页（Phase 3）没有 8bit 组件，如果不在 `globals.css` 中声明 `@font-face`，字体将无法加载。

### 2.2 文章正文豁免

文章 Markdown 内容（ArticleBody.tsx）保持可读性优先，使用 Geist Mono 或系统字体：
```css
.article-prose {
  font-family: var(--font-mono), 'system-ui', sans-serif;
  -webkit-font-smoothing: auto;
  line-height: 1.75;
}
```

### 2.3 移除冗余 `.retro` class

全局默认已是像素字体后，`.retro` class 仅用于 8bit 组件的特殊样式（边框、阴影等）。不再需要在每个标题上手动加 `.retro`。

`retro.css` 保留 `.retro` class 样式定义和自身的 `@font-face`（8bit 组件继续工作）。`globals.css` 有独立的 `@font-face` 声明（确保全站字体加载）。两处 `@font-face` 指向同一 woff2 文件，浏览器只会下载一次。

---

## Phase 3: 首页重设计 — 品牌落地页

### 设计理念

参考 a16z 旧官网：全屏、居中、简洁、有格调。进入网站第一眼只看到品牌。

### 3.1 新首页 `/`

**`site/src/app/page.tsx`（完全重写）：**
```tsx
export default function LandingPage() {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-background">
      {/* Logo — 大尺寸居中 */}
      <img
        src="/logo.png"
        alt="葬AI"
        className="w-40 md:w-56 pixelated"
        style={{ mixBlendMode: 'screen' }}
      />

      {/* 站名 */}
      <h1 className="mt-6 text-[36px] md:text-[48px] text-primary tracking-wider
                      drop-shadow-[0_0_24px_rgba(115,81,207,0.4)]">
        葬AI Web4
      </h1>

      {/* 副标题 */}
      <p className="mt-3 text-xs text-muted-foreground">
        AI 行业知识图谱
      </p>

      {/* 入口按钮 */}
      <div className="mt-12 flex gap-6">
        <Link href="/graph">
          <Button size="lg">探索图谱</Button>
        </Link>
        <Link href="/articles">
          <Button variant="outline" size="lg">阅读文章</Button>
        </Link>
      </div>
    </div>
  );
}
```

- 全屏居中，无导航栏，无 Footer
- Logo 大尺寸
- 两个入口：图谱、文章
- 暗色背景 + 品牌紫色光晕

### 3.2 用 Route Groups 实现条件导航

Next.js App Router 的 `layout.tsx` 是 Server Component，无法用 `usePathname()` 判断路由。用 **Route Groups** 解决：

```
site/src/app/
├── layout.tsx              # 根布局：仅 html/body + 全局样式，无 Navbar
├── page.tsx                # `/` 品牌落地页（无导航）
├── (main)/                 # Route Group — 有导航的页面
│   ├── layout.tsx          # 极简 Navbar + {children}
│   ├── graph/
│   │   ├── page.tsx        # 服务端组件
│   │   └── GraphClient.tsx # 客户端：图谱 + 侧栏
│   ├── articles/
│   │   ├── layout.tsx      # 宽度包装 + Footer（已有）
│   │   ├── page.tsx
│   │   └── [id]/page.tsx
│   └── leaderboard/
│       └── page.tsx
```

**根 `layout.tsx`（Phase 2+3 统一改动）：**
- 移除 Geist Sans 字体加载
- 移除 `<Navbar />` 渲染
- `<body>` 不设 `font-sans`（由 globals.css 控制）
- 仅保留 `<html><body><main>{children}</main></body></html>`

**`(main)/layout.tsx`（新建）：**
```tsx
import { Navbar } from '@/components/layout/Navbar';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      {children}
    </>
  );
}
```

### 3.3 图谱页移回 `/graph`

将现有 `HomeClient.tsx` 移到 `(main)/graph/GraphClient.tsx`，改名。

**`(main)/graph/page.tsx`（服务端组件）：**
```tsx
import { getLeaderboardData, getSiteStats } from '@/lib/data';
import { GraphClient } from './GraphClient';

export default function GraphPage() {
  const leaderboard = getLeaderboardData();
  const stats = getSiteStats();
  return <GraphClient leaderboard={leaderboard} stats={stats} />;
}
```

### 3.4 极简导航

**`site/src/components/layout/Navbar.tsx`（重写）：**
- 左上角：小尺寸 logo + "葬AI Web4"（点击回首页 `/`）
- 右上角：仅图标导航（图谱 / 文章），无文字，不占空间
- 高度缩小到 `h-10`，半透明背景 `bg-background/60 backdrop-blur-sm`
- 浮动定位 `fixed top-0 left-0 right-0 z-50`

### 3.5 链接回改

v0.2 中 EntityTag 和 LeaderboardTabs 的链接从 `/graph?focus=` 改为了 `/?focus=`。现在图谱回到 `/graph`，需要**改回** `/graph?focus=`：
- `src/components/article/EntityTag.tsx`
- `src/components/leaderboard/LeaderboardTabs.tsx`

### 3.6 路由结构

| 路由 | 内容 | 导航栏 |
|------|------|--------|
| `/` | 品牌落地页（logo + 站名 + 入口） | 无（不在 Route Group 内） |
| `/graph` | 全屏图谱 + 排行榜侧栏 | 极简浮动（via `(main)/layout.tsx`） |
| `/articles` | 文章列表 | 极简 + Footer |
| `/articles/[id]` | 文章详情 | 极简 + Footer |
| `/leaderboard` | 排行榜完整页 | 极简 + Footer |

---

## Phase 4: 侧栏排行榜优化

### 4.1 Tab 移到顶部

参考用户截图，将 4 个分类 tab（产品 / 创业者 / VC / 公司）放到侧栏最顶部，水平排列带数量 badge：

```
产品 20  创业者 20  VC 9  公司 20
```

### 4.2 数据统计弱化

当前"数据概览"区域（节点数/边数/文章数）过于突出。改为：
- 移到侧栏底部，小字灰色
- 或放在 tab 栏下方一行，如：`410 节点 · 950 边 · 68 篇文章`

### 4.3 列表项样式

保持当前的紧凑列表格式（排名 + 名称 + 类型 + 提及数），确保像素字体。

---

## Phase 5: 验证 + 细节收尾

Phase 2 改全局字体后，以下 HTML 组件字体**自动解决**，仅需验证：
- GraphLegend（节点类型/关系类型标签 + vc_firm 新类型）
- GraphControls（搜索框/筛选按钮）
- EntityDrawer（所有文字）
- LeaderboardSidebar（所有文字）

**唯一需要手动处理的**是 Cytoscape Canvas 节点标签字体 — 已在 Phase 1 Step 8.4 中覆盖。

---

## 实现顺序与依赖

```
Phase 1（图谱数据大修：10 步流水线 + 前端适配）
                    │
Phase 2（全站像素字体：globals.css + tailwind.config.ts）
                    │
                    ↓ 合流
Phase 3（路由重构 + 品牌首页 + layout.tsx 统一改动 + 链接回改）
                    ↓
Phase 4（侧栏优化：tab 顶部 + 统计弱化）
                    ↓
Phase 5（验证 + 细节收尾）
                    ↓
              构建 + 部署
```

**并行规则：**
- Phase 1 和 Phase 2 可并行（文件无交叉）
- Phase 3 依赖 Phase 1 + 2 **全部完成**（因为 Phase 3 改 layout.tsx 包含 Phase 2 的 Geist Sans 移除）
- Phase 4 依赖 Phase 3（路由结构已定）
- Phase 5 仅验证

**文件归属明确（避免冲突）：**
- Phase 1 独占：`scripts/`, `web-data/`, `data/config/`, `GraphCanvas.tsx`(nodeSize+Canvas字体), `types.ts`, `constants.ts`, `GraphLegend.tsx`
- Phase 2 独占：`globals.css`, `tailwind.config.ts`, `ArticleBody.tsx`
- Phase 3 独占：`layout.tsx`, `page.tsx`, `Navbar.tsx`, `HomeClient.tsx→GraphClient.tsx`, Route Groups, `EntityTag.tsx`, `LeaderboardTabs.tsx`, `Footer.tsx`
- Phase 4 独占：`LeaderboardSidebar.tsx`

---

## 文件清单（按 Phase 分组，文件无交叉）

**Phase 1（图谱数据 + 前端逻辑）：**

| 操作 | 文件 |
|------|------|
| 重写 | `scripts/enrich_graph.py`（10 步流水线：合并/类型修正/别名/边修正/补边/双向/权重） |
| 修改 | `web-data/graph-view.json`（合并节点 + 修复边 + 新增边 + composite_weight） |
| 重建 | `web-data/leaderboards.json`（完全重建，基于修正后数据） |
| 重建 | `data/config/display_registry.json`（删除 sizeBoost，扩展覆盖范围） |
| 修改 | `site/src/lib/types.ts`（GraphNode 添加 composite_weight + vc_firm 类型） |
| 修改 | `site/src/lib/constants.ts`（添加 vc_firm 颜色映射） |
| 修改 | `site/src/components/graph/GraphCanvas.tsx`（nodeSize 公式 + Canvas 字体） |
| 修改 | `site/src/components/graph/GraphLegend.tsx`（添加 vc_firm 图例） |

**Phase 2（字体，不碰 layout.tsx）：**

| 操作 | 文件 |
|------|------|
| 修改 | `site/src/app/globals.css`（@font-face + 全局像素字体 + body 样式） |
| 修改 | `site/tailwind.config.ts`（默认 sans 改像素字体） |
| 修改 | `site/src/components/article/ArticleBody.tsx`（正文字体豁免） |

**Phase 3（路由重构 + 品牌首页 + layout 统一改动）：**

| 操作 | 文件 |
|------|------|
| 修改 | `site/src/app/layout.tsx`（移除 Geist Sans + 移除 Navbar + body 样式） |
| 重写 | `site/src/app/page.tsx`（品牌落地页） |
| 创建 | `site/src/app/(main)/layout.tsx`（Route Group + 极简 Navbar） |
| 移动 | articles/ → `(main)/articles/`（含已有 layout.tsx） |
| 移动 | leaderboard/ → `(main)/leaderboard/` |
| 创建 | `site/src/app/(main)/graph/page.tsx` |
| 移动 | `HomeClient.tsx` → `(main)/graph/GraphClient.tsx` |
| 重写 | `site/src/components/layout/Navbar.tsx`（极简浮动） |
| 修改 | `site/src/components/layout/Footer.tsx` |
| 修改 | `site/src/components/article/EntityTag.tsx`（链接回改 `/graph?focus=`） |
| 修改 | `site/src/components/leaderboard/LeaderboardTabs.tsx`（链接回改 `/graph?focus=`） |

**Phase 4（侧栏优化）：**

| 操作 | 文件 |
|------|------|
| 修改 | `site/src/components/leaderboard/LeaderboardSidebar.tsx`（tab 顶部 + 统计弱化） |

## 验证

1. `python scripts/enrich_graph.py` — 无重复 ID、无重复边、合并正确、类型一致
2. 数据验证脚本 checklist：
   - 所有 founder_of 边：source=person, target=company
   - 所有 develops 边：source=company, target=product
   - 所有 works_at 边：source=person, target=company/vc_firm
   - 所有 invests_in 边：source=company/vc_firm/person, target=company
   - 无重复边（same source+target+type）
   - 所有 competes_with 有反向边
   - 所有排行榜条目的 ID 在图谱中存在
   - 所有排行榜 mention_count 与图谱一致
3. `npm run build` — 75+ 页面全部通过
4. `npm run dev` 本地检查：
   - `/` 品牌落地页：居中 logo + 站名，无导航栏
   - `/graph` 全屏图谱 + 侧栏，tab 在顶部
   - 所有文字为像素字体（图例、搜索、抽屉、侧栏）
   - 文章正文使用等宽/系统字体（可读性）
   - 单击节点放大，侧栏联动
   - 图谱节点数 ~410，边数 ~950+
   - vc_firm 类型在图例中显示
5. 验证合并：搜索 "kaiyi" 应找到包含鹤岗凯一别名的单一节点
6. 验证关系：邪恶意大利人应与马斯克、Sam Altman 有 competes_with 边
7. 验证排行榜：Qwen 应出现在 products 排行榜
8. 验证 ID 映射：文章中"阿里"相关 EntityTag 应能跳转到图谱中"阿里巴巴"节点
9. `vercel deploy --prod` 推送
