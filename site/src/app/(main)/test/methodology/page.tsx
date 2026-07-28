import type { Metadata } from 'next';
import fs from 'node:fs';
import path from 'node:path';
import {
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  Clock,
  Database,
  FileCheck2,
  Layers3,
  Repeat2,
  Scale,
  ShieldCheck,
  TriangleAlert,
  WalletCards,
} from 'lucide-react';
import { Footer } from '@/components/layout/Footer';
import { PageContainer } from '@/components/layout/PageContainer';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: '模型分析 - 葬AI Web4',
  description: '葬AI Graph V2 第一轮正式榜单的方法、质量分布、跨批模型画像、工程消耗、替换审计与局限说明。',
  robots: { index: false, follow: false },
};

interface EngineeringRow {
  tier: string;
  model_id: string;
  model: string;
  score_mean: number;
  score_median: number;
  avg_wall_minutes: number;
  api_calls_10_tasks: number;
  cost_cny_10_tasks: number | null;
  cost_basis: string;
}

interface ValueRow {
  rank: number;
  model_id: string;
  model: string;
  value_index: number;
  score_mean: number;
  cost_cny_10_tasks: number;
  avg_wall_minutes: number;
  api_calls_10_tasks: number;
  cost_basis: string;
}

interface TestEntry {
  round: string;
  model: string;
  modelId: string;
  score: number;
  state: string;
}

interface ValueFormula {
  consumption_rank: string;
  value_index: string;
  unpriced_models_excluded: string[];
}

interface TestManifest {
  schemaVersion: string;
  releaseId: string;
  generatedAt: string;
  sourceGeneratedAt: string;
  snapshotDate: string;
  dataVersion: string;
  scoreStandard: string;
  expectedEntries: number;
  pricingAsOf: string;
  fxCnyPerUsd: number;
  scope: string;
  runnerPolicy: string;
  scoreFormula: string;
  valueFormula: ValueFormula;
  limitations: string[];
  engineeringLeaderboard: EngineeringRow[];
  valueLeaderboard: ValueRow[];
  entries: TestEntry[];
}

interface ReleaseSummary {
  entries: number;
  sourceFiles: number;
  sourceBytes: number;
  archiveBytes: number;
}

interface ModelAnalysis extends EngineeringRow {
  minimum: number;
  maximum: number;
  highCount: number;
  lowCount: number;
  failedCount: number;
}

const TEST_PUBLIC_DIR = path.join(process.cwd(), 'public', 'test');

const CHECKERS = [
  { label: '加载数据身份', area: '数据', points: 12, detail: '节点、边与端点是否与冻结输入一致' },
  { label: '关系渲染', area: '图谱', points: 14, detail: '关系线是否真实、完整且可见' },
  { label: '空间可读性', area: '视觉', points: 11, detail: '冷启动布局、画布占用与节点分布' },
  { label: '搜索状态转换', area: '交互', points: 9, detail: '搜索、定位与清除是否改变状态' },
  { label: '节点详情与邻居', area: '交互', points: 11, detail: '点击节点后的字段与邻接关系' },
  { label: '类型筛选', area: '交互', points: 7, detail: '筛选控件、状态变化与恢复' },
  { label: '缩放、平移与重置', area: '交互', points: 7, detail: '视口操作及重置后的完整恢复' },
  { label: '离线运行', area: '稳定性', points: 5, detail: '外部请求、运行错误与资源失败' },
  { label: '最短路径正确性', area: '算法', points: 10, detail: '固定路径用例的真实计算结果' },
  { label: '统计准确性', area: '数据', points: 6, detail: '顶部、类型与关系统计是否正确' },
  { label: '视觉稳定性', area: '视觉', points: 8, detail: '收敛时间、抖动峰值与最终稳定' },
] as const;

const CROSS_RUN_TRAJECTORIES = [
  { model: 'GPT-5.6 Sol', scores: '69.95 → 64.36 → 61.00', reading: '三批都在 S 档' },
  { model: 'Claude Fable 5', scores: '62.39 → 57.86 → 51.60', reading: '三批都在 50 分以上' },
  { model: 'Kimi K3', scores: '41.94 → 50.71 → 54.55', reading: '从 B 档爬到头部' },
  { model: 'Qwen 3.8', scores: '48.70 → 53.23 → 69.33', reading: '最新批次才登顶' },
] as const;

