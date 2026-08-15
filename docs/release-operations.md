# 发布与回滚运行手册

> 人工发布环境：canonical root `/Users/xixiangyu/Documents/葬AI Web4`
> 正式域名：`https://funeralai.cc`  
> Cloudflare Pages project：`funeral-ai-web4`

## 1. 唯一正式发布命令

```bash
cd "/Users/xixiangyu/Documents/葬AI Web4/site"
npm run deploy
```

该命令不是单纯上传。它依次执行：仓库卫生检查、数据重建、KG gate、Python/前端测试、一次 production-mode 构建、release contract、本地验证、preview 上传与验收、同产物 production 上传、唯一 production URL 验收、正式域名验收和 receipt 写入。

不得用 `deploy:raw` 发布 production。该命令只允许显式设置 `ALLOW_RAW_PAGES_DEPLOY=1`，并固定发布到 `diagnostics-only` preview branch。

工作日内容自动化是唯一受控例外。它必须使用 Codex 的 worktree execution environment，并同时满足：

- worktree 与 canonical root 共用同一个 git common dir；
- 显式设置 `WEB4_AUTOMATION_WORKTREE=1`；
- profile 固定为 `content`；
- 开始构建和部署前 `HEAD` 精确等于最新 `origin/main`；
- `ZANGAI_ARTICLES_SOURCE_DIR` 指向本机文章库，`TEST_BENCHMARK_CONFIG` 指向 canonical root 的 ignored benchmark 配置。

该模式存在的目的，是让内容更新不受 canonical 工作区中未提交的 benchmark/UI 改动影响。普通副本、append 目录及 benchmark/UI/release profile 均不能借此获得 production 权限。

## 2. 成功证据

成功发布必须同时留下：

- `site/out/release-manifest.json`：本次产物身份；
- preview 唯一 URL；
- production 唯一 URL；
- `site/.release-receipts/release-*.json`：上一版本、本版本、正式域名与验证结果；
- 正式域名 `/release-manifest.json` 与本地 release ID 一致。

只有 Wrangler 显示 “Deployment complete” 不算完成。

## 3. 常见失败与安全处置

### doctor 失败

不构建、不部署。按输出处理重复 `public/test *`、源码副本、嵌套 `node_modules`、错误工作树或 secret。备份材料移入 `site/.stage-test-trash/`，不要放在 `site/public/` 或 `site/src/`。

若内容自动化报告 worktree 不受信，检查任务是否使用 worktree execution environment、`WEB4_AUTOMATION_WORKTREE=1` 是否存在、git common dir 是否指向 canonical repo，以及 `HEAD` 是否已 fast-forward 到 `origin/main`。不得把 profile 改成 `release` 绕过校验。

### KG gate 失败

不绕过。复核新文章实体关系，更新 `scripts/overrides.py` 和整体复核记录，再推进 `pipeline.toml` 的 `last_holistic_review_article`。

### 文件预算失败

查看 release guard 输出的 `totalFiles`。19,000 是上传前安全上限，Cloudflare 平台上限为 20,000。优先检查重复 benchmark、归档副本和意外生成目录；不要提高阈值掩盖问题。

### preview 验收失败

production 尚未改变。查看具体的 release ID、哈希、路由或只读 API 错误，修复后从头构建；不得直接跳过 preview。

### production 验收失败

立即停止所有写操作。脚本会打印 `previous_deployment_id`。先执行回滚 dry-run：

```bash
python3 scripts/rollback_pages.py --deployment-id "<previous_deployment_id>"
```

dry-run 使用本机 Wrangler 登录态只读查询 production deployment，并读取该版本的 `release-manifest.json`；它不会修改 production，也不会读取或输出 Wrangler 私有 token。确认输出的 project、environment、release ID 和 deployment URL 后，再显式提供 Pages Write API 凭据执行：

```bash
export CLOUDFLARE_ACCOUNT_ID="<Cloudflare account id>"
export CLOUDFLARE_API_TOKEN="<Pages Write token>"
python3 scripts/rollback_pages.py \
  --deployment-id "<previous_deployment_id>" \
  --execute \
  --confirm-project funeral-ai-web4
```

回滚 API 返回后，工具会用目标 release manifest 对 `https://funeralai.cc` 做完整、有界重试的远程验收。只有正式域名收敛到目标文章、图谱、benchmark、路由和只读 Functions 契约后，receipt 才会标记 `verified: true`。

如果本机没有显式 API token，进入 Cloudflare Dashboard → Pages → `funeral-ai-web4` → Deployments，在上一条成功 production deployment 的菜单中选择官方 **Rollback to this deployment**。不得让脚本读取 Wrangler 私有 OAuth token。

## 4. 手工验证命令

验证当前本地产物：

```bash
python3 scripts/release_guard.py verify-local --mode required
```

验证指定部署：

```bash
python3 scripts/release_guard.py verify-remote \
  --base-url "https://<deployment>.funeral-ai-web4.pages.dev" \
  --expected-manifest site/out/release-manifest.json
```

验证正式域名：

```bash
python3 scripts/release_guard.py verify-remote \
  --base-url "https://funeralai.cc" \
  --expected-manifest site/out/release-manifest.json
```

远程验证会检查 release ID、关键 JSON 哈希、文章/图谱/benchmark 计数、关键路由和投票 API 的只读 GET，不会写投票。

## 5. 内容停更日常检查

每个工作日自动化结束后核对三个时间点：

1. Substack feed 最新文章日期。
2. `web-data/article-index.json` 最新文章 ID/日期。
3. `https://funeralai.cc/release-manifest.json` 的最新文章 ID/日期。

三者不一致时，报告必须包含失败阶段（import / extract / KG gate / build / preview / production verify）、release ID（若已生成）和下一条安全命令。不能只说“没有更新”。

自动化不得再以 canonical 工作树存在 benchmark/UI 改动为由跳过 Substack 检查。隔离 worktree 自身若出现 content 之外的改动，仍必须 fail closed。

## 6. GitHub 同步

生产发布与 GitHub 同步是两个事务。发布成功后，先检查工作区事务边界，再按 profile 执行：

```bash
./scripts/sync_github_repo.sh --profile content "content: sync latest articles"
```

可靠性、UI、benchmark 和内容混在一起时使用 `release` 前必须人工复核 staged diff。同步失败不应触发重新发布，也不得用 `git add -A` 绕过 profile。

## 7. 依赖维护

- CI 固定 Node 22；本地支持 Node 20–25。
- Next.js 固定 Maintenance LTS patch，Wrangler 固定验证过的版本。
- 每月至少运行一次 `npm audit --omit=dev`，只在独立维护窗口处理跨 Next/Tailwind 大版本升级。
- 当前站点是静态导出并关闭 Next Image optimizer，不能据此忽略公告，但可以把仅影响服务器运行时的修复放入独立、完整回归的升级事务。
