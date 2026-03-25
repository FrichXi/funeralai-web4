# 知识图谱数据优化 — 彻底修复计划

## 问题诊断

两次全量重跑（葬AI模拟器）将图谱从 155 节点/236 边提升到当前 435 节点/812 边（经 enrich_graph.py 合并/补全后），但仍存在系统性问题：

| 问题类型 | 根因 | 举例 |
|---------|------|------|
| **实体类型错误** | Gemini 只认识 3 类（company/person/product），VC 全归为 company | a16z、IDG、红杉资本都是 company |
| **实体未合并** | MERGE_MAP 不够全面，跨文章同义词未覆盖 | 阿里/阿里巴巴、kaiyi/鹤岗凯一/孙先生 |
| **关系缺失** | Gemini 不做推导，只提取文章字面描述的关系 | 闫俊杰→MiniMax(founder_of)、砸盘两兄弟→compares_to |
| **关系类型错误** | Gemini 对 works_on/works_at/founder_of 区分不清 | 创始人被标为 works_on，任职被标为 works_on |
| **管线分裂** | Web4 的 enrich_graph.py 是独立补丁层，与模拟器的 graph_utils.py 规则重叠不同步 | 模拟器标 Plaud=product，enrich 又改成 company |

**核心结论**：Gemini 提取有天花板（不会推导、不识别 VC、关系类型模糊），必须靠"更好的 prompt + 更全的后处理"双管齐下。单纯重跑无法解决后处理缺失的问题，单纯后处理也无法解决提取盲区。

---

## 整体策略：三层修复

```
Layer 1: 改善提取基础设施（vc_firm 类型 + prompt 增强 + 更全的 MERGE_MAP）
    ↓
Layer 2: 全量重跑 68 篇（第三次，但这次 prompt 针对性强得多）
    ↓
Layer 3: 后处理修正（把 enrich_graph.py 的领域知识固化为声明式规则，自动执行）
    ↓
输出: graph-view.json + leaderboards.json（直接可用，不再需要 Web4 端二次处理）
```

**和前两次的区别**：
- 第一次：基础 prompt，大量噪音，节点 155
- 第二次：改进 prompt + 降低剪枝阈值，经 enrich_graph.py 后处理得到 435 节点/812 边，但关系类型混乱，VC 分类错误
- **这次**：加 vc_firm 类型 + 针对性 prompt（具体示例而非泛泛指引）+ 全量后处理规则自动执行

---

## Phase 1: 保存当前状态 ✅

已完成。Commit `deff3a8`: "save: frontend state before knowledge graph overhaul"

---

## Phase 2: 提取基础设施升级（在葬AI模拟器中）

### 2.1 添加 vc_firm 实体类型

**文件**: `scripts/graph_utils.py`

```python
# 之前
ALLOWED_ENTITY_TYPES = ("company", "product", "person")

# 之后
ALLOWED_ENTITY_TYPES = ("company", "product", "person", "vc_firm")

# TYPE_ALIASES 修改
"投资机构": "vc_firm",  # 原来映射到 company
"vc": "vc_firm",
"fund": "vc_firm",
"基金": "vc_firm",
"资本": "vc_firm",

# TYPE_OVERRIDES 新增/修正
"a16z": "vc_firm",
"Rokid": "product",
"Agnes": "product",
```

**文件**: `scripts/pipeline_state.py`
```python
GRAPH_SCHEMA_VERSION = "2026-03-15-vc-firm-v3"  # 触发全量重跑
```

### 2.2 扩充 MERGE_MAP

从 enrich_graph.py 的合并经验，补充模拟器的 MERGE_MAP：

```python
# 新增（当前缺失的）
"阿里巴巴": [..., "阿里"],
"阶跃星辰": [..., "阶跃"],
"商汤科技": [..., "商汤"],
"红杉资本": [..., "红杉"],
"千里科技": [..., "千里"],
"火山引擎": [..., "火山"],
"海螺AI": [..., "海螺"],
"明超平": [..., "小明"],
"IDG": [..., "IDG 90后基金"],
"Qwen": [..., "千问", "通义大模型", "通义"],
```

这样提取阶段就能正确合并，不需要后处理再补。

### 2.3 提取 Prompt 大幅增强

**文件**: `scripts/extract_gemini.py`

在 EXTRACTION_PROMPT 中增加 vc_firm 类型和针对性关系提取指引：

