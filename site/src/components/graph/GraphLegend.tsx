'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { NODE_COLORS, NODE_TYPE_LABELS, RELATION_CATEGORIES } from '@/lib/constants';

export function GraphLegend() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="absolute bottom-4 left-4 z-20 rounded border border-border bg-background/80 backdrop-blur-sm text-xs">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex w-full items-center justify-between gap-4 px-3 py-2 text-left text-muted-foreground hover:text-foreground transition-colors"
      >
        <span className="retro text-[10px]">图例</span>
        {collapsed ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
      </button>

      {!collapsed && (
        <div className="px-3 pb-3 space-y-3">
          {/* Node types */}
          <div className="space-y-1.5">
            <p className="text-muted-foreground text-[10px]">节点类型</p>
            {Object.entries(NODE_COLORS).map(([type, color]) => (
              <div key={type} className="flex items-center gap-2">
                <span
                  className="inline-block size-3 rounded-full border"
                  style={{ backgroundColor: color, borderColor: `${color}88` }}
                />
                <span className="text-foreground">{NODE_TYPE_LABELS[type]}</span>
              </div>
            ))}
          </div>

          {/* Edge categories */}
          <div className="space-y-1.5">
            <p className="text-muted-foreground text-[10px]">关系类型</p>
            {RELATION_CATEGORIES.map((cat) => (
              <div key={cat.key} className="flex items-center gap-2">
                <span
                  className="inline-block h-0.5 w-4"
                  style={{ backgroundColor: cat.color }}
                />
                <span className="text-foreground">{cat.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
