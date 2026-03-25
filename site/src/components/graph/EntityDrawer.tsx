'use client';

import { useState, useEffect, useRef } from 'react';
import type { Core } from 'cytoscape';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { X, ExternalLink, ChevronUp, ChevronDown } from 'lucide-react';
import { NODE_COLORS, NODE_TYPE_LABELS, RELATION_STYLES } from '@/lib/constants';
import type { GraphNode, GraphLink, RelationType } from '@/lib/types';

function useIsMobile(breakpoint = 640) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    setIsMobile(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [breakpoint]);

  return isMobile;
}

interface EntityDrawerProps {
  node: GraphNode | null;
  links: GraphLink[];
  cy: Core | null;
  onClose: () => void;
  onNavigateToNode: (nodeId: string) => void;
}

/** Shared content sections (used by both desktop and mobile) */
function DrawerContent({
  node,
  connectedLinks,
  sourceArticles,
  getNodeName,
  onNavigateToNode,
}: {
  node: GraphNode;
  connectedLinks: GraphLink[];
  sourceArticles: GraphNode['source_articles'];
  getNodeName: (id: string) => string;
  onNavigateToNode: (nodeId: string) => void;
}) {
  const articles = Array.isArray(sourceArticles) ? sourceArticles : [];

  return (
    <div className="p-4 space-y-4">
      {/* Description */}
      {node.description && (
        <div>
          <p className="text-xs text-muted-foreground mb-1">简介</p>
          <p className="text-sm text-foreground leading-relaxed">{node.description}</p>
        </div>
      )}

      {/* Tags */}
      {node.tags && node.tags.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-1.5">标签</p>
          <div className="flex flex-wrap gap-1">
            {node.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-[10px]">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <Separator />

      {/* Relationships */}
      {connectedLinks.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-2">
            关系 ({connectedLinks.length})
          </p>
          <div className="space-y-1">
            {connectedLinks.map((link, i) => {
              const isSource = link.source === node.id;
              const otherId = isSource ? link.target : link.source;
              const otherName = getNodeName(otherId);
              const style = RELATION_STYLES[link.relation_type as RelationType];
              const color = style?.color || '#888';

              return (
                <button
                  key={`${link.source}-${link.target}-${link.relation_type}-${i}`}
                  onClick={() => onNavigateToNode(otherId)}
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-secondary transition-colors group"
                >
                  <span
                    className="inline-block h-0.5 w-3 shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-muted-foreground shrink-0">
                    {style?.label || link.relation_type}
                  </span>
                  <span className="text-foreground truncate group-hover:text-primary transition-colors">
                    {otherName}
                  </span>
                  <span className="ml-auto text-[10px] text-muted-foreground shrink-0">
                    w:{link.weight}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <Separator />

      {/* Source articles */}
      {articles.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-2">
            来源文章 ({articles.length})
          </p>
          <div className="space-y-1">
            {articles.map((article) => (
              <a
                key={article.article_id}
                href={article.permalink}
                className="flex items-center gap-2 rounded px-2 py-1.5 text-xs text-foreground hover:bg-secondary transition-colors group"
              >
                <ExternalLink className="size-3 shrink-0 text-muted-foreground" />
                <span className="truncate group-hover:text-primary transition-colors">
                  {article.title}
                </span>
                <span className="ml-auto text-[10px] text-muted-foreground shrink-0">
                  x{article.mention_count}
                </span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function EntityDrawer({ node, links, cy, onClose, onNavigateToNode }: EntityDrawerProps) {
  const isMobile = useIsMobile();
  const [expanded, setExpanded] = useState(false);
  const prevNodeId = useRef<string | null>(null);

  // Reset to collapsed when switching nodes
  useEffect(() => {
    if (node && node.id !== prevNodeId.current) {
      setExpanded(false);
      prevNodeId.current = node.id;
    }
  }, [node]);

  if (!node) return null;

  // Get connected links
  const connectedLinks = links.filter(
    (l) => l.source === node.id || l.target === node.id
  );

  // Get source articles from node data
  const sourceArticles = Array.isArray(node.source_articles)
    ? node.source_articles
    : [];

  // Resolve neighbor names from cy
  const getNodeName = (id: string): string => {
    if (!cy) return id;
    const n = cy.$id(id);
    if (n.length === 0) return id;
    return (n.data('label') as string) || id;
  };

  const nodeColor = NODE_COLORS[node.type] || '#888';

  // --- Desktop: side panel (unchanged) ---
  if (!isMobile) {
    return (
      <div className="fixed right-0 bottom-0 top-[calc(var(--navbar-height)+1rem)] z-40 w-[400px] border-l border-border bg-background shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 p-4 border-b border-border">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span
                className="inline-block size-3 rounded-full shrink-0"
                style={{ backgroundColor: nodeColor }}
              />
              <h2 className="text-base font-medium text-foreground truncate">
                {node.displayName || node.name}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-[10px]">
                {NODE_TYPE_LABELS[node.type] || node.type}
              </Badge>
              <span className="text-[10px] text-muted-foreground">
                提及 {node.mention_count} 次 / {node.article_count} 篇文章
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 p-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 overflow-auto">
          <DrawerContent
            node={node}
            connectedLinks={connectedLinks}
            sourceArticles={sourceArticles}
            getNodeName={getNodeName}
            onNavigateToNode={onNavigateToNode}
          />
        </ScrollArea>
      </div>
    );
  }

  // --- Mobile: bottom sheet ---
  return (
    <div
      className="fixed left-0 right-0 bottom-0 z-40 bg-background border-t border-border shadow-2xl flex flex-col transition-[max-height] duration-300 ease-out"
      style={{
        maxHeight: expanded ? '80vh' : '40vh',
        height: expanded ? '80vh' : 'auto',
      }}
    >
      {/* Drag handle + toggle */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex flex-col items-center py-2 cursor-pointer"
      >
        <span className="w-10 h-1 rounded-full bg-muted-foreground/40" />
        <span className="mt-1">
          {expanded ? (
            <ChevronDown className="size-3 text-muted-foreground" />
          ) : (
            <ChevronUp className="size-3 text-muted-foreground" />
          )}
        </span>
      </button>

      {/* Peek header */}
      <div className="flex items-center justify-between gap-2 px-4 pb-2">
        <div className="min-w-0 flex-1 flex items-center gap-2">
          <span
            className="inline-block size-3 rounded-full shrink-0"
            style={{ backgroundColor: nodeColor }}
          />
          <h2 className="text-sm font-medium text-foreground truncate">
            {node.displayName || node.name}
          </h2>
          <Badge variant="secondary" className="text-[9px] shrink-0">
            {NODE_TYPE_LABELS[node.type] || node.type}
          </Badge>
        </div>
        <button
          onClick={onClose}
          className="shrink-0 p-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {!expanded ? (
          /* Collapsed: show only description peek */
          <div className="px-4 pb-4">
            {node.description && (
              <p className="text-xs text-foreground leading-relaxed line-clamp-3">
                {node.description}
              </p>
            )}
            <p className="text-[10px] text-muted-foreground mt-2">
              提及 {node.mention_count} 次 / {node.article_count} 篇文章 · {connectedLinks.length} 个关系
            </p>
          </div>
        ) : (
          /* Expanded: full content */
          <DrawerContent
            node={node}
            connectedLinks={connectedLinks}
            sourceArticles={sourceArticles}
            getNodeName={getNodeName}
            onNavigateToNode={onNavigateToNode}
          />
        )}
      </div>
    </div>
  );
}
