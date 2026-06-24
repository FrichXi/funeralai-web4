import type { Metadata } from 'next';
import fs from 'node:fs';
import path from 'node:path';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ArrowLeft, BarChart3, CheckCircle2, Database, Moon, Scale } from 'lucide-react';
import { Footer } from '@/components/layout/Footer';
import { PageContainer } from '@/components/layout/PageContainer';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: '模型分析 - 葬AI Web4',
  description: '葬AI Web4 真实工作任务评测的模型排名、追加测试、性价比、成本和调用分析。',
  robots: {
    index: false,
    follow: false,
  },
};

interface TestEntry {
  round: string;
  model: string;
  modelVersion?: string;
  score: number | null;
  loading: number | null;
  graph: number | null;
  articles: number | null;
  visual: number | null;
  interaction: number | null;
}

interface EfficiencyEntry {
  model: string;
  modelVersion: string;
  mainRank: number | null;
  scoreAvg?: number | null;
  tokensTotal: number | null;
  costLabel: string;
  costSortCny?: number | null;
  consumptionRank?: number | null;
  valueIndex?: number | null;
  calls: number | null;
  wallMinutes: number | null;
  note?: string;
}

interface TestManifest {
  generatedAt?: string;
  snapshotDate?: string;
  dataVersion?: string;
  scoreFormula?: string;
  scoreStandard?: string;
  expectedEntries?: number;
  entries: TestEntry[];
  efficiencyLeaderboard?: EfficiencyEntry[];
}

interface ModelSummary {
  model: string;
  version: string;
  count: number;
  avg: number;
  min: number;
  max: number;
  loading: number | null;
  graph: number | null;
  articles: number | null;
  visual: number | null;
  interaction: number | null;
  highCount: number;
  lowCount: number;
}

const TEST_PUBLIC_DIR = path.join(process.cwd(), 'public', 'test');
const DEFAULT_MANIFEST: TestManifest = {
  entries: [],
  efficiencyLeaderboard: [],
};

function readPublicText(fileName: string, fallback = '') {
  try {
    return fs.readFileSync(path.join(TEST_PUBLIC_DIR, fileName), 'utf8');
  } catch {
    return fallback;
  }
}

function readManifest() {
  try {
    const raw = fs.readFileSync(path.join(TEST_PUBLIC_DIR, 'manifest.json'), 'utf8');
    return JSON.parse(raw) as TestManifest;
  } catch {
    return DEFAULT_MANIFEST;
  }
}

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let current = '';
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      quoted = !quoted;
      continue;
    }

    if (char === ',' && !quoted) {
      cells.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  cells.push(current);
  return cells;
}

function parseCsv(raw: string) {
  const [headerLine, ...lines] = raw.trim().split(/\r?\n/);

  if (!headerLine) {
    return [] as Record<string, string>[];
  }

  const headers = parseCsvLine(headerLine);
  return lines
    .filter((line) => line.trim())
    .map((line) => {
      const cells = parseCsvLine(line);
      return Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? '']));
    });
}

