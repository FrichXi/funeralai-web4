# Web4 Benchmark 2026-08-04 发布清单

> 状态：**可供用户审核；尚未部署、尚未上线。**
>
> 当前发布数据 ID：`web4-graph-v2-leaderboard-20260804-v2`
>
> 本清单只授权 benchmark、分析页、多模态页与对应发布图片。不得把 iCloud 占位造成的 `web-data/`、文章、知识图谱或首页差异混入发布。

## 1. 当前冻结口径

- 唯一数值基准：`site/src/data/web4-benchmark-current.json`
- 16 个唯一 `model_id`，每模型 10 轮成绩，共 160 个成绩。
- Hunyuan、MiniMax 不进入当前发布包；LongCat 由人工规则调整为 D 档。
- 豆包锁定：均分 28.70、中位数 31.42、平均墙钟 5.44 分钟、179 次调用、4.54M token、¥13.178。
- 总榜、性价比榜、Round 矩阵、methodology、两张榜单下载图均绑定同一 releaseId。
- 冻结的旧 raw artifact manifest 保留为历史产物包，releaseId 为 `web4-graph-v2-first-official`；它只承担旧原始产物/归档链接，不再作为当前 16 模型数值基准。release guard 已把当前 selection 与旧 raw artifact 身份分字段记录，避免混称。

## 2. 最终 16 模型摘要

| # | 模型 | 档 | 均分 | 中位数 | 平均分钟 | 调用 | Token | 10 任务成本 |
|---:|---|:---:|---:|---:|---:|---:|---:|---:|
| 1 | GPT-5.6 Sol | S | 69.95 | 82.71 | 6.26 | 175 | 5.95M | 估算 ¥86.500 |
| 2 | Claude Fable 5 | S | 62.39 | 71.47 | 8.58 | 207 | 8.36M | 估算 ¥188.164 |
| 3 | Qwen 3.8 Max | A | 58.08 | 51.61 | 13.27 | 180 | 6.91M | ¥38.218 |
| 4 | Kimi K3 | A | 54.55 | 62.38 | 15.17 | 248 | 7.05M | ¥42.737 |
| 5 | Claude Opus 5 | A | 53.91 | 50.29 | 16.80 | 478 | 37.32M | 估算 ¥273.123 |
| 6 | DeepSeek V4 Pro | B | 45.07 | 38.03 | 7.65 | 262 | 16.59M | ¥3.749 |
| 7 | Grok 4.5 | B | 41.87 | 41.50 | 3.28 | 64 | 1.35M | 估算 ¥11.893 |
| 8 | DeepSeek V4 Flash | B | 41.25 | 30.03 | 6.94 | 245 | 9.98M | ¥1.056 |
| 9 | Qwen 3.7 Max | C | 37.97 | 26.62 | 6.85 | 215 | 10.75M | ¥20.700 |
| 10 | GPT-5.6 Luna | C | 36.62 | 46.79 | 5.72 | 130 | 3.45M | 估算 ¥5.003 |
| 11 | GLM 5.2 | C | 36.44 | 17.50 | 11.24 | 230 | 9.46M | ¥33.126 |
| 12 | Step 3.7 Flash | D | 29.11 | 20.80 | 5.42 | 289 | 13.98M | ¥6.875 |
| 13 | Doubao Seed Evolving | D | 28.70 | 31.42 | 5.44 | 179 | 4.54M | ¥13.178 |
| 14 | MiMo 2.5 Pro | D | 22.81 | 22.29 | 4.62 | 206 | 10.31M | ¥6.011 |
| 15 | LongCat 2.0 | D | 18.45 | 10.25 | 7.60 | 226 | 12.57M | ¥3.255 |
| 16 | ERNIE 5.1 | E | 2.23 | 0.00 | 11.40 | 107 | 7.00M | ¥45.560 |

性价比前三：Grok 4.5（12.31）、GPT-5.6 Luna（9.77）、GPT-5.6 Sol（8.23）。公式为均分除以当前 16 模型内的加权消耗名次；成本 40%、墙钟 25%、调用 20%、token 15%。

