import type { Metadata } from 'next';
import Image from 'next/image';
import fs from 'fs';
import path from 'path';
import { Crown, Database, ExternalLink, FileText, Github } from 'lucide-react';
import { Footer } from '@/components/layout/Footer';
import { PageContainer } from '@/components/layout/PageContainer';
import { LeaderboardImageDownload } from '@/components/test/LeaderboardImageDownload';
import { MethodologyTransitionLink } from '@/components/test/MethodologyTransitionLink';
import { Badge } from '@/components/ui/8bit/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/8bit/table';
import { cn } from '@/lib/utils';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: '测试 - 葬AI Web4',
  description: '葬AI Web4 本地重构网页测试集。',
  robots: {
    index: false,
    follow: false,
  },
};

const MODEL_ORDER = [
  'DeepSeek',
  'Kimi',
  'Qwen',
  'GLM',
  'MiniMax',
  'Opus 4.8',
  'Doubao',
  'Step',
] as const;

interface TestEntry {
  id: string;
  round: string;
  roundNumber: number;
  model: string;
  modelVersion?: string;
  modelTitle?: string;
  modelIcon?: string;
  modelSlug: string;
  href: string;
  score: number | null;
  grade: string;
  loading: number | null;
  graph: number | null;
  articles: number | null;
  visual: number | null;
  interaction: number | null;
  evidence: string;
  pending: boolean;
  crownRank: number | null;
  adjustedRank?: number | null;
  graphWeightedRank?: number | null;
  graphWeightedScore?: number | null;
  graphWeightedGrade?: string | null;
  graphWeightedGraph?: number | null;
  oldGraph25?: number | null;
  adjustedGraph25?: number | null;
  stabilityStatus?: string | null;
  observedPenaltyGraph25?: number | null;
  effectivePenaltyGraph25?: number | null;
  sampleKind?: string | null;
  avgChangedRatio?: number | null;
  avgMeanAbs?: number | null;
  maxChangedRatio?: number | null;
  maxMeanAbs?: number | null;
}

interface EfficiencyEntry {
  model: string;
  modelVersion: string;
  modelTitle?: string;
  modelIcon?: string;
  modelSlug?: string;
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
  generatedAt: string;
  snapshotDate?: string;
  dataVersion?: string;
  repoUrl?: string;
  methodologyUrl?: string;
  scoreCsvUrl?: string;
  scoreJsonUrl?: string;
  reportUrl?: string;
  graphWeightedScoreCsvUrl?: string;
  graphWeightedScoreJsonUrl?: string;
  graphWeightedReportUrl?: string;
  runnerPolicy?: string;
  scoreFormula?: string;
  limitations?: string[];
  scoreStandard: string;
  expectedEntries: number;
  efficiencyLeaderboard?: EfficiencyEntry[];
  entries: TestEntry[];
}

interface ModelSummary {
  model: string;
  version: string;
  title: string;
  icon: string;
  avg: number | null;
  min: number | null;
  max: number | null;
  loading: number | null;
  graph: number | null;
  articles: number | null;
  visual: number | null;
  interaction: number | null;
}

interface RankedEfficiencyEntry extends EfficiencyEntry {
  displayRank: number | null;
}

const MODEL_FALLBACKS: Record<
  (typeof MODEL_ORDER)[number],
  { version: string; title: string; icon: string }
> = {
  DeepSeek: { version: 'DeepSeek V4 Pro', title: 'DeepSeek V4 Pro', icon: 'diamond' },
  Kimi: { version: 'Kimi K2.7 Code', title: 'Kimi K2.7 Code', icon: 'moon' },
  Qwen: { version: 'Qwen3.7 Max', title: 'Qwen3.7 Max', icon: 'grid' },
  GLM: { version: 'GLM 5.2', title: 'GLM 5.2', icon: 'spark' },
  MiniMax: { version: 'MiniMax M3', title: 'MiniMax M3', icon: 'bolt' },
  'Opus 4.8': { version: 'Claude Opus 4.8', title: 'Claude Opus 4.8', icon: 'crystal' },
  Doubao: {
    version: 'Doubao Seed 2.1 Pro',
    title: 'Doubao Seed 2.1 Pro',
    icon: 'diamond',
  },
  Step: { version: 'Step 3.7 Flash', title: 'Step 3.7 Flash', icon: 'spark' },
};