```
【只允许输出这 4 类实体】
- company：公司、机构（非投资机构）
- person：创始人、CEO、投资人、关键行业人物
- product：具体产品、工具、应用、服务
- vc_firm：风投基金、投资机构、资本（如 a16z、红杉资本、IDG）

【容易遗漏的关系——请特别注意】
1. 创始人关系：如果文中描述某人"创立/创办/联合创立"了某公司，必须提取 founder_of
   - 例：文中出现"闫俊杰创立了MiniMax" → 闫俊杰 --founder_of--> MiniMax
2. 收购链推导：如果 A 被 B 收购，则 A 的创始人与 B 有 works_at 关系
   - 例："脸萌被字节跳动收购" + "郭列是脸萌创始人" → 郭列 --works_at--> 字节跳动
3. 产品归属：如果产品 X 是公司 Y 的，提取 Y --develops--> X
   - 例："火山引擎是字节跳动的云平台" → 字节跳动 --develops--> 火山引擎
4. 集体昵称/比较：如果文章用昵称指代多个实体的关系，提取实际关系
   - 例："砸盘两兄弟"指 MiniMax 和智谱AI → MiniMax --compares_to--> 智谱AI
5. works_on vs works_at vs founder_of 区分：
   - founder_of: 创始人→公司（仅创始人关系）
   - works_at: 员工/高管→公司（任职关系）
   - works_on: 人→产品（参与开发产品，非任职于产品）
   - 注意：如果人"在某产品团队工作"，应提取 works_at 指向该产品的母公司
6. 投资关系：vc_firm/公司 投资了 → invests_in，不要用 mentors
```

### 2.4 Bump 版本触发全量重提取

```python
PROMPT_VERSION = "2026-03-15-vc-firm-relationship-v7"
EXTRACTOR_VERSION = "2026-03-15-overrides-pipeline-v5"
GRAPH_SCHEMA_VERSION = "2026-03-15-vc-firm-v3"
```

---

## Phase 3: 全量重跑提取

```bash
cd <path-to-zangai-simulator>
python scripts/run_full_extraction.py --force
```

版本号变更会自动触发 68 篇全量重提取。完成后执行 `build_graph.py` 生成新的 canonical.json。

**API 费用提醒**：68 篇文章 × gemini-3.1-pro-preview 全量重跑，预估费用 ~$2-5。确认 `.env` 中 API key 有效且余额充足。

**预期改善**：
- VC 实体自动归类为 vc_firm（不再需要后处理改类型）
- 更多 founder_of/works_at 关系被正确提取
- 产品归属 develops 关系覆盖更广
- 合并规则在提取阶段就生效，减少后处理压力

---

## Phase 4: 后处理层（修正 Gemini 仍然遗漏的问题）

即使 prompt 再好，Gemini 仍会遗漏一些需要跨文章推理或领域知识的东西。这一层把 enrich_graph.py 的经验固化为可维护的声明式规则。

### 4.1 创建 `scripts/overrides.py`（声明式修正数据）

**文件位置**: `<path-to-zangai-simulator>/scripts/overrides.py`

所有手动修正集中在一个文件里，按类别组织：

