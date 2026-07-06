'use client';

import { useEffect, useRef, useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import cytoscape from 'cytoscape';
import fcose from 'cytoscape-fcose';
import type { Core, NodeSingular, EventObject } from 'cytoscape';
import { Spinner } from '@/components/ui/8bit/spinner';
import { useGraphData } from '@/hooks/useGraphData';
import { useGraphInteraction } from '@/hooks/useGraphInteraction';
import { buildStylesheet, buildElements, FCOSE_LAYOUT_OPTIONS } from '@/lib/graph-config';
import { GraphControls } from './GraphControls';
import { GraphLegend } from './GraphLegend';
import { EntityDrawer } from './EntityDrawer';

interface GraphCanvasProps {
  focusNodeId?: string | null;
}

// Register fcose layout once
cytoscape.use(fcose);

export default function GraphCanvas({ focusNodeId }: GraphCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const [cyInstance, setCyInstance] = useState<Core | null>(null);
  const searchParams = useSearchParams();

  const { graphData, loading: dataLoading, error, retry } = useGraphData();

  const {
    selectedNode,
    typeFilters,
    tooltip,
    updateLabelVisibility,
    applyVisibilityFilters,
    clearHighlight,
    handleSelectNode,
    handleToggleType,
    handleSetTopologyMode,
    showTooltip,
    hideTooltip,
    topologyMode,
  } = useGraphInteraction(cyRef);

  const graphStats = useMemo(() => {
    if (!graphData) {
      return null;
    }

    const degree = new Map<string, number>();
    graphData.nodes.forEach((node) => degree.set(node.id, 0));
    graphData.links.forEach((link) => {
      degree.set(link.source, (degree.get(link.source) ?? 0) + 1);
      degree.set(link.target, (degree.get(link.target) ?? 0) + 1);
    });

    const isolated = graphData.nodes.filter((node) => (degree.get(node.id) ?? 0) === 0).length;
    const leaf = graphData.nodes.filter((node) => (degree.get(node.id) ?? 0) === 1).length;
    const visibleNodeIds = new Set(
      graphData.nodes
        .filter((node) => {
          if (typeFilters[node.type] === false) return false;

          const nodeDegree = degree.get(node.id) ?? 0;
          if (topologyMode === 'core') return nodeDegree >= 2;
          if (topologyMode === 'connected') return nodeDegree >= 1;
          return true;
        })
        .map((node) => node.id)
    );

    return {
      totalNodes: graphData.nodes.length,
      visibleNodes: visibleNodeIds.size,
      isolated,
      leaf,
      totalLinks: graphData.links.length,
    };
  }, [graphData, topologyMode, typeFilters]);

  // ── Stable ref for handleSelectNode ──
  const handleSelectNodeRef = useRef(handleSelectNode);
  useEffect(() => { handleSelectNodeRef.current = handleSelectNode; }, [handleSelectNode]);

  // ── Layout running state (local to init effect) ──
  const layoutRunningRef = useRef(false);

  // ── Respond to focusNodeId prop changes ──
  useEffect(() => {
    if (focusNodeId && cyRef.current && !dataLoading) {
      handleSelectNodeRef.current(focusNodeId);
    }
  }, [focusNodeId, dataLoading]);

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
      pixelRatio: 'auto',
    });

    cyRef.current = cy;
    setCyInstance(cy);
    layoutRunningRef.current = true;

    const layout = cy.layout(FCOSE_LAYOUT_OPTIONS);
    applyVisibilityFilters(cy, typeFilters, topologyMode);

    layout.on('layoutstop', () => {
      layoutRunningRef.current = false;

      updateLabelVisibility(cy);
      applyVisibilityFilters(cy, typeFilters, topologyMode);

      const focusId = searchParams.get('focus');
      if (focusId) {
        setTimeout(() => handleSelectNodeRef.current(focusId), 300);
      }
    });

    layout.run();

    // ── Events ──
    cy.on('zoom', () => updateLabelVisibility(cy));

    cy.on('tap', 'node', (e: EventObject) => {
      const node = e.target as NodeSingular;
      handleSelectNodeRef.current(node.id());
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graphData]);

  // ── Drawer close ──
  const handleCloseDrawer = useCallback(() => {
    const cy = cyRef.current;
    if (cy) clearHighlight(cy);
  }, [clearHighlight]);

  // ── Navigate to node from drawer ──
  const handleNavigateToNode = useCallback((nodeId: string) => {
    handleSelectNode(nodeId);
  }, [handleSelectNode]);

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
          node={selectedNode}
          links={graphData.links}
          cy={cyRef.current}
          onClose={handleCloseDrawer}
          onNavigateToNode={handleNavigateToNode}
        />
      )}
    </div>
  );
}