const FOUR_MODEL_CHECKERS = [
  { label: '算法 / 数据层', kimi: '90–100%', qwen: '98–100%', fable: '80–100%', sol: '100%' },
  { label: '搜索状态', kimi: '69%', qwen: '90%', fable: '90%', sol: '78%' },
  { label: '节点详情', kimi: '56%', qwen: '80%', fable: '50%', sol: '33%' },
  { label: '类型筛选', kimi: '60%', qwen: '70%', fable: '40%', sol: '67%' },
  { label: '空间可读性', kimi: '63%', qwen: '80%', fable: '52%', sol: '73%' },
] as const;

function readJson<T>(fileName: string): T {
  return JSON.parse(fs.readFileSync(path.join(TEST_PUBLIC_DIR, fileName), 'utf8')) as T;
}

function formatNumber(value: number, digits = 2) {
  return value.toLocaleString('zh-CN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function formatBytes(value: number) {
  if (value >= 1024 * 1024) return `${formatNumber(value / 1024 / 1024, 1)} MB`;
  return `${formatNumber(value / 1024, 0)} KB`;
}

function formatCost(value: number | null, basis: string) {
  if (value === null) return '订阅制，无法折现';
  const prefix = basis === 'official_counterfactual_proxy' ? '估算 ' : '';
  return `${prefix}¥${value.toFixed(3)}`;
}

function formatCostBasis(basis: string) {
  if (basis === 'official_counterfactual_proxy') return '第一方标准价估算';
  if (basis === 'subscription_unpriced') return '订阅制，未定价';
  return '官方直连价';
}

function formatGeneratedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Shanghai',
  }).format(date);
}

function tierClass(tier: string) {
  if (tier === 'S') return 'border-[#eab308] bg-[#fef3c7] text-[#713f12]';
  if (tier === 'A') return 'border-[#7351cf] bg-[#ede9fe] text-[#3b247a]';
  if (tier === 'B') return 'border-[#10b981] bg-[#d1fae5] text-[#065f46]';
  if (tier === 'C') return 'border-[#38bdf8] bg-[#e0f2fe] text-[#075985]';
  if (tier === 'D') return 'border-[#f59e0b] bg-[#ffedd5] text-[#92400e]';
  return 'border-[#ef4444] bg-[#fee2e2] text-[#991b1b]';
}

function buildAnalyses(manifest: TestManifest) {
  return manifest.engineeringLeaderboard.map((row): ModelAnalysis => {
    const entries = manifest.entries.filter((entry) => entry.modelId === row.model_id);
    const scores = entries.map((entry) => entry.score).filter(Number.isFinite);
    return {
      ...row,
      minimum: Math.min(...scores),
      maximum: Math.max(...scores),
      highCount: scores.filter((score) => score >= 70).length,
      lowCount: scores.filter((score) => score < 10).length,
      failedCount: entries.filter((entry) => entry.state !== 'done').length,
    };
  });
}

function StatCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="border-y-4 border-[#2f2938] py-4">
      <p className="retro text-[11px] text-[#5b3ea7]">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-[#17131d]">{value}</p>
      <p className="mt-2 text-xs leading-5 text-[#6d6078]">{detail}</p>
    </div>
  );
}