const PIXEL_ICON_SPECS: Record<
  string,
  {
    width: number;
    height: number;
    pixelSize: number;
    color: string;
    glow: string;
    pixels: Array<[number, number]>;
  }
> = {
  diamond: {
    width: 5,
    height: 5,
    pixelSize: 3,
    color: '#fde047',
    glow: 'rgba(253, 224, 71, 0.65)',
    pixels: [[2, 0], [1, 1], [2, 1], [3, 1], [0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [1, 3], [2, 3], [3, 3], [2, 4]],
  },
  moon: {
    width: 5,
    height: 5,
    pixelSize: 3,
    color: '#c4b5fd',
    glow: 'rgba(196, 181, 253, 0.55)',
    pixels: [[2, 0], [3, 0], [1, 1], [0, 2], [0, 3], [1, 4], [2, 4], [3, 3], [2, 2]],
  },
  grid: {
    width: 5,
    height: 5,
    pixelSize: 3,
    color: '#9b7de8',
    glow: 'rgba(155, 125, 232, 0.55)',
    pixels: [[0, 0], [2, 0], [4, 0], [1, 1], [3, 1], [0, 2], [2, 2], [4, 2], [1, 3], [3, 3], [0, 4], [2, 4], [4, 4]],
  },
  spark: {
    width: 5,
    height: 5,
    pixelSize: 3,
    color: '#facc15',
    glow: 'rgba(250, 204, 21, 0.65)',
    pixels: [[2, 0], [2, 1], [0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [2, 3], [2, 4]],
  },
  bolt: {
    width: 4,
    height: 6,
    pixelSize: 3,
    color: '#10b981',
    glow: 'rgba(16, 185, 129, 0.5)',
    pixels: [[2, 0], [1, 1], [2, 1], [1, 2], [0, 3], [1, 3], [0, 4], [0, 5]],
  },
  crystal: {
    width: 5,
    height: 6,
    pixelSize: 3,
    color: '#38bdf8',
    glow: 'rgba(56, 189, 248, 0.6)',
    pixels: [[2, 0], [1, 1], [2, 1], [3, 1], [1, 2], [2, 2], [3, 2], [0, 3], [2, 3], [4, 3], [1, 4], [3, 4], [2, 5]],
  },
};

function readManifest(): TestManifest {
  const manifestPath = path.join(process.cwd(), 'public', 'test', 'manifest.json');

  try {
    const raw = fs.readFileSync(manifestPath, 'utf8');
    return JSON.parse(raw) as TestManifest;
  } catch {
    return {
      generatedAt: '',
      snapshotDate: '2026-06-15',
      dataVersion: '2026-06-15-visible-graph-audit-v2',
      repoUrl: 'https://github.com/FrichXi/personal-work-benchmark',
      methodologyUrl: '/test/methodology/',
      scoreCsvUrl: '/test/playwright-recheck-composite.csv',
      scoreJsonUrl: '/test/playwright-recheck-composite.json',
      reportUrl: '/test/playwright-recheck-composite.md',
      graphWeightedScoreCsvUrl: '/test/playwright-recheck-graphweighted.csv',
      graphWeightedScoreJsonUrl: '/test/playwright-recheck-graphweighted.json',
      graphWeightedReportUrl: '/test/playwright-recheck-graphweighted.md',
      runnerPolicy:
        'Models, providers, and runners are separate. opencode, Claude Code, pai, and custom commands are execution shells as long as they run the same task in isolated rounds.',
      scoreFormula:
        '复合评分 = loading 15 + adjusted graph/25*35 + articles/25*15 + visual 20 + interaction 15；adjusted graph 来自全量图谱稳定性复核',
      limitations: [
        'This leaderboard only describes the FuneralAI Web4 website-rebuild task.',
        'It is not a general model capability ranking.',
      ],
      scoreStandard: 'playwright-recheck-composite-stability-20260624',
      expectedEntries: 80,
      efficiencyLeaderboard: [],
      entries: [],
    };
  }
}

function formatScore(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return '待复测';
  }

  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatTokenTotal(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return '暂缺';
  }

  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M`;
  }

  return value.toLocaleString('zh-CN');
}

function formatInteger(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return '暂缺';
  }

  return Math.round(value).toLocaleString('zh-CN');
}

function formatMinutes(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return '暂缺';
  }

  return `${value.toFixed(1)} 分钟`;
}

function formatValueIndex(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '暂缺';
  }

  return value.toFixed(1);
}

function formatMaybeScore(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return 'n/a';
  }

  return formatScore(value);
}

function scoreTooltip(entry: TestEntry) {
  const details = [entry.evidence];

  if (Number.isFinite(entry.graphWeightedScore)) {
    details.push(`旧 graph-weighted 分：${formatMaybeScore(entry.graphWeightedScore)}`);
  }

  if (entry.stabilityStatus) {
    details.push(
      `图谱稳定性：${entry.stabilityStatus}；Graph/25 ${formatMaybeScore(entry.oldGraph25)} -> ${formatMaybeScore(entry.adjustedGraph25)}；扣分 ${formatMaybeScore(entry.effectivePenaltyGraph25)}`
    );
  }

  return details.filter(Boolean).join('\n');
}

function average(values: Array<number | null>) {
  const valid = values.filter((value): value is number => Number.isFinite(value));

  if (!valid.length) {
    return null;
  }

  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

function summarize(entries: TestEntry[]) {
  return MODEL_ORDER.map<ModelSummary>((model) => {
    const rows = entries.filter((entry) => entry.model === model);
    const scores = rows
      .map((entry) => entry.score)
      .filter((score): score is number => Number.isFinite(score));
    const fallback = MODEL_FALLBACKS[model];
    const first = rows[0];

    return {
      model,
      version: first?.modelVersion || fallback.version,
      title: first?.modelTitle || fallback.title,
      icon: first?.modelIcon || fallback.icon,
      avg: average(rows.map((entry) => entry.score)),
      min: scores.length ? Math.min(...scores) : null,
      max: scores.length ? Math.max(...scores) : null,
      loading: average(rows.map((entry) => entry.loading)),
      graph: average(rows.map((entry) => entry.graph)),
      articles: average(rows.map((entry) => entry.articles)),
      visual: average(rows.map((entry) => entry.visual)),
      interaction: average(rows.map((entry) => entry.interaction)),
    };
  }).sort((a, b) => {
    if (a.avg === null && b.avg === null) {
      return MODEL_ORDER.indexOf(a.model as (typeof MODEL_ORDER)[number]) -
        MODEL_ORDER.indexOf(b.model as (typeof MODEL_ORDER)[number]);
    }

    if (a.avg === null) return 1;
    if (b.avg === null) return -1;
    return b.avg - a.avg;
  });
}

function rankEfficiencyRows(rows: EfficiencyEntry[] | undefined): RankedEfficiencyEntry[] {
  if (!rows?.length) {
    return [];
  }

  return rows.map((row, index) => ({
    ...row,
    displayRank: index + 1,
  }));
}

function entriesByRound(entries: TestEntry[]) {
  return Array.from({ length: 10 }, (_, index) => {
    const round = `r${index + 1}`;
    return {
      round,
      items: Object.fromEntries(
        entries
          .filter((entry) => entry.round === round)
          .map((entry) => [entry.model, entry])
      ) as Partial<Record<(typeof MODEL_ORDER)[number], TestEntry>>,
    };
  });
}

function gradeClass(grade: string) {
  if (grade === 'A') return 'border-[#facc15] bg-[#facc15]/20 text-[#fef3c7]';
  if (grade === 'A-') return 'border-primary bg-primary/20 text-[#f5e9ff]';
  if (grade.startsWith('B')) return 'border-[#10b981] bg-[#10b981]/20 text-[#d1fae5]';
  if (grade.startsWith('C')) return 'border-[#f59e0b] bg-[#f59e0b]/20 text-[#fde68a]';
  if (grade === '待复测') return 'border-border bg-secondary text-muted-foreground';
  return 'border-destructive bg-destructive/20 text-destructive-foreground';
}

function RankCell({ rank, compact = false }: { rank: number | null; compact?: boolean }) {
  if (rank === null) {
    return <span className="text-[#6d6078]">待</span>;
  }

  if (rank <= 3) {
    return (
      <span
        className={`inline-flex items-center justify-center border border-[#17131d] bg-[#facc15] font-bold leading-none text-[#17131d] ${
          compact ? 'h-6 min-w-6 px-1.5 text-xs' : 'h-7 min-w-7 px-2 text-sm'
        }`}
      >
        {rank}
      </span>
    );
  }

  return (
    <span className={`${compact ? 'text-xs' : 'text-sm'} font-bold tabular-nums text-[#332b3d]`}>
      {rank}
    </span>
  );
}

function CrownMark({ rank }: { rank: number | null }) {
  if (!rank) {
    return null;
  }

  return (
    <span
      className="inline-flex items-center text-[#facc15] drop-shadow-[0_0_6px_rgba(250,204,21,0.6)]"
      title={`Top ${rank}`}
      aria-label="皇冠推荐"
    >
      <Crown className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
    </span>
  );
}

function PixelModelIcon({ icon }: { icon: string }) {
  const spec = PIXEL_ICON_SPECS[icon] || PIXEL_ICON_SPECS.diamond;
  const p = spec.pixelSize;

  return (
    <span
      className="inline-flex items-center justify-center align-middle"
      aria-hidden="true"
      style={{ width: spec.width * p, height: spec.height * p }}
    >
      <span
        className="relative"
        style={{
          width: p,
          height: p,
          backgroundColor: 'transparent',
          boxShadow: spec.pixels
            .map(([x, y]) => `${x * p}px ${y * p}px 0 ${spec.color}`)
            .join(', '),
          filter: `drop-shadow(0 0 4px ${spec.glow})`,
        }}
      />
    </span>
  );
}

function ScoreBadge({ entry }: { entry: TestEntry }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Badge className={cn('px-1.5 py-0.5 text-[10px]', gradeClass(entry.grade))}>
        {entry.grade}
      </Badge>
      <span className={entry.pending ? 'text-muted-foreground' : 'text-foreground'}>
        {formatScore(entry.score)}
      </span>
      <CrownMark rank={entry.crownRank} />
    </span>
  );
}

