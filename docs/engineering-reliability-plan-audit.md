# 工程可靠性计划审核

> 审核日期：2026-07-28  
> 被审核计划：`docs/engineering-reliability-plan.md`  
> 审核结论：**有条件通过**。下列约束纳入实施后，可以按 P0 → P5 顺序执行。

## 1. 审核方法

从六个维度逐项反证计划：

1. 故障覆盖：已发生的 20,000 文件事故和 KG gate 阻断是否会在 production 前暴露。
2. 生产隔离：任何新增步骤失败时，是否保持当前 production 不变。
3. 同产物保证：preview 验证的是否真是随后上传 production 的同一目录。
4. 回滚安全：是否可能因自动化选错 deployment 而扩大事故。
5. CI 可执行性：干净 clone 是否具备构建 `/test` 所需的最小数据。
6. 维护成本：是否引入重复配置、隐式凭据或需要记忆的旁路命令。

## 2. 审核发现与处置

| 等级 | 发现 | 计划处置 | 审核状态 |
|---|---|---|---|
| 高 | 直接 production 上传无法在变更前发现静态路由或数据错误 | 固定 preview branch，远程验收通过后才上传同一 `site/out` | 通过 |
| 高 | 仅验证几个 JSON 不能证明 preview 与 production 使用同一产物 | release manifest 增加完整文件树摘要；production 上传前重新计算 | 通过（实施时必须测试） |
| 高 | 自动回滚若目标 ID 错误会扩大事故 | 回滚默认 dry-run，校验 project/environment/status，`--execute` 二次确认 | 通过 |
| 高 | CI 的 `STAGE_TEST=skip` 在干净 clone 中没有 `/test` manifest，无法代表代码可构建 | 增加小型只读 fixture 和独立 `ci` 模式；production 仍验证完整 160 个归档 | 通过（实施时必须做 fresh-like 构建） |
| 中 | Pages Functions 不在 `site/out`，不能靠静态目录判断是否上传 | 本地做语法检查，preview/production 做只读 API binding 请求 | 已修正计划 |
| 中 | preview 与 production 的 D1/secret 环境可能不同 | preview 验证静态和可用 binding；production 仍需再次验证正式 API | 通过 |
| 中 | 工作区允许内容自动化先部署后同步，不能简单要求绝对 clean | 记录 Git dirty 摘要，并由 profile 限制变更范围；`release` profile 必须显式使用 | 通过 |
| 中 | 19,000 是经验阈值，不应散落在脚本中 | release guard 作为唯一预算检查实现，shell 只调用它 | 通过 |
| 低 | 每次发布跑全量测试增加时间 | 可靠性优先；仅允许显式环境变量在本地诊断跳过，production 默认不可跳过 | 通过 |

## 3. 生产安全顺序审核

实施阶段不得直接用新脚本覆盖 production。必须依次满足：

1. 新增工具的单元测试通过。
2. 现有 Python/前端测试和 lint 通过。
3. production 模式本地构建和本地产物验证通过。
4. 新脚本上传 preview，preview verifier 通过。
5. 记录当前 production deployment ID 与现网站基线。
6. 才允许上传 production。
7. 正式域名验收失败时停止其他写操作，并使用 receipt 中的上一 deployment 走显式回滚。

这保证 P0–P4 的开发失败只影响本地 ignored 目录或 preview，不会让正式站点崩溃。

## 4. 可维护性审核

- 新增核心工具应控制为一个 release guard 和一个 rollback CLI，避免多个功能重叠的小脚本。
- JSON 字段和验证逻辑由 Python 单元测试固定；shell 只负责编排和 Cloudflare 命令。
- production/CI 差异必须作为显式模式写入 manifest，不能根据“文件恰好存在”静默降级。
- `deploy:raw` 必须显著标记为非 production，不得成为正式发布捷径。
- 文档命令必须能从 canonical root 直接复制执行。

## 5. 最终审核门槛

若出现以下任一情况，计划应暂停在 production 上传之前：

- fresh-like CI staging 无法构建 `/test`；
- release tree digest 在 preview 后发生变化；
- preview verifier 无法确认 release ID；
- 无法取得当前 production deployment ID；
- rollback dry-run 无法确认上一 deployment 为成功的 production；
- 正式域名在发布前已有关键路由异常。

在这些约束下，计划的覆盖面与复杂度匹配当前项目，不需要迁移框架或托管平台，可以进入实施。

## 6. 实施复核（2026-07-29）

计划中的高风险约束均已落实，最终动态证据以 `site/.release-receipts/` 中最新 receipt 为准：

| 验收项 | 实施证据 | 状态 |
|---|---|---|
| 源码树卫生 | doctor 拒绝 public 重复目录、源码备份副本和嵌套 `node_modules`；三类故障注入均已验证 | 通过 |
| 发布契约 | release manifest 固定文章、图谱、benchmark、Functions、Git 和完整静态树摘要；正常与错误分支有单元测试 | 通过 |
| 可重复数据构建 | 相同输入连续运行两次，canonical、presentation、insights、索引与榜单核心文件哈希一致 | 通过 |
| CI/fresh-like 构建 | `STAGE_TEST=ci` 的 160-entry fixture 完成静态导出并通过本地契约检查 | 通过 |
| production 构建 | `STAGE_TEST=required` 完成 125 篇文章、160/160 benchmark 和低于 19,000 的文件预算检查 | 通过 |
| 两阶段发布 | preview 先验收；production 复用同一 `site/out`；自定义域名传播期间的旧哈希由有界完整契约重试处理 | 通过 |
| Functions | 本地语法检查，preview/production 对投票 API 仅执行只读 GET | 通过 |
| 回滚 | dry-run 可用 Wrangler 登录态确认 production 目标和 release ID；执行仍要求显式写权限 token 与二次确认 | 通过 |
| 线上结果 | 最新文章、文章索引、图谱、排行榜、benchmark、方法论、release manifest 与正式域名远程 verifier 均通过 | 通过 |

依赖审核仍保留一个有意识接受的中风险后续项：Next.js 16 属于框架大版本迁移，需在独立维护窗口完成，不能与本次内容恢复和发布链路改造混为同一事务。当前已固定到 Next.js 15 维护线的最新补丁，并且本站采用静态导出与未优化图片；该项不构成本次可靠性发布的阻断条件，但不得长期忽略。
