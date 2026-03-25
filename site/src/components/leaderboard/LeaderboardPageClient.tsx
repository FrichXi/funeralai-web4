'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { LEADERBOARD_SEGMENTS, SPONSORS_DATA } from '@/lib/constants';
import { SegmentTable } from '@/components/leaderboard/LeaderboardTabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/8bit/table';
import type { LeaderboardData, LeaderboardSegment } from '@/lib/types';

/** 5×2 pixel-art crown rendered with CSS box-shadow */
function PixelCrown() {
  const p = 3; // pixel size
  const c = '#facc15';
  return (
    <span
      className="inline-block relative align-middle"
      aria-hidden="true"
      style={{ width: 5 * p, height: 2 * p }}
    >
      <span
        className="absolute left-0 top-0"
        style={{
          width: p,
          height: p,
          backgroundColor: c,
          boxShadow: [
            `${2*p}px 0 0 ${c}`, `${4*p}px 0 0 ${c}`,
            `0 ${p}px 0 ${c}`, `${p}px ${p}px 0 ${c}`, `${2*p}px ${p}px 0 ${c}`, `${3*p}px ${p}px 0 ${c}`, `${4*p}px ${p}px 0 ${c}`,
          ].join(', '),
          filter: 'drop-shadow(0 0 4px rgba(250,204,21,0.5))',
        }}
      />
    </span>
  );
}

function SponsorTable() {
  return (
    <Table className="text-xs md:text-sm" layout="intrinsic" align="center">
      <TableHeader>
        <TableRow>
          <TableHead className="w-12 text-center text-[10px] md:text-xs">#</TableHead>
          <TableHead className="text-[10px] md:text-xs">Name</TableHead>
          <TableHead className="text-right text-[10px] md:text-xs">功德</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {SPONSORS_DATA.map((s) => (
          <TableRow key={s.rank}>
            <TableCell className="w-12 text-center">
              {s.rank === 1 ? <PixelCrown /> : s.rank}
            </TableCell>
            <TableCell className="font-bold text-foreground">
              {s.title && <span className="text-primary">{s.title} </span>}
              {s.name}
            </TableCell>
            <TableCell className="text-right text-[#facc15]">{s.karma}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function LeaderboardPageClient({ data }: { data: LeaderboardData }) {
  const [activeTab, setActiveTab] = useState<LeaderboardSegment>('products');

  return (
    <section>
      <div className="grid gap-y-8 lg:grid-cols-[max-content_max-content] lg:justify-center lg:items-start lg:gap-x-20 lg:gap-y-6">
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
          {LEADERBOARD_SEGMENTS.map((seg) => (
            <button
              key={seg.key}
              onClick={() => setActiveTab(seg.key)}
              className={cn(
                "retro text-[24px] transition-colors",
                activeTab === seg.key
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {seg.label}
            </button>
          ))}
        </div>

        <div className="hidden lg:block">
          <h2 className="retro text-center text-[24px] text-[#facc15]">功德榜</h2>
        </div>

        <div className="min-w-0">
          <SegmentTable entries={data.segments[activeTab]} />
        </div>

        <aside className="hidden lg:block">
          <SponsorTable />
        </aside>
      </div>
    </section>
  );
}
