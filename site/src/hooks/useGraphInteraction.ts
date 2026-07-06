import { useState, useCallback, type MutableRefObject } from 'react';
import type { Core } from 'cytoscape';
import type { GraphNode } from '@/lib/types';
import { ALL_NODE_TYPES } from '@/lib/constants';
import { ZOOM_THRESHOLDS } from '@/lib/graph-config';

export type GraphTopologyMode = 'connected' | 'core' | 'all';

interface TooltipState {
  x: number;
  y: number;
  name: string;
  type: string;
  description: string;
}

export function useGraphInteraction(cyRef: MutableRefObject<Core | null>) {
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [typeFilters, setTypeFilters] = useState<Record<string, boolean>>(
    Object.fromEntries(ALL_NODE_TYPES.map((t) => [t, true]))
  );
  const [topologyMode, setTopologyMode] = useState<GraphTopologyMode>('connected');
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const nodePassesTopologyMode = useCallback((cy: Core, nodeId: string, mode: GraphTopologyMode) => {
    const degree = cy.$id(nodeId).degree(false);
    if (mode === 'core') return degree >= 2;
    if (mode === 'connected') return degree >= 1;
    return true;
  }, []);

  // ── Update label visibility based on zoom ──
  const updateLabelVisibility = useCallback((cy: Core) => {
    const zoom = cy.zoom();
    cy.nodes().forEach((node) => {
      if (
        node.hasClass('highlighted') ||
        node.hasClass('hovered') ||
        node.hasClass('neighbor')
      ) {
        node.addClass('show-label');
        return;
      }

      const degree = node.data('degree') as number;
      const mentionCount = node.data('mention_count') as number;

      if (zoom < ZOOM_THRESHOLDS.SHOW_HIGH_DEGREE_LABELS) {
        if (degree > ZOOM_THRESHOLDS.HIGH_DEGREE_MIN) {
          node.addClass('show-label');
        } else {
          node.removeClass('show-label');
        }
      } else if (zoom < ZOOM_THRESHOLDS.SHOW_ALL_LABELS) {
        if (mentionCount > ZOOM_THRESHOLDS.HIGH_MENTION_MIN) {
          node.addClass('show-label');
        } else {
          node.removeClass('show-label');
        }
      } else {
        node.addClass('show-label');
      }
    });
  }, []);

  // ── Apply type filters ──
  const applyVisibilityFilters = useCallback((
    cy: Core,
    filters: Record<string, boolean>,
    mode: GraphTopologyMode,
  ) => {
    cy.nodes().forEach((node) => {
      const type = node.data('type') as string;
      if (filters[type] === false || !nodePassesTopologyMode(cy, node.id(), mode)) {
        node.addClass('filtered-out');
      } else {
        node.removeClass('filtered-out');
      }
    });
    cy.edges().forEach((edge) => {
      const srcType = edge.source().data('type') as string;
      const tgtType = edge.target().data('type') as string;
      const sourceHidden =
        filters[srcType] === false || !nodePassesTopologyMode(cy, edge.source().id(), mode);
      const targetHidden =
        filters[tgtType] === false || !nodePassesTopologyMode(cy, edge.target().id(), mode);
      if (sourceHidden || targetHidden) {
        edge.style('display', 'none');
      } else {
        edge.style('display', 'element');
      }
    });
    updateLabelVisibility(cy);
  }, [nodePassesTopologyMode, updateLabelVisibility]);

  // ── Highlight a node and its neighborhood ──
  const highlightNode = useCallback((cy: Core, nodeId: string) => {
    cy.elements().removeClass('highlighted neighbor dimmed');

    const node = cy.$id(nodeId);
    if (node.length === 0) return;

    const neighborhood = node.neighborhood();
    const connectedEdges = node.connectedEdges();

    cy.elements().addClass('dimmed');

    node.removeClass('dimmed').addClass('highlighted');
    neighborhood.nodes().removeClass('dimmed').addClass('neighbor');
    connectedEdges.removeClass('dimmed').addClass('highlighted');

    setSelectedNode(node.data('_raw') as unknown as GraphNode);
  }, []);

  // ── Clear highlighting ──
  const clearHighlight = useCallback((cy: Core) => {
    cy.elements().removeClass('highlighted neighbor dimmed hovered');
    setSelectedNode(null);
    updateLabelVisibility(cy);
  }, [updateLabelVisibility]);

  // ── Handle node selection (from search or click) ──
  const handleSelectNode = useCallback((nodeId: string) => {
    const cy = cyRef.current;
    if (!cy) return;

    const node = cy.$id(nodeId);
    if (node.length === 0) return;

    highlightNode(cy, nodeId);

    const neighborhood = node.neighborhood().add(node);
    cy.animate({
      fit: { eles: neighborhood, padding: 80 },
      duration: 600,
      easing: 'ease-in-out-cubic',
    });
  }, [cyRef, highlightNode]);

  // ── Toggle type filter ──
  const handleToggleType = useCallback((type: string) => {
    setTypeFilters((prev) => {
      const next = { ...prev, [type]: !prev[type] };
      const cy = cyRef.current;
      if (cy) {
        applyVisibilityFilters(cy, next, topologyMode);
      }
      return next;
    });
  }, [cyRef, applyVisibilityFilters, topologyMode]);

  // ── Toggle topology/connectedness filter ──
  const handleSetTopologyMode = useCallback((mode: GraphTopologyMode) => {
    setTopologyMode(mode);
    const cy = cyRef.current;
    if (cy) {
      applyVisibilityFilters(cy, typeFilters, mode);
    }
  }, [cyRef, applyVisibilityFilters, typeFilters]);

  // ── Show tooltip ──
  const showTooltip = useCallback((x: number, y: number, name: string, type: string, description: string) => {
    setTooltip({ x, y, name, type, description });
  }, []);

  // ── Hide tooltip ──
  const hideTooltip = useCallback(() => {
    setTooltip(null);
  }, []);

  return {
    selectedNode,
    typeFilters,
    topologyMode,
    tooltip,
    updateLabelVisibility,
    applyVisibilityFilters,
    highlightNode,
    clearHighlight,
    handleSelectNode,
    handleToggleType,
    handleSetTopologyMode,
    showTooltip,
    hideTooltip,
  };
}
