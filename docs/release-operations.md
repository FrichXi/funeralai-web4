# 更新、发布与恢复

唯一正式站点为 `https://funeralai.cc`，Cloudflare Pages 项目为 `funeral-ai-web4`。
canonical 仓库为 `/Users/xixiangyu/Documents/葬AI Web4`。

## 日常更新

定时任务在与 canonical 共用 Git 的隔离 worktree 执行：

```bash
git fetch origin main
git merge --ff-only origin/main
python3 -m scripts.run_pipeline update
```

`update` 负责导入、增量提取、恢复未完成构建、比较线上内容、按需发布和 GitHub 同步。它不根据导入数量提前退出。新的 worktree 使用 Git 内已保存的提取结果，读取 canonical 的 `pipeline.local.toml` 定位本机文章库，并通过 `TEST_BENCHMARK_DIR` 复用已发布的 benchmark 目录。

多个内容更新共用一个进程锁；锁在进程退出后自动释放。退出前（包括失败）会尝试把已完成进度同步到 Git；失败后直接重跑相同命令，成功的文章不会重复调用模型。推送失败后的本地提交也会在下次同步时继续推送。

## 模型故障切换

按 DashScope → GLM → Kimi → MiniMax 顺序使用 `~/.env` 中的现有密钥，仓库 `.env` 可覆盖；密钥不复制进代码或 Git。

| 供应商 | 密钥 | URL / 模型 |
|---|---|---|
| DashScope | `DASHSCOPE_API_KEY` | URL 来自 `DASHSCOPE_BASE_URL`；主模型来自 `pipeline.toml` |
| GLM | `ZHIPUAI_API_KEY`，兼容 `ZHIPU_API_KEY` / `GLM_API_KEY` | 对应前缀的 `_BASE_URL` / `_MODEL` |
| Kimi | `MOONSHOT_API_KEY`，兼容 `KIMI_API_KEY` | 对应前缀的 `_BASE_URL` / `_MODEL` |
| MiniMax | `MINIMAX_API_KEY` | `MINIMAX_BASE_URL` / `MINIMAX_MODEL` |

没有配置密钥的供应商自动跳过。欠费、鉴权失败、模型不可用立即切换，本次运行后续文章跳过已经确认不可用的供应商。超时、限流、服务错误、JSON 不完整最多尝试两次再切换。API 请求使用直连，避免桌面代理污染国内 API 路径。所有供应商失败时保留原结果、返回真实错误，下次自动补做。

`data/extracted/*.json` 是版本化构图输入，每篇记录真实供应商和模型。原始响应、API 密钥仍不进入 Git。默认模型改变不会重提取历史文章；需要主动迁移才使用 `--force`。

## 人工综合发布

修改数据后先运行 `python3 -m scripts.run_pipeline`，仅改图谱规则时运行 `python3 -m scripts.run_pipeline build`。随后：

```bash
cd "/Users/xixiangyu/Documents/葬AI Web4/site"
npm run deploy
```

发布流程只有一次构建、实际产物校验、一次 production 上传、线上核对和 receipt。测试在开发及 CI 执行，不在每次发布时重复运行。`doctor_repo.sh`、`kg_review_gate.py` 和 `frontend_refactor_readiness.py` 保留为按需诊断；复核日期不作为发文条件。

人工 production 仍从 canonical 执行；内容 worktree 使用 `WEB4_AUTOMATION_WORKTREE=1`、`content` profile。append 目录、普通副本不能发布 production。

`site/public/test` 是已发布 benchmark bundle；内容更新只复制它，不读取正在修改的原始测评目录。榜单下载图片直接复用当前榜单 JSON 已绑定哈希的版本化 PNG。`npm run stage:test` 仅在有意更换 benchmark 时使用。

GitHub Actions 在干净环境运行测试和 `STAGE_TEST=ci` 编译。正式构建使用 `STAGE_TEST=required`，仍需完整 benchmark bundle，故 Git push 不触发 production 自动部署。

依赖锁文件使用 `packageManager` 声明的 npm 10.9.4 更新（`npx npm@10.9.4 install`），与 Node 22 CI 保持一致。`/data/*` 每次请求重新验证缓存，避免新页面读取旧图谱。

## 成功与恢复

`site/out/release-manifest.json` 记录本次文章/图谱/benchmark、关键哈希、静态树与运行时身份。脚本核对唯一 production URL 和正式域名，成功后写入 ignored `site/.release-receipts/release-*.json`，包括上一 production 的 ID。只有线上内容一致才报告发布完成。

检查本地或线上：

```bash
python3 scripts/release_guard.py verify-local --mode required
python3 scripts/release_guard.py verify-remote --base-url https://funeralai.cc
```

失败时根据具体阶段处理：抓取失败可重跑并由 Ego Lite 回退；提取失败自动切换供应商；构建失败修复报告中的产物问题；推送失败重跑 `scripts/sync_github_repo.sh --profile content`。不要手动把失败状态改成成功。

需要回滚时，使用 receipt 的上一 production ID，先检查目标：

```bash
python3 scripts/rollback_pages.py --deployment-id "<previous-id>"
```

执行要求已有 Pages Write token：

```bash
python3 scripts/rollback_pages.py --deployment-id "<previous-id>" --execute --confirm-project funeral-ai-web4
```

脚本从环境读取 `CLOUDFLARE_ACCOUNT_ID` / `CLOUDFLARE_API_TOKEN`，或在 Cloudflare Dashboard 选择该版本的 Rollback。回滚后也会检查正式域名。

## 2026-09-06 停更修复记录

线上停在 2026-08-26 的文章 138；GitHub 最后一次 CI 成功，本机 canonical 比 origin/main 落后一次内容提交。9 月 4 日任务在 Substack 请求读取阶段发生 TimeoutError。

本次修复的根因包括：

- 抓取未捕获读取超时，且依赖已经过时的 Chrome 3456 代理；改为有界 HTTP 重试及 Ego Lite 回退。
- 导入成功后提取/发布失败，下一次因“没有新文章”提前退出；改为检查源文件、提取状态和线上哈希。
- 提取结果被 Git 忽略，新的 worktree 无法完整构图；恢复并纳入 Git，不再靠复制历史临时目录。
- 状态同步先覆盖旧内容哈希，使正文更新被误判为未变；保留旧哈希直到实际提取成功。
- 默认模型改变会重跑历史语料，提取失败仍可能返回 0；改为只补新增/变更、逐篇保存、失败如实退出。
- 国内模型 API 受代理路径及账户状态影响；改为直连和四供应商自动切换，实测 Kimi、MiniMax 可用，GLM 返回余额不足 1113。
- 内容发布重复依赖审查、preview 上传、原始 benchmark 目录及 Chrome 图片渲染；改为复用已发布资源，只检查一次实际产物、上传一次。
- 推送失败后的干净工作树被当作“无需推送”；改为继续推送已有提交。
- 本机 139/140 是同文不同版本，保留原稿、仅发布 140；修正排除文章仍阻断构图的问题。
- 文章摘要混入标题、日期与 Markdown 分隔线；清理展示摘要，保留原始正文。

删除已由 overrides/post_process 取代的 enrich_graph.py，并把旧 CLAUDE.md 改为引用 AGENTS.md，避免维护两套冲突说明。历史方案和 release receipt 保留为历史记录。
