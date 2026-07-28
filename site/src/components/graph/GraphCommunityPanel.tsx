'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Network } from 'lucide-react';
import type { GraphCommunity } from '@/lib/types';

interface GraphCommunityPanelProps {
  communities: GraphCommunity[];
  onFocusCommunity: (communityId: string) => void;
}

export function GraphCommunityPanel({ communities, onFocusCommunity }: GraphCommunityPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const topCommunities = useMemo(
    () => communities.slice().sort((a, b) => b.node_count - a.node_count).slice(0, 8),
    [communities]
  );

  if (topCommunities.length === 0) return null;

  return (
    <div className="absolute right-4 top-4 z-20 hidden w-64 rounded border border-border bg-background/80 text-xs backdrop-blur-sm md:block">
      <button
        type="button"
        onClick={() => setCollapsed((value) => !value)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-muted-foreground transition-colors hover:text-foreground"
      >
        <span className="flex items-center gap-1.5 text-[10px]">
          <Network className="size-3" aria-hidden="true" />
          社区速览
        </span>
        {collapsed ? <ChevronDown className="size-3" /> : <ChevronUp className="size-3" />}
      </button>

      {!collapsed && (
        <div className="space-y-1 border-t border-border px-2 py-2">
          {topCommunities.map((community) => (
            <button
              key={community.id}
              type="button"
              onClick={() => onFocusCommunity(community.id)}
              className="flex w-full items-center gap-2 rounded px-1.5 py-1.5 text-left transition-colors hover:bg-secondary"
              title={community.name}
            >
              <span
                className="inline-block size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: community.color }}
              />
              <span className="min-w-0 flex-1 truncate text-foreground">
                {community.name}
              </span>
              <span className="shrink-0 text-[10px] text-muted-foreground">
                {community.node_count}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