function TestHeader({ manifest, scored }: { manifest: TestManifest; scored: number }) {
  const links = [
    {
      href: manifest.repoUrl || 'https://github.com/FrichXi/personal-work-benchmark',
      label: 'GitHub',
      icon: Github,
      external: true,
    },
    {
      href: manifest.methodologyUrl || '/test/methodology/',
      label: '模型分析',
      icon: FileText,
      external: false,
    },
    {
      href: manifest.scoreCsvUrl || '/test/playwright-recheck-composite.csv',
      label: 'CSV',
      icon: Database,
      external: false,
    },
    {
      href: manifest.scoreJsonUrl || '/test/playwright-recheck-composite.json',
      label: 'JSON',
      icon: Database,
      external: false,
    },
    {
      href: '/test/legacy-6-model/',
      label: '旧榜单',
      icon: FileText,
      external: false,
    },
  ];

  return (
    <section className="mb-8 space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-4xl">
          <div className="mb-2 flex flex-wrap items-center gap-3">
            <h1 className="retro text-[24px] text-primary">葬AI Benchmark</h1>
            <span className="text-xs text-muted-foreground">
              {manifest.entries.length}/{manifest.expectedEntries} 个站点，{scored} 个已复测
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            真实工作任务多轮复现；模型、provider、runner 分开记录；结果只代表本次 Web4
            复杂个人网站任务。
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap lg:justify-end">
          {links.map((item) => {
            const Icon = item.icon;
            const content = (
              <>
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{item.label}</span>
                {item.external ? <ExternalLink className="h-3 w-3" aria-hidden="true" /> : null}
              </>
            );
            const className =
              'inline-flex items-center justify-center gap-2 border border-border px-3 py-2 text-xs text-foreground transition-colors hover:border-primary hover:text-primary';

            if (item.label === '模型分析') {
              return (
                <MethodologyTransitionLink key={item.label} href={item.href} className={className}>
                  {content}
                </MethodologyTransitionLink>
              );
            }

            return (
              <a
                key={item.label}
                href={item.href}
                target={item.external ? '_blank' : undefined}
                rel={item.external ? 'noopener noreferrer' : undefined}
                className={className}
              >
                {content}
              </a>
            );
          })}
        </div>
      </div>

      <p className="text-xs leading-6 text-muted-foreground">
        不是通用 benchmark：它把个人真实任务标准化后交给可替换 runner 反复执行，再用可审计证据评分。
      </p>
    </section>
  );
}

