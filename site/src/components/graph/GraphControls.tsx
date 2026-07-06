'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { Core } from 'cytoscape';
import { Network, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/8bit/input';
import { NODE_COLORS, NODE_TYPE_LABELS } from '@/lib/constants';
import type { GraphTopologyMode } from '@/hooks/useGraphInteraction';

interface GraphControlsProps {
  cy: Core | null;
  onSelectNode: (nodeId: string) => void;
  typeFilters: Record<string, boolean>;
  onToggleType: (type: string) => void;
  topologyMode: GraphTopologyMode;
  onSetTopologyMode: (mode: GraphTopologyMode) => void;
  graphStats: {
    totalNodes: number;
    visibleNodes: number;
    isolated: number;
    leaf: number;
    totalLinks: number;
  } | null;
}

interface SearchResult {
  id: string;
  label: string;
  type: string;
}

const TOPOLOGY_MODES: Array<{ value: GraphTopologyMode; label: string; title: string }> = [
  { value: 'connected', label: '连通', title: '隐藏没有关系的孤立节点' },
  { value: 'core', label: '核心', title: '只显示至少有两条关系的节点' },
  { value: 'all', label: '全量', title: '显示所有节点，包括待补边孤点' },
];

export function GraphControls({
  cy,
  onSelectNode,
  typeFilters,
  onToggleType,
  topologyMode,
  onSetTopologyMode,
  graphStats,
}: GraphControlsProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const handleSearch = useCallback((value: string) => {
    setQuery(value);
    if (!cy || value.trim().length === 0) {
      setResults([]);
      setShowResults(false);
      return;
    }

    const q = value.toLowerCase();
    const matched: SearchResult[] = [];

    cy.nodes().forEach((node) => {
      if (node.hasClass('filtered-out')) return;

      const label = (node.data('label') as string || '').toLowerCase();
      const aliases = (node.data('aliases') as string[] || []);
      const matchesAlias = aliases.some((a: string) => a.toLowerCase().includes(q));

      if (label.includes(q) || matchesAlias) {
        matched.push({
          id: node.id(),
          label: node.data('label') as string,
          type: node.data('type') as string,
        });
      }
    });

    // Sort by relevance: exact match first, then starts-with, then includes
    matched.sort((a, b) => {
      const aL = a.label.toLowerCase();
      const bL = b.label.toLowerCase();
      if (aL === q && bL !== q) return -1;
      if (bL === q && aL !== q) return 1;
      if (aL.startsWith(q) && !bL.startsWith(q)) return -1;
      if (bL.startsWith(q) && !aL.startsWith(q)) return 1;
      return 0;
    });

    setResults(matched.slice(0, 10));
    setShowResults(matched.length > 0);
  }, [cy]);

  const handleSelect = useCallback((nodeId: string) => {
    setShowResults(false);
    setQuery('');
    onSelectNode(nodeId);
  }, [onSelectNode]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div
      ref={panelRef}
      className="absolute top-4 left-4 z-20 w-64 rounded border border-border bg-background/80 backdrop-blur-sm"
    >
      {/* Search */}
      <div className="relative p-2">
        <div className="relative flex items-center">
          <Search className="absolute left-2 size-3 text-muted-foreground pointer-events-none z-10" />
          <Input
            placeholder="搜索实体..."
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => { if (results.length > 0) setShowResults(true); }}
            className="pl-7 pr-7 text-xs h-7"
          />
          {query && (
            <button
              onClick={() => { setQuery(''); setResults([]); setShowResults(false); }}
              className="absolute right-2 z-10 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3" />
            </button>
          )}
        </div>

        {/* Search results dropdown */}
        {showResults && results.length > 0 && (
          <div className="absolute left-2 right-2 top-full mt-1 max-h-48 overflow-y-auto rounded border border-border bg-background shadow-lg z-30">
            {results.map((r) => (
              <button
                key={r.id}
                onClick={() => handleSelect(r.id)}
                className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-xs hover:bg-secondary transition-colors"
              >
                <span
                  className="inline-block size-2 rounded-full shrink-0"
                  style={{ backgroundColor: NODE_COLORS[r.type] }}
                />
                <span className="truncate text-foreground">{r.label}</span>
                <span className="ml-auto text-[10px] text-muted-foreground shrink-0">
                  {NODE_TYPE_LABELS[r.type]}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Topology cleanup mode */}
      <div className="border-t border-border px-3 py-2">
        <div className="mb-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Network className="size-3" aria-hidden="true" />
          <span>连接视图</span>
        </div>
        <div className="grid grid-cols-3 border border-border bg-background/50">
          {TOPOLOGY_MODES.map((mode) => {
            const active = topologyMode === mode.value;
            return (
              <button
                key={mode.value}
                type="button"
                title={mode.title}
                onClick={() => onSetTopologyMode(mode.value)}
                className={`min-h-7 px-2 text-[11px] transition-colors ${
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`}
              >
                {mode.label}
              </button>
            );
          })}
        </div>
        {graphStats && (
          <div className="mt-2 grid grid-cols-3 gap-1 text-center text-[10px] text-muted-foreground">
            <span className="border border-border/70 bg-background/35 px-1 py-1">
              {graphStats.visibleNodes}/{graphStats.totalNodes}
            </span>
            <span className="border border-border/70 bg-background/35 px-1 py-1">
              孤点 {graphStats.isolated}
            </span>
            <span className="border border-border/70 bg-background/35 px-1 py-1">
              叶子 {graphStats.leaf}
            </span>
          </div>
        )}
      </div>

      {/* Type filters — collapsible on mobile */}
      <div className="border-t border-border">
        <button
          onClick={() => setFiltersExpanded(!filtersExpanded)}
          className="flex w-full items-center justify-between px-3 py-2 text-[11px] text-muted-foreground lg:hidden"
          aria-expanded={filtersExpanded}
          aria-controls="graph-type-filters"
        >
          <span>类型筛选</span>
          <span className="text-[10px]">{filtersExpanded ? '\u25B2' : '\u25BC'}</span>
        </button>
        <div
          id="graph-type-filters"
          className={`px-3 py-2 flex flex-wrap gap-2 ${filtersExpanded ? 'block' : 'hidden lg:flex'}`}
        >
          {Object.entries(NODE_TYPE_LABELS).map(([type, label]) => {
            const active = typeFilters[type] !== false;
            return (
              <button
                key={type}
                onClick={() => onToggleType(type)}
                className={`flex items-center gap-1.5 rounded px-2 py-1 text-[11px] border transition-colors ${
                  active
                    ? 'border-border bg-secondary text-foreground'
                    : 'border-transparent bg-transparent text-muted-foreground opacity-50'
                }`}
              >
                <span
                  className="inline-block size-2 rounded-full"
                  style={{ backgroundColor: active ? NODE_COLORS[type] : '#555' }}
                />
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
