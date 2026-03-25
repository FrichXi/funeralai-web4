import { describe, it, expect } from 'vitest';
import { nodeSize, edgeWidth, lightenColor, buildElements, NODE_SIZE } from '../graph-config';
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
    expect(elements[1].data.source).toBe('openai');
  });

  it('handles empty data', () => {
    const data: GraphData = { nodes: [], links: [] };
    const elements = buildElements(data);
    expect(elements).toHaveLength(0);
  });
});
