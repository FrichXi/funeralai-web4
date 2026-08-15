import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowLeft,
  BarChart3,
  Clock3,
  Database,
  FileCheck2,
  Images,
  Layers3,
  Scale,
  ShieldCheck,
  TriangleAlert,
  WalletCards,
} from 'lucide-react';
import { Footer } from '@/components/layout/Footer';
import { PageContainer } from '@/components/layout/PageContainer';
import { cn } from '@/lib/utils';
import currentBenchmark from '@/data/web4-benchmark-current.json';
import { benchmarkEvidenceByModelId } from '@/data/web4-benchmark-analysis';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: '模型分析与测试口径 - 葬AI Web4',
  description: '葬AI Web4 当前 19 模型、10 轮工程榜单的测试口径、逐模型证据分析、效率与局限。',
  robots: { index: false, follow: false },
};

interface BenchmarkRow {
  rank: number;
  tier: string;
  model_id: string;
  model: string;
  score_mean: number;
  score_median: number;
  avg_wall_minutes: number;
  api_calls_10_tasks: number;
  cost_cny_10_tasks: number;
  cost_estimated: boolean;
  total_tokens_10_tasks: number;
  scores: number[];
}

interface BenchmarkSelection {
  schemaVersion: string;
  releaseId: string;
  title: string;
  scope: string;
  scoreFormula: string;
  valueFormula: string;
  pricingAsOf: string;
  fxCnyPerUsd: number;
  rows: BenchmarkRow[];
}

const selection = currentBenchmark as BenchmarkSelection;

const CHECKERS = [
  ['加载数据身份', 12, '节点、边与端点是否与冻结输入完全一致'],
  ['关系渲染', 14, '关系线是否真实、完整且可见'],
  ['空间可读性', 11, '冷启动布局、画布占用和节点分布'],
  ['搜索状态转换', 9, '搜索、定位与清除是否真正改变状态'],
  ['节点详情与邻居', 11, '点击节点后的字段与邻接关系是否有证据'],
  ['类型筛选', 7, '筛选、状态变化与恢复'],
  ['缩放、平移与重置', 7, '视口操作和重置后的完整恢复'],
  ['离线运行', 5, '外部请求、运行错误与资源失败'],
  ['最短路径正确性', 10, '固定用例是否返回真实路径'],
  ['统计准确性', 6, '顶部、类型与关系统计是否正确'],
  ['视觉稳定性', 8, '布局是否收敛、最终画面是否稳定'],
] as const;

type ValueMetric = 'cost_cny_10_tasks' | 'avg_wall_minutes' | 'api_calls_10_tasks' | 'total_tokens_10_tasks';

function ascendingRanks(rows: BenchmarkRow[], metric: ValueMetric) {
  const ordered = rows
    .map((row) => ({ id: row.model_id, value: row[metric] }))
    .sort((left, right) => left.value - right.value || left.id.localeCompare(right.id));
  const ranks = new Map<string, number>();
  let index = 0;
  while (index < ordered.length) {
    let end = index + 1;
    while (end < ordered.length && ordered[end].value === ordered[index].value) end += 1;
    const averageRank = ((index + 1) + end) / 2;
    for (const item of ordered.slice(index, end)) ranks.set(item.id, averageRank);
    index = end;
  }
  return ranks;
}

function buildValueRows(rows: BenchmarkRow[]) {
  const costRanks = ascendingRanks(rows, 'cost_cny_10_tasks');
  const timeRanks = ascendingRanks(rows, 'avg_wall_minutes');
  const callRanks = ascendingRanks(rows, 'api_calls_10_tasks');
  const tokenRanks = ascendingRanks(rows, 'total_tokens_10_tasks');
  return rows
    .map((row) => {
      const consumptionRank =
        Number(costRanks.get(row.model_id)) * 0.4 +
        Number(timeRanks.get(row.model_id)) * 0.25 +
        Number(callRanks.get(row.model_id)) * 0.2 +
        Number(tokenRanks.get(row.model_id)) * 0.15;
      return { ...row, valueIndex: row.score_mean / consumptionRank };
    })
    .sort((left, right) => right.valueIndex - left.valueIndex || left.model.localeCompare(right.model));
}

