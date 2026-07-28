import type { Metadata } from 'next';
import Image from 'next/image';
import fs from 'fs';
import path from 'path';
import { createHash } from 'node:crypto';
import { Archive, ExternalLink, FileText, Github } from 'lucide-react';
import { Footer } from '@/components/layout/Footer';
import { PageContainer } from '@/components/layout/PageContainer';
import { BenchmarkVoteControls } from '@/components/test/BenchmarkVoteControls';
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
  title: '模型测试榜单 - 葬AI Web4',
  description: '葬AI Web4 真实工程任务模型测试榜单与完整测试产物。',
  robots: { index: false, follow: false },
};

interface EngineeringRow {
  tier: string;
  model_id: string;
  model: string;
  slug: string;
  icon: string;
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
  slug: string;
  icon: string;
  value_index: number;
  score_mean: number;
  cost_cny_10_tasks: number;
  avg_wall_minutes: number;
  api_calls_10_tasks: number;
  cost_basis: string;
}

interface TestEntry {
  id: string;
  round: string;
  roundNumber: number;
  model: string;
  modelId: string;
  modelVersion: string;
  modelIcon: string;
  modelSlug: string;
  href: string;
  rawArchiveHref: string;
  score: number;
  grade: string;
  evidence: string;
  state: string;
  sourceTreeSha256: string;
  sourceFileCount: number;
  sourceBytes: number;
  rawArchiveSha256: string;
}

interface TestManifest {
  releaseId: string;
  generatedAt: string;
  sourceGeneratedAt: string;
  snapshotDate: string;
  dataVersion: string;
  scoreStandard: string;
  expectedEntries: number;
  pricingAsOf: string;
  scope: string;
  repoUrl: string;
  methodologyUrl: string;
  scoreCsvUrl: string;
  scoreJsonUrl: string;
  reportUrl: string;
  archiveUrl: string;
  scoreFormula: string;
  limitations: string[];
  engineeringLeaderboard: EngineeringRow[];
  valueLeaderboard: ValueRow[];
  entries: TestEntry[];
}