function SummaryTable({ summaries }: { summaries: ModelSummary[] }) {
  let rank = 0;
  const rankedSummaries = summaries.map((summary) => ({
    ...summary,
    displayRank: summary.avg === null ? null : ++rank,
  }));

  return (
    <div className="relative border-2 border-[#2f2938] bg-[#f5f1e8] pb-12 text-[#17131d] shadow-[8px_8px_0_#2f2938] md:pb-16">
      <div className="hidden overflow-x-auto p-2 md:block">
        <table className="w-full min-w-[780px] border-collapse text-[#17131d]">
          <thead className="border-b-2 border-[#17131d]">
            <tr>
              <th className="w-16 px-3 py-1.5 text-center text-[13px] font-bold text-[#43384f]">排名</th>
              <th className="px-3 py-1.5 text-left text-[13px] font-bold text-[#43384f]">模型版本</th>
              <th className="w-28 px-3 py-1.5 text-center text-[13px] font-bold text-[#43384f]">均分</th>
              <th className="w-32 px-3 py-1.5 text-center text-[13px] font-bold text-[#43384f]">区间</th>
              <th className="px-3 py-1.5 text-center text-[13px] font-bold text-[#43384f]">加载</th>
              <th className="px-3 py-1.5 text-center text-[13px] font-bold text-[#43384f]">图谱</th>
              <th className="px-3 py-1.5 text-center text-[13px] font-bold text-[#43384f]">文章</th>
              <th className="px-3 py-1.5 text-center text-[13px] font-bold text-[#43384f]">视觉</th>
              <th className="px-3 py-1.5 text-center text-[13px] font-bold text-[#43384f]">交互</th>
            </tr>
          </thead>
          <tbody>
            {rankedSummaries.map((summary) => (
              <tr
                key={summary.model}
                className="border-b border-[#d7cfbf] last:border-b-0 hover:bg-[#ebe4d6]"
              >
                <td className="px-3 py-1 text-center">
                  <RankCell rank={summary.displayRank} />
                </td>
                <td className="whitespace-normal px-3 py-1">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-7 w-7 items-center justify-center border border-[#2f2938] bg-[#211a2c]">
                      <PixelModelIcon icon={summary.icon} />
                    </span>
                    <span>
                      <span className="block text-base font-bold leading-6 text-[#17131d]">
                        {summary.version}
                      </span>
                      <span className="block text-[12px] leading-4 text-[#5d5368]">
                        {summary.model}
                      </span>
                    </span>
                  </div>
                </td>
                <td className="px-3 py-1 text-center text-[22px] font-bold leading-none tabular-nums text-[#17131d]">
                  {formatScore(summary.avg)}
                </td>
                <td className="px-3 py-1 text-center text-[13px] tabular-nums text-[#332b3d]">
                  {summary.min === null || summary.max === null
                    ? '待复测'
                    : `${formatScore(summary.min)}-${formatScore(summary.max)}`}
                </td>
                <td className="px-3 py-1 text-center text-[13px] tabular-nums text-[#332b3d]">
                  {formatScore(summary.loading)}
                </td>
                <td className="px-3 py-1 text-center text-[13px] tabular-nums text-[#332b3d]">
                  {formatScore(summary.graph)}
                </td>
                <td className="px-3 py-1 text-center text-[13px] tabular-nums text-[#332b3d]">
                  {formatScore(summary.articles)}
                </td>
                <td className="px-3 py-1 text-center text-[13px] tabular-nums text-[#332b3d]">
                  {formatScore(summary.visual)}
                </td>
                <td className="px-3 py-1 text-center text-[13px] tabular-nums text-[#332b3d]">
                  {formatScore(summary.interaction)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-1.5 p-2 md:hidden">
        {rankedSummaries.map((summary) => (
          <div
            key={summary.model}
            className="border border-[#d7cfbf] bg-[#fffaf0] p-2 text-[#17131d]"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-start gap-2">
                <RankCell rank={summary.displayRank} compact />
                <div className="min-w-0">
                  <div className="break-words text-[15px] font-bold leading-5 text-[#17131d]">
                    {summary.version}
                  </div>
                  <div className="text-[11px] leading-4 text-[#5d5368]">{summary.model}</div>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-[20px] font-bold leading-none tabular-nums text-[#17131d]">
                  {formatScore(summary.avg)}
                </div>
                <div className="mt-0.5 text-[10px] leading-none text-[#5d5368]">均分</div>
              </div>
            </div>
            <div className="mt-1.5 grid grid-cols-5 gap-1 text-center text-[11px] leading-3 text-[#332b3d]">
              <div><span className="block text-[10px] leading-3 text-[#6d6078]">加载</span>{formatScore(summary.loading)}</div>
              <div><span className="block text-[10px] leading-3 text-[#6d6078]">图谱</span>{formatScore(summary.graph)}</div>
              <div><span className="block text-[10px] leading-3 text-[#6d6078]">文章</span>{formatScore(summary.articles)}</div>
              <div><span className="block text-[10px] leading-3 text-[#6d6078]">视觉</span>{formatScore(summary.visual)}</div>
              <div><span className="block text-[10px] leading-3 text-[#6d6078]">交互</span>{formatScore(summary.interaction)}</div>
            </div>
          </div>
        ))}
      </div>
      <Image
        src="/scoreboard-logo.png"
        alt="葬AI"
        width={1400}
        height={774}
        className="pointer-events-none absolute bottom-2 right-2 h-9 w-auto md:bottom-3 md:right-4 md:h-12"
        style={{ imageRendering: 'pixelated' }}
      />
    </div>
  );
}

function CostEfficiencyTable({ rows }: { rows: RankedEfficiencyEntry[] }) {
  if (!rows.length) {
    return (
      <div className="border border-border p-4 text-sm text-muted-foreground">
        性价比数据暂缺。
      </div>
    );
  }

  return (
    <div className="relative border-2 border-[#2f2938] bg-[#f5f1e8] pb-8 text-[#17131d] shadow-[8px_8px_0_#2f2938]">
      <div className="hidden overflow-x-auto p-2 md:block">
        <table className="w-full min-w-[960px] border-collapse text-[#17131d]">
          <thead className="border-b-2 border-[#17131d]">
            <tr>
              <th className="w-24 px-3 py-1.5 text-center text-[13px] font-bold text-[#43384f]">性价比排名</th>
              <th className="px-3 py-1.5 text-left text-[13px] font-bold text-[#43384f]">模型版本</th>
              <th className="w-32 px-3 py-1.5 text-center text-[13px] font-bold text-[#43384f]">性价比指数</th>
              <th className="w-32 px-3 py-1.5 text-center text-[13px] font-bold text-[#43384f]">总 tokens</th>
              <th className="w-44 px-3 py-1.5 text-center text-[13px] font-bold text-[#43384f]">人民币价格</th>
              <th className="w-24 px-3 py-1.5 text-center text-[13px] font-bold text-[#43384f]">调用数</th>
              <th className="w-28 px-3 py-1.5 text-center text-[13px] font-bold text-[#43384f]">耗时</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.model}
                className="border-b border-[#d7cfbf] last:border-b-0 hover:bg-[#ebe4d6]"
                title={row.note || undefined}
              >
                <td className="px-3 py-1 text-center">
                  <RankCell rank={row.displayRank} />
                </td>
                <td className="whitespace-normal px-3 py-1">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-7 w-7 items-center justify-center border border-[#2f2938] bg-[#211a2c]">
                      <PixelModelIcon icon={row.modelIcon || MODEL_FALLBACKS[row.model as (typeof MODEL_ORDER)[number]]?.icon || 'diamond'} />
                    </span>
                    <span>
                      <span className="block text-base font-bold leading-6 text-[#17131d]">
                        {row.modelVersion}
                      </span>
                      <span className="block text-[12px] leading-4 text-[#5d5368]">
                        {row.model}
                      </span>
                    </span>
                  </div>
                </td>
                <td className="px-3 py-1 text-center text-[20px] font-bold tabular-nums text-[#17131d]">
                  {formatValueIndex(row.valueIndex)}
                </td>
                <td className="px-3 py-1 text-center text-[18px] font-bold tabular-nums text-[#17131d]">
                  {formatTokenTotal(row.tokensTotal)}
                </td>
                <td className="px-3 py-1 text-center text-[13px] font-bold tabular-nums text-[#332b3d]">
                  {row.costLabel}
                </td>
                <td className="px-3 py-1 text-center text-[13px] tabular-nums text-[#332b3d]">
                  {formatInteger(row.calls)}
                </td>
                <td className="px-3 py-1 text-center text-[13px] tabular-nums text-[#332b3d]">
                  {formatMinutes(row.wallMinutes)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-1.5 p-2 md:hidden">
        {rows.map((row) => (
          <div
            key={row.model}
            className="border border-[#d7cfbf] bg-[#fffaf0] p-2 text-[#17131d]"
            title={row.note || undefined}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-start gap-2">
                <RankCell rank={row.displayRank} compact />
                <div className="min-w-0">
                  <div className="break-words text-[15px] font-bold leading-5 text-[#17131d]">
                    {row.modelVersion}
                  </div>
                  <div className="text-[11px] leading-4 text-[#5d5368]">{row.model}</div>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-[18px] font-bold leading-none tabular-nums text-[#17131d]">
                  {formatValueIndex(row.valueIndex)}
                </div>
                <div className="mt-0.5 text-[10px] leading-none text-[#5d5368]">指数</div>
              </div>
            </div>
            <div className="mt-1.5 grid grid-cols-2 gap-1.5 text-center text-[11px] leading-3 text-[#332b3d]">
              <div><span className="block text-[10px] leading-3 text-[#6d6078]">tokens</span>{formatTokenTotal(row.tokensTotal)}</div>
              <div><span className="block text-[10px] leading-3 text-[#6d6078]">价格</span>{row.costLabel}</div>
              <div><span className="block text-[10px] leading-3 text-[#6d6078]">调用</span>{formatInteger(row.calls)}</div>
              <div><span className="block text-[10px] leading-3 text-[#6d6078]">耗时</span>{formatMinutes(row.wallMinutes)}</div>
            </div>
          </div>
        ))}
      </div>

      <Image
        src="/scoreboard-logo.png"
        alt="葬AI"
        width={1400}
        height={774}
        className="pointer-events-none absolute bottom-2 right-2 h-9 w-auto md:bottom-3 md:right-4 md:h-12"
        style={{ imageRendering: 'pixelated' }}
      />
    </div>
  );
}

function RoundMatrix({ entries }: { entries: TestEntry[] }) {
  const rounds = entriesByRound(entries);

  return (
    <div className="overflow-x-auto">
      <Table className="w-full min-w-[1180px]" layout="fill" align="center">
        <TableHeader>
          <TableRow>
            <TableHead className="w-20 text-[10px] md:text-xs">Round</TableHead>
            {MODEL_ORDER.map((model) => (
              <TableHead key={model} className="text-[10px] md:text-xs">
                <span className="block text-foreground">{model}</span>
                <span className="mt-0.5 block text-[9px] leading-none text-muted-foreground">
                  {MODEL_FALLBACKS[model].version}
                </span>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rounds.map(({ round, items }) => (
            <TableRow key={round}>
              <TableCell className="text-xs text-primary">{round}</TableCell>
              {MODEL_ORDER.map((model) => {
                const entry = items[model];

                if (!entry) {
                  return (
                    <TableCell key={model} className="text-xs text-muted-foreground">
                      缺失
                    </TableCell>
                  );
                }

                return (
                  <TableCell key={model} className="min-w-36 text-xs">
                    <a
                      href={entry.href}
                      className="inline-flex max-w-full items-center gap-2 text-foreground underline-offset-4 hover:text-primary hover:underline"
                      title={scoreTooltip(entry)}
                    >
                      <ScoreBadge entry={entry} />
                    </a>
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default function TestPage() {
  const manifest = readManifest();
  const summaries = summarize(manifest.entries);
  const efficiencyRows = rankEfficiencyRows(manifest.efficiencyLeaderboard);
  const scored = manifest.entries.filter((entry) => Number.isFinite(entry.score)).length;
  const scoreFormula = manifest.scoreFormula || 'loading 15 + graph/25*35 + articles/25*15 + visual 20 + interaction 15';

  return (
    <>
      <PageContainer className="space-y-10">
        <TestHeader manifest={manifest} scored={scored} />

        <section className="space-y-2 md:space-y-4" data-leaderboard-export>
          <div className="flex flex-col gap-1 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex items-center justify-between gap-3">
              <h2 className="retro text-[20px] leading-none text-primary">模型总榜</h2>
              <LeaderboardImageDownload buttonLabel="下载榜单图" />
            </div>
            <p className="hidden max-w-2xl text-xs leading-6 text-muted-foreground md:block lg:text-right">
              <span className="text-foreground">评分公式：</span>
              {scoreFormula}
            </p>
          </div>
          <SummaryTable summaries={summaries} />
        </section>

        <section className="space-y-2 md:space-y-4" data-value-leaderboard-export>
          <div className="flex flex-col gap-1 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex items-center justify-between gap-3">
              <h2 className="retro text-[20px] leading-none text-primary">性价比榜</h2>
              <LeaderboardImageDownload
                imageUrl="/test/value-leaderboard-mobile.png"
                fileNamePrefix="funeralai-value-leaderboard"
                shareTitle="葬AI 性价比榜"
                buttonLabel="下载性价比图"
              />
            </div>
            <p className="hidden max-w-2xl text-xs leading-6 text-muted-foreground md:block lg:text-right">
              按质量均分相对综合消耗排序，不影响模型总榜。
            </p>
          </div>
          <CostEfficiencyTable rows={efficiencyRows} />
        </section>

        <section className="space-y-4">
          <h2 className="retro text-[20px] text-primary">Round 矩阵</h2>
          <RoundMatrix entries={manifest.entries} />
        </section>
      </PageContainer>
      <Footer />
    </>
  );
}
