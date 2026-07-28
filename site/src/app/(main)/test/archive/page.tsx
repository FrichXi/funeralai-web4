import type { Metadata } from 'next';
import fs from 'fs';
import path from 'path';
import { ArrowLeft, FileText } from 'lucide-react';
import { Footer } from '@/components/layout/Footer';
import { PageContainer } from '@/components/layout/PageContainer';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/8bit/table';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: '旧榜单归档 - 葬AI Benchmark',
  description: '葬AI Benchmark 历史榜单及原测试站点归档。',
  robots: { index: false, follow: false },
};

interface LegacyEntry {
  round: string;
  roundNumber: number;
  model: string;
  modelVersion?: string;
  href: string;
  score: number | null;
  grade: string;
}

interface LegacyManifest {
  generatedAt: string;
  snapshotDate?: string;
  dataVersion?: string;
  scoreStandard: string;
  expectedEntries: number;
  entries: LegacyEntry[];
}

function readLegacyManifest(): LegacyManifest {
  const manifestPath = path.join(
    process.cwd(),
    'public',
    'test',
    'archive',
    '2026-06-24-web4-rebuild',
    'manifest.json'
  );
  return JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as LegacyManifest;
}

function formatScore(value: number | null) {
  return value === null || !Number.isFinite(value) ? '待复测' : value.toFixed(1);
}

export default function TestArchivePage() {
  const manifest = readLegacyManifest();
  const models = Array.from(new Set(manifest.entries.map((entry) => entry.model)));
  const summaries = models
    .map((model) => {
      const entries = manifest.entries.filter((entry) => entry.model === model);
      const scores = entries.map((entry) => entry.score).filter((score): score is number => Number.isFinite(score));
      return {
        model,
        version: entries[0]?.modelVersion || model,
        average: scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : null,
        entries,
      };
    })
    .sort((a, b) => (b.average ?? -Infinity) - (a.average ?? -Infinity));
  const byKey = new Map(manifest.entries.map((entry) => [`${entry.roundNumber}:${entry.model}`, entry]));

  return <>
    <PageContainer className="space-y-8">
      <header className="space-y-4">
        <a href="/test/" className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-primary"><ArrowLeft className="h-3.5 w-3.5" />返回当前榜单</a>
        <div><h1 className="retro text-[24px] text-primary">旧榜单</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">2026-06-24 Web4 重构榜单，完整保留原来的 80 个测试站点与评分口径。</p></div>
        <div className="flex flex-wrap gap-2"><a href="/test/archive/2026-06-24-web4-rebuild/playwright-recheck-composite.csv" className="inline-flex items-center gap-2 border border-border px-3 py-2 text-xs hover:border-primary hover:text-primary"><FileText className="h-3.5 w-3.5" />旧榜 CSV</a><a href="/test/legacy-6-model/" className="inline-flex items-center gap-2 border border-border px-3 py-2 text-xs hover:border-primary hover:text-primary"><FileText className="h-3.5 w-3.5" />更早的 6 模型榜单</a></div>
      </header>

      <section className="space-y-4"><h2 className="retro text-[20px] text-primary">模型总榜 · 2026-06-24</h2><div className="overflow-x-auto border-2 border-[#2f2938] bg-[#f5f1e8] p-2 text-[#17131d] shadow-[8px_8px_0_#2f2938]"><table className="w-full min-w-[680px] border-collapse"><thead className="border-b-2 border-[#17131d]"><tr><th className="px-3 py-2 text-center">排名</th><th className="px-3 py-2 text-left">模型版本</th><th className="px-3 py-2 text-center">10 轮均分</th><th className="px-3 py-2 text-center">站点数</th></tr></thead><tbody>{summaries.map((summary, index) => <tr key={summary.model} className="border-b border-[#d7cfbf] last:border-b-0"><td className="px-3 py-2 text-center font-bold">{index + 1}</td><td className="px-3 py-2 font-bold">{summary.version}</td><td className="px-3 py-2 text-center text-xl font-bold tabular-nums">{formatScore(summary.average)}</td><td className="px-3 py-2 text-center">{summary.entries.length}</td></tr>)}</tbody></table></div></section>

      <section className="space-y-4"><h2 className="retro text-[20px] text-primary">原 Round 矩阵</h2><div className="overflow-x-auto"><Table className="min-w-[1400px]" layout="fill" align="center"><TableHeader><TableRow><TableHead>Round</TableHead>{models.map((model) => <TableHead key={model}>{manifest.entries.find((entry) => entry.model === model)?.modelVersion || model}</TableHead>)}</TableRow></TableHeader><TableBody>{Array.from({ length: 10 }, (_, index) => index + 1).map((round) => <TableRow key={round}><TableCell className="text-primary">r{round}</TableCell>{models.map((model) => { const entry = byKey.get(`${round}:${model}`); return <TableCell key={model}>{entry ? <a href={entry.href} className="underline-offset-4 hover:text-primary hover:underline">{entry.grade} · {formatScore(entry.score)}</a> : '缺失'}</TableCell>; })}</TableRow>)}</TableBody></Table></div></section>
    </PageContainer>
    <Footer />
  </>;
}