const ICON_SPECS: Record<string, { color: string; pixels: Array<[number, number]> }> = {
  diamond: { color: '#fde047', pixels: [[2, 0], [1, 1], [2, 1], [3, 1], [0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [1, 3], [2, 3], [3, 3], [2, 4]] },
  moon: { color: '#c4b5fd', pixels: [[2, 0], [3, 0], [1, 1], [0, 2], [0, 3], [1, 4], [2, 4], [3, 3], [2, 2]] },
  grid: { color: '#9b7de8', pixels: [[0, 0], [2, 0], [4, 0], [1, 1], [3, 1], [0, 2], [2, 2], [4, 2], [1, 3], [3, 3], [0, 4], [2, 4], [4, 4]] },
  spark: { color: '#fb7185', pixels: [[2, 0], [2, 1], [0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [2, 3], [2, 4]] },
  bolt: { color: '#10b981', pixels: [[3, 0], [2, 1], [1, 2], [2, 2], [0, 3], [1, 3], [0, 4]] },
  crystal: { color: '#38bdf8', pixels: [[2, 0], [1, 1], [2, 1], [3, 1], [0, 2], [2, 2], [4, 2], [1, 3], [3, 3], [2, 4]] },
};

function readManifest(): TestManifest {
  const manifestPath = path.join(process.cwd(), 'public', 'test', 'manifest.json');
  return JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as TestManifest;
}

function formatScore(value: number) {
  return value.toFixed(2);
}

function formatCost(value: number | null, basis: string) {
  if (value === null) return '订阅制，无法折现';
  return `${basis === 'official_counterfactual_proxy' ? '估算 ' : ''}¥${value.toFixed(3)}`;
}

function formatBytes(value: number) {
  if (value >= 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.round(value / 1024)} KB`;
}

function gradeClass(grade: string) {
  if (grade === 'S') return 'border-[#facc15] bg-[#facc15]/25 text-[#5b4600]';
  if (grade === 'A') return 'border-[#7351cf] bg-[#7351cf]/20 text-[#3b247a]';
  if (grade === 'B') return 'border-[#10b981] bg-[#10b981]/20 text-[#065f46]';
  if (grade === 'C') return 'border-[#38bdf8] bg-[#38bdf8]/20 text-[#075985]';
  if (grade === 'D') return 'border-[#f59e0b] bg-[#f59e0b]/20 text-[#92400e]';
  return 'border-[#ef4444] bg-[#ef4444]/15 text-[#991b1b]';
}

function PixelModelIcon({ icon }: { icon: string }) {
  const spec = ICON_SPECS[icon] || ICON_SPECS.diamond;
  return (
    <span className="relative block h-[15px] w-[15px]" aria-hidden="true">
      <span
        className="absolute left-0 top-0 h-[3px] w-[3px]"
        style={{ boxShadow: spec.pixels.map(([x, y]) => `${x * 3}px ${y * 3}px 0 ${spec.color}`).join(', ') }}
      />
    </span>
  );
}

function buildBenchmarkVersion(manifest: TestManifest) {
  const digest = createHash('sha256')
    .update(JSON.stringify({ releaseId: manifest.releaseId, generatedAt: manifest.sourceGeneratedAt, rows: manifest.engineeringLeaderboard }))
    .digest('hex')
    .slice(0, 16);
  return `${manifest.releaseId}:${digest}`;
}

function TestHeader({ manifest }: { manifest: TestManifest }) {
  const links = [
    { href: manifest.repoUrl, label: 'GitHub', icon: Github, external: true },
    { href: manifest.methodologyUrl, label: '模型分析', icon: FileText, external: false },
    { href: manifest.archiveUrl, label: '旧榜单', icon: Archive, external: false },
  ];

  return (
    <section className="mb-8 space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-4xl">
          <div className="mb-2 flex flex-wrap items-center gap-3">
            <h1 className="retro text-[24px] text-primary">葬AI Benchmark</h1>
            <span className="text-xs text-muted-foreground">{manifest.entries.length}/{manifest.expectedEntries} 个正式测试产物</span>
          </div>
          <p className="text-sm leading-6 text-muted-foreground">
            真实工作任务多轮复现；模型、provider、runner 分开记录；结果只代表本次 Web4 复杂个人网站工程任务。
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap lg:justify-end">
          {links.map((item) => {
            const Icon = item.icon;
            const content = <><Icon className="h-3.5 w-3.5" aria-hidden="true" /><span>{item.label}</span>{item.external ? <ExternalLink className="h-3 w-3" aria-hidden="true" /> : null}</>;
            const className = 'inline-flex items-center justify-center gap-2 border border-border px-3 py-2 text-xs text-foreground transition-colors hover:border-primary hover:text-primary';
            if (item.label === '模型分析') return <MethodologyTransitionLink key={item.label} href={item.href} className={className}>{content}</MethodologyTransitionLink>;
            return <a key={item.label} href={item.href} target={item.external ? '_blank' : undefined} rel={item.external ? 'noopener noreferrer' : undefined} className={className}>{content}</a>;
          })}
        </div>
      </div>
      <p className="text-xs leading-6 text-muted-foreground">
        模型总榜按平均分每 10 分划档，同档不做精确排名；原始交付文件以完整归档保存，网页浏览副本只做路径兼容处理。
      </p>
    </section>
  );
}

function EngineeringTable({ rows, benchmarkVersion }: { rows: EngineeringRow[]; benchmarkVersion: string }) {
  return (
    <div className="relative overflow-hidden border-2 border-[#2f2938] bg-[#f5f1e8] pb-12 text-[#17131d] shadow-[8px_8px_0_#2f2938]">
      <div className="hidden overflow-x-auto p-2 md:block">
        <table className="w-full min-w-[1040px] border-collapse">
          <thead className="border-b-2 border-[#17131d] text-[13px] text-[#43384f]"><tr>
            <th className="w-16 px-3 py-2 text-center">档位</th><th className="px-3 py-2 text-left">模型版本</th>
            <th className="px-3 py-2 text-center">平均分</th><th className="px-3 py-2 text-center">中位数</th>
            <th className="px-3 py-2 text-center">平均耗时/任务</th><th className="px-3 py-2 text-center">调用数（10任务）</th>
            <th className="px-3 py-2 text-center">10任务 API 成本</th>
          </tr></thead>
          <tbody>{rows.map((row) => <tr key={row.model_id} className="border-b border-[#d7cfbf] last:border-b-0 hover:bg-[#ebe4d6]">
            <td className="px-3 py-2 text-center"><Badge className={cn('min-w-8 justify-center px-2 py-1 text-xs', gradeClass(row.tier))}>{row.tier}</Badge></td>
            <td className="px-3 py-2"><div className="flex items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><span className="inline-flex h-7 w-7 shrink-0 items-center justify-center border border-[#2f2938] bg-[#211a2c]"><PixelModelIcon icon={row.icon} /></span><span className="font-bold">{row.model}</span></div><BenchmarkVoteControls leaderboardId="model_total" benchmarkVersion={benchmarkVersion} modelSlug={row.slug} modelName={row.model} modelVersion={row.model} /></div></td>
            <td className="px-3 py-2 text-center text-xl font-bold tabular-nums">{formatScore(row.score_mean)}</td>
            <td className="px-3 py-2 text-center tabular-nums">{formatScore(row.score_median)}</td>
            <td className="px-3 py-2 text-center tabular-nums">{row.avg_wall_minutes.toFixed(2)} 分钟</td>
            <td className="px-3 py-2 text-center tabular-nums">{row.api_calls_10_tasks}</td>
            <td className="px-3 py-2 text-center font-bold tabular-nums">{formatCost(row.cost_cny_10_tasks, row.cost_basis)}</td>
          </tr>)}</tbody>
        </table>
      </div>
      <div className="space-y-1.5 p-2 md:hidden">
        {rows.map((row) => <div key={row.model_id} className="border border-[#d7cfbf] bg-[#fffaf0] p-2.5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2"><Badge className={cn('min-w-8 justify-center px-2 py-1 text-xs', gradeClass(row.tier))}>{row.tier}</Badge><span className="inline-flex h-7 w-7 shrink-0 items-center justify-center border border-[#2f2938] bg-[#211a2c]"><PixelModelIcon icon={row.icon} /></span><span className="break-words text-[15px] font-bold leading-5">{row.model}</span></div>
            <div className="shrink-0 text-right"><div className="text-xl font-bold tabular-nums">{formatScore(row.score_mean)}</div><div className="text-[9px] text-[#6d6078]">平均分</div></div>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 border-t border-[#d7cfbf] pt-2 text-[11px] text-[#332b3d]">
            <div><span className="text-[#6d6078]">中位数 </span><b>{formatScore(row.score_median)}</b></div><div><span className="text-[#6d6078]">平均耗时 </span><b>{row.avg_wall_minutes.toFixed(2)} 分钟</b></div>
            <div><span className="text-[#6d6078]">调用数 </span><b>{row.api_calls_10_tasks}</b></div><div><span className="text-[#6d6078]">10任务成本 </span><b>{formatCost(row.cost_cny_10_tasks, row.cost_basis)}</b></div>
          </div>
        </div>)}
      </div>
      <Image src="/scoreboard-logo.png" alt="葬AI" width={1400} height={774} className="pointer-events-none absolute bottom-2 right-3 h-9 w-auto" style={{ imageRendering: 'pixelated' }} />
    </div>
  );
}

function ValueTable({ rows }: { rows: ValueRow[] }) {
  return (
    <div className="relative overflow-hidden border-2 border-[#2f2938] bg-[#f5f1e8] pb-10 text-[#17131d] shadow-[8px_8px_0_#2f2938]">
      <div className="hidden overflow-x-auto p-2 md:block"><table className="w-full min-w-[1040px] border-collapse">
        <thead className="border-b-2 border-[#17131d] text-[13px] text-[#43384f]"><tr>
          <th className="px-3 py-2 text-center">排名</th><th className="px-3 py-2 text-left">模型版本</th><th className="px-3 py-2 text-center">性价比指数</th>
          <th className="px-3 py-2 text-center">平均分</th><th className="px-3 py-2 text-center">10任务 API 成本</th><th className="px-3 py-2 text-center">平均耗时/任务</th><th className="px-3 py-2 text-center">调用数（10任务）</th>
        </tr></thead>
        <tbody>{rows.map((row) => <tr key={row.model_id} className="border-b border-[#d7cfbf] last:border-b-0 hover:bg-[#ebe4d6]">
          <td className="px-3 py-2 text-center"><span className={cn('inline-flex h-7 min-w-7 items-center justify-center border px-2 font-bold', row.rank <= 3 ? 'border-[#17131d] bg-[#facc15]' : 'border-[#a99e8b]')}>{row.rank}</span></td>
          <td className="px-3 py-2"><div className="flex items-center gap-3"><span className="inline-flex h-7 w-7 items-center justify-center border border-[#2f2938] bg-[#211a2c]"><PixelModelIcon icon={row.icon} /></span><span className="font-bold">{row.model}</span></div></td>
          <td className="px-3 py-2 text-center text-xl font-bold tabular-nums">{row.value_index.toFixed(2)}</td><td className="px-3 py-2 text-center tabular-nums">{formatScore(row.score_mean)}</td>
          <td className="px-3 py-2 text-center font-bold tabular-nums">{formatCost(row.cost_cny_10_tasks, row.cost_basis)}</td><td className="px-3 py-2 text-center tabular-nums">{row.avg_wall_minutes.toFixed(2)} 分钟</td><td className="px-3 py-2 text-center tabular-nums">{row.api_calls_10_tasks}</td>
        </tr>)}</tbody>
      </table></div>
      <div className="space-y-1.5 p-2 md:hidden">
        {rows.map((row) => <div key={row.model_id} className="border border-[#d7cfbf] bg-[#fffaf0] p-2.5">
          <div className="flex items-start justify-between gap-2"><div className="flex min-w-0 items-center gap-2"><span className={cn('inline-flex h-7 min-w-7 items-center justify-center border px-2 font-bold', row.rank <= 3 ? 'border-[#17131d] bg-[#facc15]' : 'border-[#a99e8b]')}>{row.rank}</span><span className="inline-flex h-7 w-7 shrink-0 items-center justify-center border border-[#2f2938] bg-[#211a2c]"><PixelModelIcon icon={row.icon} /></span><span className="break-words text-[15px] font-bold leading-5">{row.model}</span></div><div className="shrink-0 text-right"><div className="text-xl font-bold tabular-nums">{row.value_index.toFixed(2)}</div><div className="text-[9px] text-[#6d6078]">性价比指数</div></div></div>
          <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 border-t border-[#d7cfbf] pt-2 text-[11px] text-[#332b3d]"><div><span className="text-[#6d6078]">平均分 </span><b>{formatScore(row.score_mean)}</b></div><div><span className="text-[#6d6078]">平均耗时 </span><b>{row.avg_wall_minutes.toFixed(2)} 分钟</b></div><div><span className="text-[#6d6078]">调用数 </span><b>{row.api_calls_10_tasks}</b></div><div><span className="text-[#6d6078]">10任务成本 </span><b>{formatCost(row.cost_cny_10_tasks, row.cost_basis)}</b></div></div>
        </div>)}
      </div>
      <Image src="/scoreboard-logo.png" alt="葬AI" width={1400} height={774} className="pointer-events-none absolute bottom-2 right-3 h-8 w-auto" style={{ imageRendering: 'pixelated' }} />
    </div>
  );
}

function RoundMatrix({ manifest }: { manifest: TestManifest }) {
  const byKey = new Map(manifest.entries.map((entry) => [`${entry.roundNumber}:${entry.modelId}`, entry]));
  return (
    <div className="overflow-x-auto">
      <Table className="min-w-[2700px]" layout="fill" align="center">
        <TableHeader><TableRow><TableHead className="w-20">Round</TableHead>{manifest.engineeringLeaderboard.map((model) => <TableHead key={model.model_id} className="min-w-40 text-[10px]"><span className="block text-foreground">{model.model}</span><span className="block text-[9px] text-muted-foreground">{model.tier} 档</span></TableHead>)}</TableRow></TableHeader>
        <TableBody>{Array.from({ length: 10 }, (_, index) => index + 1).map((round) => <TableRow key={round}><TableCell className="text-xs text-primary">r{round}</TableCell>{manifest.engineeringLeaderboard.map((model) => {
          const entry = byKey.get(`${round}:${model.model_id}`);
          if (!entry) return <TableCell key={model.model_id} className="text-xs text-destructive">缺失</TableCell>;
          return <TableCell key={model.model_id} className="min-w-40 text-xs"><div className="flex items-center gap-2"><a href={entry.href} className="inline-flex items-center gap-1.5 underline-offset-4 hover:text-primary hover:underline" title={`${entry.evidence}\n文件 ${entry.sourceFileCount} · ${formatBytes(entry.sourceBytes)}\nTree SHA-256 ${entry.sourceTreeSha256}`}><Badge className={cn('px-1.5 py-0.5 text-[10px]', gradeClass(entry.grade))}>{entry.grade}</Badge><span className="tabular-nums">{formatScore(entry.score)}</span></a><a href={entry.rawArchiveHref} className="text-[9px] text-muted-foreground hover:text-primary" title={`完整原始归档 · SHA-256 ${entry.rawArchiveSha256}`}>RAW</a></div></TableCell>;
        })}</TableRow>)}</TableBody>
      </Table>
    </div>
  );
}

export default function TestPage() {
  const manifest = readManifest();
  const benchmarkVersion = buildBenchmarkVersion(manifest);
  const modelImageVersion = `${manifest.sourceGeneratedAt}|${manifest.releaseId}|${manifest.engineeringLeaderboard.map((row) => `${row.model_id}:${row.score_mean}`).join('|')}`;
  const valueImageVersion = `${manifest.sourceGeneratedAt}|${manifest.releaseId}|${manifest.valueLeaderboard.map((row) => `${row.model_id}:${row.value_index}`).join('|')}`;
  return <>
    <PageContainer className="space-y-10">
      <TestHeader manifest={manifest} />
      <section className="space-y-4" data-leaderboard-export>
        <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between"><div className="flex items-center justify-between gap-3"><h2 className="retro text-[20px] text-primary">模型总榜</h2><LeaderboardImageDownload imageVersion={modelImageVersion} buttonLabel="下载榜单图" /></div><p className="text-xs leading-6 text-muted-foreground">{manifest.scoreFormula}</p></div>
        <EngineeringTable rows={manifest.engineeringLeaderboard} benchmarkVersion={benchmarkVersion} />
      </section>
      <section className="space-y-4" data-value-leaderboard-export>
        <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between"><div className="flex items-center justify-between gap-3"><h2 className="retro text-[20px] text-primary">性价比榜</h2><LeaderboardImageDownload imageUrl="/test/value-leaderboard.png" imageVersion={valueImageVersion} fileNamePrefix="funeralai-value-leaderboard" shareTitle="葬AI 性价比榜" buttonLabel="下载性价比图" /></div><p className="text-xs leading-6 text-muted-foreground">Qwen 3.8 暂无可换算的公开 API 单价，因此不参与性价比排名。</p></div>
        <ValueTable rows={manifest.valueLeaderboard} />
      </section>
      <section className="space-y-4"><div><h2 className="retro text-[20px] text-primary">Round 矩阵</h2><p className="mt-2 text-xs leading-6 text-muted-foreground">点击分数打开兼容浏览副本；RAW 下载完整原始归档。每个归档及源目录均记录独立 SHA-256。</p></div><RoundMatrix manifest={manifest} /></section>
    </PageContainer>
    <Footer />
  </>;
}
