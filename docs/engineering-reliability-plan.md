# 葬AI Web4 工程可靠性与可维护性计划

> 制定日期：2026-07-28  
> 适用范围：文章导入、知识图谱生成、Next.js 静态构建、`/test` benchmark、Cloudflare Pages Functions/D1、生产发布与 GitHub 同步。  
> 核心目标：让错误在上传生产前被发现，让每次发布可识别、可验证、可回退，并让本机与 CI 使用同一套工程契约。

## 1. 当前基线与已知故障模型

当前生产基线为 125 篇文章、699 个图谱节点、1860 条关系、160/160 个 Graph V2 benchmark 产物。2026-07 的内容停更事故证明了以下风险真实存在：

1. `site/public/` 下的人工备份目录会被 Next.js 原样复制，静态文件数超过 Cloudflare Pages 20,000 文件上限。
2. 内容导入、图谱复核、前端构建、benchmark staging 和生产上传之间缺少统一的机器可读发布契约。
3. 部署成功只代表上传成功，不代表正式域名已经提供正确文章、图谱、榜单和 Functions。
4. 本机发布与 CI 的 staging 模式不同，CI 不能完整复现 production release。
5. 工作区长期混有多个事务，发布来源无法仅凭 Git commit 还原；复制文件和工具缓存可能进入源码树。
6. 当前发布直接进入 production，没有先对同一份静态产物做 preview 验收。
7. Cloudflare 支持回滚成功的 production deployment，但仓库没有受控回滚工具和 runbook。

## 2. 设计原则

- **单一入口**：正式发布只能通过 `scripts/deploy_site.sh`，`deploy:raw` 仅供非 production 排障。
- **同一份产物晋级**：数据管线和构建只运行一次；先把 `site/out` 上传 preview 验收，再把完全相同的目录上传 production。
- **契约优先**：发布清单记录文章、图谱、benchmark、关键文件哈希、Git 状态和构建身份；本地与远程验证都读取它。
- **失败关闭**：任何缺失、数量倒退、哈希不一致、悬空图谱边、文件预算超限或关键路由失败都阻断发布。
- **非破坏性清理**：历史备份移入已忽略的隔离目录；不直接删除用户材料。
- **最小生产变更**：不重写 Next.js、图谱算法或 benchmark 数据，只加外围验证和发布事务控制。
- **显式回滚**：自动记录上一个 production deployment；回滚要求明确 deployment ID、成功状态和二次确认。
- **可观测但不泄密**：日志展示计数、哈希和部署 ID，不输出 Cloudflare token、D1 数据或本地秘密。

## 3. 目标架构

```text
canonical repo
  -> repo doctor
  -> data pipeline + KG gate
  -> Python tests + frontend lint/tests
  -> one production-mode static build
  -> release contract + local artifact verification
  -> Cloudflare preview upload
  -> preview remote verification
  -> record previous production deployment
  -> upload the same site/out to production
  -> production remote verification
  -> success receipt
       or explicit rollback command/runbook
```

## 4. 实施项目

### P0：源码树卫生与边界

1. 将 `site/src/**/page 2.tsx` 等人工副本移入 `site/.stage-test-trash/`。
2. 忽略任意层级 `node_modules/`、本地 release receipt 和生成的 release manifest。
3. `doctor_repo.sh` 拒绝：
   - `site/public/test *` 等会进入产物的重复目录；
   - 源码树里的 `* 2.*`、`* copy.*`、`* backup*`；
   - 源码树里的嵌套 `node_modules`；
   - 被 Git 跟踪的生成目录。

验收：对每类污染做故障注入时 doctor 必须失败，清理后必须通过。

### P1：统一发布契约

新增标准库 Python 工具 `scripts/release_guard.py`，负责：

1. 生成 `site/public/release-manifest.json`，至少包含：
   - schema/version 与唯一 release ID；
   - 生成时间、Git HEAD、dirty 状态摘要；
   - 文章总数、最新文章 ID/日期；
   - 图谱文章数、节点数、关系数；
   - benchmark release ID 与产物数；
   - 关键 JSON 的 SHA-256，以及 `site/out` 完整文件树摘要。
2. 本地产物验证：
   - article index 数量、ID 唯一性、文章 JSON 一一对应；
   - graph metadata 与 article index 一致；
   - 节点 ID 唯一、边端点存在；
   - benchmark `entries == expectedEntries`，关键归档存在；
   - `site/out` 文件数低于安全预算，并且关键 HTML/JSON 存在；
   - `site/out` 中哈希与 release manifest 一致。