```python
# ── 节点合并（提取阶段 MERGE_MAP 没覆盖到的）──
NODE_MERGES = [
    {"keep": "looki", "remove": ["looki公司"]},
    {"keep": "manus", "remove": ["manus-产品", "manus-agents"]},
    {"keep": "锴杰", "remove": ["陈总"]},
    {"keep": "openclaw", "remove": ["clawdbot", "云端openclaw"]},
    {"keep": "kaiyi", "remove": ["鹤岗凯一", "孙先生"]},
    {"keep": "钟十六", "remove": ["钟经纬"]},
    # ... 完整列表见 enrich_graph.py step 1
]

# ── 类型修正 ──
TYPE_CORRECTIONS = {
    "plaud": "product",    # 用户明确要求
    "youware": "product",
    "looki": "product",
    "agnes": "product",
    "myshell": "product",
    "rokid": "product",
    "胖猫": "person",
    "taku": "product",
    # VC（如果提取仍未正确分类）
    "a16z": "vc_firm",
    "idg": "vc_firm",
    "高瓴": "vc_firm",
    "锦秋基金": "vc_firm",
    "五源": "vc_firm",
    "红杉资本": "vc_firm",
    "金沙江": "vc_firm",
    "benchmark": "vc_firm",
}

# ── 关系类型修正（~70条，从 enrich_graph.py step 4 移植）──
EDGE_TYPE_FIXES = [
    # works_on → founder_of
    ("明超平", "youware", "works_on", {"new_type": "founder_of"}),
    ("景鲲", "genspark", "works_on", {"new_type": "founder_of"}),
    # ... 完整列表

    # works_on → works_at（含 target 重定向）
    ("杨植麟", "kimi", "works_on", {"new_type": "works_at", "new_target": "月之暗面"}),
    # ... 完整列表

    # mentors → invests_in
    ("锦秋基金", "王登科", "mentors", {"new_type": "invests_in"}),
    # ... 完整列表
]

# ── 缺失关系补充（~80条，Gemini 不会推导的）──
MISSING_EDGES = [
    # 用户报告
    ("minimax", "智谱ai", "compares_to", "砸盘两兄弟"),
    ("郭列", "张一鸣", "collaborates_with", "郭列被字节跳动收购后认识张一鸣"),
    ("郭列", "剪映", "works_on", "郭列带领团队做出剪映"),
    ("字节跳动", "豆包手机", "develops", "字节跳动开发豆包手机"),
    ("开为科技", "agnes", "develops", "开为科技开发Agnes"),

    # 常识性 founder_of（跨文章知识）
    ("sam-altman", "openai", "founder_of", "Sam Altman创立OpenAI"),
    ("邪恶意大利人", "anthropic", "founder_of", "Dario Amodei创立Anthropic"),
    ("闫俊杰", "minimax", "founder_of", "闫俊杰创立MiniMax"),
    ("robin", "百度", "founder_of", "李彦宏创立百度"),
    # ... 完整列表（从 enrich_graph.py step 5 移植全部）

    # 父子公司 develops
    ("openai", "sora", "develops", "OpenAI开发Sora"),
    ("谷歌", "gemini", "develops", "谷歌开发Gemini"),
    ("字节跳动", "火山引擎", "develops", "字节跳动开发火山引擎"),
    # ... 完整列表
]

# ── 别名修正 ──
ALIAS_REMOVALS = [
    {"node": "minimax", "contains": "胖猫"},
    {"node": "kimi", "exact": "月之暗面"},
    # ... 完整列表
]

NODE_RENAMES = [
    {"node": "rokid创始人", "new_name": "祝铭明", "add_aliases": ["Misa", "Rokid创始人"]},
]
```

### 4.2 创建 `scripts/post_process.py`（执行引擎）

读取 canonical.json → 按顺序执行 overrides.py 中的全部规则 → 输出修正后的 canonical.json。

核心逻辑从 enrich_graph.py 移植：
- `merge_nodes()` — 合并节点，重定向边，去重
- `apply_type_corrections()` — 修正实体类型
- `apply_edge_fixes()` — 修正关系类型/端点
- `add_missing_edges()` — 补充缺失关系
- `complete_bidirectional()` — competes_with + compares_to 双向补全（两种对称关系都需要反向边）
- `recalculate_metrics()` — 重算 degree + composite_weight
- `preserve_relation_strength()` — 保留模拟器 graph_utils.py 中的 5 级 RELATION_STRENGTH 体系（founder_of=5, invests_in=4, competes_with=3, compares_to=2, related=1），新增边也需赋值

### 4.3 创建 `scripts/build_presentation.py`（生成前端数据）

从修正后的 canonical.json 生成：
- `web-data/graph-view.json` — 前端图谱数据
- `web-data/leaderboards.json` — 排行榜（完全重建）
- `web-data/article-index.json` — 文章索引
- `web-data/articles/{id}.json` — 单篇文章详情
- `data/config/display_registry.json` — 同步重建节点展示配置（leaderboardSegments 须与新类型一致，如 plaud 从 "companies" 移到 "products"）

排行榜生成规则（从 enrich_graph.py step 9 移植）：
- products: type=product，按 composite_weight 排序，top 20
- founders: type=person 且有 founder_of/co_founded 边，top 20
- vcs: type=vc_firm，全部
- companies: type=company，top 20

### 4.4 整合管线入口

**方案 A（推荐）**：post_process.py 和 build_presentation.py 作为独立 CLI 入口，不侵入 build_graph.py。run_full_extraction.py 按顺序调用三步：

```bash
python scripts/build_graph.py           # 步骤1: 聚合 → canonical.json
python scripts/post_process.py          # 步骤2: 修正 → canonical_corrected.json
python scripts/build_presentation.py    # 步骤3: 生成前端数据 → web-data/
```

这样 build_graph.py 保持纯净（只做聚合），后处理可以独立调试和重跑。