function finiteNumber(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function average(values: Array<number | null | undefined>) {
  const numbers = values.filter(finiteNumber);

  if (!numbers.length) {
    return null;
  }

  return numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
}

function formatNumber(value: number | null | undefined, digits = 1) {
  if (!finiteNumber(value)) {
    return '暂缺';
  }

  return value.toLocaleString('zh-CN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function formatInteger(value: number | null | undefined) {
  if (!finiteNumber(value)) {
    return '暂缺';
  }

  return Math.round(value).toLocaleString('zh-CN');
}

function formatCompactTokens(value: number | null | undefined) {
  if (!finiteNumber(value)) {
    return '暂缺';
  }

  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toLocaleString('zh-CN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}M`;
  }

  return formatInteger(value);
}

function formatGeneratedAt(value?: string) {
  if (!value) {
    return '待生成';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Shanghai',
  }).format(date);
}

function summarizeModels(entries: TestEntry[]) {
  const groups = new Map<string, TestEntry[]>();

  for (const entry of entries) {
    if (!finiteNumber(entry.score)) {
      continue;
    }

    const rows = groups.get(entry.model) ?? [];
    rows.push(entry);
    groups.set(entry.model, rows);
  }

  const summaries: ModelSummary[] = Array.from(groups.entries()).map(([model, rows]) => {
    const scores = rows.map((row) => row.score).filter(finiteNumber);
    return {
      model,
      version: rows[0]?.modelVersion || model,
      count: scores.length,
      avg: average(scores) ?? 0,
      min: Math.min(...scores),
      max: Math.max(...scores),
      loading: average(rows.map((row) => row.loading)),
      graph: average(rows.map((row) => row.graph)),
      articles: average(rows.map((row) => row.articles)),
      visual: average(rows.map((row) => row.visual)),
      interaction: average(rows.map((row) => row.interaction)),
      highCount: scores.filter((score) => score >= 90).length,
      lowCount: scores.filter((score) => score < 70).length,
    };
  });

  return summaries.sort((a, b) => b.avg - a.avg || a.model.localeCompare(b.model));
}

function metricFromCsv(rows: Record<string, string>[], model: string, key: string) {
  const row = rows.find((item) => item.model === model);
  return row?.[key] || '';
}

const markdownComponents: Components = {
  h1: ({ children }) => (
    <h2 className="retro mt-10 text-[20px] leading-8 text-[#5b3ea7]">{children}</h2>
  ),
  h2: ({ children }) => (
    <h3 className="retro mt-9 text-[18px] leading-8 text-[#5b3ea7]">{children}</h3>
  ),
  h3: ({ children }) => (
    <h4 className="retro mt-7 text-[15px] leading-7 text-[#5b3ea7]">{children}</h4>
  ),
  p: ({ children }) => <p className="my-4 text-[15px] leading-8 text-[#2f2938]">{children}</p>,
  ul: ({ children }) => (
    <ul className="my-5 list-disc space-y-2 pl-5 text-[15px] leading-8 text-[#2f2938]">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="my-5 list-decimal space-y-3 pl-5 text-[15px] leading-8 text-[#2f2938]">
      {children}
    </ol>
  ),
  li: ({ children }) => <li>{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-[#17131d]">{children}</strong>,
  code: ({ children }) => (
    <code className="border border-[#d7cfbf] bg-[#fffaf0] px-1.5 py-0.5 font-mono text-[0.9em] text-[#5b3ea7]">
      {children}
    </code>
  ),
  table: ({ children }) => (
    <div className="my-6 overflow-x-auto border-2 border-[#2f2938] bg-[#fffaf0] shadow-[6px_6px_0_#2f2938]">
      <table className="w-full min-w-[760px] border-collapse text-left text-[13px] text-[#17131d]">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => <thead className="border-b-2 border-[#17131d] bg-[#ebe4d6]">{children}</thead>,
  th: ({ children }) => (
    <th className="px-3 py-2 font-semibold text-[#43384f] align-bottom">{children}</th>
  ),
  td: ({ children }) => (
    <td className="border-b border-[#d7cfbf] px-3 py-2 align-top text-[#2f2938]">{children}</td>
  ),
  a: ({ children, href }) => (
    <a href={href} className="text-[#5b3ea7] underline underline-offset-4">
      {children}
    </a>
  ),
};

function StatCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="border-y-4 border-[#2f2938] py-4">
      <p className="retro text-[11px] text-[#5b3ea7]">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-normal text-[#17131d]">{value}</p>
      <p className="mt-2 text-xs leading-5 text-[#6d6078]">{detail}</p>
    </div>
  );
}

function QualityTable({ summaries, csvRows }: { summaries: ModelSummary[]; csvRows: Record<string, string>[] }) {
  return (
    <div className="overflow-x-auto border-2 border-[#2f2938] bg-[#fffaf0] shadow-[8px_8px_0_#2f2938]">
      <table className="w-full min-w-[960px] border-collapse text-[13px] text-[#17131d]">
        <thead className="border-b-2 border-[#17131d] bg-[#ebe4d6]">
          <tr>
            <th className="px-3 py-2 text-right text-[#43384f]">排名</th>
            <th className="px-3 py-2 text-left text-[#43384f]">模型</th>
            <th className="px-3 py-2 text-right text-[#43384f]">均分</th>
            <th className="px-3 py-2 text-right text-[#43384f]">区间</th>
            <th className="px-3 py-2 text-right text-[#43384f]">图谱/25</th>
            <th className="px-3 py-2 text-right text-[#43384f]">文章/25</th>
            <th className="px-3 py-2 text-right text-[#43384f]">视觉</th>
            <th className="px-3 py-2 text-right text-[#43384f]">交互</th>
            <th className="px-3 py-2 text-right text-[#43384f]">A 档轮次</th>
            <th className="px-3 py-2 text-right text-[#43384f]">低尾轮次</th>
          </tr>
        </thead>
        <tbody>
          {summaries.map((summary, index) => (
            <tr key={summary.model} className="border-b border-[#d7cfbf] last:border-b-0">
              <td className="px-3 py-2 text-right tabular-nums">{index + 1}</td>
              <td className="px-3 py-2">
                <strong>{summary.version}</strong>
                <div className="text-[11px] text-[#6d6078]">{summary.count} 轮有效结果</div>
              </td>
              <td className="px-3 py-2 text-right tabular-nums font-semibold">{formatNumber(summary.avg)}</td>
              <td className="px-3 py-2 text-right tabular-nums">
                {formatNumber(summary.min)}-{formatNumber(summary.max)}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">
                {metricFromCsv(csvRows, summary.model, 'graph_avg') || formatNumber((summary.graph ?? 0) / 35 * 25)}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">
                {metricFromCsv(csvRows, summary.model, 'articles_avg') || formatNumber((summary.articles ?? 0) / 15 * 25)}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">{formatNumber(summary.visual)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{formatNumber(summary.interaction)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{summary.highCount}</td>
              <td className="px-3 py-2 text-right tabular-nums">{summary.lowCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EfficiencyTable({ rows }: { rows: EfficiencyEntry[] }) {
  return (
    <div className="overflow-x-auto border-2 border-[#2f2938] bg-[#fffaf0] shadow-[8px_8px_0_#2f2938]">
      <table className="w-full min-w-[900px] border-collapse text-[13px] text-[#17131d]">
        <thead className="border-b-2 border-[#17131d] bg-[#ebe4d6]">
          <tr>
            <th className="px-3 py-2 text-right text-[#43384f]">性价比排名</th>
            <th className="px-3 py-2 text-left text-[#43384f]">模型</th>
            <th className="px-3 py-2 text-right text-[#43384f]">质量排名</th>
            <th className="px-3 py-2 text-right text-[#43384f]">均分</th>
            <th className="px-3 py-2 text-right text-[#43384f]">成本</th>
            <th className="px-3 py-2 text-right text-[#43384f]">调用</th>
            <th className="px-3 py-2 text-right text-[#43384f]">耗时</th>
            <th className="px-3 py-2 text-right text-[#43384f]">可见 token</th>
            <th className="px-3 py-2 text-right text-[#43384f]">value index</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.model} className="border-b border-[#d7cfbf] last:border-b-0">
              <td className="px-3 py-2 text-right tabular-nums">{index + 1}</td>
              <td className="px-3 py-2">
                <strong>{row.modelVersion}</strong>
                {row.note ? <div className="max-w-[300px] text-[11px] leading-5 text-[#6d6078]">{row.note}</div> : null}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">{formatInteger(row.mainRank)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{formatNumber(row.scoreAvg)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{row.costLabel}</td>
              <td className="px-3 py-2 text-right tabular-nums">{formatInteger(row.calls)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{formatNumber(row.wallMinutes)} 分钟</td>
              <td className="px-3 py-2 text-right tabular-nums">{formatCompactTokens(row.tokensTotal)}</td>
              <td className="px-3 py-2 text-right tabular-nums font-semibold">{formatNumber(row.valueIndex, 2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ModelAnalysisPage() {
  const manifest = readManifest();
  const scoredEntries = manifest.entries.filter((entry) => finiteNumber(entry.score));
  const summaries = summarizeModels(manifest.entries);
  const efficiencyRows = manifest.efficiencyLeaderboard ?? [];
  const csvRows = parseCsv(readPublicText('cross-model-comparison.csv'));
  const analysisMarkdown = readPublicText(
    'model-log-analysis.md',
    '公开分析文件尚未生成。请先运行 `npm run stage:test`。'
  );
  const doubao = summaries.find((summary) => summary.model === 'Doubao');
  const step = summaries.find((summary) => summary.model === 'Step');

  return (
    <>
      <main className="min-h-screen bg-[#f5f1e8] text-[#17131d]">
        <PageContainer className="space-y-10 py-8 md:py-12">
          <section className="space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-4xl space-y-4">
                <p className="retro text-[11px] text-[#6d6078]">PERSONAL REAL-WORK BENCHMARK</p>
                <h1 className="retro text-[26px] leading-10 text-[#5b3ea7]">模型分析</h1>
                <p className="text-[15px] leading-8 text-[#2f2938]">
                  这页把当前公开榜单的质量结果、2026-06-23 追加测试、性价比榜、缓存成本和调用耗时放在同一个口径里解释。它不是通用模型能力排名，而是葬AI Web4 复杂个人网站重构任务的一次可审计快照。
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <a
                  href="/test/"
                  className="inline-flex items-center gap-2 border border-[#2f2938] bg-[#fffaf0] px-3 py-2 text-xs text-[#17131d] transition-colors hover:bg-[#ebe4d6]"
                >
                  <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>返回测试总榜</span>
                </a>
                <a
                  href="/test/legacy-6-model/"
                  className="inline-flex items-center gap-2 border border-[#2f2938] bg-[#fffaf0] px-3 py-2 text-xs text-[#17131d] transition-colors hover:bg-[#ebe4d6]"
                >
                  <Moon className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>旧榜单</span>
                </a>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <StatCard
                label="PUBLIC SITES"
                value={String(manifest.entries.length || manifest.expectedEntries || 0)}
                detail={`已评分 ${scoredEntries.length} 个，追加前快照另存为旧榜单。`}
              />
              <StatCard
                label="MODELS"
                value={String(summaries.length)}
                detail="每个模型 10 轮独立产物，模型、provider、runner 分开记录。"
              />
              <StatCard
                label="EFFICIENCY"
                value={String(efficiencyRows.length)}
                detail="性价比榜覆盖质量、现金/等价成本、耗时、调用数和 token 负载。"
              />
              <StatCard
                label="SNAPSHOT"
                value={manifest.snapshotDate || '2026-06-15'}
                detail={`页面生成：${formatGeneratedAt(manifest.generatedAt)}`}
              />
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-3">
            <div className="space-y-3 border-y-4 border-[#2f2938] py-4">
              <Scale className="h-5 w-5 text-[#5b3ea7]" aria-hidden="true" />
              <h2 className="retro text-[14px] text-[#5b3ea7]">统一公式</h2>
              <p className="text-xs leading-6 text-[#6d6078]">
                {manifest.scoreFormula || 'loading 15 + graph/25*35 + articles/25*15 + visual 20 + interaction 15'}
              </p>
            </div>
            <div className="space-y-3 border-y-4 border-[#2f2938] py-4">
              <CheckCircle2 className="h-5 w-5 text-[#5b3ea7]" aria-hidden="true" />
              <h2 className="retro text-[14px] text-[#5b3ea7]">追加边界</h2>
              <p className="text-xs leading-6 text-[#6d6078]">
                Doubao 和 Step 是 2026-06-23 在同一冻结数据、同一任务 prompt、同一 graph-weighted 基础评分和同一图谱稳定性复核下追加进榜；旧榜单保留追加前状态。
              </p>
            </div>
            <div className="space-y-3 border-y-4 border-[#2f2938] py-4">
              <Database className="h-5 w-5 text-[#5b3ea7]" aria-hidden="true" />
              <h2 className="retro text-[14px] text-[#5b3ea7]">公开边界</h2>
              <p className="text-xs leading-6 text-[#6d6078]">
                公开页面和 GitHub 只发布汇总 CSV、JSON、Markdown 与方法说明；原始账单 PDF、控制台截图和完整本地日志不公开。
              </p>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-[#5b3ea7]" aria-hidden="true" />
              <h2 className="retro text-[20px] text-[#5b3ea7]">质量总榜</h2>
            </div>
            <QualityTable summaries={summaries} csvRows={csvRows} />
            <p className="max-w-4xl text-[15px] leading-8 text-[#2f2938]">
              总榜仍然按产物质量排序。GLM 5.2 与 Claude Opus 4.8 的均分差距很窄；Doubao 追加后落在 Kimi 之后、MiniMax 之前；Step 的文章项稳定，但图谱和视觉弱轮次拉低了总分。
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="retro text-[20px] text-[#5b3ea7]">Doubao vs Step</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <article className="border-y-4 border-[#2f2938] py-4">
                <h3 className="retro text-[14px] text-[#5b3ea7]">Doubao Seed 2.1 Pro</h3>
                <p className="mt-3 text-sm leading-7 text-[#2f2938]">
                  均分 {formatNumber(doubao?.avg)}，区间 {formatNumber(doubao?.min)}-{formatNumber(doubao?.max)}。它有满分和多个 A 档高分轮次，说明产物上限很高；但低尾、耗时和重跑成本也是真问题。
                </p>
              </article>
              <article className="border-y-4 border-[#2f2938] py-4">
                <h3 className="retro text-[14px] text-[#5b3ea7]">Step 3.7 Flash</h3>
                <p className="mt-3 text-sm leading-7 text-[#2f2938]">
                  均分 {formatNumber(step?.avg)}，区间 {formatNumber(step?.min)}-{formatNumber(step?.max)}。它跑得快、现金成本极低，文章页基本稳定，但这次任务里图谱和视觉不够稳。
                </p>
              </article>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="retro text-[20px] text-[#5b3ea7]">性价比榜</h2>
            <EfficiencyTable rows={efficiencyRows} />
            <p className="max-w-4xl text-[15px] leading-8 text-[#2f2938]">
              性价比榜不是质量总榜的替代品。它把成本排名、耗时排名、调用数排名和可见 token 排名按 40% / 25% / 20% / 15% 合成工程消耗排名，再用质量均分除以该消耗排名得到 value index。这个口径适合解释“这次任务做完要付出多少工程消耗”，不适合单独判断哪个模型最好。
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="retro text-[20px] text-[#5b3ea7]">公开分析全文</h2>
            <div className="border-2 border-[#2f2938] bg-[#f8f3e8] px-4 py-5 shadow-[8px_8px_0_#2f2938] md:px-8 md:py-8">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {analysisMarkdown}
              </ReactMarkdown>
            </div>
          </section>
        </PageContainer>
      </main>
      <Footer />
    </>
  );
}