## 3. Qwen 3.8 Max 同步摘要

### Web4

- 总榜第 3，A 档；均分 58.08、中位数 51.61，10 轮范围 36.36–85.41，无 0 分轮。
- 数据身份、离线运行、最短路径、统计准确性均 10/10 轮满分；节点详情 9/10 轮满分。
- 主要问题是视觉稳定：`visual_instability` cap 8 次，节点渲染不完整 4 次；类型筛选与缩放平移各 3 轮未通过。
- 平均 13.27 分钟、180 次调用、6.91M token、¥38.218；性价比指数 5.90，排第 5。
- 有限结论：核心数据与算法覆盖很均衡，但布局动画和视觉收敛仍需独立回归。

### 多模态

- 本轮表现为强规划、强符号化：会把视觉特征拆成明确几何/场景元素，并主动修复空白预览、法线与索引问题。
- 3D 特征抓取明确，切片 49.54 分钟；但“水密”自述与独立检查冲突，仍有 21 条非流形边、47 个退化三角。
- MG 分镜完整，但 15 fps 抽样近静止帧约 61.2%，四模型最高，更像关键帧与场景切换，而不是持续动画。
- “硬眉毛”可由 `build_model.py` 中裁切 `torus_y` 与较小平滑并集直接解释，不能证明服务端采用分离的 VL/LLM 架构。
- 正式版暂不能宣称相对 Preview 提升：严格旧题 A/B 中 3D 为 48/60 对 55/60，宣传片 SSIM 为 0.7781 对 0.7886，均为 Preview 略高；单轮只足以否定“全面升级”，不足以建立稳定版本结论。

## 4. 新增/修改文件

### 页面与数据

- `site/src/app/(main)/test/page.tsx`
- `site/src/app/(main)/test/methodology/page.tsx`
- `site/src/app/(main)/test/multimodal-model-analysis/page.tsx`
- `site/src/data/web4-benchmark-current.json`
- `site/src/data/web4-benchmark-analysis.ts`
- `site/src/data/web4-benchmark-current.test.ts`

### 发布锁与防回档

- `site/prebuild.sh`：把当前 benchmark JSON 发布为 `/test/current-release.json`。
- `scripts/release_guard.py`：验证 16×10 selection、豆包冻结数值、两张榜单图 SHA、三张多模态图 SHA、methodology 与多模态路由；当前 selection 与旧 raw artifact manifest 分开记录。
- `AGENTS.md`
- `CHANGELOG.md`
- `docs/releases/web4-benchmark-20260804-release-checklist.md`

### 图片

- `site/public/images/test/web4-graph-v2-leaderboard-20260804-v2/model-leaderboard.png`
  - SHA-256 `ed0a0c638eb3fbce307b75c0d65bb45d2c9c9e584ea450cbbc081d4e4762a0e0`
- `site/public/images/test/web4-graph-v2-leaderboard-20260804-v2/value-leaderboard.png`
  - SHA-256 `fffff0a45bcee35fcde9c2f71dc061e40878f02a2d5e3d61800d4bdf8bcc6459`
- `site/public/images/test/multimodal-20260804/qwen38-formal-vs-preview-3d-four-view.png`
  - SHA-256 `a9367b65d29df123916ba1c147dbbb03e24157454b5beee890b739090ec8e862`
- `site/public/images/test/multimodal-20260804/six-models-3d-four-view-grid.png`
  - SHA-256 `88d0c65e0ad7c416e9cb6219082c4b51249d3ea098d37a110c1f24fba3d361c0`
- `site/public/images/test/multimodal-20260804/four-models-mg-representative-frames.png`
  - SHA-256 `d33931343c7ab3c181214ac713542175b451b8f83eadcffee34ff20a3694f39d`

多模态源报告：`/Users/xixiangyu/dev/多模态模型两题运行倾向简报-20260804.md`，SHA-256 `37c250528eb8bd3b8bdb6e1a0360dcbd03e2eca908e74bbb70aa5f7e716ae22d`。