function tierClass(tier: string) {
  if (tier === 'S') return 'border-[#eab308] bg-[#fef3c7] text-[#713f12]';
  if (tier === 'A') return 'border-[#7351cf] bg-[#ede9fe] text-[#3b247a]';
  if (tier === 'B') return 'border-[#10b981] bg-[#d1fae5] text-[#065f46]';
  if (tier === 'C') return 'border-[#38bdf8] bg-[#e0f2fe] text-[#075985]';
  if (tier === 'D') return 'border-[#f59e0b] bg-[#ffedd5] text-[#92400e]';
  return 'border-[#ef4444] bg-[#fee2e2] text-[#991b1b]';
}

function formatTokens(value: number) {
  return `${(value / 1_000_000).toFixed(2)}M`;
}

function SectionHeading({ icon: Icon, eyebrow, title }: { icon: typeof BarChart3; eyebrow: string; title: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center border border-[#2f2938] bg-[#fffaf0]">
        <Icon className="h-4 w-4 text-[#5b3ea7]" aria-hidden="true" />
      </span>
      <div>
        <p className="retro text-[10px] text-[#6d6078]">{eyebrow}</p>
        <h2 className="retro mt-1 text-[20px] leading-8 text-[#5b3ea7]">{title}</h2>
      </div>
    </div>
  );
}

function StatCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="border-y-4 border-[#2f2938] py-4">
      <p className="retro text-[10px] text-[#5b3ea7]">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-[#17131d]">{value}</p>
      <p className="mt-2 text-xs leading-5 text-[#6d6078]">{detail}</p>
    </div>
  );
}