**方案 B（备选）**：在 build_graph.py 末尾用 `--with-postprocess` flag 可选执行：

```python
if args.with_postprocess:
    from post_process import apply_all_overrides
    from build_presentation import build_presentation
    corrected = apply_all_overrides(canonical_graph)
    build_presentation(corrected)
```

### 4.5 MERGE_MAP 与 NODE_MERGES 职责划分

两处合并规则的边界必须清晰，否则会重蹈 enrich_graph.py 与 graph_utils.py 失同步的覆辙：

| 规则位置 | 职责 | 触发时机 | 举例 |
|---------|------|---------|------|
| `graph_utils.py` MERGE_MAP | **提取阶段**同义词归一化（纯文本变体） | Gemini 提取后立即执行 | "阿里"→"阿里巴巴"、"字节"→"字节跳动" |
| `overrides.py` NODE_MERGES | **后处理阶段**合并（需要上下文/人工判断的） | canonical.json 生成后执行 | "鹤岗凯一"→"kaiyi"（需要领域知识才知道是同一人） |

**原则**：能在 MERGE_MAP 中解决的优先放 MERGE_MAP（越早合并越好），NODE_MERGES 只处理 MERGE_MAP 无法覆盖的特殊情况。

---

## Phase 5: 前端适配（在 Web4 中）

### 5.1 vc_firm 类型支持 ✅ 已完成

前端已支持 vc_firm：
- `types.ts` — NodeType union 已包含 `'vc_firm'`
- `constants.ts` — NODE_TYPE_REGISTRY 已有 vc_firm 条目（`#2dd4bf`, "投资机构"）

无需修改。

### 5.2 图谱布局密度优化（待调参）

**文件**: `site/src/lib/graph-config.ts`

> **注意**：以下参数为起点，数据量变化后需在浏览器中目视调参。建议重跑后先用当前默认值看效果，仅在节点明显重叠时再逐步调整。

```typescript
export const FCOSE_LAYOUT_OPTIONS = {
  name: 'fcose',
  quality: 'default',
  randomize: true,
  animate: true,
  animationDuration: 1000,
  nodeSeparation: 180,        // 原 100 — 起点，视重叠程度调整
  idealEdgeLength: (edge) =>
    180 + (1 / ((edge.data('weight')) || 1)) * 80,  // 原 120+50
  nodeRepulsion: (node) => {  // 原 flat 8000 — 高 degree 节点需要更大斥力
    const degree = node.data('degree') || 0;
    return degree > 15 ? 25000 : degree > 8 ? 15000 : 10000;
  },
  gravity: 0.15,              // 原 0.25
  gravityRange: 5.0,          // 原 3.8
  numIter: 5000,
  nodeDimensionsIncludeLabels: true,
};
```

### 5.3 数据同步

修改 `site/prebuild.sh`：从模拟器的 `web-data/` 复制到 `site/public/data/`。

### 5.4 移除 enrich_graph.py

数据修正已上游化到模拟器的 post_process.py，Web4 不再需要自己的后处理脚本。

---

## Phase 6: 合并仓库

以 Web4 为主仓库，将模拟器的提取管线代码迁入。

### 6.1 迁入策略

使用文件复制（非 git subtree/merge），保持简洁。模拟器仓库保留为归档，不再主动开发。

```bash
# 从模拟器复制到 Web4
cp -r <simulator-repo>/scripts/ ./scripts/
cp -r <simulator-repo>/articles/ ./articles/
cp -r <simulator-repo>/data/ ./data/
cp <simulator-repo>/requirements.txt ./requirements.txt
```

### 6.2 .gitignore 规划

合并后必须更新 `.gitignore`，防止敏感/大文件入库：

```gitignore
# API keys
.env

# Gemini 原始响应（可重新生成，每篇 ~100KB）
data/gemini_raw/

# 运行状态（可重新生成）
data/state/nightly_run_state.json

# OS
.DS_Store
```

需要 git 跟踪的：
- `data/extracted/*.json` — 提取结果（重跑成本高）
- `data/graph/canonical.json` — 核心图谱
- `data/state/articles_manifest.json` — 版本追踪
- `data/config/display_registry.json` — 展示配置

### 6.3 Python 依赖

从模拟器的 `requirements.txt` 迁入。确保包含：
- `google-genai` (Gemini API)
- 其他依赖见模拟器 requirements.txt

建议在 Web4 根目录创建 `venv`：
```bash
python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt
```

