import { useState, useCallback, type MutableRefObject } from 'react';
import type { Core } from 'cytoscape';
import type { GraphNode } from '@/lib/types';
import { ALL_NODE_TYPES } from '@/lib/constants';
import { ZOOM_THRESHOLDS } from '@/lib/graph-config';

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
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

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
  const applyTypeFilters = useCallback((cy: Core, filters: Record<string, boolean>) => {
    cy.nodes().forEach((node) => {
      const type = node.data('type') as string;
      if (filters[type] === false) {
        node.addClass('filtered-out');
      } else {
        node.removeClass('filtered-out');
      }
    });
    cy.edges().forEach((edge) => {
      const srcType = edge.source().data('type') as string;
      const tgtType = edge.target().data('type') as string;
      if (filters[srcType] === false || filters[tgtType] === false) {
        edge.style('display', 'none');
      } else {
        edge.style('display', 'element');
      }
    });
  }, []);

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
        applyTypeFilters(cy, next);
      }
      return next;
    });
  }, [cyRef, applyTypeFilters]);

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
    tooltip,
    updateLabelVisibility,
    applyTypeFilters,
    highlightNode,
    clearHighlight,
    handleSelectNode,
    handleToggleType,
    showTooltip,
    hideTooltip,
  };
}