function ModelCard({ row, valueIndex }: { row: BenchmarkRow; valueIndex: number }) {
  const evidence = benchmarkEvidenceByModelId[row.model_id];
  const minimum = Math.min(...row.scores);
  const maximum = Math.max(...row.scores);
  const lowTail = row.scores.filter((score) => score < 10).length;
  if (!evidence) throw new Error(`Missing evidence card for ${row.model_id}`);

  return (
    <article id={row.model_id.replace(/[^a-z0-9]+/gi, '-').toLowerCase()} className="border-2 border-[#2f2938] bg-[#fffaf0] p-4 shadow-[5px_5px_0_#d8cde9] sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn('inline-flex min-w-8 justify-center border px-2 py-1 text-xs font-bold', tierClass(row.tier))}>{row.tier}</span>
            <h3 className="text-xl font-semibold text-[#17131d]">{row.rank}. {row.model}</h3>
          </div>
          <p className="mt-3 text-sm font-medium leading-6 text-[#332b3d]">{evidence.conclusion}</p>
        </div>
        <div className="grid shrink-0 grid-cols-2 gap-x-4 gap-y-1 text-xs tabular-nums text-[#5b4d66] sm:text-right">
          <span>均值 <b className="text-[#17131d]">{row.score_mean.toFixed(2)}</b></span>
          <span>中位 <b className="text-[#17131d]">{row.score_median.toFixed(2)}</b></span>
          <span>区间 <b className="text-[#17131d]">{minimum.toFixed(2)}–{maximum.toFixed(2)}</b></span>
          <span>性价比 <b className="text-[#17131d]">{valueIndex.toFixed(2)}</b></span>
        </div>
      </div>

      <div className="mt-4 grid gap-4 border-t border-[#d7cfbf] pt-4 lg:grid-cols-[1.1fr_1fr]">
        <div className="space-y-4">
          <div>
            <p className="retro text-[10px] text-[#5b3ea7]">10 轮分布与稳定性</p>
            <p className="mt-2 text-xs leading-6 text-[#5b4d66]">
              {row.scores.map((score) => score.toFixed(2)).join(' / ')}。低于 10 分 {lowTail} 轮，0 分槽位
              {evidence.zeroScoreRounds.length ? ` r${evidence.zeroScoreRounds.join('、r')}` : ' 无'}；runner 失败
              {evidence.runnerFailedRounds.length ? ` r${evidence.runnerFailedRounds.join('、r')}` : ' 无'}。
            </p>
          </div>
          <div>
            <p className="retro text-[10px] text-[#5b3ea7]">交付效率</p>
            <p className="mt-2 text-xs leading-6 text-[#5b4d66]">
              平均墙钟 {row.avg_wall_minutes.toFixed(2)} 分钟/任务；10 任务 {row.api_calls_10_tasks} 次调用；
              {formatTokens(row.total_tokens_10_tasks)} token；{row.cost_estimated ? '按官方价格与本批 token 反算，估算' : '按调用日志与官方单价核算，实付口径'} ¥{row.cost_cny_10_tasks.toFixed(3)}。
            </p>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <p className="retro text-[10px] text-[#5b3ea7]">scorer / 产物观察</p>
            <ul className="mt-2 space-y-2 text-xs leading-6 text-[#5b4d66]">
              {evidence.observedStrengths.map((item) => <li key={item}>＋ {item}</li>)}
              {evidence.observedFailures.map((item) => <li key={item}>－ {item}</li>)}
            </ul>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="border border-[#d7cfbf] bg-white/60 p-3"><p className="retro text-[9px] text-[#5b3ea7]">适用推断</p><p className="mt-2 text-xs leading-5 text-[#5b4d66]">{evidence.fit}</p></div>
            <div className="border border-[#d7cfbf] bg-white/60 p-3"><p className="retro text-[9px] text-[#9a3412]">风险提示</p><p className="mt-2 text-xs leading-5 text-[#5b4d66]">{evidence.risk}</p></div>
          </div>
        </div>
      </div>

      <details className="mt-4 border-t border-dashed border-[#b7aa98] pt-3 text-xs text-[#6d6078]">
        <summary className="cursor-pointer font-medium text-[#5b3ea7]">失败槽位与证据边界</summary>
        {evidence.missingScoreArtifactRounds.length ? <p className="mt-1 leading-6 text-[#9a3412]">缺少 score.json：r{evidence.missingScoreArtifactRounds.join('、r')}，按发布口径记 0 分。</p> : null}
        <p className="mt-1 leading-6">以上“通过/失败”来自 scorer、slot 状态或具体产物；“适用”属于基于本批表现的有限推断。单次轨迹、自述或界面现象不被升级为模型底层架构事实。</p>
      </details>
    </article>
  );
}

