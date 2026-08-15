export interface BenchmarkEvidenceCard {
  conclusion: string;
  observedStrengths: string[];
  observedFailures: string[];
  fit: string;
  risk: string;
  zeroScoreRounds: number[];
  runnerFailedRounds: number[];
  missingScoreArtifactRounds: number[];
}

export const benchmarkEvidenceByModelId: Record<string, BenchmarkEvidenceCard> = {
  'openai-sol/gpt-5.6-sol': {
    conclusion: '本批总分第一、上限最高，但两轮低尾说明它仍不是“每轮都稳”的交付机。',
    observedStrengths: [
      'scorer 在 10/10 轮确认加载图数据身份完全一致；离线运行、最短路径与统计准确性均有 9/10 轮满分。',
      '有 6 轮超过 80 分，其中 r3、r5、r7 均超过 96 分，证明在成功收口时能覆盖数据、算法、交互与视觉的完整交付链。',
    ],
    observedFailures: [
      '节点详情与邻居检查有 5 轮为 0；类型筛选、空间可读性、缩放重置各有 2 轮为 0。',
      'r1 与 r9 分别只有 1.38 和 17.83；scorer 记录 2 次图谱空白、2 次关系未渲染，以及 1 次浏览器主线程无响应 cap。',
    ],
    fit: '适合需要冲击高完成度、可接受逐轮验收与失败重跑的复杂前端工程任务。',
    risk: '不能只看 69.95 的均分；低尾会把一次性、无人值守交付的风险显著放大。',
    zeroScoreRounds: [],
    runnerFailedRounds: [],
    missingScoreArtifactRounds: [],
  },
  'anthropic-fable/claude-fable-5': {
    conclusion: '头部得分能力强，但筛选、详情与画布落地的跨轮稳定性仍明显波动。',
    observedStrengths: [
      '加载数据身份与统计准确性各有 9/10 轮满分，搜索状态 8/10 轮满分，最短路径 8/10 轮满分。',
      'r3、r4、r7、r10 均超过 87 分，成功轮通常能把数据和主要交互一并交付。',
    ],
    observedFailures: [
      '类型筛选有 6 轮为 0，节点详情有 5 轮为 0；scorer 还记录 3 次图谱空白、3 次关系未渲染和 2 次视觉不稳定。',
      'r1、r2、r6 均低于 18 分，均值 62.39 明显高于这些低尾，部署前仍需逐项回归。',
    ],
    fit: '适合重视数据正确性和搜索/路径主流程，同时有自动化回归兜底的工程团队。',
    risk: '高分轮不能代表筛选与节点详情必然可用；这两个交互是本批最频繁的失分源。',
    zeroScoreRounds: [],
    runnerFailedRounds: [],
    missingScoreArtifactRounds: [],
  },
  'dashscope/qwen3.8-max': {
    conclusion: '正式版在本批表现最均衡：没有 0 分轮，核心数据与算法检查全轮通过，但视觉稳定性仍是主要短板。',
    observedStrengths: [
      '数据身份、离线运行、最短路径、统计准确性均为 10/10 轮满分，节点详情 9/10 轮满分。',
      '10 轮均在 36.36–85.41 之间，4 轮 task_success，低尾显著少于同档高波动模型。',
    ],
    observedFailures: [
      'visual_instability cap 出现 8 次，incomplete_node_render 出现 4 次；类型筛选和缩放平移各有 3 轮未通过 gate。',
      '均值 58.08、耗时 13.27 分钟，说明完整性较好，但视觉收敛与交付速度并不占优。',
    ],
    fit: '适合把数据、路径、统计和节点详情正确性放在首位，并愿意单独打磨布局动画的任务。',
    risk: '“核心检查全过”不等于最终视觉稳定；应保留截图回归和动画收敛检查。',
    zeroScoreRounds: [],
    runnerFailedRounds: [],
    missingScoreArtifactRounds: [],
  },
  'moonshotai/kimi-k3': {
    conclusion: '能做出接近满分的完整交付，但 7.20–95.89 的跨度暴露出很强的轮次波动。',
    observedStrengths: [
      '数据身份、离线运行、统计准确性均为 10/10 轮满分，最短路径 9/10 轮满分。',
      'r2、r4、r8 分别达到 89.90、95.89、85.38，成功轮的综合覆盖非常强。',
    ],
    observedFailures: [
      '节点详情、类型筛选各有 4 轮为 0，搜索、空间可读性、缩放重置各有 3 轮为 0。',
      'scorer 记录 3 次图谱空白、3 次关系未渲染与 4 次视觉不稳定；r6、r7、r10 均低于 18 分。',
    ],
    fit: '适合可多轮择优、重视核心数据与算法正确性的复杂原型或工程实现。',
    risk: '中位数 62.38 高于均值 54.55，但最低仅 7.20；一次性交付前必须验收完整交互。',
    zeroScoreRounds: [],
    runnerFailedRounds: [],
    missingScoreArtifactRounds: [],
  },
  'anthropic/claude-opus-5': {
    conclusion: '成功轮上限很高，但两轮无入口得 0 分，且本批资源消耗最高，形成明显的稳定性与成本双重风险。',
    observedStrengths: [
      '在 8 个有可评分入口的轮次中，数据身份、离线运行、最短路径和统计准确性全部满分。',
      'r5、r10 接近 98 分，r1、r8 也达到 69.71、78.58，说明成功产物具备高完成度。',
    ],
    observedFailures: [
      'r2、r4 因 no_html_entrypoint 得 0 分；节点详情检查在 6 轮为 0。',
      '10 任务共 478 次调用、约 3732 万 token、估算 ¥273.123，均为本批最高一档。',
    ],
    fit: '适合质量上限优先、允许人工把关与重跑、且预算充足的高价值任务。',
    risk: '不能用两轮接近满分掩盖无入口失败；高调用与 token 也会放大重跑成本。',
    zeroScoreRounds: [2, 4],
    runnerFailedRounds: [],
    missingScoreArtifactRounds: [],
  },
  'xai-openai/grok-4.6': {
    conclusion: 'Grok 4.6 进入 A 档前三，成功轮上限很高，但低分轮仍然明显，不能把均分当作无人工复核的稳定交付保证。',
    observedStrengths: [
      'r2、r3、r5、r7、r8 均超过 74 分，其中 r2、r3、r5 超过 98 分，成功收口时覆盖度很强。',
      '10 轮全部有 score 产物，平均耗时 5.38 分钟、87 次调用，资源消耗低于多数 A 档模型。',
    ],
    observedFailures: [
      'r1、r4、r6、r10 低于 20 分，均分 58.57 与中位数 63.70 之间仍有明显低尾风险。',
      '低分轮说明节点交互、画布和最终收口仍会跨轮失守；正式发布前应保留逐轮截图验收。',
    ],
    fit: '适合追求较高完成度、同时能接受自动化 scorer 与人工抽检的复杂前端工程任务。',
    risk: '高分上限不能替代稳定性验证；无人值守一次性交付仍需为低尾轮次准备重跑策略。',
    zeroScoreRounds: [],
    runnerFailedRounds: [],
    missingScoreArtifactRounds: [],
  },
  'zai-coding/glm-5.3': {
    conclusion: 'GLM-5.3 以 52.32 分进入 A 档，核心正确性有高分轮支撑，但 Coding Plan 接入下的交互稳定性仍然波动。',
    observedStrengths: [
      'r1、r2、r4、r7、r9、r10 均超过 52 分，最高 98.88，成功轮能完成较完整的图谱工程交付。',
      '10 轮均完成 runner，平均耗时 12.69 分钟；数据与算法正确性在高分轮中有明确产物证据。',
    ],
    observedFailures: [
      'r3 得 0 分，r6 为 29.58、r8 为 11.22；中位数 56.98 不能掩盖交互与画布低尾。',
      '类型筛选、节点详情和视觉收敛仍需逐轮回归；Coding Plan 没有可直接核验的按量 API 成本。',
    ],
    fit: '适合已有 GLM Coding Plan、能保留 scorer 验收并允许人工复核交互细节的工程任务。',
    risk: '本榜成本为 GLM-5.2 token 价格代理估算，不是 Coding Plan 的实付账单，性价比结论需按套餐周期复核。',
    zeroScoreRounds: [3],
    runnerFailedRounds: [],
    missingScoreArtifactRounds: [],
  },
  'deepseek/deepseek-v4-pro-0813': {
    conclusion: 'DeepSeek V4 Pro 正式版位于 B 档中段，10 轮全部完成且没有 0 分，但高低轮差距仍然较大。',
    observedStrengths: [
      'r4、r5、r6、r8 达到 51.29–84.09，说明成功收口时可以完成数据、交互和视觉链路。',
      '178 次调用、平均 7.93 分钟，按 DeepSeek 正式价审计约 ¥2.371，资源消耗处于低位。',
    ],
    observedFailures: [
      'r2、r3、r7、r10 低于 20 分；中位数 46.06 仅略高于均分，稳定性仍需关注。',
      '低分轮主要暴露最终交互收口和视觉细节的不确定性，不能只依据无 0 分判断稳定。',
    ],
    fit: '适合成本敏感、允许 scorer 验收和必要重跑的图谱工程试跑。',
    risk: '该正式版与旧榜同属 DeepSeek Pro 系列，发布时必须使用完整版本名，避免混淆两次快照。',
    zeroScoreRounds: [],
    runnerFailedRounds: [],
    missingScoreArtifactRounds: [],
  },
  'deepseek/deepseek-v4-pro': {
    conclusion: '成本低且没有 0 分轮，但类型筛选几乎系统性失守，适合“核心正确、交互补做”的用法。',
    observedStrengths: [
      '数据身份与离线运行 10/10 轮满分，统计和最短路径各 9/10 轮满分。',
      '最低 10.85、最高 89.07，10 轮均产生可评分结果；实付成本仅 ¥3.749。',
    ],
    observedFailures: [
      '类型筛选有 9 轮为 0，节点详情有 4 轮为 0；视觉不稳定 cap 出现 5 次。',
      '图谱空白与关系未渲染各出现 2 次，缩放与重置 gate 也分别多次失败。',
    ],
    fit: '适合预算敏感、数据与算法正确性优先、后续有人补齐交互的工程任务。',
    risk: '若验收标准包含可用筛选、节点详情和稳定画布，必须安排二次实现或严格回归。',
    zeroScoreRounds: [],
    runnerFailedRounds: [],
    missingScoreArtifactRounds: [],
  },
  'xai-openai/grok-4.5': {
    conclusion: '本批综合性价比第一：速度、调用与 token 都很省，但布局和画布失败让质量上限不稳定。',
    observedStrengths: [
      '数据身份、离线运行、最短路径和统计准确性全部 10/10 轮满分，视觉稳定检查 9/10 轮满分。',
      '平均仅 3.28 分钟、64 次调用、约 135 万 token；r6 达到 99.27，证明低消耗下也能产出完整高分轮。',
    ],
    observedFailures: [
      'layout_hairball_collapse 出现 6 次、layout_edge_stacking 4 次；另有 3 次图谱空白和 3 次关系未渲染。',
      '节点详情、类型筛选各有 4 轮为 0，空间可读性与缩放重置各有 3 轮为 0。',
    ],
    fit: '适合快速迭代、成本敏感、能接受对布局与交互进行专项验收的任务。',
    risk: '性价比指数是按本批排序计算，不代表任意价格或任意任务下都占优。',
    zeroScoreRounds: [],
    runnerFailedRounds: [],
    missingScoreArtifactRounds: [],
  },
  'deepseek/deepseek-v4-flash': {
    conclusion: 'API 成本最低且有多轮高分，但数据身份与视觉稳定性不像 Pro 版那样持续可靠。',
    observedStrengths: [
      '最短路径 9/10 轮满分，统计 8/10、搜索 8/10 轮满分；r2、r5、r9、r10 均超过 60 分。',
      '10 任务实付 ¥1.056，为本批最低成本，平均耗时 6.94 分钟。',
    ],
    observedFailures: [
      'visual_instability cap 出现 7 次，节点详情有 5 轮为 0；数据身份也有 2 轮完全失败。',
      '图谱空白和关系未渲染各 2 次，类型筛选与缩放平移多轮未通过。',
    ],
    fit: '适合低预算批量探索、允许挑选结果并做数据一致性复核的任务。',
    risk: '极低价格不能替代身份校验；出现 loaded_graph_identity_mismatch 时产物不应直接进入发布链。',
    zeroScoreRounds: [],
    runnerFailedRounds: [],
    missingScoreArtifactRounds: [],
  },
  'dashscope/qwen3.7-max': {
    conclusion: '能产生 90.88 的高分轮，但视觉不稳定与筛选失败频繁，且末轮无入口归零。',
    observedStrengths: [
      '在 9 个可评分轮次中，数据身份、离线运行、统计准确性全部满分；关系渲染 8 轮满分。',
      'r5、r6 达到 90.88、73.89，说明其能力上限仍可覆盖较完整的图谱实现。',
    ],
    observedFailures: [
      'r10 因 no_html_entrypoint 得 0 分；visual_instability cap 出现 8 次，类型筛选有 6 轮为 0。',
      '缩放、重置和视觉稳定 gate 各有 5 轮未通过，均值被高分轮明显抬高。',
    ],
    fit: '适合已有回归脚本、愿意多轮择优并重点修正视觉与筛选的任务。',
    risk: '中位数仅 26.62；不能把少数高分轮外推为稳定工程交付。',
    zeroScoreRounds: [10],
    runnerFailedRounds: [],
    missingScoreArtifactRounds: [],
  },
  'openai-sol/gpt-5.6-luna': {
    conclusion: '非零轮速度快、价格低，但连续 4 轮无 HTML 入口，稳定性不足以支持无人值守交付。',
    observedStrengths: [
      '6 个可评分轮次中有 5 轮超过 44 分，r10 达到 93.77；平均耗时 5.72 分钟、估算成本 ¥5.003。',
      '非零轮显示它能完成主要数据与交互链路，且资源消耗显著低于 Sol。',
    ],
    observedFailures: [
      'r5–r8 连续 4 轮触发 no_html_entrypoint 并得 0 分，10 轮 task_success 为 0。',
      '在可评分轮中，节点详情仍有 4 轮为 0，搜索状态也有 2 轮为 0。',
    ],
    fit: '适合低成本试跑、有人检查入口产物并允许重试的探索性任务。',
    risk: '性价比排名第二建立在低消耗之上，不会消除 40% 轮次无入口的交付风险。',
    zeroScoreRounds: [5, 6, 7, 8],
    runnerFailedRounds: [],
    missingScoreArtifactRounds: [],
  },
  'zhipuai/glm-5.2': {
    conclusion: '核心数据和算法很稳，但交互与画布频繁失守，使均值远高于中位数。',
    observedStrengths: [
      '数据身份、离线运行、最短路径、统计准确性均为 10/10 轮满分。',
      'r2、r5、r6 分别达到 91.08、82.25、63.98，证明核心正确性可以转化为高分成品。',
    ],
    observedFailures: [
      '类型筛选有 8 轮为 0、节点详情 6 轮为 0；图谱空白与关系未渲染各出现 4 次。',
      '中位数 17.50，空间可读性和缩放重置各有 4 轮为 0，典型低尾来自交互与画布。',
    ],
    fit: '适合数据处理和算法正确性优先、UI 交互可由后续工程阶段接手的任务。',
    risk: '不能用 36.44 均分概括典型体验；本批更具代表性的中位轮只有 17.50。',
    zeroScoreRounds: [],
    runnerFailedRounds: [],
    missingScoreArtifactRounds: [],
  },
  'stepfun/step-3.7-flash': {
    conclusion: '偶有高分，但数据身份、离线性和核心交互都出现重复失败，整体更适合受控试验。',
    observedStrengths: [
      'r9、r10 分别达到 53.32、89.46，视觉稳定检查有 7 轮满分。',
      '平均耗时 5.42 分钟、实付 ¥6.875，资源消耗处于中低位。',
    ],
    observedFailures: [
      'r3 得 0 分；类型筛选和缩放平移各有 8 轮未通过，节点详情 7 轮未通过。',
      '数据身份有 3 轮完全失败，并记录 2 次 external_network_dependency，违反离线交付要求。',
    ],
    fit: '适合快速原型和受控环境试验，不适合作为无需复核的离线成品生成器。',
    risk: '数据身份或离线性 gate 失败属于硬风险，即使视觉看起来完成也不能直接发布。',
    zeroScoreRounds: [3],
    runnerFailedRounds: [],
    missingScoreArtifactRounds: [],
  },
  'volcengine-ark/doubao-seed-evolving': {
    conclusion: '速度和调用量尚可，但两轮归零与视觉波动拉低了可预测性。',
    observedStrengths: [
      '冻结口径下均分 28.70、179 次调用、实付 ¥13.178；最高一轮达到 80.67。',
      '在 8 个有 score 产物的轮次中，离线运行全部满分；数据身份、最短路径和统计准确性各有 7 轮满分。',
    ],
    observedFailures: [
      'r8 缺少 score.json 按 0 分计，r10 无 HTML 入口得 0 分；visual_instability cap 出现 5 次。',
      '缩放平移 gate 有 5 轮未通过，节点详情和类型筛选各有 3 轮为 0。',
    ],
    fit: '适合对成本和速度有要求、且能保留 scorer 与入口完整性检查的迭代任务。',
    risk: '发布时必须保持 28.70、179 次调用与 ¥13.178 三项冻结数字一致，不得混用其他记录。',
    zeroScoreRounds: [8, 10],
    runnerFailedRounds: [],
    missingScoreArtifactRounds: [8],
  },
  'mimo/mimo-v2.5-pro': {
    conclusion: '资源消耗不高，但两轮缺少 score 产物，筛选、画布与视觉稳定性也反复失分。',
    observedStrengths: [
      '在 8 个有 score 产物的轮次里，数据身份有 7 轮满分；r5 达到 72.40。',
      '平均耗时 4.62 分钟、实付 ¥6.011，成本和速度都处于较低区间。',
    ],
    observedFailures: [
      'r6、r9 缺少 score.json，按失败槽位 0 分计；类型筛选有 7 轮为 0。',
      '图谱空白、关系未渲染各 3 次，视觉不稳定 cap 5 次，节点详情也有 4 轮为 0。',
    ],
    fit: '适合低成本原型与人工择优，不适合依赖完整评分产物的无人值守流水线。',
    risk: '缺失 score 产物本身就是可审计性缺口；不能把缺失轮当成普通低分轮淡化。',
    zeroScoreRounds: [6, 9],
    runnerFailedRounds: [],
    missingScoreArtifactRounds: [6, 9],
  },
  'longcat/LongCat-2.0': {
    conclusion: '部分轮次能完成路径和统计，但数据身份不一致与画布失败过于频繁；本发布包按人工规则列入 D 档。',
    observedStrengths: [
      '离线运行 7 轮满分，最短路径 7 轮满分；r7、r10 分别达到 52.07、49.14。',
      '实付 ¥3.255，API 成本较低。',
    ],
    observedFailures: [
      '数据身份有 5 轮完全失败，图谱空白与关系未渲染各出现 4 次；缩放平移 9 轮未通过。',
      'r6 得 0 分，中位数仅 10.25；incomplete_node_render 与 visual_instability 各出现 4–5 次。',
    ],
    fit: '仅适合低成本探索和人工检查充分的非关键任务。',
    risk: 'D 档是本发布包的人工调整，不是由平均分阈值自动推导；数据身份失败时不得复用产物。',
    zeroScoreRounds: [6],
    runnerFailedRounds: [],
    missingScoreArtifactRounds: [],
  },
  'qianfan/ernie-5.1': {
    conclusion: '本批运行与交付链路均未达到可用门槛，5 个 runner 失败槽位和 6 个 0 分轮是主要事实。',
    observedStrengths: [
      'r4、r6、r7、r8 产生了可评分结果，最高为 8.89；这些轮次至少留下了部分产物证据。',
      '107 次调用不高，但低调用并未转化为有效交付。',
    ],
    observedFailures: [
      'r1、r2、r3、r5、r10 runner state=failed 且缺少 score 产物；r9 也为 0 分，共 6 个 0 分轮。',
      '4 个可评分轮次的关系渲染、空间可读性、搜索、详情、筛选、缩放与统计均为 0；另有 3 次外部网络依赖。',
    ],
    fit: '不建议用于当前离线 Web4 图谱任务的正式交付。',
    risk: '这里反映的是本批接入与产物结果，不能据此断言模型在其他工具链或任务上也必然失败。',
    zeroScoreRounds: [1, 2, 3, 5, 9, 10],
    runnerFailedRounds: [1, 2, 3, 5, 10],
    missingScoreArtifactRounds: [1, 2, 3, 5, 10],
  },
};