function SectionHeading({ icon: Icon, title, eyebrow }: { icon: typeof BarChart3; title: string; eyebrow: string }) {
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

function AnalysisTable({ rows }: { rows: ModelAnalysis[] }) {
  return (
    <div className="overflow-x-auto border-2 border-[#2f2938] bg-[#fffaf0] shadow-[8px_8px_0_#2f2938]">
      <table className="w-full min-w-[1180px] border-collapse text-[13px] text-[#17131d]">
        <thead className="border-b-2 border-[#17131d] bg-[#ebe4d6] text-[#43384f]">
          <tr>
            <th className="px-3 py-2 text-center">档位</th>
            <th className="px-3 py-2 text-left">模型</th>
            <th className="px-3 py-2 text-right">平均分</th>
            <th className="px-3 py-2 text-right">中位数</th>
            <th className="px-3 py-2 text-right">10 轮范围</th>
            <th className="px-3 py-2 text-right">≥70</th>
            <th className="px-3 py-2 text-right">&lt;10</th>
            <th className="px-3 py-2 text-right">失败槽位</th>
            <th className="px-3 py-2 text-right">平均耗时</th>
            <th className="px-3 py-2 text-right">调用数</th>
            <th className="px-3 py-2 text-right">10 任务成本</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.model_id} className="border-b border-[#d7cfbf] last:border-b-0">
              <td className="px-3 py-2 text-center">
                <span className={`inline-flex min-w-8 justify-center border px-2 py-1 font-semibold ${tierClass(row.tier)}`}>{row.tier}</span>
              </td>
              <td className="px-3 py-2 font-semibold">{row.model}</td>
              <td className="px-3 py-2 text-right text-base font-semibold tabular-nums">{formatNumber(row.score_mean)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{formatNumber(row.score_median)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{formatNumber(row.minimum)}–{formatNumber(row.maximum)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{row.highCount}/10</td>
              <td className="px-3 py-2 text-right tabular-nums">{row.lowCount}/10</td>
              <td className="px-3 py-2 text-right tabular-nums">{row.failedCount}/10</td>
              <td className="px-3 py-2 text-right tabular-nums">{formatNumber(row.avg_wall_minutes)} 分</td>
              <td className="px-3 py-2 text-right tabular-nums">{row.api_calls_10_tasks}</td>
              <td className="px-3 py-2 text-right">
                <strong>{formatCost(row.cost_cny_10_tasks, row.cost_basis)}</strong>
                <div className="text-[10px] text-[#6d6078]">{formatCostBasis(row.cost_basis)}</div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ValueTable({ rows }: { rows: ValueRow[] }) {
  return (
    <div className="overflow-x-auto border-2 border-[#2f2938] bg-[#fffaf0] shadow-[8px_8px_0_#2f2938]">
      <table className="w-full min-w-[900px] border-collapse text-[13px] text-[#17131d]">
        <thead className="border-b-2 border-[#17131d] bg-[#ebe4d6] text-[#43384f]">
          <tr>
            <th className="px-3 py-2 text-right">排名</th>
            <th className="px-3 py-2 text-left">模型</th>
            <th className="px-3 py-2 text-right">性价比指数</th>
            <th className="px-3 py-2 text-right">平均分</th>
            <th className="px-3 py-2 text-right">平均耗时</th>
            <th className="px-3 py-2 text-right">调用数</th>
            <th className="px-3 py-2 text-right">10 任务成本</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.model_id} className="border-b border-[#d7cfbf] last:border-b-0">
              <td className="px-3 py-2 text-right font-semibold tabular-nums">{row.rank}</td>
              <td className="px-3 py-2 font-semibold">{row.model}</td>
              <td className="px-3 py-2 text-right text-base font-semibold tabular-nums">{formatNumber(row.value_index)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{formatNumber(row.score_mean)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{formatNumber(row.avg_wall_minutes)} 分</td>
              <td className="px-3 py-2 text-right tabular-nums">{row.api_calls_10_tasks}</td>
              <td className="px-3 py-2 text-right font-semibold">{formatCost(row.cost_cny_10_tasks, row.cost_basis)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ModelAnalysisPage() {
  const manifest = readJson<TestManifest>('manifest.json');
  const release = readJson<ReleaseSummary>('release-summary.json');
  const analyses = buildAnalyses(manifest);
  const completed = manifest.entries.filter((entry) => entry.state === 'done').length;
  const failed = manifest.entries.length - completed;
  const sTier = analyses.filter((row) => row.tier === 'S');
  const fastest = analyses.reduce((best, row) => row.avg_wall_minutes < best.avg_wall_minutes ? row : best);
  const fewestCalls = analyses.reduce((best, row) => row.api_calls_10_tasks < best.api_calls_10_tasks ? row : best);
  const sol = analyses.find((row) => row.model === 'GPT-5.6 Sol');
  const fable = analyses.find((row) => row.model === 'Claude Fable 5');
  const qwen38 = analyses.find((row) => row.model === 'Qwen 3.8 Max Preview');
  const kimi = analyses.find((row) => row.model === 'Kimi K3');
  const opus = analyses.find((row) => row.model === 'Claude Opus 4.8');
  const glm = analyses.find((row) => row.model === 'GLM 5.2');
  const ernie = analyses.find((row) => row.model === 'ERNIE 5.1');
  const valueLeader = manifest.valueLeaderboard[0];

  return (
    <>
      <main className="min-h-screen bg-[#f5f1e8] text-[#17131d]">
        <PageContainer className="space-y-14 py-8 md:py-12">
          <section className="space-y-7">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-4xl space-y-4">
                <p className="retro text-[11px] text-[#6d6078]">GRAPH V2 · FIRST OFFICIAL</p>
                <h1 className="retro text-[26px] leading-10 text-[#5b3ea7]">模型分析</h1>
                <p className="max-w-3xl text-[15px] leading-8 text-[#2f2938]">
                  这是当前 16 个模型、每个模型 10 个独立工程任务的正式分析。所有公开分数统一来自 Graph V2 scorer 3.1；模型、provider、runner 和最终选用的 attempt 分开记录。它回答的是“谁在这次复杂知识图谱网站任务中交付得更完整”，不是通用模型能力排名。
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <a href="/test/" className="inline-flex items-center gap-2 border border-[#2f2938] bg-[#fffaf0] px-3 py-2 text-xs transition-colors hover:bg-[#ebe4d6]">
                  <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />返回测试总榜
                </a>
                <a href="/test/archive/" className="inline-flex items-center gap-2 border border-[#2f2938] bg-[#fffaf0] px-3 py-2 text-xs transition-colors hover:bg-[#ebe4d6]">
                  <Layers3 className="h-3.5 w-3.5" aria-hidden="true" />旧榜单
                </a>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="OFFICIAL TASKS" value={`${manifest.entries.length}/${manifest.expectedEntries}`} detail="16 个模型 × 10 个冻结任务，所有槽位都有分数和产物记录。" />
              <StatCard label="RUNNER STATE" value={`${completed}/${manifest.entries.length}`} detail={`${completed} 个正常完成，${failed} 个失败槽位仍按 0 分与真实消耗计入。`} />
              <StatCard label="S TIER" value={String(sTier.length)} detail={`${sTier.map((row) => row.model).join('、')}；同档不做精确名次。`} />
              <StatCard label="SNAPSHOT" value={manifest.snapshotDate} detail={`数据生成：${formatGeneratedAt(manifest.sourceGeneratedAt)}`} />
            </div>
          </section>

          <section className="space-y-6">
            <SectionHeading icon={Scale} eyebrow="READING THE BOARD" title="先把榜单读对" />
            <div className="grid gap-4 md:grid-cols-3">
              <article className="border-y-4 border-[#2f2938] py-4">
                <h3 className="retro text-[14px] text-[#5b3ea7]">总榜是档位，不是伪精确排名</h3>
                <p className="mt-3 text-sm leading-7 text-[#2f2938]">按 10 轮平均分划档：S≥60，A=50–59.99，B=40–49.99，C=30–39.99，D=20–29.99，E&lt;20。同一档内的细小均分差不被包装成确定名次。</p>
              </article>
              <article className="border-y-4 border-[#2f2938] py-4">
                <h3 className="retro text-[14px] text-[#5b3ea7]">平均分必须配合中位数和范围</h3>
                <p className="mt-3 text-sm leading-7 text-[#2f2938]">每个模型只有 10 个任务。平均分反映总产出，中位数反映典型轮次，最高/最低分和低尾次数用来暴露“偶尔极强、偶尔不可交付”的波动。</p>
              </article>
              <article className="border-y-4 border-[#2f2938] py-4">
                <h3 className="retro text-[14px] text-[#5b3ea7]">质量榜与性价比榜回答不同问题</h3>
                <p className="mt-3 text-sm leading-7 text-[#2f2938]">质量榜只看产物；性价比榜再引入现金成本、墙钟、调用数和 token 排名。低价或快不能替代质量，高分也不会自动等于高性价比。</p>
              </article>
            </div>
          </section>

          <section className="space-y-6">
            <SectionHeading icon={BarChart3} eyebrow="QUALITY DISTRIBUTION" title="16 个模型的质量分布" />
            <AnalysisTable rows={analyses} />
            <div className="grid gap-4 md:grid-cols-2">
              <article className="border-l-4 border-[#5b3ea7] bg-[#fffaf0] p-5">
                <h3 className="retro text-[13px] text-[#5b3ea7]">S 档领先，但低尾仍然存在</h3>
                <p className="mt-3 text-sm leading-7 text-[#2f2938]">
                  {sol?.model} 均分 {formatNumber(sol?.score_mean ?? 0)}、中位数 {formatNumber(sol?.score_median ?? 0)}；{fable?.model} 均分 {formatNumber(fable?.score_mean ?? 0)}、中位数 {formatNumber(fable?.score_median ?? 0)}。两者的中位数都高于均分，说明典型轮次很强，但各有一个低于 10 分的尾部任务。
                </p>
              </article>
              <article className="border-l-4 border-[#7351cf] bg-[#fffaf0] p-5">
                <h3 className="retro text-[13px] text-[#5b3ea7]">A 档是两种不同的波动</h3>
                <p className="mt-3 text-sm leading-7 text-[#2f2938]">
                  {qwen38?.model} 均分 {formatNumber(qwen38?.score_mean ?? 0)}，10 轮范围 {formatNumber(qwen38?.minimum ?? 0)}–{formatNumber(qwen38?.maximum ?? 0)}；{kimi?.model} 均分 {formatNumber(kimi?.score_mean ?? 0)}，范围 {formatNumber(kimi?.minimum ?? 0)}–{formatNumber(kimi?.maximum ?? 0)}。二者都没有失败槽位，但都不是“每轮稳定同分”的模型。
                </p>
              </article>
              <article className="border-l-4 border-[#10b981] bg-[#fffaf0] p-5">
                <h3 className="retro text-[13px] text-[#5b3ea7]">B 档均分接近，典型轮次差异明显</h3>
                <p className="mt-3 text-sm leading-7 text-[#2f2938]">
                  {opus?.model} 与 {glm?.model} 均分只差 {formatNumber(Math.abs((opus?.score_mean ?? 0) - (glm?.score_mean ?? 0)))}，但中位数分别是 {formatNumber(opus?.score_median ?? 0)} 和 {formatNumber(glm?.score_median ?? 0)}。只看均分会漏掉 GLM 更明显的高分拉升效应。
                </p>
              </article>
              <article className="border-l-4 border-[#ef4444] bg-[#fffaf0] p-5">
                <h3 className="retro text-[13px] text-[#5b3ea7]">失败不会从榜单里消失</h3>
                <p className="mt-3 text-sm leading-7 text-[#2f2938]">
                  当前 160 个槽位中有 {failed} 个 runner 失败，全部来自 {ernie?.model}。这些槽位按 0 分保留，已经产生的调用、token、耗时和费用同样进入工程消耗；这也是 E 档结果的一部分，而不是需要从平均值里剔除的异常点。
                </p>
              </article>
            </div>
          </section>

          <section className="space-y-6">
            <SectionHeading icon={Repeat2} eyebrow="CROSS-RUN READ" title="四强差距已经从能力面移到时间面" />
            <div className="border-2 border-[#2f2938] bg-[#2f2938] p-5 text-[#f8f3e8] shadow-[8px_8px_0_#7351cf] md:p-7">
              <p className="retro text-[12px] text-[#c4b5fd]">“全面落后”已经不成立</p>
              <p className="mt-3 max-w-5xl text-[15px] leading-8 text-[#eee7dc]">
                把 Kimi K3、Qwen 3.8 与 Sol、Fable 的最新对照批及历史轨迹放在一起看，四者在算法、数据一致性、搜索、筛选和空间布局上已经互有胜负。真正还拉开样本权重的，是巅峰表现能否跨批复现、一次调用能完成多少工作，以及接近满分交付是否足够确定。
              </p>
              <p className="mt-3 text-xs leading-6 text-[#c9c0d1]">本节是跨批补充观察，不改动上方当前正式榜；不同模型取各自已审计的最新有效批次，所有对照仍来自 scorer 3.1 的 score.json。</p>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <article className="border-y-4 border-[#2f2938] py-4 lg:col-span-1">
                <p className="retro text-[11px] text-[#6d6078]">01 · 巅峰一致性</p>
                <h3 className="mt-2 font-semibold text-[#17131d]">“每次都在头部”与“最近一次很强”不是同一种证据</h3>
                <div className="mt-4 space-y-3">
                  {CROSS_RUN_TRAJECTORIES.map((row) => (
                    <div key={row.model} className="border-l-2 border-[#7351cf] pl-3">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-2">
                        <strong className="text-sm">{row.model}</strong>
                        <span className="text-xs tabular-nums text-[#5b3ea7]">{row.scores}</span>
                      </div>
                      <p className="mt-1 text-[11px] text-[#6d6078]">{row.reading}</p>
                    </div>
                  ))}
                </div>
              </article>

              <article className="border-y-4 border-[#2f2938] py-4">
                <p className="retro text-[11px] text-[#6d6078]">02 · 单步效率</p>
                <h3 className="mt-2 font-semibold text-[#17131d]">Sol / Fable 步子更大，K3 的慢是体验级短板</h3>
                <p className="mt-3 text-sm leading-7 text-[#2f2938]">同题 full2 对照里，Sol、Fable、K3、Qwen 分别用了 147、226、248、245 次调用。Sol 用最少往返完成最多工作；K3 约 23 tok/s，只有 Sol、Fable 正常速度的一半左右，能力已经进第一梯队，交付体感仍在后排。</p>
              </article>

              <article className="border-y-4 border-[#2f2938] py-4">
                <p className="retro text-[11px] text-[#6d6078]">03 · 上限确定性</p>
                <h3 className="mt-2 font-semibold text-[#17131d]">闭源头部仍更容易重复交出近满分轮</h3>
                <p className="mt-3 text-sm leading-7 text-[#2f2938]">Sol 与 Fable 在历史批次里都不止一次出现 97+ 的近满分轮；K3 也能触到 95.9–97.4，但更像偶发上限。差距不是“能不能做到”，而是下一次是否还敢预期它做到。</p>
              </article>
            </div>

            <div className="space-y-3">
              <div>
                <p className="retro text-[11px] text-[#6d6078]">ALREADY COMPETITIVE</p>
                <h3 className="mt-1 font-semibold text-[#17131d]">已经不能再说落后的五个分项</h3>
              </div>
              <div className="overflow-x-auto border-2 border-[#2f2938] bg-[#fffaf0] shadow-[8px_8px_0_#2f2938]">
                <table className="w-full min-w-[720px] border-collapse text-[13px] text-[#17131d]">
                  <thead className="border-b-2 border-[#17131d] bg-[#ebe4d6] text-[#43384f]">
                    <tr><th className="px-3 py-2 text-left">评分项</th><th className="px-3 py-2 text-right">Kimi K3</th><th className="px-3 py-2 text-right">Qwen 3.8</th><th className="px-3 py-2 text-right">Fable 5</th><th className="px-3 py-2 text-right">GPT-5.6 Sol</th></tr>
                  </thead>
                  <tbody>
                    {FOUR_MODEL_CHECKERS.map((row) => (
                      <tr key={row.label} className="border-b border-[#d7cfbf] last:border-b-0">
                        <td className="px-3 py-2 font-semibold">{row.label}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{row.kimi}</td>
                        <td className="px-3 py-2 text-right font-semibold tabular-nums text-[#5b3ea7]">{row.qwen}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{row.fable}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{row.sol}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs leading-6 text-[#6d6078]">Qwen 3.8 的最新批在搜索状态、节点详情和空间可读性上已经是四强最高；这恰好是它早期最容易出现交互漂移与布局坍缩的区域，也说明 Preview 期快速迭代既能补短板，也会让“当前测到的是哪个版本”成为额外变量。</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <article className="border-l-4 border-[#7351cf] bg-[#fffaf0] p-4">
                <h3 className="font-semibold">Kimi K3</h3>
                <p className="mt-2 text-xs leading-6 text-[#2f2938]">高上限但双峰明显。主要死法是视觉持续抖动和空白画布；还欠“渲染稳定性 + 速度”两个补丁。</p>
              </article>
              <article className="border-l-4 border-[#5b3ea7] bg-[#fffaf0] p-4">
                <h3 className="font-semibold">Qwen 3.8</h3>
                <p className="mt-2 text-xs leading-6 text-[#2f2938]">同类渲染事故更少，最新批灾难率降到 10%。补短板最快，但 Preview 版本漂移让跨日复现需要更谨慎。</p>
              </article>
              <article className="border-l-4 border-[#10b981] bg-[#fffaf0] p-4">
                <h3 className="font-semibold">Claude Fable 5</h3>
                <p className="mt-2 text-xs leading-6 text-[#2f2938]">跨批地板更可信；命门集中在画布空白与关系未渲染，本质上是渲染管线偶发断链。</p>
              </article>
              <article className="border-l-4 border-[#f59e0b] bg-[#fffaf0] p-4">
                <h3 className="font-semibold">GPT-5.6 Sol</h3>
                <p className="mt-2 text-xs leading-6 text-[#2f2938]">单步效率与近满分复现最好；软肋是边堆叠、毛球布局和节点详情，不是能力面的全面碾压。</p>
              </article>
            </div>
          </section>

          <section className="space-y-6">
            <SectionHeading icon={FileCheck2} eyebrow="SCORER 3.1" title="100 分是怎样得到的" />
            <p className="max-w-4xl text-[15px] leading-8 text-[#2f2938]">评分器不是看截图打印象分，而是在浏览器中验证冻结图谱身份、真实关系渲染、可读布局、交互状态、算法正确性、离线运行和稳定性。11 项基础分合计 100 分：</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {CHECKERS.map((checker) => (
                <article key={checker.label} className="border border-[#d7cfbf] bg-[#fffaf0] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div><p className="retro text-[10px] text-[#6d6078]">{checker.area}</p><h3 className="mt-1 font-semibold text-[#17131d]">{checker.label}</h3></div>
                    <span className="retro text-[16px] text-[#5b3ea7]">{checker.points}</span>
                  </div>
                  <p className="mt-3 text-xs leading-6 text-[#6d6078]">{checker.detail}</p>
                </article>
              ))}
            </div>
            <div className="border-2 border-[#2f2938] bg-[#2f2938] p-5 text-[#f8f3e8] shadow-[8px_8px_0_#7351cf]">
              <h3 className="retro text-[13px] text-[#c4b5fd]">基础分之后还有可交付性乘数</h3>
              <p className="mt-3 text-sm leading-7 text-[#eee7dc]">页面打不开、画布空白、加载的图谱身份不一致、关系几乎没有渲染、依赖外网、主线程失去响应、持续抖动或布局退化，都会触发乘数或上限。例如入口不可加载 ×0.25、空白图谱 ×0.35、身份不一致 ×0.65、关系缺失 ×0.55、关系不完整 ×0.82。评分器按上游根因处理同源失败，避免把一个加载失败重复惩罚多次。</p>
            </div>
          </section>

          <section className="space-y-6">
            <SectionHeading icon={WalletCards} eyebrow="VALUE INDEX" title="性价比榜及其边界" />
            <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="border-y-4 border-[#2f2938] py-4">
                <p className="retro text-[12px] text-[#5b3ea7]">综合消耗排名</p>
                <p className="mt-3 text-sm leading-7 text-[#2f2938]">成本排名 × 40% + 耗时排名 × 25% + 调用数排名 × 20% + token 排名 × 15%；性价比指数 = 质量均分 ÷ 综合消耗排名，指数越高越好。</p>
              </div>
              <div className="border-y-4 border-[#2f2938] py-4">
                <p className="retro text-[12px] text-[#5b3ea7]">当前结果</p>
                <p className="mt-3 text-sm leading-7 text-[#2f2938]">{valueLeader.model} 以 {formatNumber(valueLeader.value_index)} 位居性价比榜首。{fastest.model} 同时拥有最短平均墙钟（{formatNumber(fastest.avg_wall_minutes)} 分钟）和最少调用（{fewestCalls.api_calls_10_tasks} 次）。</p>
              </div>
            </div>
            <ValueTable rows={manifest.valueLeaderboard} />
            <div className="flex items-start gap-3 border-l-4 border-[#f59e0b] bg-[#fffaf0] p-4 text-sm leading-7 text-[#2f2938]">
              <TriangleAlert className="mt-1 h-4 w-4 shrink-0 text-[#b45309]" aria-hidden="true" />
              <p>Qwen 3.8 只有 Token Plan 订阅信息，没有公开且可换算的按 token API 单价，因此不参与现金成本和性价比排名。Fable、Opus、Sol 的数据库成本字段为 0，本榜统一按各自第一方官方 API 标准价做反事实估算，不等同于代理账单实扣。</p>
            </div>
          </section>

          <section className="space-y-6">
            <SectionHeading icon={Database} eyebrow="AUDIT TRAIL" title="替换、原始产物与审计边界" />
            <div className="grid gap-4 md:grid-cols-2">
              <article className="border-y-4 border-[#2f2938] py-4">
                <h3 className="flex items-center gap-2 font-semibold"><CheckCircle2 className="h-4 w-4 text-[#5b3ea7]" />最终选用 attempt</h3>
                <p className="mt-3 text-sm leading-7 text-[#2f2938]">当前榜采用第一轮修正后的 16×10 槽位。Opus、Kimi、Qwen 3.8 使用已确认替换轮，Sol 使用首次完整有效轮；旧 attempt 保留在全量审计数据中，但没有混入当前平均分。</p>
              </article>
              <article className="border-y-4 border-[#2f2938] py-4">
                <h3 className="flex items-center gap-2 font-semibold"><ShieldCheck className="h-4 w-4 text-[#5b3ea7]" />原始产物不被网页改写</h3>
                <p className="mt-3 text-sm leading-7 text-[#2f2938]">每个槽位提供完整 raw.tar.gz，保留原目录、文件和符号链接；网页 viewer 只是另行生成的路径兼容副本。源目录与归档各自记录 SHA-256，可独立验证。</p>
              </article>
              <article className="border-y-4 border-[#2f2938] py-4">
                <h3 className="flex items-center gap-2 font-semibold"><Clock className="h-4 w-4 text-[#5b3ea7]" />时间与成本口径</h3>
                <p className="mt-3 text-sm leading-7 text-[#2f2938]">墙钟来自每个槽位的 startedAt→endedAt，包含模型、工具、本地读写与 harness 开销。价格基准日为 {manifest.pricingAsOf}，美元按 1 USD = ¥{manifest.fxCnyPerUsd} 折算；缓存与 reasoning 依各模型公开规则计价。</p>
              </article>
              <article className="border-y-4 border-[#2f2938] py-4">
                <h3 className="flex items-center gap-2 font-semibold"><Layers3 className="h-4 w-4 text-[#5b3ea7]" />发布包规模</h3>
                <p className="mt-3 text-sm leading-7 text-[#2f2938]">当前发布包含 {release.entries} 个槽位、{release.sourceFiles.toLocaleString('zh-CN')} 个原始文件、{formatBytes(release.sourceBytes)} 源数据与 {formatBytes(release.archiveBytes)} 压缩归档；上一轮 80 个产物完整保存在旧榜单。</p>
              </article>
            </div>
          </section>

          <section className="space-y-6">
            <SectionHeading icon={TriangleAlert} eyebrow="LIMITATIONS" title="这份榜单不能证明什么" />
            <div className="border-2 border-[#2f2938] bg-[#fffaf0] p-5 shadow-[8px_8px_0_#2f2938] md:p-7">
              <ul className="space-y-3 text-sm leading-7 text-[#2f2938]">
                <li>• 结果只代表本次 Web4 复杂个人知识图谱网站任务，不可外推为通用编程、推理或写作能力排名。</li>
                <li>• 每个模型只有 10 个任务，服务更新、随机性和 agent 路径都会影响分布；均分小差距不等于稳定优劣。</li>
                <li>• 最新替换批次没有覆盖完全一致的人工视觉判定，因此当前正式榜只采用所有 160 个槽位共有的 scorer 3.1 自动检查口径。</li>
                <li>• 调用数是 OpenCode assistant message 数，接近 API 往返次数但不是 HTTP 抓包；在 assistant message 形成前失败的请求可能不可见。</li>
                <li>• 价格不含税、汇率波动、代理加价、订阅沉没成本、工具服务费和人工复核成本；性价比指数应当与质量分布一起阅读。</li>
              </ul>
            </div>
            <p className="text-xs leading-6 text-[#6d6078]">版本：{manifest.releaseId} · {manifest.dataVersion} · {manifest.scoreStandard} · 页面生成 {formatGeneratedAt(manifest.generatedAt)}</p>
          </section>
        </PageContainer>
      </main>
      <Footer />
    </>
  );
}
