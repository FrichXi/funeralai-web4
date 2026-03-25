'use client';

import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/8bit/tabs';
import { Badge } from '@/components/ui/8bit/badge';
import { LEADERBOARD_SEGMENTS, NODE_TYPE_LABELS, NODE_BADGE_CLASSES } from '@/lib/constants';
import type { LeaderboardData, LeaderboardEntry } from '@/lib/types';

interface LeaderboardSidebarProps {
  data: LeaderboardData;
  stats: { articleCount: number; nodeCount: number; linkCount: number };
  onFocusNode: (nodeId: string) => void;
}

function CompactEntry({
  entry,
  onFocusNode,
}: {
  entry: LeaderboardEntry;
  onFocusNode: (nodeId: string) => void;
}) {
  const typeLabel = NODE_TYPE_LABELS[entry.type] ?? entry.type;
  const badgeClasses =
    NODE_BADGE_CLASSES[entry.type] ?? 'bg-[#94a3b8] border-[#94a3b8] text-white';

  return (
    <button
      onClick={() => onFocusNode(entry.nodeId)}
      className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-secondary/50 rounded-sm"
    >
      {/* Rank */}
      <span className="w-6 shrink-0 text-center text-xs text-muted-foreground tabular-nums">
        {entry.rank}
      </span>

      {/* Name */}
      <span className="flex-1 min-w-0 text-xs text-foreground truncate">
        {entry.displayName}
      </span>

      {/* Type badge */}
      <Badge className={`text-[9px] px-1 py-0 shrink-0 ${badgeClasses}`}>
        {typeLabel}
      </Badge>

      {/* Mention count */}
      <span className="w-8 shrink-0 text-right text-[10px] text-muted-foreground tabular-nums">
        {entry.mention_count}
      </span>
    </button>
  );
}

export function LeaderboardSidebar({
  data,
  stats,
  onFocusNode,
}: LeaderboardSidebarProps) {
  return (
    <div className="flex h-full flex-col">
      <Tabs defaultValue="products" className="flex h-full flex-col">
        {/* Tabs at very top */}
        <TabsList className="shrink-0 border-b border-border flex flex-nowrap w-full px-0.5 py-1.5">
          {LEADERBOARD_SEGMENTS.map((seg) => (
            <TabsTrigger
              key={seg.key}
              value={seg.key}
              className="px-1 py-1 min-w-0"
            >
              {seg.label}
              <span className="ml-0.5 text-[10px] text-muted-foreground">
                {data.segments[seg.key].length}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Compact stats line */}
        <div className="shrink-0 px-3 py-1.5 text-[9px] text-muted-foreground border-b border-border/50">
          {stats.nodeCount} 节点 · {stats.linkCount} 边 · {stats.articleCount} 篇文章
        </div>

        {/* Tab content - scrollable */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {LEADERBOARD_SEGMENTS.map((seg) => (
            <TabsContent key={seg.key} value={seg.key} className="mt-0 pb-4">
              <div className="flex flex-col">
                {data.segments[seg.key].map((entry) => (
                  <CompactEntry
                    key={`${entry.nodeId}-${entry.rank}`}
                    entry={entry}
                    onFocusNode={onFocusNode}
                  />
                ))}
                {data.segments[seg.key].length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-10">
                    暂无数据
                  </p>
                )}
              </div>
            </TabsContent>
          ))}
        </div>
      </Tabs>
    </div>
  );
}
