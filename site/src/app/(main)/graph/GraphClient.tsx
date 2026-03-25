'use client';

import { useState, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { LeaderboardSidebar } from '@/components/leaderboard/LeaderboardSidebar';
import { Spinner } from '@/components/ui/8bit/spinner';
import type { LeaderboardData } from '@/lib/types';

const GraphCanvas = dynamic(() => import('@/components/graph/GraphCanvas'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center">
      <Spinner className="size-8 text-primary" />
    </div>
  ),
});

interface GraphClientProps {
  leaderboard: LeaderboardData;
  stats: { articleCount: number; nodeCount: number; linkCount: number };
}

export function GraphClient({ leaderboard, stats }: GraphClientProps) {
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null);

  return (
    <div className="flex h-[calc(100vh-var(--navbar-height))]">
      <div className="flex-1 min-w-0 relative">
        <Suspense
          fallback={
            <div className="flex h-full w-full items-center justify-center">
              <Spinner className="size-8 text-primary" />
            </div>
          }
        >
          <GraphCanvas focusNodeId={focusNodeId} />
        </Suspense>
      </div>
      <aside className="w-[300px] shrink-0 border-l border-border hidden lg:block overflow-y-auto bg-background">
        <LeaderboardSidebar
          data={leaderboard}
          stats={stats}
          onFocusNode={setFocusNodeId}
        />
      </aside>
    </div>
  );
}