### 6.4 目标目录结构

```
葬AI Web4/
├── articles/                  # 源文章（从模拟器迁入，69 个 .md）
├── scripts/                   # 完整管线（从模拟器迁入）
│   ├── extract_gemini.py
│   ├── graph_builder.py
│   ├── graph_utils.py
│   ├── pipeline_state.py
│   ├── build_graph.py
│   ├── run_full_extraction.py
│   ├── overrides.py           # 声明式修正
│   ├── post_process.py        # 后处理引擎
│   └── build_presentation.py  # 前端数据生成
├── data/
│   ├── extracted/             # 每篇提取结果
│   ├── gemini_raw/            # ⚠️ .gitignore — 可重新生成
│   ├── graph/                 # canonical.json
│   ├── config/                # display_registry.json
│   └── state/                 # manifest
├── web-data/                  # 最终输出
├── site/                      # Next.js 前端
├── .env                       # ⚠️ .gitignore — Gemini API key
├── requirements.txt           # Python 依赖
├── CLAUDE.md
└── CHANGELOG.md
```

### 6.5 prebuild.sh 更新

合并后 prebuild.sh 不再需要跨仓库路径，改为相对路径：
```bash
# 之前: 可能引用模拟器绝对路径
# 之后: 统一用项目根目录的 web-data/
cp -r ../web-data/*.json public/data/
```

合并后，一条命令跑通全链路：
```bash
python scripts/run_full_extraction.py --force  # 提取 + 聚合
python scripts/post_process.py                 # 后处理修正
python scripts/build_presentation.py           # 生成前端数据 → web-data/
cd site && npm run build                       # 构建前端
```

---

## Phase 7: 更新文档

- 更新两个项目的 CLAUDE.md
- 更新 CHANGELOG.md
- 保存用户偏好到 memory

---

## 执行顺序

```
Phase 1 ✅ 已完成（git save）
    ↓
Phase 2: 提取基础设施升级（修改模拟器的 graph_utils.py、extract_gemini.py、pipeline_state.py）
    ↓
Phase 3: 全量重跑 68 篇（需确认 API 余额）
    ↓
Phase 4: 创建后处理层（overrides.py + post_process.py + build_presentation.py）
    ↓  运行三步管线生成最终数据
    ↓
Phase 5: 前端适配（5.1 ✅ 已完成 | 5.2 布局调参 | 5.3 数据同步 | 5.4 移除 enrich_graph.py）
    ↓
Phase 6: 合并仓库（含 .gitignore、requirements.txt、prebuild.sh 更新）
    ↓
Phase 7: 文档更新
```

---

## 验证清单

### 数据质量
- [ ] 用户报告的 6 个缺失关系全部存在
- [ ] Plaud/YouWare/Looki/Agnes/MyShell/Rokid 类型为 product
- [ ] a16z/IDG/红杉/高瓴/五源/锦秋/金沙江/Benchmark 类型为 vc_firm
- [ ] IDG 和 IDG 90后基金 已合并
- [ ] kaiyi/鹤岗凯一/孙先生 已合并
- [ ] 阿里和阿里巴巴 已合并
- [ ] 所有 founder_of 边: source=person, target=company
- [ ] 所有 develops 边: source=company, target=product
- [ ] 所有 works_at 边: source=person, target=company/vc_firm
- [ ] 所有 competes_with 有双向边
- [ ] 所有 compares_to 有双向边
- [ ] 无重复节点 ID，无重复边
- [ ] 排行榜 mention_count 与图谱一致
- [ ] Qwen 出现在 products 排行榜
- [ ] display_registry.json 中 plaud 的 leaderboardSegments 为 "products"（非 "companies"）
- [ ] 所有边的 strength 字段已按 5 级体系赋值

### 构建
- [ ] `python scripts/build_graph.py` 无错误
- [ ] `python scripts/post_process.py` 无错误
- [ ] `python scripts/build_presentation.py` 无错误
- [ ] `npm run build` SSG 成功
- [ ] `npm run dev` 本地预览正常

### 合并仓库
- [ ] `.env` 在 `.gitignore` 中
- [ ] `data/gemini_raw/` 在 `.gitignore` 中
- [ ] `requirements.txt` 存在且可用
- [ ] prebuild.sh 使用相对路径

### 图谱可视化
- [ ] 节点不过度密集
- [ ] vc_firm 类型在图例中显示
- [ ] 搜索 "kaiyi" 能找到合并后的节点
