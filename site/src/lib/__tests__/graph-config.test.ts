import { describe, it, expect, vi } from 'vitest';
import cytoscape from 'cytoscape';
import { nodeSize, edgeWidth, lightenColor, buildElements, buildStylesheet, applyVisibilityFilters, updateLabelVisibility, NODE_SIZE } from '../graph-config';
import type { GraphData, GraphNode } from '../types';

describe('nodeSize', () => {
  it('returns MIN for weight 0', () => {
    const node = { composite_weight: 0 } as GraphNode;
    expect(nodeSize(node)).toBe(NODE_SIZE.MIN);
  });

  it('returns MAX for weight 1', () => {
    const node = { composite_weight: 1 } as GraphNode;
    expect(nodeSize(node)).toBe(NODE_SIZE.MAX);
  });

  it('returns midpoint for weight 0.5', () => {
    const node = { composite_weight: 0.5 } as GraphNode;
    expect(nodeSize(node)).toBe((NODE_SIZE.MIN + NODE_SIZE.MAX) / 2);
  });

  it('handles undefined composite_weight', () => {
    const node = {} as GraphNode;
    expect(nodeSize(node)).toBe(NODE_SIZE.MIN);
  });
});

describe('edgeWidth', () => {
  it('returns minimum 1 for weight 0', () => {
    expect(edgeWidth(0)).toBe(1);
  });

  it('returns clamped value for large weight', () => {
    expect(edgeWidth(100)).toBeLessThanOrEqual(4);
  });

  it('returns at least 1 for weight 1', () => {
    expect(edgeWidth(1)).toBeGreaterThanOrEqual(1);
  });
});

describe('lightenColor', () => {
  it('lightens a dark color', () => {
    const result = lightenColor('#000000', 50);
    expect(result).toBe('#323232');
  });

  it('clamps to white', () => {
    const result = lightenColor('#ffffff', 50);
    expect(result).toBe('#ffffff');
  });

  it('handles brand purple', () => {
    const result = lightenColor('#7351cf', 40);
    expect(result).toMatch(/^#[0-9a-f]{6}$/);
  });
});

describe('buildElements', () => {
  it('converts graph data to cytoscape elements', () => {
    const data: GraphData = {
      nodes: [
        {
          id: 'openai',
          name: 'OpenAI',
          type: 'company',
          description: 'AI company',
          mention_count: 10,
          article_count: 5,
          degree: 3,
          aliases: [],
          tags: [],
          composite_weight: 0.5,
          x: 123.5,
          y: -240,
        } as GraphNode,
      ],
      links: [
        {
          source: 'openai',
          target: 'chatgpt',
          relation_type: 'develops' as const,
          label: 'develops',
          weight: 3,
          effective_weight: 15,
          article_count: 3,
        },
      ],
    };

    const elements = buildElements(data);
    expect(elements).toHaveLength(2); // 1 node + 1 edge
    expect(elements[0].data.id).toBe('openai');
    expect(elements[0]).toHaveProperty('position', { x: 123.5, y: -240 });
    expect((elements[1].data as { source: string }).source).toBe('openai');
  });

  it('handles empty data', () => {
    const data: GraphData = { nodes: [], links: [] };
    const elements = buildElements(data);
    expect(elements).toHaveLength(0);
  });
});

describe('graph interactions', () => {
  function makeGraph() {
    return cytoscape({
      headless: true,
      styleEnabled: true,
      style: buildStylesheet(),
      layout: { name: 'preset' },
      elements: [
        { data: { id: 'hub', type: 'company', degree: 20, mention_count: 10, _raw: {} } },
        { data: { id: 'leaf', label: 'Leaf', type: 'product', degree: 1, mention_count: 6, _raw: {} } },
        { data: { id: 'other', type: 'person', degree: 1, mention_count: 1, _raw: {} } },
        { data: { id: 'isolated', type: 'product', degree: 0, mention_count: 1, _raw: {} } },
        { data: { id: 'e1', source: 'hub', target: 'leaf' } },
        { data: { id: 'e2', source: 'hub', target: 'other' } },
      ],
    });
  }

  it('filters nodes and their incident edges, then restores all without stale edge styles', () => {
    const cy = makeGraph();
    try {
      applyVisibilityFilters(cy, {}, 'connected');
      expect(cy.nodes().filter((node) => node.style('display') !== 'none').map((n) => n.id())).toEqual(['hub', 'leaf', 'other']);
      applyVisibilityFilters(cy, { product: false }, 'all');
      expect(cy.$id('e1').style('display')).toBe('none');
      expect(cy.$id('e2').style('display')).toBe('element');
      applyVisibilityFilters(cy, {}, 'core');
      expect(cy.nodes().filter((node) => node.style('display') !== 'none').map((n) => n.id())).toEqual(['hub']);
      applyVisibilityFilters(cy, {}, 'all');
      expect(cy.nodes().filter((node) => node.style('display') !== 'none')).toHaveLength(4);
      expect(cy.edges().filter((edge) => edge.style('display') !== 'none')).toHaveLength(2);
    } finally {
      cy.destroy();
    }
  });

  it('updates labels only when crossing a zoom tier and keeps hover/selection labels independent', () => {
    const cy = makeGraph();
    try {
      cy.zoom(0.2);
      updateLabelVisibility(cy);
      expect(cy.nodes('.show-label').map((n) => n.id())).toEqual(['hub']);
      const nodes = vi.spyOn(cy, 'nodes');
      cy.zoom(0.3);
      updateLabelVisibility(cy);
      expect(nodes).not.toHaveBeenCalled();
      nodes.mockRestore();
      cy.zoom(0.6);
      updateLabelVisibility(cy);
      expect(cy.nodes('.show-label').map((n) => n.id())).toEqual(['hub', 'leaf']);
      cy.zoom(1);
      updateLabelVisibility(cy);
      expect(cy.nodes('.show-label')).toHaveLength(4);
      cy.$id('leaf').addClass('neighbor');
      cy.zoom(0.2);
      updateLabelVisibility(cy);
      expect(cy.$id('leaf').style('label')).toBe('Leaf');
      cy.$id('leaf').removeClass('neighbor');
      expect(cy.$id('leaf').hasClass('show-label')).toBe(false);
    } finally {
      cy.destroy();
    }
  });
});