## 5. 校验结果

- JSON 语法与 16 行数据锁：通过。
- Vitest：4 个测试文件、31 项测试全部通过。
- 定向 TypeScript：本次 5 个 TS/TSX 文件及直接依赖通过。
- 定向 ESLint：通过。
- `site/prebuild.sh` shell 语法：通过。
- `scripts/release_guard.py` Python 语法：通过。
- release guard 定向验证：releaseId 正确、16 模型、160/160 成绩、模型 ID 唯一、豆包 28.70/179/¥13.178、发布图片 SHA 全部通过。
- Next.js 15.5.21 开发模式：`/test/`、`/test/methodology/`、`/test/multimodal-model-analysis/` 均成功编译并返回 200。
- 图片 HTTP：两张榜单图与三张多模态图均返回 200、`image/png`，字节数与源文件一致。
- 图片 alt：三张多模态图片均有具体模型和内容描述。
- Playwright：1440×900 桌面与 390×844 窄屏均检查；复古像素风、表格移动卡片、16 张分析卡、三张图片均正常。
- Playwright HAR：多模态页无 4xx/5xx；`/test` 本地仅 Cloudflare Pages Functions 投票接口返回预期 404，生产 Functions 不在本地 Next dev 中运行。
- 防回档源文件：`site/src/app/page.tsx`、`site/src/app/(main)/graph/page.tsx`、`site/src/app/(main)/articles/page.tsx` 前后 SHA-256 完全一致。

视觉证据：

- `output/playwright/test-desktop-final.png`
- `output/playwright/test-mobile.png`
- `output/playwright/methodology-desktop.png`
- `output/playwright/methodology-mobile.png`
- `output/playwright/multimodal-desktop-final.png`
- `output/playwright/multimodal-mobile-final.png`
- `output/playwright/multimodal-final.har`
- `output/playwright/test-final.har`
- `output/playwright/test-release-lock.png`
- `output/playwright/test-release-lock.har`

## 6. 生产将变化的 URL

- `/test/`
- `/test/methodology/`
- `/test/multimodal-model-analysis/`
- `/test/current-release.json`
- `/images/test/web4-graph-v2-leaderboard-20260804-v2/model-leaderboard.png`
- `/images/test/web4-graph-v2-leaderboard-20260804-v2/value-leaderboard.png`
- `/images/test/multimodal-20260804/qwen38-formal-vs-preview-3d-four-view.png`
- `/images/test/multimodal-20260804/six-models-3d-four-view-grid.png`
- `/images/test/multimodal-20260804/four-models-mg-representative-frames.png`

首页 `/`、知识图谱 `/graph/`、文章列表 `/articles/`、文章详情数据与现有非测试路由不在本发布范围。

## 7. 环境阻塞与上线门槛

- iCloud File Provider 将部分 `web-data/*.json`、`site/public/data/*.json` 和旧依赖标记为 `dataless`；普通读取会得到空内容或长时间等待。
- 因此本轮**没有执行**会先跑 `prebuild.sh` 的完整 `npm run build`，避免把空占位复制进 `site/public/data/`，触发首页/知识图谱回档或损坏。
- 全量 TypeScript 也因扫描未物化旧文件而中止；已用定向 TypeScript、ESLint、Vitest 与真实浏览器页面编译覆盖本次改动。
- 正式发布前必须先确认 `web-data/` 和 `site/public/data/` 的必需 JSON 全部本地物化、非空且可解析，然后只使用运行手册中的 guarded preview → 同产物 production 流程。
- 工作区中因 iCloud 占位显示的文章、图谱和 `web-data/` 差异不得 `git add -A`，不得混入本 benchmark 发布事务。
- 当前没有执行任何 Wrangler、Cloudflare、Git push、deploy、promotion 或生产写操作。

## 8. 最终状态

**尚未部署。等待用户亲自下达上线指令；在 File Provider 阻塞解除并完成一次完整 guarded build/preview 验收前，不得上线。**
