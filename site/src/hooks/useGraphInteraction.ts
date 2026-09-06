import { useState, useCallback, useEffect, type MutableRefObject } from 'react';
import type { Core } from 'cytoscape';
import type { GraphNode } from '@/lib/types';
import { ALL_NODE_TYPES } from '@/lib/constants';
import { applyVisibilityFilters, type GraphTopologyMode } from '@/lib/graph-config';

interface TooltipState {
  x: number;
  y: number;
  name: string;
  type: string;
  description: string;
}

export function useGraphInteraction(cyRef: MutableRefObject<Core | null>, cy: Core | null) {
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [typeFilters, setTypeFilters] = useState<Record<string, boolean>>(
    Object.fromEntries(ALL_NODE_TYPES.map((type) => [type, true]))
  );
  const [topologyMode, setTopologyMode] = useState<GraphTopologyMode>('connected');
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  useEffect(() => {
    if (cy) applyVisibilityFilters(cy, typeFilters, topologyMode);
  }, [cy, typeFilters, topologyMode]);

  const clearHighlight = useCallback((graph: Core) => {
    graph.batch(() => graph.elements().removeClass('highlighted neighbor dimmed hovered'));
    setSelectedNode(null);
    setTooltip(null);
  }, []);

  const handleSelectNode = useCallback((nodeId: string) => {
    const graph = cyRef.current;
    if (!graph) return;
    const node = graph.$id(nodeId);
    if (!node.length) return;

    // Deep links and sidebar selections also reveal nodes hidden by filters.
    if (node.hasClass('filtered-out')) {
      setTypeFilters((prev) => ({ ...prev, [node.data('type')]: true }));
      setTopologyMode('all');
    }
    graph.batch(() => {
      graph.elements().removeClass('highlighted neighbor dimmed hovered');
      graph.elements().addClass('dimmed');
      node.removeClass('dimmed filtered-out').addClass('highlighted');
      node.neighborhood().nodes().removeClass('dimmed').addClass('neighbor');
      node.connectedEdges().removeClass('dimmed').addClass('highlighted');
    });
    setSelectedNode(node.data('_raw') as GraphNode);
    setTooltip(null);
    graph.stop();
    graph.animate({
      fit: { eles: node.closedNeighborhood().not('.filtered-out'), padding: 80 },
      duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 250,
    });
  }, [cyRef]);

  const handleToggleType = useCallback((type: string) => {
    setTypeFilters((prev) => ({ ...prev, [type]: !prev[type] }));
  }, []);

  const showTooltip = useCallback((x: number, y: number, name: string, type: string, description: string) => {
    setTooltip({ x, y, name, type, description });
  }, []);
  const hideTooltip = useCallback(() => setTooltip(null), []);

  return {
    selectedNode, typeFilters, topologyMode, tooltip, clearHighlight,
    handleSelectNode, handleToggleType, handleSetTopologyMode: setTopologyMode,
    showTooltip, hideTooltip,
  };
}
