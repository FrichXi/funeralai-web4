'use client';

import { useEffect, useRef, useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import cytoscape from 'cytoscape';
import type { Core, NodeSingular, EventObject } from 'cytoscape';
import { Spinner } from '@/components/ui/8bit/spinner';
import { useGraphData } from '@/hooks/useGraphData';
import { useGraphInteraction } from '@/hooks/useGraphInteraction';
import { buildStylesheet, buildElements, applyVisibilityFilters, updateLabelVisibility, nodeIsVisible } from '@/lib/graph-config';
import { GraphControls } from './GraphControls';
import { GraphLegend } from './GraphLegend';
import { EntityDrawer } from './EntityDrawer';

interface GraphCanvasProps {
  focusNode?: { id: string } | null;
}

export default function GraphCanvas({ focusNode }: GraphCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const [cyInstance, setCyInstance] = useState<Core | null>(null);
  const searchParams = useSearchParams();

  const { graphData, loading: dataLoading, error, retry } = useGraphData();

  const {
    selectedNode,
    typeFilters,
    tooltip,
    clearHighlight,
    handleSelectNode,
    handleToggleType,
    handleSetTopologyMode,
    showTooltip,
    hideTooltip,
    topologyMode,
  } = useGraphInteraction(cyRef, cyInstance);

  const graphStats = useMemo(() => {
    if (!cyInstance) return null;
    const nodes = cyInstance.nodes();
    return {
      totalNodes: nodes.length,
      visibleNodes: nodes.filter((node) => nodeIsVisible(node.data('type'), node.degree(false), typeFilters, topologyMode)).length,
      isolated: nodes.filter((node) => node.degree(false) === 0).length,
      leaf: nodes.filter((node) => node.degree(false) === 1).length,
    };
  }, [cyInstance, topologyMode, typeFilters]);

  const urlFocus = searchParams.get('focus');
  useEffect(() => {
    if (urlFocus && cyInstance) handleSelectNode(urlFocus);
  }, [urlFocus, cyInstance, handleSelectNode]);
  useEffect(() => {
    if (focusNode && cyInstance) handleSelectNode(focusNode.id);
  }, [focusNode, cyInstance, handleSelectNode]);

  // ── Initialize Cytoscape when data + container ready ──
  useEffect(() => {
    if (!graphData || !containerRef.current) return;

    const elements = buildElements(graphData);

    const cy = cytoscape({
      container: containerRef.current,
      elements,
      style: buildStylesheet(),
      minZoom: 0.05,
      maxZoom: 4,
      wheelSensitivity: 0.3,
      pixelRatio: Math.min(window.devicePixelRatio || 1, 1.5),
      hideEdgesOnViewport: true,
      layout: { name: 'preset', fit: false },
    });

    cyRef.current = cy;
    setCyInstance(cy);
    applyVisibilityFilters(cy, {}, 'connected');
    cy.fit(cy.elements().not('.filtered-out'), 40);
    updateLabelVisibility(cy);

    // ── Events ──
    cy.on('zoom', () => updateLabelVisibility(cy));
    cy.on('pan zoom grab', hideTooltip);

    cy.on('tap', 'node', (e: EventObject) => {
      const node = e.target as NodeSingular;
      handleSelectNode(node.id());
    });

    cy.on('tap', (e: EventObject) => {
      if (e.target === cy) clearHighlight(cy);
    });

    cy.on('mouseover', 'node', (e: EventObject) => {
      const node = e.target as NodeSingular;
      node.addClass('hovered');
      const pos = node.renderedPosition();
      showTooltip(
        pos.x,
        pos.y,
        node.data('label') as string,
        node.data('type') as string,
        node.data('description') as string,
      );
    });

    cy.on('mouseout', 'node', (e: EventObject) => {
      const node = e.target as NodeSingular;
      node.removeClass('hovered');
      hideTooltip();
    });

    return () => {
      cy.destroy();
      cyRef.current = null;
      setCyInstance(null);
    };
  }, [graphData, clearHighlight, showTooltip, hideTooltip, handleSelectNode]);

  // ── Drawer close ──
  const handleCloseDrawer = useCallback(() => {
    const cy = cyRef.current;
    if (cy) clearHighlight(cy);
  }, [clearHighlight]);

  // ── Error state ──
  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-sm text-destructive">加载图谱数据失败</p>
          <p className="text-xs text-muted-foreground">{error}</p>
          <button
            onClick={retry}
            className="px-4 py-2 text-xs bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {/* Cytoscape container */}
      <div
        ref={containerRef}
        className="absolute inset-0"
        style={{ width: '100%', height: '100%' }}
        aria-label="知识图谱可视化"
        role="img"
      />

      {/* Loading overlay */}
      {dataLoading && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
          <Spinner className="size-8 text-primary" />
          <p className="retro mt-4 text-xs text-muted-foreground">
            加载图谱数据...
          </p>
        </div>
      )}

      {/* Controls */}
      <GraphControls
        cy={cyInstance}
        onSelectNode={handleSelectNode}
        typeFilters={typeFilters}
        onToggleType={handleToggleType}
        topologyMode={topologyMode}
        onSetTopologyMode={handleSetTopologyMode}
        graphStats={graphStats}
      />

      {/* Legend */}
      <GraphLegend />

      {/* Tooltip */}
      {tooltip && (
        <div
          className="pointer-events-none absolute z-30 max-w-[200px] rounded border border-border bg-background/90 px-2 py-1.5 text-xs shadow-lg backdrop-blur-sm"
          style={{
            left: tooltip.x + 15,
            top: tooltip.y - 10,
          }}
        >
          <p className="font-medium text-foreground">{tooltip.name}</p>
          <p className="text-[10px] text-muted-foreground capitalize">{tooltip.type}</p>
          {tooltip.description && (
            <p className="mt-1 text-[10px] text-muted-foreground line-clamp-2">
              {tooltip.description}
            </p>
          )}
        </div>
      )}

      {/* Entity Drawer */}
      {selectedNode && graphData && (
        <EntityDrawer
          key={selectedNode.id}
          node={selectedNode}
          cy={cyRef.current}
          onClose={handleCloseDrawer}
          onNavigateToNode={handleSelectNode}
        />
      )}
    </div>
  );
}