export default function MethodologyPage() {
  const valueRows = buildValueRows(selection.rows);
  const valueByModel = new Map(valueRows.map((row) => [row.model_id, row.valueIndex]));
  const top = selection.rows[0];
  const zeros = selection.rows.reduce((sum, row) => sum + row.scores.filter((score) => score === 0).length, 0);
  const tierCounts = Object.entries(selection.rows.reduce<Record<string, number>>((accumulator, row) => {
    accumulator[row.tier] = (accumulator[row.tier] ?? 0) + 1;
    return accumulator;
  }, {}));

  return <>
    <PageContainer className="space-y-12">
      <header className="space-y-5 border-b-4 border-[#2f2938] pb-7">
        <Link href="/test/" className="inline-flex items-center gap-2 text-xs text-[#5b3ea7] hover:underline"><ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />返回模型榜单</Link>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-4xl">
            <p className="retro text-[10px] text-[#6d6078]">CURRENT EVIDENCE SNAPSHOT</p>
            <h1 className="retro mt-2 text-[25px] leading-10 text-[#5b3ea7]">Web4 模型分析与测试口径</h1>
            <p className="mt-4 text-sm leading-7 text-[#5b4d66]">本页只使用同一冻结发布包的 19 个模型、每模型 10 轮成绩。总榜、性价比榜、Round 矩阵与逐模型分析均绑定同一个 releaseId，不混入线上旧阵容或其他批次。</p>
          </div>
          <div className="border border-[#2f2938] bg-[#fffaf0] p-3 text-[11px] leading-5 text-[#5b4d66] lg:max-w-md">
            <p><b>releaseId</b> <span className="break-all">{selection.releaseId}</span></p>
            <p><b>价格日期</b> {selection.pricingAsOf} · USD/CNY {selection.fxCnyPerUsd}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/test/multimodal-model-analysis/" className="inline-flex items-center gap-2 border border-[#2f2938] bg-[#fffaf0] px-3 py-2 text-xs text-[#5b3ea7] hover:bg-[#ede9fe]"><Images className="h-3.5 w-3.5" aria-hidden="true" />查看多模态两题分析</Link>
          <a href="#models" className="inline-flex items-center gap-2 border border-[#2f2938] px-3 py-2 text-xs text-[#5b3ea7] hover:bg-[#ede9fe]"><Layers3 className="h-3.5 w-3.5" aria-hidden="true" />跳到 19 模型卡片</a>
        </div>
      </header>

      <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="冻结阵容" value="19 × 10" detail="19 个 model_id、190 个成绩；不含 Hunyuan 与 MiniMax。" />
        <StatCard label="总榜第一" value={top.model} detail={`均分 ${top.score_mean.toFixed(2)}，中位数 ${top.score_median.toFixed(2)}。`} />
        <StatCard label="零分槽位" value={String(zeros)} detail="0 分包括无入口、runner/score 产物失败与可评分但未得分，逐卡区分。" />
          <StatCard label="性价比第一" value={valueRows[0].model} detail={`指数 ${valueRows[0].valueIndex.toFixed(2)}；只代表当前 19 模型的相对排序。`} />
      </section>

      <section className="space-y-5">
        <SectionHeading icon={Database} eyebrow="SINGLE SOURCE OF TRUTH" title="发布包与数据锁" />
        <div className="grid gap-4 text-sm leading-7 text-[#5b4d66] lg:grid-cols-3">
          <div className="border border-[#d7cfbf] bg-[#fffaf0] p-4"><b className="text-[#17131d]">唯一数值基准</b><p className="mt-2">`site/src/data/web4-benchmark-current.json`。排名、分数、效率、成本、总榜图片与性价比图片均从这个 19 模型快照生成。</p></div>
          <div className="border border-[#d7cfbf] bg-[#fffaf0] p-4"><b className="text-[#17131d]">冻结数字</b><p className="mt-2">豆包锁定为均分 28.70、179 次调用、¥13.178；总榜、性价比与模型卡共用同一行数据。</p></div>
          <div className="border border-[#d7cfbf] bg-[#fffaf0] p-4"><b className="text-[#17131d]">排除与人工档位</b><p className="mt-2">Hunyuan、MiniMax 因异常刷分风险不进入本发布包；LongCat 按发布规则由 E 调整为 D，页面不伪装成自动阈值结果。</p></div>
        </div>
      </section>

      <section className="space-y-5">
        <SectionHeading icon={Scale} eyebrow="SCORING CONTRACT" title="100 分工程评分口径" />
        <p className="max-w-4xl text-sm leading-7 text-[#5b4d66]">{selection.scope} {selection.scoreFormula}</p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {CHECKERS.map(([label, points, detail]) => <div key={label} className="flex items-start justify-between gap-3 border border-[#d7cfbf] bg-[#fffaf0] p-3"><div><p className="text-sm font-semibold text-[#17131d]">{label}</p><p className="mt-1 text-xs leading-5 text-[#6d6078]">{detail}</p></div><span className="retro shrink-0 text-[10px] text-[#5b3ea7]">{points}pt</span></div>)}
        </div>
      </section>

      <section className="space-y-5">
        <SectionHeading icon={BarChart3} eyebrow="CURRENT SNAPSHOT" title="总览、档位与跨批边界" />
        <div className="overflow-x-auto border-2 border-[#2f2938] bg-[#fffaf0]">
          <table className="w-full min-w-[880px] border-collapse text-xs">
            <thead className="border-b-2 border-[#2f2938] bg-[#f5f1e8] text-[#43384f]"><tr><th className="px-3 py-2 text-center">档位</th><th className="px-3 py-2 text-left">模型</th><th className="px-3 py-2 text-right">均分</th><th className="px-3 py-2 text-right">中位数</th><th className="px-3 py-2 text-right">范围</th><th className="px-3 py-2 text-right">0 分轮</th></tr></thead>
            <tbody>{selection.rows.map((row) => <tr key={row.model_id} className="border-b border-[#d7cfbf] last:border-0"><td className="px-3 py-2 text-center"><span className={cn('inline-flex min-w-7 justify-center border px-2 py-0.5 font-bold', tierClass(row.tier))}>{row.tier}</span></td><td className="px-3 py-2 font-medium text-[#17131d]">{row.model}</td><td className="px-3 py-2 text-right tabular-nums">{row.score_mean.toFixed(2)}</td><td className="px-3 py-2 text-right tabular-nums">{row.score_median.toFixed(2)}</td><td className="px-3 py-2 text-right tabular-nums">{Math.min(...row.scores).toFixed(2)}–{Math.max(...row.scores).toFixed(2)}</td><td className="px-3 py-2 text-right tabular-nums">{row.scores.filter((score) => score === 0).length}</td></tr>)}</tbody>
          </table>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="border border-[#d7cfbf] bg-[#fffaf0] p-4 text-sm leading-7 text-[#5b4d66]"><b className="text-[#17131d]">档位解读</b><p className="mt-2">当前分布为 {tierCounts.map(([tier, count]) => `${tier} ${count} 个`).join('、')}。档位帮助阅读本快照，不代表通用能力等级；LongCat 的 D 档是已披露的人工调整。</p></div>
          <div className="border border-[#d7cfbf] bg-[#fffaf0] p-4 text-sm leading-7 text-[#5b4d66]"><b className="text-[#17131d]">跨批结论</b><p className="mt-2">本版不展示旧 Opus 4.8、Qwen Preview、Hy3、MiniMax，也不把其他阵容的历史分数拼成趋势。跨批只可作为背景，当前排名结论只由本 releaseId 支持。</p></div>
        </div>
      </section>

      <section className="space-y-5">
        <SectionHeading icon={WalletCards} eyebrow="VALUE INDEX" title="性价比结论与成本口径" />
        <p className="max-w-5xl text-sm leading-7 text-[#5b4d66]">{selection.valueFormula} 成本权重 40%、时间 25%、调用 20%、token 15%；先在当前 19 模型内做升序名次，再用均分除以加权消耗名次。它是相对指数，不是“每元得分”。</p>
        <div className="grid gap-3 md:grid-cols-3">
          {valueRows.slice(0, 3).map((row, index) => <div key={row.model_id} className="border-2 border-[#2f2938] bg-[#fffaf0] p-4 shadow-[4px_4px_0_#d8cde9]"><p className="retro text-[10px] text-[#5b3ea7]">VALUE #{index + 1}</p><p className="mt-2 text-lg font-semibold text-[#17131d]">{row.model}</p><p className="mt-3 text-3xl font-semibold tabular-nums text-[#5b3ea7]">{row.valueIndex.toFixed(2)}</p><p className="mt-2 text-xs leading-5 text-[#6d6078]">均分 {row.score_mean.toFixed(2)} · {row.avg_wall_minutes.toFixed(2)} 分钟 · {row.api_calls_10_tasks} 调用 · {formatTokens(row.total_tokens_10_tasks)} token · {row.cost_estimated ? '估算' : '实付'} ¥{row.cost_cny_10_tasks.toFixed(3)}</p></div>)}
        </div>
        <div className="border-l-4 border-[#f59e0b] bg-[#fff7ed] p-4 text-xs leading-6 text-[#7c2d12]">Sol、Fable、Opus、Grok、Luna 的成本为官方定价下按本批 token 结构反算；其余为日志与官方单价核算口径。指数会随参评阵容、价格和权重变化，不能脱离版本号引用。</div>
      </section>

      <section id="models" className="space-y-6 scroll-mt-6">
        <SectionHeading icon={FileCheck2} eyebrow="19 MODEL EVIDENCE CARDS" title="逐模型详细分析" />
        <p className="max-w-5xl text-sm leading-7 text-[#5b4d66]">每张卡把可观察事实与适用推断分开：分数、slot、checker、gate、cap 与产物是证据；“适合什么”是只针对这 10 轮任务的有限判断。</p>
        <div className="space-y-6">{selection.rows.map((row) => <ModelCard key={row.model_id} row={row} valueIndex={Number(valueByModel.get(row.model_id))} />)}</div>
      </section>

      <section className="space-y-5">
        <SectionHeading icon={ShieldCheck} eyebrow="LIMITATIONS" title="证据等级与局限" />
        <div className="grid gap-4 text-sm leading-7 text-[#5b4d66] lg:grid-cols-2">
          <div className="border border-[#d7cfbf] bg-[#fffaf0] p-4"><b className="text-[#17131d]">证据等级</b><ul className="mt-2 space-y-2"><li>1. 产物与 scorer：最高，直接描述页面、数据、交互与评分结果。</li><li>2. 运行日志与 slot：描述过程、耗时、调用、token、失败状态。</li><li>3. 模型自述：仅能说明它声称做过什么，不能替代产物验证。</li><li>4. 推断：必须标为推断，不能升级成底层架构事实。</li></ul></div>
          <div className="border border-[#d7cfbf] bg-[#fffaf0] p-4"><b className="text-[#17131d]">样本边界</b><ul className="mt-2 space-y-2"><li>同一 Web4 图谱工程任务、每模型 10 轮，不能覆盖所有编程任务。</li><li>runner、模型接入、工具链和 scorer 版本都会影响结果。</li><li>均值与中位数不能替代逐轮失败审计，尤其是无入口和缺 score 产物。</li><li>价格、汇率与厂商计费政策变化后应重新核算。</li></ul></div>
        </div>
        <div className="flex items-start gap-3 border-2 border-[#2f2938] bg-[#fef3c7] p-4 text-sm leading-7 text-[#713f12]"><TriangleAlert className="mt-1 h-4 w-4 shrink-0" aria-hidden="true" /><p>本页明确不从一次轨迹、模型意图或自述推断模型是否采用特定内部模块；多模态页中的 Qwen“硬眉毛”案例也遵守同一边界。</p></div>
      </section>

      <section className="grid gap-4 border-t-4 border-[#2f2938] pt-6 sm:grid-cols-2">
        <Link href="/test/" className="group border-2 border-[#2f2938] bg-[#fffaf0] p-4 hover:bg-[#ede9fe]"><div className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-[#5b3ea7]" aria-hidden="true" /><b className="text-[#17131d]">返回总榜与 Round 矩阵</b></div><p className="mt-2 text-xs leading-5 text-[#6d6078]">查看相同 releaseId 的总榜、性价比榜与 190 个成绩。</p></Link>
        <Link href="/test/multimodal-model-analysis/" className="group border-2 border-[#2f2938] bg-[#fffaf0] p-4 hover:bg-[#ede9fe]"><div className="flex items-center gap-2"><Images className="h-4 w-4 text-[#5b3ea7]" aria-hidden="true" /><b className="text-[#17131d]">多模态两题运行倾向</b></div><p className="mt-2 text-xs leading-5 text-[#6d6078]">查看 3D 六模型与 MG 四模型的单轮证据分析。</p></Link>
      </section>
    </PageContainer>
    <Footer />
  </>;
}