3. Functions 不属于 `site/out`，因此单独做 JavaScript 语法检查；远程以只读 API 请求验证实际 binding。
4. 远程验证：
   - 有界重试获取 release manifest；
   - release ID 和关键哈希必须与本地产物一致；
   - `/articles/`、最新文章、`/graph/`、`/leaderboard/`、`/test/` 返回 200；
   - 读取文章、图谱和 benchmark JSON 再验证数量；
   - 以只读 GET 验证投票 API binding，不写入投票。

验收：测试覆盖正常、数量不一致、悬空边、重复 ID、缺文件、远程旧版本和 HTTP 失败。

### P2：两阶段发布事务

重构 `scripts/deploy_site.sh`，按固定顺序执行：

1. doctor、数据管线、KG gate。
2. Python tests、frontend lint、frontend tests。
3. `STAGE_TEST=required` 构建一次。
4. 本地 release contract 验证。
5. 上传固定 preview branch `release-candidate`，解析唯一 deployment URL。
6. 对 preview URL 运行远程验证。
7. 记录当前 production deployment ID。
8. 把同一份 `site/out` 上传 production，并传入 commit hash/message/dirty 标识。
9. 对唯一 production deployment URL 和 `https://funeralai.cc` 分别验收。
10. 写入本地 ignored release receipt，记录 previous/current deployment、release ID 和验证结果。

任何步骤失败立即停止。preview 失败时 production 完全不变；production 验收失败时脚本打印经过验证的上一 deployment ID 和唯一回滚命令。

### P3：受控回滚

新增 `scripts/rollback_pages.py`：

1. 仅接受显式 production deployment ID。
2. 从环境读取 `CLOUDFLARE_ACCOUNT_ID` 和 `CLOUDFLARE_API_TOKEN`，不读取或打印 Wrangler 私有 token。
3. 先 GET 目标 deployment，确认它属于 `funeral-ai-web4`、状态成功、环境为 production。
4. 默认 dry-run；只有 `--execute` 才调用官方 rollback API。
5. 回滚后调用远程 verifier，并保存 rollback receipt。

没有 API token 时，只允许通过 Wrangler 登录态做 production 目标与 release manifest 的只读 dry-run；执行回滚仍必须显式提供 Pages Write API token，不得绕过目标校验。

### P4：CI 与本机一致性

1. CI 固定 Node LTS 版本，并与 `package.json#engines` 和文档一致。
2. CI 增加 release contract 单元测试，并使用仓库内最小只读 manifest fixture 完成 `STAGE_TEST=ci` 编译和本地产物校验；涉及完整 frozen benchmark 目录与归档的 production staging 仍只在 canonical 本机执行。
3. `package.json` 提供 `check`、`release:verify` 等统一命令，避免文档和脚本各自拼命令。
4. CI 对 shell 运行 `bash -n`，对 Python 运行 compile/import 检查。
5. README、AGENTS 和 CHANGELOG 只引用统一命令。

### P5：运行手册与日常维护

1. 新增发布、故障排查、回滚、内容停更检查清单。
2. 明确每周检查：最新 Substack 日期、本地最新文章、线上 release manifest 三者是否一致。
3. 自动化任务失败时必须报告失败阶段、release ID 和下一条安全命令，不能只报告“未更新”。
4. GitHub 同步保持独立事务；production 发布成功不自动提交混合工作区。

## 5. 验收标准

全部条件同时满足才算改造完成：

- 计划和独立审核文档存在，审核没有未处理的高风险意见。
- doctor 的真实基线与污染故障注入测试通过。
- release guard 单元测试和全仓库现有测试全部通过。
- lint、TypeScript/Next 构建、Graph V2 160/160 staging、KG gate 全部通过。
- `site/out` 只有一份 benchmark，文件预算低于 19,000。
- preview deployment 与本地 release ID、哈希、计数一致。
- production deployment 与 preview 使用同一 `site/out`，正式域名通过远程 verifier。
- 上一 production deployment ID 已写入 receipt；回滚工具 dry-run 能确认目标。
- 当前生产站在改造前后持续可用；任何失败发生在 production 变更前，或可明确回滚。

## 6. 明确不做

- 不迁移托管平台、不引入数据库保存文章/图谱、不重写 Next.js App Router。
- 不修改图谱评分公式、benchmark 冻结数据或文章正文。
- 不自动提交或推送当前混合工作区。
- 不在没有显式 token 和目标确认时自动执行生产回滚。
